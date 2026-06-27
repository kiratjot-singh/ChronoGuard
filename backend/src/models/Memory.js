const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  averageFocus: {
    type: Number,
    default: 0.0
  },
  averageCompletionRate: {
    type: Number,
    default: 0.0
  },
  preferredWorkHours: {
    type: [String],
    default: []
  },
  recurringProcrastinationPatterns: {
    type: [String],
    default: []
  },
  observationsCount: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Memory', memorySchema);
