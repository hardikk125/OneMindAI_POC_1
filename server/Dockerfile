# =============================================================================
# OneMindAI Backend - Production Dockerfile (Optimized)
# =============================================================================

# Use Node.js LTS (Alpine for smaller image)
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN npm install -g dumb-init

# Copy package files first (for better caching)
COPY package.json package-lock.json* ./

# Install dependencies with npm ci (faster and more reliable)
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose the port (Railway sets PORT env var automatically)
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/health || exit 1

# Start the server with proper signal handling
CMD ["dumb-init", "node", "ai-proxy.cjs"]
