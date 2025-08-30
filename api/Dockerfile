# syntax=docker/dockerfile:1

# Multi-stage build for optimal image size and security

# Stage 1: Dependencies stage - install all dependencies
FROM node:22-alpine AS dependencies

# Create the directory structure first
RUN mkdir -p /govdoc-scanner

# Set the working directory to match monorepo structure
WORKDIR /govdoc-scanner

# Create non-root user early for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

# Copy package files for dependency installation
COPY package*.json ./
COPY api/package*.json ./api/

# Install dependencies with npm install for reproducible builds
# Use --omit=dev to exclude dev dependencies and --ignore-scripts to skip postinstall (chromium)
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force

# Stage 2: Build stage (if needed for any build steps)
FROM node:22-alpine AS builder

# Create the directory structure first
RUN mkdir -p /govdoc-scanner

WORKDIR /govdoc-scanner

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/

# Install all dependencies (including dev deps) for any build process
# Skip postinstall script to avoid installing Chromium (not needed for API)
RUN npm install --ignore-scripts

# Copy source code
COPY api/ .

# If you had build steps, they would go here
# RUN npm run build

# Stage 3: Production stage - minimal runtime image
FROM node:22-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk update && \
    apk add --no-cache dumb-init && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

# Create the directory structure first
RUN mkdir -p /govdoc-scanner

# Set working directory
WORKDIR /govdoc-scanner

# Change ownership to app user
RUN chown -R app:nodejs /govdoc-scanner

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=app:nodejs /govdoc-scanner/node_modules ./node_modules

# Copy the shared directory that the API depends on
COPY --chown=app:nodejs shared ./shared

# Copy application source code
COPY --chown=app:nodejs api ./api

# Switch to non-root user
USER app

# Expose the port the app runs on
EXPOSE 8080

# Add labels for better maintainability
LABEL maintainer="govdoc-scanner-team" \
      description="GovDoc Scanner API - Fastify-based REST API for querying company metadata" \
      version="0.1.0" \
      org.opencontainers.image.title="GovDoc Scanner API" \
      org.opencontainers.image.description="API for querying company metadata derived from incorporation document scans" \
      org.opencontainers.image.version="0.1.0" \
      org.opencontainers.image.vendor="GovDoc Scanner Project"

# Health check to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(http => { \
        const req = http.request({hostname: 'localhost', port: 8080, path: '/health', timeout: 5000}, \
        (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
        req.on('error', () => process.exit(1)); \
        req.end(); \
    })" || exit 1

# Use dumb-init to handle signals properly and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "api/src/server.mjs"]
