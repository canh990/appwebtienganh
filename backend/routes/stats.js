const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /api/stats/me — Full profile stats for the logged-in user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const totalVocab = await Vocabulary.count();

    res.json({
      id: user.id,
      username: user.username,
      level: user.level || 1,
      xp: user.xp || 0,
      streak: user.streak || 0,
      wordsLearned: Array.isArray(user.wordsLearned) ? user.wordsLearned.length : 0,
      favoriteWords: Array.isArray(user.favoriteWords) ? user.favoriteWords.length : 0,
      achievements: Array.isArray(user.achievements) ? user.achievements.length : 0,
      stats: user.stats || { totalQuizzesTaken: 0, highestScore: 0 },
      totalVocab,
      xpForNextLevel: ((user.level || 1)) * 1000,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET /api/stats/leaderboard — Top 10 users by XP
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'xp', 'level', 'streak', 'avatar'],
      order: [['xp', 'DESC']],
      limit: 10
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// POST /api/stats/update-streak — Update streak when user logs in daily
router.post('/update-streak', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const now = new Date();
    const last = user.lastActive ? new Date(user.lastActive) : null;

    let newStreak = user.streak || 0;

    if (last) {
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1; // Continue streak
      } else if (diffDays > 1) {
        newStreak = 1; // Reset streak
      }
      // diffDays === 0 means same day, no change
    } else {
      newStreak = 1;
    }

    user.streak = newStreak;
    user.lastActive = now;
    await user.save();

    res.json({ streak: newStreak });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
