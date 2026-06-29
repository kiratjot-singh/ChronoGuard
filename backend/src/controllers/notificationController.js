const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { logFeedbackEvent } = require('../utils/learningLogger');

// Retrieve all notifications and run a proactive check for near deadlines
exports.getNotifications = async (req, res) => {
  try {
    // Proactively scan pending tasks for deadlines today/tomorrow and generate notifications
    try {
      const pendingTasks = await Task.find({ user: req.user.id, status: 'pending' });
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      for (const task of pendingTasks) {
        const deadlineLower = (task.deadline || '').toLowerCase();
        const specificDate = task.specificDate || '';

        const isDueToday = deadlineLower.includes('today') || specificDate === todayStr;
        const isDueTomorrow = deadlineLower.includes('tomorrow') || specificDate === tomorrowStr;

        if (isDueToday || isDueTomorrow) {
          const dueDay = isDueToday ? 'today' : 'tomorrow';
          const msg = `Deadline Alert: '${task.title}' is due ${dueDay} (${task.deadline || 'soon'}). Estimated time: ${task.estimated_hours || 2}h.`;
          
          const existingNotif = await Notification.findOne({ user: req.user.id, message: msg });
          if (!existingNotif) {
            await Notification.create({
              user: req.user.id,
              title: 'Upcoming Deadline Warning',
              message: msg,
              type: 'risk',
              explanation: `This task is due ${dueDay}. Make sure to allocate focus blocks today to complete it.`,
              changes: 'Scheduled check'
            });
          }
        }
      }
    } catch (checkErr) {
      console.error("Failed to auto-check task deadlines:", checkErr.message);
    }

    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving notifications.', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating notifications status.', error: error.message });
  }
};

// Toggle mark single notification as read
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
    logFeedbackEvent(req.user.id, 'Notification Opened', { notification_id: req.params.id, title: notification.title });
    return res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating notification status.', error: error.message });
  }
};
