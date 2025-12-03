/**
 * Input Sanitization Utility
 * 
 * Sanitizes all user inputs to prevent XSS and injection attacks.
 * Uses DOMPurify for HTML sanitization.
 */

import DOMPurify from 'dompurify';

// =============================================================================
// DOMPURIFY CONFIGURATION
// =============================================================================

/**
 * Strict config - removes all HTML, only plain text
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

/**
 * Markdown config - allows safe markdown-rendered HTML
 */
const MARKDOWN_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's', 'strike',
  'code', 'pre', 'blockquote',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
  'sup', 'sub',
];

const MARKDOWN_ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id',
  'target', 'rel',
  'width', 'height',
];

const MARKDOWN_CONFIG = {
  ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
  ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Rich content config - for AI responses with more formatting
 */
const RICH_CONFIG = {
  ...MARKDOWN_CONFIG,
  ALLOWED_TAGS: [
    ...MARKDOWN_ALLOWED_TAGS,
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'details', 'summary',
    'figure', 'figcaption',
  ],
  ALLOWED_ATTR: [
    ...MARKDOWN_ALLOWED_ATTR,
    'd', 'fill', 'stroke', 'stroke-width', 'viewBox', 'xmlns',
    'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'points', 'transform',
  ],
};

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize user input - removes all HTML tags
 * Use for: prompts, search queries, form inputs
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // First pass: DOMPurify strict mode
  const purified = DOMPurify.sanitize(input, STRICT_CONFIG);
  
  // Second pass: escape any remaining special characters
  const sanitized = String(purified)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * Sanitize for display - allows safe HTML for rendering
 * Use for: markdown content, AI responses
 */
export function sanitizeForDisplay(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return String(DOMPurify.sanitize(html, MARKDOWN_CONFIG));
}

/**
 * Sanitize rich content - allows more HTML for complex displays
 * Use for: charts, diagrams, formatted AI output
 */
export function sanitizeRichContent(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return String(DOMPurify.sanitize(html, RICH_CONFIG));
}

/**
 * Sanitize URL - validates and sanitizes URLs
 * Use for: links, image sources
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  // Remove whitespace
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:text/html',
    'vbscript:',
    'file:',
  ];
  
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn('[Security] Blocked dangerous URL protocol:', protocol);
      return '';
    }
  }
  
  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'data:image/'];
  const hasProtocol = safeProtocols.some(p => lowerUrl.startsWith(p));
  
  // If no protocol, assume relative URL (safe)
  if (!hasProtocol && !lowerUrl.includes(':')) {
    return trimmed;
  }
  
  // If has safe protocol, return as-is
  if (hasProtocol) {
    return trimmed;
  }
  
  // Unknown protocol - block
  console.warn('[Security] Blocked unknown URL protocol:', trimmed);
  return '';
}

/**
 * Sanitize filename - removes path traversal and dangerous characters
 * Use for: file uploads, exports
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'unnamed';
  
  return filename
    // Remove path traversal
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove dangerous characters for Windows/Unix
    .replace(/[<>:"|?*]/g, '')
    // Trim whitespace and dots
    .trim()
    .replace(/^\.+|\.+$/g, '')
    // Limit length
    .substring(0, 255)
    || 'unnamed';
}

/**
 * Sanitize JSON - validates and parses JSON safely
 * Use for: API responses, stored data
 */
export function sanitizeJson<T>(jsonString: string, fallback: T): T {
  if (!jsonString || typeof jsonString !== 'string') return fallback;
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch (error) {
    console.warn('[Security] Invalid JSON:', error);
    return fallback;
  }
}

/**
 * Sanitize object keys - removes prototype pollution attempts
 * Use for: user-provided objects, API payloads
 */
export function sanitizeObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (dangerous.includes(key)) {
      console.warn('[Security] Blocked dangerous object key:', key);
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObjectKeys(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null
          ? sanitizeObjectKeys(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if string contains potential XSS
 */
export function containsXss(input: string): boolean {
  if (!input) return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*['"]?\s*data:/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  if (!input) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /(--)|(\/\*)/g,
    /(;|\||&)/g,
    /('|")\s*(OR|AND)\s*('|"|\d)/gi,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  // Most API keys are 20+ characters, alphanumeric with some special chars
  return key.length >= 20 && /^[a-zA-Z0-9_\-]+$/.test(key);
}

export default {
  sanitizeInput,
  sanitizeForDisplay,
  sanitizeRichContent,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeJson,
  sanitizeObjectKeys,
  containsXss,
  containsSqlInjection,
  isValidEmail,
  isValidApiKeyFormat,
};
