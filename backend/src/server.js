require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;
const logger = console;

const startServer = async () => {
  // 1. Connect to MongoDB Database
  await connectDB();

  // 2. Start Listening
  app.listen(PORT, () => {
    logger.info(`ChronoGuard Express server is listening on port ${PORT} 🚀`);
  });
};

startServer();
