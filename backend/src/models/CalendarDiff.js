const mongoose = require('mongoose');

const diffItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  task_title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['ADD', 'MOVE', 'UPDATE', 'REMOVE', 'KEEP', 'MERGE'],
    required: true
  },
  current_date: {
    type: String,
    default: ""
  },
  current_time: {
    type: String,
    default: ""
  },
  new_date: {
    type: String,
    default: ""
  },
  new_time: {
    type: String,
    default: ""
  },
  estimated_duration: {
    type: String,
    default: ""
  },
  reason: {
    type: String,
    required: true
  },
  expected_benefit: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    default: "medium"
  },
  approval_required: {
    type: String,
    enum: ['YES', 'NO'],
    default: 'YES'
  }
});

const calendarDiffSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  summary: {
    events_added: { type: Number, default: 0 },
    events_moved: { type: Number, default: 0 },
    events_updated: { type: Number, default: 0 },
    events_removed: { type: Number, default: 0 },
    events_merged: { type: Number, default: 0 },
    estimated_completion_improvement: { type: String, default: "0% -> 0%" },
    total_free_time_preserved: { type: String, default: "0 Hours" },
    conflicts_removed: { type: Number, default: 0 },
    approval_required: { type: String, default: "NO" }
  },
  changes: [diffItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CalendarDiff', calendarDiffSchema);
