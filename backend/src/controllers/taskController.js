const Task = require('../models/Task');
const { logFeedbackEvent } = require('../utils/learningLogger');

// Create Task
exports.createTask = async (req, res) => {
  try {
    const { title, deadline, priority, estimated_hours, subtasks } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ message: 'Title and deadline are required.' });
    }

    const task = new Task({
      user: req.user.id,
      title,
      deadline,
      priority,
      estimated_hours,
      subtasks
    });

    await task.save();
    logFeedbackEvent(req.user.id, 'Task Edited', { title: task.title, action: 'create' });
    return res.status(201).json({ message: 'Task created successfully.', task });
  } catch (error) {
    return res.status(500).json({ message: 'Server error creating task.', error: error.message });
  }
};

// Get Tasks with optional filters
exports.getTasks = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    
    // Optional query filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving tasks.', error: error.message });
  }
};

// Update Task
exports.updateTask = async (req, res) => {
  try {
    const { title, deadline, status, priority, estimated_hours, subtasks } = req.body;
    
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized.' });
    }

    const oldStatus = task.status;

    // Apply updates
    if (title !== undefined) task.title = title;
    if (deadline !== undefined) task.deadline = deadline;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (estimated_hours !== undefined) task.estimated_hours = estimated_hours;
    if (subtasks !== undefined) task.subtasks = subtasks;
    task.updatedAt = new Date();

    await task.save();

    if (status !== undefined && status !== oldStatus) {
      if (status === 'completed') {
        logFeedbackEvent(req.user.id, 'Task Completed', { title: task.title });
      } else if (status === 'delayed') {
        logFeedbackEvent(req.user.id, 'Task Delayed', { title: task.title });
      }
    } else {
      logFeedbackEvent(req.user.id, 'Task Rescheduled', { title: task.title });
    }

    return res.status(200).json({ message: 'Task updated successfully.', task });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating task.', error: error.message });
  }
};

// Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized.' });
    }
    logFeedbackEvent(req.user.id, 'Task Deleted', { title: task.title });
    return res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting task.', error: error.message });
  }
};

// Get Tasks due Today
exports.getTodayTasks = async (req, res) => {
  try {
    // Matches tasks with 'today' (case-insensitive) or matches current date
    const tasks = await Task.find({
      user: req.user.id,
      $or: [
        { deadline: /today/i },
        { status: 'pending' } // Fallback to pending tasks
      ]
    });
    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving today\'s tasks.', error: error.message });
  }
};

// Get Upcoming Tasks
exports.getUpcomingTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.id,
      deadline: { $ne: 'today' },
      status: 'pending'
    }).sort({ createdAt: 1 });
    
    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving upcoming tasks.', error: error.message });
  }
};
