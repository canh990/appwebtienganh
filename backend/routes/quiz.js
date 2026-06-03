const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sequelize = require('../config/database');

// Get random quizzes
router.get('/random', async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      order: sequelize.random(),
      limit: 10
    });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu quiz', error: error.message });
  }
});

// Submit quiz results
router.post('/submit', protect, async (req, res) => {
  try {
    const { score, total } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Giả sử mỗi câu đúng được 20 XP
    const earnedXp = score * 20;
    user.xp = (user.xp || 0) + earnedXp;
    
    const stats = user.stats || { totalQuizzesTaken: 0, highestScore: 0 };
    stats.totalQuizzesTaken = (stats.totalQuizzesTaken || 0) + 1;
    if (score > (stats.highestScore || 0)) {
      stats.highestScore = score;
    }
    user.stats = stats;
    user.changed('stats', true);
    
    // Level up logic (1000 XP per level)
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
