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
    const filtered = (events || []).filter(e => e.title && !e.title.startsWith("ChronoGuard:"));
    return res.status(200).json({ events: filtered });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching calendar events', error: error.message });
  }
});
router.post('/apply-fixes', authMiddleware, aiController.applyCalendarFixes);

// Retrieve Calendar Diff Preview
router.get('/calendar-diff', authMiddleware, aiController.getCalendarDiff);

// Approvals Queue
router.get('/approvals', authMiddleware, aiController.getApprovals);
router.post('/approvals/bulk-action', authMiddleware, aiController.bulkApprovalAction);
router.post('/approvals/:id/action', authMiddleware, aiController.handleApprovalAction);

module.exports = router;
