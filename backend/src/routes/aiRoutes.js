const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

// Protected AI endpoint
router.post('/analyze', authMiddleware, aiController.analyzeWorkload);

// Get real calendar events
const googleService = require('../services/googleService');
router.get('/calendar', authMiddleware, async (req, res) => {
  try {
    const events = await googleService.getCalendarEvents(req.user.id);
    return res.status(200).json({ events });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching calendar events', error: error.message });
  }
});

module.exports = router;
