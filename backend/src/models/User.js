const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  googleConnected: {
    type: Boolean,
    default: false
  },
  syncOnLoad: {
    type: Boolean,
    default: true
  },
  emailAlerts: {
    type: Boolean,
    default: false
  },
  focusBufferMinutes: {
    type: Number,
    default: 30
  },
  highPriorityKeywords: {
    type: [String],
    default: ['interview', 'internship', 'test', 'deadline', 'exam']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
