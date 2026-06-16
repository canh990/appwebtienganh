const express = require('express');
const router = express.Router();
const Vocabulary = require('../models/Vocabulary');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// GET /api/vocabulary/themes — list unique themes with word count (+ learned count if logged in)
router.get('/themes', optionalAuth, async (req, res) => {
  try {
    const themes = await Vocabulary.findAll({
      attributes: [
        'theme',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        userId: req.user ? req.user.id : -1
      },
      group: ['theme'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    const learnedByTheme = {};
    if (req.user) {
      const learnedIds = req.user.wordsLearned || [];
      if (learnedIds.length > 0) {
        const learnedWords = await Vocabulary.findAll({
          where: { id: learnedIds },
          attributes: ['theme'],
          raw: true,
        });
        learnedWords.forEach(({ theme }) => {
          learnedByTheme[theme] = (learnedByTheme[theme] || 0) + 1;
        });
      }
    }

    res.json(themes.map(t => ({
      theme: t.theme,
      count: parseInt(t.dataValues.count),
      learnedCount: learnedByTheme[t.theme] || 0,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách chủ đề', error: error.message });
  }
});

// GET /api/vocabulary — with pagination + optional theme & search filter
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const theme  = req.query.theme  || null;
    const search = req.query.search || null;

    const where = {
      userId: req.user ? req.user.id : -1
    };
    if (theme)  where.theme = theme;
    if (search) {
      where[Op.or] = [
        { word:    { [Op.like]: `%${search}%` } },
        { meaning: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows: words, count: total } = await Vocabulary.findAndCountAll({
      where,
      limit,
      offset: skip,
      order: [['id', 'ASC']]
    });

    res.json({
      words,
      hasMore: total > skip + words.length,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu từ vựng', error: error.message });
  }
});

// POST /api/vocabulary/favorite/:id — toggle favorite word
router.post('/favorite/:id', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const wordIdStr = req.params.id.toString();
    let favorites = Array.isArray(user.favoriteWords) ? user.favoriteWords : [];
    const hasWord = favorites.some(id => id.toString() === wordIdStr);

    if (hasWord) {
      favorites = favorites.filter(id => id.toString() !== wordIdStr);
    } else {
      favorites.push(parseInt(wordIdStr) || wordIdStr);
    }

    user.favoriteWords = favorites;
    user.changed('favoriteWords', true);
    await user.save();

    res.json({ favoriteWords: user.favoriteWords });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lưu từ vựng', error: error.message });
  }
});

// GET /api/vocabulary/learned — get learned word IDs of the logged-in user (protected)
router.get('/learned', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const learned = Array.isArray(user.wordsLearned) ? user.wordsLearned : [];
    res.json({ wordsLearned: learned });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách từ đã học', error: error.message });
  }
});

// POST /api/vocabulary/learned/:id — mark a word as learned (protected)
router.post('/learned/:id', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const wordIdStr = req.params.id.toString();
    const word = await Vocabulary.findByPk(wordIdStr);
    if (!word) return res.status(404).json({ message: 'Không tìm thấy từ vựng' });

    let learned = Array.isArray(user.wordsLearned) ? user.wordsLearned : [];
    const alreadyLearned = learned.some(id => id.toString() === wordIdStr);

    if (!alreadyLearned) {
      learned.push(parseInt(wordIdStr) || wordIdStr);
      user.wordsLearned = learned;
      user.changed('wordsLearned', true);
      await user.save();
    }

    res.json({ wordsLearned: user.wordsLearned, added: !alreadyLearned });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lưu tiến độ học', error: error.message });
  }
});

// GET /api/vocabulary/favorites — get all favorite words of the logged-in user (protected)
router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const favoriteIds = Array.isArray(user.favoriteWords) ? user.favoriteWords : [];
    if (favoriteIds.length === 0) {
      return res.json([]);
    }

    const words = await Vocabulary.findAll({
      where: {
        id: favoriteIds
      },
      order: [['id', 'ASC']]
    });

    res.json(words);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách từ vựng yêu thích', error: error.message });
  }
});

// PUT /api/vocabulary/:id — update a vocabulary word (protected)
router.put('/:id', protect, async (req, res) => {
  try {
    const word = await Vocabulary.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: 'Không tìm thấy từ vựng' });

    if (word.userId !== null && word.userId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền sửa từ vựng này' });
    }

    const { word: wordText, ipa, meaning, type, example, theme, imageUrl } = req.body;
    if (!wordText || !ipa || !meaning || !type) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (Từ, IPA, Nghĩa, Loại từ)' });
    }

    const duplicate = await Vocabulary.findOne({
      where: {
        word: wordText.trim(),
        id: { [Op.ne]: word.id },
        userId: { [Op.or]: [null, req.user.id] }
      },
    });
    if (duplicate) {
      return res.status(400).json({ message: 'Từ vựng này đã tồn tại trong cơ sở dữ liệu.' });
    }

    await word.update({
      word: wordText.trim(),
      ipa: ipa.trim(),
      meaning: meaning.trim(),
      type: type.toLowerCase().trim(),
      example: example ? example.trim() : '',
      theme: theme ? theme.trim() : 'General',
      imageUrl: imageUrl ? imageUrl.trim() : word.imageUrl,
    });

    res.json({ message: 'Cập nhật từ vựng thành công!', word });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật từ vựng', error: error.message });
  }
});

// DELETE /api/vocabulary/:id — delete a vocabulary word (protected)
router.delete('/:id', protect, async (req, res) => {
  try {
    const word = await Vocabulary.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: 'Không tìm thấy từ vựng' });

    if (word.userId !== null && word.userId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền xóa từ vựng này' });
    }

    await word.destroy();
    res.json({ message: 'Đã xóa từ vựng thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa từ vựng', error: error.message });
  }
});

// POST /api/vocabulary — create a new vocabulary word (protected)
router.post('/', protect, async (req, res) => {
  try {
    const { word, ipa, meaning, type, example, theme, imageUrl } = req.body;
    
    if (!word || !ipa || !meaning || !type) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (Từ, IPA, Nghĩa, Loại từ)' });
    }

    // Kiểm tra xem từ đã tồn tại chưa
    const existing = await Vocabulary.findOne({ 
      where: { 
        word: word.trim(),
        userId: { [Op.or]: [null, req.user.id] }
      } 
    });
    if (existing) {
      return res.status(400).json({ message: 'Từ vựng này đã tồn tại trong cơ sở dữ liệu.' });
    }

    const newWord = await Vocabulary.create({
      userId: req.user.id,
      word: word.trim(),
      ipa: ipa.trim(),
      meaning: meaning.trim(),
      type: type.toLowerCase().trim(),
      example: example ? example.trim() : '',
      theme: theme ? theme.trim() : 'General',
      imageUrl: imageUrl ? imageUrl.trim() : 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=60'
    });

    res.status(201).json({ message: 'Thêm từ vựng thành công!', word: newWord });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi thêm từ vựng', error: error.message });
  }
});

// DELETE /api/vocabulary/theme/:themeName — delete a whole theme (protected)
router.delete('/theme/:themeName', protect, async (req, res) => {
  try {
    const { themeName } = req.params;

    // Delete all vocabulary of this theme for this user or default
    await Vocabulary.destroy({
      where: {
        theme: themeName,
        userId: { [Op.or]: [null, req.user.id] }
      }
    });

    // Delete all quizzes of this theme for this user or default
    await Quiz.destroy({
      where: {
        theme: themeName,
        userId: { [Op.or]: [null, req.user.id] }
      }
    });

    res.json({ message: `Đã xóa chủ đề "${themeName}" thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa chủ đề', error: error.message });
  }
});

module.exports = router;
