const Memory = require('../models/Memory');
const Task = require('../models/Task');

// Retrieve or initialize memory statistics
exports.getMemory = async (req, res) => {
  try {
    let memory = await Memory.findOne({ user: req.user.id });
    if (!memory) {
      memory = new Memory({ user: req.user.id });
      await memory.save();
    }

    // Dynamically calculate task completion rate based on MongoDB tasks
    const total = await Task.countDocuments({ user: req.user.id });
    const completed = await Task.countDocuments({ user: req.user.id, status: 'completed' });
    const dynamicRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const memoryObj = memory.toObject();
    memoryObj.averageCompletionRate = dynamicRate;

    return res.status(200).json({ memory: memoryObj });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving memory stats.', error: error.message });
  }
};
