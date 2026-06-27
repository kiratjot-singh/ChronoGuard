const axios = require('axios');
const Task = require('../models/Task');
const googleService = require('../services/googleService');

/**
 * Controller to compile user details and invoke the Python FastAPI AI Agent pipeline.
 */
exports.analyzeWorkload = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user tasks from MongoDB
    const dbTasks = await Task.find({ user: userId });
    const formattedTasks = dbTasks.map(t => ({
      title: t.title,
      deadline: t.deadline,
      estimated_hours: t.estimated_hours || 2
    }));

    // 2. Fetch Google Calendar events and Gmail tasks
    const calendarEvents = await googleService.getCalendarEvents(userId);
    const gmailTasks = await googleService.getGmailTasks(userId);

    // Combine all tasks
    const allTasks = [...formattedTasks, ...gmailTasks];

    // Compile behavioral history summary based on DB tasks
    const completedTasks = dbTasks.filter(t => t.status === 'completed');
    const pendingTasks = dbTasks.filter(t => t.status === 'pending');
    
    const history = `
Completed:
${completedTasks.map(t => `- ${t.title}`).join('\n') || '- None'}

Missed/Pending:
${pendingTasks.map(t => `- ${t.title} (due: ${t.deadline})`).join('\n') || '- None'}
`.trim();

    // 3. Dispatch payload to Python FastAPI AI service
    const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000/analyze';
    const payload = {
      user_id: userId.toString(),
      history,
      tasks: allTasks,
      query: req.body.query || "Analyze my schedule, check calendar availability, calculate risk scores, and negotiate schedule improvements."
    };

    console.log(`Sending payload to Python AI Service: ${JSON.stringify(payload)}`);
    const aiResponse = await axios.post(pythonAiUrl, payload);
    const result = aiResponse.data;

    // Persist AI profile observations into MongoDB User Memory
    if (result.profile) {
      try {
        const Memory = require('../models/Memory');
        let memory = await Memory.findOne({ user: userId });
        if (!memory) {
          memory = new Memory({ user: userId });
        }
        
        const count = memory.observationsCount || 0;
        
        // Update average focus rating dynamically
        if (result.profile.focus_score !== undefined) {
          memory.averageFocus = Math.round(((memory.averageFocus * count) + result.profile.focus_score) / (count + 1));
        }

        // Merge unique preferred work hours
        if (Array.isArray(result.profile.preferred_work_hours)) {
          const hoursSet = new Set(memory.preferredWorkHours || []);
          result.profile.preferred_work_hours.forEach(h => hoursSet.add(h));
          memory.preferredWorkHours = Array.from(hoursSet).sort();
        }

        // Merge unique procrastination patterns
        if (Array.isArray(result.profile.procrastination_patterns)) {
          const patternsSet = new Set(memory.recurringProcrastinationPatterns || []);
          result.profile.procrastination_patterns.forEach(p => patternsSet.add(p));
          memory.recurringProcrastinationPatterns = Array.from(patternsSet).sort();
        }

        memory.observationsCount = count + 1;
        memory.updatedAt = new Date();
        await memory.save();
        console.log(`Saved dynamic AI profile to user memory: ${JSON.stringify(memory)}`);
      } catch (dbErr) {
        console.error(`Failed to update user memory in MongoDB: ${dbErr.message}`);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(`AI Integration Error: ${error.message}`);
    if (error.response && error.response.status === 429) {
      const detail = error.response.data?.detail || "Gemini API rate limit exceeded. Please wait a few seconds and try again.";
      return res.status(429).json({ error: detail });
    }
    return res.status(500).json({ error: error.message });
  }
};
