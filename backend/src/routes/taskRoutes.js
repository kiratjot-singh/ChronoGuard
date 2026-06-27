const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');

// Protect all routes under taskRoutes
router.use(authMiddleware);

// CRUD routes
router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/today', taskController.getTodayTasks);
router.get('/upcoming', taskController.getUpcomingTasks);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
