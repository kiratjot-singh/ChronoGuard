const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  explanation: String,
  changes: String,
  type: {
    type: String,
    enum: ['risk', 'simulation', 'general'],
    default: 'general'
  },
  message: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  severity: {
    type: String,
    enum: ['critical', 'important', 'information', 'silent'],
    default: 'information'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
