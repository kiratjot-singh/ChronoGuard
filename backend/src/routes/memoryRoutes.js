const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', memoryController.getMemory);

module.exports = router;
