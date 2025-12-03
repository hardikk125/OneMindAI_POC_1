/**
 * Content Security Policy Configuration
 * 
 * CSP headers to prevent XSS and other injection attacks.
 * These are applied via meta tags for client-side apps.
 */

// =============================================================================
// CSP DIRECTIVES
// =============================================================================

/**
 * CSP directive values for different security levels
 */
export const CSP_DIRECTIVES = {
  /**
   * Strict CSP - maximum security
   */
  strict: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.openai.com',
      'https://api.anthropic.com',
      'https://generativelanguage.googleapis.com',
      'https://api.mistral.ai',
      'https://api.perplexity.ai',
      'https://api.deepseek.com',
      'https://api.groq.com',
      'https://api.x.ai',
      'https://api.moonshot.cn',
      'http://localhost:3001', // Balance API
      'http://localhost:3002', // AI Proxy
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  /**
   * Development CSP - more permissive for dev tools
   */
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for HMR
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    'font-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'ws:', 'wss:', // WebSocket for HMR
      'http://localhost:*',
      'https://*',
    ],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
  },
} as const;

// =============================================================================
// CSP BUILDER
// =============================================================================

/**
 * Build CSP header string from directives
 */
export function buildCspHeader(
  directives: Record<string, string[]>,
  reportUri?: string
): string {
  const parts: string[] = [];

  for (const [directive, values] of Object.entries(directives)) {
    if (values.length === 0) {
      parts.push(directive);
    } else {
      parts.push(`${directive} ${values.join(' ')}`);
    }
  }

  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Get CSP for current environment
 */
export function getCurrentCsp(): string {
  const isDev = import.meta.env.DEV;
  const directives = isDev ? CSP_DIRECTIVES.development : CSP_DIRECTIVES.strict;
  // Convert readonly arrays to mutable for buildCspHeader
  const mutableDirectives: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(directives)) {
    mutableDirectives[key] = [...value];
  }
  return buildCspHeader(mutableDirectives);
}

/**
 * Create CSP meta tag content
 */
export function getCspMetaContent(): string {
  return getCurrentCsp();
}

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Recommended security headers for production
 * These should be set by the server (e.g., in vite.config.ts or nginx)
 */
export const SECURITY_HEADERS = {
  /**
   * Prevent clickjacking
   */
  'X-Frame-Options': 'DENY',

  /**
   * Prevent MIME type sniffing
   */
  'X-Content-Type-Options': 'nosniff',

  /**
   * Enable XSS filter (legacy browsers)
   */
  'X-XSS-Protection': '1; mode=block',

  /**
   * Control referrer information
   */
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  /**
   * Permissions policy (formerly Feature-Policy)
   */
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

  /**
   * Strict Transport Security (HTTPS only)
   */
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
} as const;

/**
 * Get all security headers as object
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    'Content-Security-Policy': getCurrentCsp(),
  };
}

// =============================================================================
// VITE CONFIG HELPER
// =============================================================================

/**
 * Security headers for Vite dev server
 * Add to vite.config.ts: server.headers
 */
export function getViteSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    // Note: CSP is more permissive in dev mode
  };
}

// =============================================================================
// RUNTIME CSP INJECTION
// =============================================================================

/**
 * Inject CSP meta tag at runtime (for SPAs)
 * Call this early in your app initialization
 */
export function injectCspMetaTag(): void {
  // Check if already exists
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) return;

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = getCspMetaContent();
  document.head.appendChild(meta);
}

/**
 * Remove CSP meta tag (for testing)
 */
export function removeCspMetaTag(): void {
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (meta) {
    meta.remove();
  }
}

export default {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  buildCspHeader,
  getCurrentCsp,
  getCspMetaContent,
  getSecurityHeaders,
  getViteSecurityHeaders,
  injectCspMetaTag,
  removeCspMetaTag,
};
