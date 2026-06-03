const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  xpReward: { type: Number, default: 50 },
  taskType: { type: String, enum: ['vocabulary', 'quiz', 'speaking', 'listening'], required: true },
  targetCount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
