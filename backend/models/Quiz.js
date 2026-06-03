const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  answerIndex: {
    type: DataTypes.INTEGER
  },
  correctAnswer: {
    type: DataTypes.STRING
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'multiple_choice' // multiple_choice, fill_in_blank, listening
  },
  audioUrl: {
    type: DataTypes.TEXT
  },
  xpReward: {
    type: DataTypes.INTEGER,
    defaultValue: 20
  }
});

module.exports = Quiz;
