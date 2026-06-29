const axios = require('axios');

const logFeedbackEvent = async (userId, eventType, details = {}) => {
  try {
    const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000/api';
    await axios.post(`${pythonAiUrl}/learning/feedback`, {
      user_id: userId.toString(),
      event_type: eventType,
      details: details
    });
    console.log(`Successfully logged feedback event in python-ai: ${eventType}`);
  } catch (err) {
    console.warn(`Failed to log feedback event to python-ai: ${err.message}`);
  }
};

module.exports = { logFeedbackEvent };
