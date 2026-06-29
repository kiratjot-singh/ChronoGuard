const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  deadline: {
    type: String, // Stored as a string to accommodate relative descriptors (e.g. 'Tomorrow', 'June 28th')
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  estimated_hours: {
    type: Number,
    default: 2
  },
  subtasks: {
    type: [String],
    default: []
  },
  scheduledStart: {
    type: Date
  },
  scheduledEnd: {
    type: Date
  },
  specificDate: {
    type: String
  },
  preferredStartTime: {
    type: String
  },
  reason: {
    type: String,
    default: ""
  },
  calendarSource: {
    type: String,
    default: "Manual"
  },
  confidence: {
    type: Number,
    default: 100
  },
  detectedDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', taskSchema);
