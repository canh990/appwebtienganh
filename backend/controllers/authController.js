const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper
const generateTokens = (id, username) => {
  const accessToken = jwt.sign({ id, username }, process.env.JWT_SECRET || 'cyberlingo-secret-key', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id, username }, process.env.JWT_SECRET || 'cyberlingo-secret-key', { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const userExists = await User.findOne({ where: { username } });
    if (userExists) return res.status(400).json({ message: 'Tài khoản đã tồn tại' });
    
    const user = await User.create({ username, password });
    const { accessToken, refreshToken } = generateTokens(user.id, user.username);
    
    res.status(201).json({ 
      token: accessToken,
      refreshToken,
      user: { id: user.id, username, level: user.level, streak: user.streak, xp: user.xp, avatar: user.avatar } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const user = await User.findOne({ where: { username } });
    
    if (user && (await user.matchPassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user.id, user.username);
      res.json({ 
        token: accessToken,
        refreshToken,
        user: { id: user.id, username, level: user.level, streak: user.streak, xp: user.xp, avatar: user.avatar } 
      });
    } else {
      res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: 'Không tìm thấy refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberlingo-secret-key');
    const { accessToken, refreshToken } = generateTokens(decoded.id, decoded.username);
    res.json({ token: accessToken, refreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Refresh token hết hạn hoặc không hợp lệ' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        level: user.level,
        streak: user.streak,
        xp: user.xp || 0,
        avatar: user.avatar
      });
    } else {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Update user profile (avatar)
// @route   PUT /api/auth/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      if (req.body.avatar !== undefined) {
        user.avatar = req.body.avatar;
      }
      await user.save();
      res.json({
        id: user.id,
        username: user.username,
        level: user.level,
        streak: user.streak,
        xp: user.xp || 0,
        avatar: user.avatar
      });
    } else {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
