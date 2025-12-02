# =============================================================================
# OneMindAI Backend - Production Dockerfile
# =============================================================================

# Use Node.js LTS (Alpine for smaller image)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose the port (Railway sets PORT env var automatically)
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3002}/health || exit 1

# Start the server
CMD ["node", "ai-proxy.cjs"]
