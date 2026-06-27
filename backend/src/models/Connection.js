const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accessToken: String,
  refreshToken: String,
  expiryDate: Number,
  scopes: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Connection', connectionSchema);
