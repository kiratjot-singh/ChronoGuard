const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected endpoints
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
