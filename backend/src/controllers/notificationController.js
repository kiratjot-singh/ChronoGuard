const Notification = require('../models/Notification');

// Retrieve all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving notifications.', error: error.message });
  }
};

// Toggle mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or unauthorized.' });
    }
    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating notification status.', error: error.message });
  }
};
