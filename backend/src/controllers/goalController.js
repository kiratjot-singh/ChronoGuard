const Goal = require('../models/Goal');

// Fetch all goals/habits for the user
exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ goals });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving goals.', error: error.message });
  }
};

// Create a new goal/habit
exports.createGoal = async (req, res) => {
  try {
    const { title, category, targetCount } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const goal = await Goal.create({
      user: req.user.id,
      title,
      category: category || 'work',
      targetCount: targetCount || 1,
      currentCount: 0,
      completed: false
    });

    return res.status(201).json({ message: 'Goal/Habit created successfully.', goal });
  } catch (error) {
    return res.status(500).json({ message: 'Server error creating goal.', error: error.message });
  }
};

// Update/Progress a goal/habit
exports.updateGoal = async (req, res) => {
  try {
    const { currentCount, completed } = req.body;
    const goalId = req.params.id;

    const goal = await Goal.findOne({ _id: goalId, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or unauthorized.' });
    }

    if (currentCount !== undefined) {
      goal.currentCount = currentCount;
      if (goal.currentCount >= goal.targetCount) {
        goal.completed = true;
      } else {
        goal.completed = false;
      }
    }

    if (completed !== undefined) {
      goal.completed = completed;
      if (completed) {
        goal.currentCount = goal.targetCount;
      } else {
        goal.currentCount = 0;
      }
    }

    await goal.save();
    return res.status(200).json({ message: 'Goal updated successfully.', goal });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating goal.', error: error.message });
  }
};

// Delete a goal/habit
exports.deleteGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    const result = await Goal.findOneAndDelete({ _id: goalId, user: req.user.id });
    
    if (!result) {
      return res.status(404).json({ message: 'Goal not found or unauthorized.' });
    }

    return res.status(200).json({ message: 'Goal deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting goal.', error: error.message });
  }
};
