const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const avatarUpload = multer({
  dest: path.join(__dirname, '../../uploads/avatars/'),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted for avatar upload.'));
    }
  },
});

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);
router.get('/settings', userController.getSettings);
router.put('/settings', userController.updateSettings);
router.delete('/account', userController.deleteAccount);

module.exports = router;
