const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  registerUser, 
  loginUser, 
  refreshToken, 
  getUserProfile,
  updateUserProfile
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;
