# 📊 OneMindAI System Scaling Analysis - Part 4: Monitoring, Security & Maintenance

**Date:** November 20, 2025  
**Version:** 4.0.0 - "Enterprise Scale"

---

## 🔒 SECURITY IMPLEMENTATION

### **1. API Key Security**

#### **Current Risk:** 🔴 CRITICAL
- API keys stored in plain text
- Visible in browser memory
- Vulnerable to XSS attacks

#### **Solution: Multi-Layer Encryption**

**Client-Side (Temporary Storage):**
```typescript
// src/lib/crypto.ts
import CryptoJS from 'crypto-js';

class SecureStorage {
  private encryptionKey: string;
  
  constructor() {
    // Generate session key on app load
    this.encryptionKey = this.generateSessionKey();
  }
  
  private generateSessionKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }
  
  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }
  
  decrypt(encrypted: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  // Store API key
  setApiKey(provider: string, key: string) {
    const encrypted = this.encrypt(key);
    sessionStorage.setItem(`apikey_${provider}`, encrypted);
  }
  
  // Retrieve API key
  getApiKey(provider: string): string | null {
    const encrypted = sessionStorage.getItem(`apikey_${provider}`);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }
  
  // Clear on logout
  clearAll() {
    sessionStorage.clear();
    this.encryptionKey = this.generateSessionKey();
  }
}

export const secureStorage = new SecureStorage();
```

**Backend (Database Storage):**
```typescript
// backend/src/lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Benefits:**
- ✅ Keys encrypted at rest
- ✅ Keys encrypted in transit
- ✅ Session-based encryption in browser
- ✅ AES-256-GCM encryption
- ✅ Cleared on logout

---

### **2. XSS Protection**

**Implementation:**
```typescript
// Content Security Policy
// backend/src/middleware/security.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For React
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

**Input Sanitization:**
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: [],
  });
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
```

---

### **3. Rate Limiting**

**Per-User Rate Limits:**
```typescript
// backend/src/middleware/rateLimit.ts
import { redis } from '../lib/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/stream': { windowMs: 60000, maxRequests: 60 },      // 60 req/min
  '/api/files/upload': { windowMs: 60000, maxRequests: 10 },   // 10 req/min
  '/api/conversations': { windowMs: 60000, maxRequests: 100 }, // 100 req/min
};

export async function rateLimitMiddleware(req, res, next) {
  const userId = req.userId;
  const endpoint = req.route.path;
  const config = LIMITS[endpoint];
  
  if (!config) return next();
  
  const key = `ratelimit:${userId}:${endpoint}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.pexpire(key, config.windowMs);
  }
  
  if (current > config.maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: await redis.pttl(key),
    });
  }
  
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', config.maxRequests - current);
  
  next();
}
```

---

### **4. Authentication & Authorization**

**JWT Implementation:**
```typescript
// backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based access control
export function requireRole(role: string) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    
    if (user?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

---

## 📊 MONITORING & OBSERVABILITY

### **1. Application Performance Monitoring (APM)**

**Setup DataDog:**
```typescript
// backend/src/lib/monitoring.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'onemindai-backend',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
});

// Custom metrics
export function recordMetric(name: string, value: number, tags?: Record<string, string>) {
  tracer.dogstatsd.gauge(name, value, tags);
}

// Track AI provider latency
export async function trackProviderLatency(provider: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    recordMetric('ai.provider.latency', duration, { provider, status: 'success' });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    recordMetric('ai.provider.latency', duration, { provider, status: 'error' });
    throw error;
  }
}
```

---

### **2. Error Tracking**

**Sentry Integration:**
```typescript
// src/lib/error-tracking.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  },
});

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function setUserContext(userId: string, email: string) {
  Sentry.setUser({ id: userId, email });
}
```

---

### **3. Logging Strategy**

**Structured Logging:**
```typescript
// backend/src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'onemindai' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Usage
logger.info('User logged in', { userId, email });
logger.error('AI provider error', { provider, error: error.message });
logger.warn('Rate limit approaching', { userId, current, limit });
```

---

### **4. Health Checks**

**Implementation:**
```typescript
// backend/src/routes/health.ts
import express from 'express';
import { prisma } from '../lib/db';
import { redis } from '../lib/redis';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown',
    },
  };
  
  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  // Check Redis
  try {
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }
  
  // Check memory
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = memPercent > 90 ? 'warning' : 'ok';
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/metrics', async (req, res) => {
  const metrics = {
    activeUsers: await redis.scard('active_users'),
    totalConversations: await prisma.conversation.count(),
    totalMessages: await prisma.message.count(),
    avgResponseTime: await getAvgResponseTime(),
    errorRate: await getErrorRate(),
  };
  
  res.json(metrics);
});

export default router;
```

---

## 🔄 BACKUP & DISASTER RECOVERY

### **1. Database Backups**

**Automated Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="onemindai"

# Create backup
pg_dump -U postgres -d $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://onemindai-backups/postgres/

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Verify backup
if [ $? -eq 0 ]; then
  echo "Backup successful: backup_$DATE.sql.gz"
else
  echo "Backup failed!" | mail -s "Backup Alert" admin@onemindai.com
fi
```

**Cron Schedule:**
```cron
# Daily at 2 AM
0 2 * * * /scripts/backup-postgres.sh

# Weekly full backup at Sunday 3 AM
0 3 * * 0 /scripts/backup-full.sh
```

---

### **2. Redis Persistence**

**Configuration:**
```redis
# redis.conf
save 900 1      # Save if 1 key changed in 15 minutes
save 300 10     # Save if 10 keys changed in 5 minutes
save 60 10000   # Save if 10000 keys changed in 1 minute

appendonly yes
appendfsync everysec
```

---

### **3. Disaster Recovery Plan**

**RTO (Recovery Time Objective):** 1 hour  
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**
1. Spin up new EC2 instance
2. Restore PostgreSQL from latest backup
3. Restore Redis from snapshot
4. Deploy latest application code
5. Update DNS records
6. Verify functionality
7. Monitor for issues

---

## 📈 PERFORMANCE OPTIMIZATION

### **1. Database Optimization**

**Indexing Strategy:**
```sql
-- Frequently queried columns
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_files_user_created ON files(user_id, created_at DESC);
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Full-text search
CREATE INDEX idx_messages_content_fts ON messages USING GIN(to_tsvector('english', content));

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE conversation_id = 'uuid'
ORDER BY created_at DESC
LIMIT 50;
```

**Connection Pooling:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_size = 20
  connection_limit = 10
}
```

---

### **2. Caching Strategy**

**Multi-Level Cache:**
```typescript
// backend/src/lib/cache.ts
import { redis } from './redis';

class CacheManager {
  // L1: In-memory cache (fast, small)
  private memoryCache = new Map<string, { value: any; expires: number }>();
  
  // L2: Redis cache (medium, large)
  async get<T>(key: string): Promise<T | null> {
    // Check L1
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    // Check L2
    const value = await redis.get(key);
    if (value) {
      const parsed = JSON.parse(value);
      // Populate L1
      this.memoryCache.set(key, {
        value: parsed,
        expires: Date.now() + 60000, // 1 minute
      });
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 3600) {
    // Set L1
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + Math.min(ttl * 1000, 60000),
    });
    
    // Set L2
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string) {
    // Clear L1
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear L2
    const keys = await redis.keys(pattern + '*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const cache = new CacheManager();
```

---

### **3. CDN Configuration**

**CloudFlare Setup:**
```typescript
// Cache rules
{
  "rules": [
    {
      "expression": "(http.request.uri.path matches \"^/static/.*\")",
      "action": "cache",
      "cache_ttl": 86400
    },
    {
      "expression": "(http.request.uri.path matches \"^/api/.*\")",
      "action": "bypass"
    }
  ]
}
```

---

## 🎯 MAINTENANCE CHECKLIST

### **Daily Tasks**
- [ ] Check error rates in Sentry
- [ ] Review slow queries in DataDog
- [ ] Monitor API response times
- [ ] Check disk usage
- [ ] Review rate limit hits

### **Weekly Tasks**
- [ ] Review backup logs
- [ ] Analyze user feedback
- [ ] Check security alerts
- [ ] Review cost reports
- [ ] Update dependencies (security patches)

### **Monthly Tasks**
- [ ] Full system audit
- [ ] Performance optimization review
- [ ] Security vulnerability scan
- [ ] Capacity planning review
- [ ] Update documentation

---

## 📋 SUMMARY & NEXT STEPS

### **Immediate Actions (Week 1)**
1. ✅ Implement input validation & limits
2. ✅ Add file size restrictions
3. ✅ Implement request queuing
4. ✅ Add response size limits

### **Short-term (Weeks 2-3)**
1. ✅ Add IndexedDB persistence
2. ✅ Implement settings storage
3. ✅ Add conversation history
4. ✅ Client-side encryption

### **Medium-term (Weeks 4-6)**
1. ✅ Build backend infrastructure
2. ✅ Implement authentication
3. ✅ Add file storage (S3)
4. ✅ Deploy to production

### **Long-term (Months 2-3)**
1. ✅ Add vector search
2. ✅ Implement RAG
3. ✅ Advanced analytics
4. ✅ Multi-tenancy

---

**All 4 parts of the System Scaling Analysis are now complete!** ✅
