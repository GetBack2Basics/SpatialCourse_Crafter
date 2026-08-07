# Multi-stage Dockerfile optimized for Google Cloud Run (Free Tier) & minimal cost

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors
COPY package*.json ./
RUN npm ci

# Copy source files and build production bundle
COPY . .
RUN npm run build

# Stage 2: Minimal Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package descriptors and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled frontend build and backend server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Expose standard Cloud Run port
EXPOSE 8080

# Run lightweight unified Express + WebSocket + Static Server
CMD ["node", "server/index.js"]
