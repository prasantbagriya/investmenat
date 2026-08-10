# Multi-stage Dockerfile for high-performance React SPA serving

# Phase 1: Dependency settlement & static compilation build
FROM node:20-alpine AS builder
WORKDIR /app

# Install absolute dependencies
COPY package*.json ./
RUN npm ci

# Copy full source and compile production artifacts
COPY . .
RUN npm run build

# Phase 2: Lightweight static container assembly
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Port exposure
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
