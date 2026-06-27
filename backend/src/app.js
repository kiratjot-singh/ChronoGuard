const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const memoryRoutes = require('./routes/memoryRoutes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Routes registry
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memory', memoryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'OK', service: 'ChronoGuard Node.js Backend' });
});

module.exports = app;
