const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  xp: { type: Number, default: 0 },
  rank: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Cyber'], default: 'Bronze' },
  weekStartDate: { type: Date, required: true }
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
