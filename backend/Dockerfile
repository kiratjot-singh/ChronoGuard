FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Run the backend server
CMD ["node", "src/server.js"]
