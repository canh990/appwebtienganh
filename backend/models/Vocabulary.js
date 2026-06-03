const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vocabulary = sequelize.define('Vocabulary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  word: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  ipa: {
    type: DataTypes.STRING,
    allowNull: false
  },
  meaning: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  example: {
    type: DataTypes.TEXT
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  theme: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  imageUrl: {
    type: DataTypes.TEXT('medium'),
    defaultValue: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=60'
  }
});

module.exports = Vocabulary;
