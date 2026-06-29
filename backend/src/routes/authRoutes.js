const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected endpoints
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/google', authMiddleware, authController.googleAuth);
router.get('/google/callback', authController.googleCallback); // public redirect handler
router.post('/google/disconnect', authMiddleware, authController.googleDisconnect);
router.put('/preferences', authMiddleware, authController.updatePreferences);

module.exports = router;
