const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  criteria: { type: String, required: true }, // e.g., '10_days_streak', '100_vocab_learned'
  rewardXp: { type: Number, default: 100 }
});

module.exports = mongoose.model('Achievement', achievementSchema);
