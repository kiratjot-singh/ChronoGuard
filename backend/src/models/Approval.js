const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskTitle: {
    type: String,
    required: true
  },
  currentTime: {
    type: String
  },
  suggestedTime: {
    type: String
  },
  reason: {
    type: String
  },
  expectedBenefit: {
    type: String
  },
  confidence: {
    type: Number,
    default: 100
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Approval', approvalSchema);
