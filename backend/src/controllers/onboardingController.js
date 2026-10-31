const OnboardingProgress = require('../models/OnboardingProgress');
const UserProfile = require('../models/UserProfile');
const UserSettings = require('../models/UserSettings');
const ActivityHistory = require('../models/ActivityHistory');

const VALID_STYLES = ['executive', 'academic', 'bullet-point', 'plain-language', 'structured'];
const VALID_LENGTHS = ['short', 'balanced', 'detailed'];

function normalizeStyle(style) {
  if (!style) return 'executive';
  const s = style.toLowerCase().trim();
  if (s === 'bullet' || s === 'bullet_point') return 'bullet-point';
  if (s === 'plain' || s === 'plain_language') return 'plain-language';
  if (VALID_STYLES.includes(s)) return s;
  return 'executive';
}

function normalizeLength(length) {
  if (!length) return 'balanced';
  const l = length.toLowerCase().trim();
  if (l === 'moderate' || l === 'medium') return 'balanced';
  if (l === 'brief') return 'short';
  if (l === 'extensive' || l === 'long') return 'detailed';
  if (VALID_LENGTHS.includes(l)) return l;
  return 'balanced';
}

class OnboardingController {
  // ── Get Progress ──────────────────────────────────────────────────────────
  async getProgress(req, res, next) {
    try {
      const userId = req.user._id;
      let progress = await OnboardingProgress.findOne({ userId });

      if (!progress) {
        progress = await OnboardingProgress.create({
          userId,
          identityData: { displayName: req.user.fullName },
        });
      }

      res.json({
        success: true,
        currentStep: progress.currentStep,
        isCompleted: progress.isCompleted,
        identityData: progress.identityData,
        preferencesData: progress.preferencesData,
        discoverySources: progress.discoverySources,
        discoveryOther: progress.discoveryOther,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Save Step ─────────────────────────────────────────────────────────────
  async saveStep(req, res, next) {
    try {
      const userId = req.user._id;
      const stepNumber = parseInt(req.params.step, 10);
      const data = req.body || {};

      let progress = await OnboardingProgress.findOne({ userId });
      if (!progress) {
        progress = new OnboardingProgress({ userId });
      }

      if (stepNumber === 1) {
        progress.identityData = {
          ...progress.identityData,
          ...data,
        };
        progress.currentStep = Math.max(progress.currentStep, 2);

        // Sync with profile
        await UserProfile.findOneAndUpdate(
          { userId },
          {
            displayName: data.displayName || req.user.fullName,
            avatar: data.avatar || '',
            occupation: data.occupation || '',
            institution: data.institution || '',
            country: data.country || '',
            preferredLanguage: data.preferredLanguage || 'en',
          },
          { upsert: true }
        );
      } else if (stepNumber === 2) {
        const cleanPreferences = {
          documentInterests: data.documentInterests || data.interestCategories || [],
          preferredSummaryStyle: normalizeStyle(data.preferredSummaryStyle),
          preferredSummaryLength: normalizeLength(data.preferredSummaryLength || data.defaultLength),
        };

        progress.preferencesData = {
          ...progress.preferencesData,
          ...cleanPreferences,
        };
        progress.currentStep = Math.max(progress.currentStep, 3);

        // Sync with user settings
        await UserSettings.findOneAndUpdate(
          { userId },
          {
            defaultLength: cleanPreferences.preferredSummaryLength,
            defaultStyle: cleanPreferences.preferredSummaryStyle,
          },
          { upsert: true }
        );
      } else if (stepNumber === 3) {
        progress.discoverySources = data.discoverySources || (data.discoverySource ? [data.discoverySource] : []);
        progress.discoveryOther = data.discoveryOther || '';
      }

      await progress.save();

      res.json({
        success: true,
        message: `Step ${stepNumber} saved successfully.`,
        currentStep: progress.currentStep,
        isCompleted: progress.isCompleted,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Complete Onboarding ───────────────────────────────────────────────────
  async complete(req, res, next) {
    try {
      const userId = req.user._id;
      const { identityData, preferencesData, discoverySources, discoveryOther } = req.body;

      let progress = await OnboardingProgress.findOne({ userId });
      if (!progress) {
        progress = new OnboardingProgress({ userId });
      }

      if (identityData) progress.identityData = { ...progress.identityData, ...identityData };
      if (preferencesData) {
        progress.preferencesData = {
          ...progress.preferencesData,
          ...preferencesData,
          preferredSummaryStyle: normalizeStyle(preferencesData.preferredSummaryStyle),
          preferredSummaryLength: normalizeLength(preferencesData.preferredSummaryLength),
        };
      }
      if (discoverySources) progress.discoverySources = discoverySources;
      if (discoveryOther !== undefined) progress.discoveryOther = discoveryOther;

      progress.isCompleted = true;
      progress.completedAt = new Date();
      await progress.save();

      // Final sync with profile & settings
      if (progress.identityData) {
        await UserProfile.findOneAndUpdate(
          { userId },
          {
            displayName: progress.identityData.displayName || req.user.fullName,
            occupation: progress.identityData.occupation || '',
            institution: progress.identityData.institution || '',
            country: progress.identityData.country || '',
            preferredLanguage: progress.identityData.preferredLanguage || 'en',
          },
          { upsert: true }
        );
      }

      if (progress.preferencesData) {
        await UserSettings.findOneAndUpdate(
          { userId },
          {
            defaultLength: progress.preferencesData.preferredSummaryLength || 'balanced',
            defaultStyle: progress.preferencesData.preferredSummaryStyle || 'executive',
          },
          { upsert: true }
        );
      }

      await ActivityHistory.create({
        userId,
        actionType: 'onboarding_completed',
        description: 'First-time onboarding questionnaire completed',
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Onboarding completed successfully! Welcome to SankshepAI.',
        onboardingComplete: true,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OnboardingController();
