const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserSettings = require('../models/UserSettings');
const Document = require('../models/Document');
const Summary = require('../models/Summary');
const Collection = require('../models/Collection');
const ActivityHistory = require('../models/ActivityHistory');
const bcrypt = require('bcryptjs');

class UserController {
  async getProfile(req, res) {
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        fullName: req.user.fullName,
        emailVerified: req.user.emailVerified,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
      profile: profile || {},
    });
  }

  async updateProfile(req, res) {
    const userId = req.user._id;
    const { displayName, avatar, occupation, institution, country, preferredLanguage, bio, fullName } = req.body;

    if (fullName && fullName.trim()) {
      req.user.fullName = fullName.trim();
      await req.user.save();
    }

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        displayName: displayName || req.user.fullName,
        ...(avatar !== undefined && { avatar }),
        ...(occupation !== undefined && { occupation }),
        ...(institution !== undefined && { institution }),
        ...(country !== undefined && { country }),
        ...(preferredLanguage !== undefined && { preferredLanguage }),
        ...(bio !== undefined && { bio }),
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updatedProfile,
    });
  }

  async uploadAvatar(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await UserProfile.findOneAndUpdate({ userId: req.user._id }, { avatar: avatarUrl });
    res.json({ success: true, avatarUrl });
  }

  async getSettings(req, res) {
    let settings = await UserSettings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await UserSettings.create({ userId: req.user._id });
    }
    res.json({ success: true, settings });
  }

  async updateSettings(req, res) {
    const userId = req.user._id;
    const settings = await UserSettings.findOneAndUpdate({ userId }, req.body, { new: true, upsert: true });

    await ActivityHistory.create({
      userId,
      actionType: 'settings_updated',
      description: 'Account preferences updated',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Settings saved.', settings });
  }

  async deleteAccount(req, res) {
    const userId = req.user._id;
    const { password } = req.body;

    if (req.user.passwordHash) {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password confirmation required to delete account.' });
      }
      const match = await bcrypt.compare(password, req.user.passwordHash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      }
    }

    // Cascade delete user data
    await Document.deleteMany({ userId });
    await Summary.deleteMany({ userId });
    await Collection.deleteMany({ userId });
    await UserProfile.deleteOne({ userId });
    await UserSettings.deleteOne({ userId });
    await ActivityHistory.deleteMany({ userId });
    await User.deleteOne({ _id: userId });

    res.clearCookie('token');
    res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });
  }
}

module.exports = new UserController();
