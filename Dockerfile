# Production Dockerfile for PulseLink Microservice
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy application backend source code and static public assets
COPY backend/ ./backend/
COPY public/ ./public/
COPY server.py ./

# Expose server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start production Express server
CMD ["node", "backend/server.js"]
