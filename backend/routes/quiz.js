const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

// Get available quiz themes
router.get('/themes', optionalAuth, async (req, res) => {
  try {
    const results = await Quiz.findAll({
      attributes: [
        'theme',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { 
        theme: { [Op.not]: null },
        userId: req.user ? req.user.id : -1
      },
      group: ['theme'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    res.json(results.map(r => ({ theme: r.theme, count: parseInt(r.dataValues.count) })));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách chủ đề', error: error.message });
  }
});

// Get random quizzes with optional filters: ?limit=10&type=multiple_choice&theme=Tech
router.get('/random', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const type = req.query.type;
    const theme = req.query.theme;

    const where = {
      userId: req.user ? req.user.id : -1
    };
    if (type && type !== 'all') where.type = type;
    if (theme && theme !== 'all') where.theme = theme;

    const quizzes = await Quiz.findAll({
      where,
      order: sequelize.random(),
      limit
    });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu quiz', error: error.message });
  }
});

// Submit quiz results
router.post('/submit', protect, async (req, res) => {
  try {
    const { score, total, streak } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Base XP: 20 per correct, bonus 50 XP for streak >= 5, 100 XP for perfect score
    let earnedXp = score * 20;
    if (streak && streak >= 5) earnedXp += 50;
    if (score === total && total > 0) earnedXp += 100;

    user.xp = (user.xp || 0) + earnedXp;

    const stats = user.stats || { totalQuizzesTaken: 0, highestScore: 0, totalCorrect: 0 };
    stats.totalQuizzesTaken = (stats.totalQuizzesTaken || 0) + 1;
    stats.totalCorrect = (stats.totalCorrect || 0) + score;
    if (score > (stats.highestScore || 0)) {
      stats.highestScore = score;
    }
    user.stats = stats;
    user.changed('stats', true);

    const newLevel = Math.floor(user.xp / 1000) + 1;
    if (newLevel > (user.level || 1)) {
      user.level = newLevel;
    }

    await user.save();
    res.json({ message: 'Đã lưu kết quả', xp: user.xp, level: user.level, earnedXp });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lưu điểm', error: error.message });
  }
});

module.exports = router;
