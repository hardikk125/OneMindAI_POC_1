/**
 * Security Module
 * 
 * Centralized security utilities for OneMindAI.
 */

// Input Sanitization
export {
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
} from './sanitize';

// Secret Filtering
export {
  filterSecrets,
  filterSecretsFromObject,
  createSafeError,
  maskSecret,
  containsSecrets,
  detectSecretTypes,
  safeConsole,
  getSafeEnvInfo,
} from './secret-filter';

// CSP & Security Headers
export {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  buildCspHeader,
  getCurrentCsp,
  getCspMetaContent,
  getSecurityHeaders,
  getViteSecurityHeaders,
  injectCspMetaTag,
  removeCspMetaTag,
} from './csp-config';
