import { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronDown, ChevronUp, Copy, Settings, Info, Zap } from 'lucide-react';
import { analyzeError, analyzeDeepSeekError, analyzeGeminiError, analyzeClaudeError, analyzePerplexityError, analyzeKimiError, analyzeMistralError, ErrorAnalysis } from '../lib/error-recovery-engine';
import { superDebugBus } from '../lib/super-debug-bus';

export function ErrorRecoveryPanel({ 
  error, 
  onDismiss, 
  onRetry 
}: { 
  error: any; 
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
  const [expanded, setExpanded] = useState(true); // Always expanded by default
  const [showRaw, setShowRaw] = useState(false); // Default closed
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Helper function to infer status code from error message
  const inferStatusCodeFromMessage = (msg: string): number | undefined => {
    const lowerMsg = msg.toLowerCase();
    
    // PRIORITY 1: Check for explicit status codes in message (e.g., "[403 ]", "403:", "(403)")
    // This catches formats like "[403 ]" from Google API errors
    const statusMatch = msg.match(/\[(\d{3})\s*\]|\((\d{3})\)|:\s*(\d{3})\b|\b(\d{3})\s+/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1] || statusMatch[2] || statusMatch[3] || statusMatch[4]);
      if (code >= 400 && code <= 599) {
        console.log('[ErrorRecoveryPanel] Found explicit status code in message:', code);
        return code;
      }
    }
    
    // PRIORITY 2: Check for "Permission denied (403)" pattern specifically
    const permissionMatch = msg.match(/permission\s+denied\s*\((\d{3})\)/i);
    if (permissionMatch) {
      const code = parseInt(permissionMatch[1]);
      console.log('[ErrorRecoveryPanel] Found permission denied status code:', code);
      return code;
    }
    
    // PRIORITY 3: Infer from common error patterns (fallback only)
    // Check 403 patterns BEFORE 401 patterns since "api key leaked" is 403, not 401
    if (lowerMsg.includes('forbidden') || lowerMsg.includes('permission denied') || 
        lowerMsg.includes('leaked') || lowerMsg.includes('🚫')) {
      return 403;
    }
    if (lowerMsg.includes('invalid api key') || lowerMsg.includes('unauthorized') || 
        lowerMsg.includes('authentication failed') || lowerMsg.includes('🔑')) {
      return 401;
    }
    if (lowerMsg.includes('not found') || lowerMsg.includes('❓')) {
      return 404;
    }
    if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many') || lowerMsg.includes('⏱️')) {
      return 429;
    }
    if (lowerMsg.includes('bad request') || lowerMsg.includes('invalid request')) {
      return 400;
    }
    if (lowerMsg.includes('server error') || lowerMsg.includes('internal error') || lowerMsg.includes('⚠️')) {
      return 500;
    }
    if (lowerMsg.includes('overloaded') || lowerMsg.includes('⏳')) {
      return 503;
    }
    if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
      return 504;
    }
    return undefined;
  };

  // Extract raw error information directly from the error object
  // Only use numeric status codes, not string error codes like "PERMISSION_DENIED"
  const getNumericStatusCode = (val: any): number | undefined => {
    if (typeof val === 'number' && val >= 100 && val <= 599) return val;
    if (typeof val === 'string') {
      const num = parseInt(val);
      if (!isNaN(num) && num >= 100 && num <= 599) return num;
    }
    return undefined;
  };
  
  const extractedStatusCode = 
    getNumericStatusCode(error?.statusCode) || 
    getNumericStatusCode(error?.status) || 
    getNumericStatusCode(error?.error?.status) ||
    getNumericStatusCode(error?.error?.statusCode) ||
    getNumericStatusCode(error?.originalError?.statusCode) || 
    getNumericStatusCode(error?.originalError?.status) ||
    getNumericStatusCode(error?.response?.status);
  
  // Get the message for inference - check all possible message locations
  const messageForInference = 
    error?.cleanedMessage || 
    error?.message || 
    error?.rawMessage || 
    error?.error?.message ||
    error?.originalError?.message ||
    '';
  
  // Final status code: use extracted or infer from message
  const finalStatusCode = extractedStatusCode || inferStatusCodeFromMessage(messageForInference);
  
  // Debug log to help troubleshoot
  console.log('[ErrorRecoveryPanel] Status code extraction:', {
    extractedStatusCode,
    inferredFromMessage: inferStatusCodeFromMessage(messageForInference),
    finalStatusCode,
    errorKeys: Object.keys(error || {}),
    rawError: error
  });
  
  const rawErrorData = {
    message: error?.message || error?.originalError?.message || 'No error message available', // This is now the REAL raw error
    cleanedMessage: error?.cleanedMessage || error?.message || 'No cleaned message available', // Cleaned version for explanations
    rawMessage: error?.rawMessage || error?.originalError?.message || error?.message || 'No raw error message available', // Real API error
    rawJson: error?.rawJson || JSON.stringify(error?.originalError || error, null, 2), // Full error JSON
    statusCode: finalStatusCode as number | undefined, // Always number or undefined, never 'N/A' for comparisons
    statusCodeDisplay: finalStatusCode || 'N/A', // For display purposes
    provider: error?.provider || 'Unknown Provider',
    engine: error?.engine || 'Unknown Engine',
    originalError: error?.originalError || error,
  };
  
  // Generate human-readable error title based on status code
  const getErrorTitle = () => {
    const code = rawErrorData.statusCode;
    if (code === 400) return 'BAD REQUEST';
    if (code === 401) return 'UNAUTHORIZED - Invalid API Key';
    if (code === 403) return 'FORBIDDEN - Access Denied';
    if (code === 404) return 'NOT FOUND - Model/Endpoint Missing';
    if (code === 429) return 'RATE LIMITED - Too Many Requests';
    if (code === 500) return 'SERVER ERROR - Internal Error';
    if (code === 502) return 'BAD GATEWAY - Service Unavailable';
    if (code === 503) return 'SERVICE UNAVAILABLE';
    if (rawErrorData.message.toLowerCase().includes('timeout')) return 'REQUEST TIMEOUT';
    if (rawErrorData.message.toLowerCase().includes('network')) return 'NETWORK ERROR';
    if (rawErrorData.message.toLowerCase().includes('cors')) return 'CORS ERROR';
    return `ERROR ${code ? code : ''} - ${rawErrorData.provider.toUpperCase()}`;
  };
  
  // Get business-friendly error explanation from superDebugBus
  const getBusinessExplanation = () => {
    // Try to get error explanation from the error object first (if it was generated by superDebugBus)
    if (error?.errorExplanation) {
      return {
        what: error.errorExplanation.business,
        why: error.errorExplanation.technical,
        impact: error.errorExplanation.actionRequired.join(' '),
        isAutoRetryable: error.errorExplanation.isAutoRetryable,
        actions: error.errorExplanation.actionRequired
      };
    }
    
    // Otherwise, generate it dynamically
    const events = superDebugBus.getEvents();
    const latestError = events.filter(e => e.type === 'ERROR_CAUGHT').slice(-1)[0];
    
    if (latestError?.data?.errorExplanation) {
      return {
        what: latestError.data.errorExplanation.business,
        why: latestError.data.errorExplanation.technical,
        impact: latestError.data.errorExplanation.actionRequired.join(' '),
        isAutoRetryable: latestError.data.errorExplanation.isAutoRetryable,
        actions: latestError.data.errorExplanation.actionRequired
      };
    }
    
    // Fallback to legacy explanation
    return getLegacyExplanation();
  };
  
  // Helper to format explanation with all required fields
  const formatExplanation = (what: string, why: string, impact: string, customRetryable?: boolean): { what: string; why: string; impact: string; isAutoRetryable: boolean; actions: string[] } => {
    const code = rawErrorData.statusCode;
    const msg = rawErrorData.cleanedMessage.toLowerCase();
    
    // Determine if error is auto-retryable
    const isAutoRetryable = customRetryable !== undefined ? customRetryable : (
      [429, 500, 502, 503, 529].includes(code as number) || 
      msg.includes('rate limit') || msg.includes('overloaded') || 
      msg.includes('server error') || msg.includes('timeout')
    );
    
    // Generate action steps from impact text
    const actions = impact.split('.').filter(s => s.trim().length > 0).map(s => s.trim());
    
    return { what, why, impact, isAutoRetryable, actions };
  };
  
  // Legacy explanation generator (kept for backward compatibility)
  const getLegacyExplanation = (): Partial<{ what: string; why: string; impact: string; isAutoRetryable: boolean; actions: string[] }> => {
    const code = rawErrorData.statusCode;
    const msg = rawErrorData.cleanedMessage.toLowerCase(); // Use cleaned message for pattern matching
    const provider = rawErrorData.provider.toLowerCase();
    
    // ===== ANTHROPIC/CLAUDE SPECIFIC =====
    if (provider === 'anthropic') {
      if (code === 401 || msg.includes('authentication') || msg.includes('api key') || msg.includes('unauthorized') || msg.includes('invalid or expired')) {
        return formatExplanation(
          `Claude API authentication failed - your API key is invalid or expired.`,
          `HTTP Status Code: 401 (authentication_error) - The API key you entered is incorrect, has been revoked, or may have expired. API keys should start with "sk-ant-".`,
          'Go to https://console.anthropic.com/settings/keys to get a valid API key, then update it in Settings.',
          false
        );
      }
      if (code === 403 || msg.includes('permission') || msg.includes('forbidden')) {
        return {
          what: `Claude API key lacks required permissions.`,
          why: `HTTP Status Code: 403 (permission_error) - Your API key doesn't have permission for this model or feature. Some features require specific access levels.`,
          impact: 'Contact Anthropic support or check your console at https://console.anthropic.com to verify permissions.'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model')) {
        return {
          what: `Claude model or resource not found.`,
          why: `HTTP Status Code: 404 (not_found_error) - The model name may be incorrect. Valid models include claude-3-5-sonnet-20241022, claude-3-haiku-20240307, etc.`,
          impact: 'Check available models at https://docs.anthropic.com/en/docs/about-claude/models'
        };
      }
      if (code === 400 || msg.includes('invalid') || msg.includes('bad request')) {
        return {
          what: `Invalid request to Claude API.`,
          why: `HTTP Status Code: 400 (invalid_request_error) - Request body failed validation. Check your parameters for invalid format or missing required fields.`,
          impact: 'Review your request format against https://docs.anthropic.com/en/api/messages'
        };
      }
      if (code === 413 || msg.includes('too large') || msg.includes('exceeds maximum')) {
        return {
          what: `Request to Claude is too large.`,
          why: `HTTP Status Code: 413 (request_too_large) - The request exceeds the 32 MB limit (256 MB for Batch API). Your prompt or attached files may be too large.`,
          impact: 'Reduce your input size, split into smaller requests, or use streaming for large responses.'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
        return formatExplanation(
          `Claude rate limit exceeded - too many requests.`,
          `HTTP Status Code: 429 (rate_limit_error) - You're sending requests too quickly. Rate limits depend on your subscription tier.`,
          'System will retry automatically. Ramp up traffic gradually to avoid acceleration limits.',
          true
        );
      }
      if (code === 500 || msg.includes('server error') || msg.includes('internal error')) {
        return {
          what: `Claude API experienced an internal error.`,
          why: `HTTP Status Code: 500 (api_error) - Unexpected error on Anthropic's servers. This is usually temporary.`,
          impact: 'System will retry automatically. Usually resolves within minutes.'
        };
      }
      if (code === 529 || msg.includes('overloaded') || msg.includes('high traffic')) {
        return {
          what: `Claude API is temporarily overloaded.`,
          why: `HTTP Status Code: 529 (overloaded_error) - High traffic across all users or a sharp increase in your usage has triggered capacity limits.`,
          impact: 'System will retry automatically. Consider using Message Batches API for non-urgent requests.'
        };
      }
      if (msg.includes('connection') || msg.includes('network') || msg.includes('timeout')) {
        return {
          what: `Network connection issue with Claude API.`,
          why: `HTTP Status Code: N/A (network_error) - Unable to reach Anthropic servers due to network issues, firewall, or timeout.`,
          impact: 'Check your internet connection. System will retry automatically.'
        };
      }
    }
    
    // ===== OPENAI SPECIFIC =====
    if (provider === 'openai') {
      // PRIORITY: Check authentication FIRST (even if message contains "connection")
      // OpenAI SDK may wrap auth errors with connection-related messages
      if (code === 401 || 
          msg.includes('401') ||
          msg.includes('unauthorized') || 
          msg.includes('invalid_api_key') || 
          msg.includes('invalid api key') ||
          msg.includes('incorrect api key') ||
          msg.includes('authentication failed') ||
          (msg.includes('api key') && !msg.includes('missing')) ||
          (msg.includes('authentication') && !msg.includes('timeout'))) {
        return {
          what: `OpenAI API authentication failed - your API key is invalid or expired.`,
          why: `HTTP Status Code: 401 (invalid_api_key) - The API key you entered is incorrect, has been revoked, or may have expired. API keys should start with "sk-".`,
          impact: 'Go to https://platform.openai.com/api-keys to get a valid API key, then update it in Settings.'
        };
      }
      if (code === 403 || msg.includes('permission') || msg.includes('forbidden') || msg.includes('not have permission')) {
        return {
          what: `OpenAI API key lacks required permissions.`,
          why: `HTTP Status Code: 403 (permission_denied) - Your API key doesn't have permission for this model or feature. Some models require specific access levels.`,
          impact: 'Check your API key permissions at https://platform.openai.com/api-keys or contact OpenAI support.'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model') || msg.includes('does not exist')) {
        return {
          what: `OpenAI model or resource not found.`,
          why: `HTTP Status Code: 404 (model_not_found) - The model name may be incorrect or deprecated. Valid models include gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.`,
          impact: 'Check available models at https://platform.openai.com/docs/models'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('quota')) {
        return {
          what: `OpenAI rate limit or quota exceeded.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - You're sending requests too quickly or have exceeded your usage quota for this billing period.`,
          impact: 'System will retry automatically. Check your usage at https://platform.openai.com/usage'
        };
      }
      if (msg.includes('insufficient_quota') || msg.includes('billing') || msg.includes('exceeded your current quota')) {
        return {
          what: `OpenAI billing quota exceeded - no credits remaining.`,
          why: `HTTP Status Code: 429 (insufficient_quota) - Your account has run out of API credits or reached its spending limit.`,
          impact: 'Add credits at https://platform.openai.com/account/billing or increase your spending limit.'
        };
      }
      if (code === 500 || msg.includes('server error') || msg.includes('internal error')) {
        return {
          what: `OpenAI server experienced an internal error.`,
          why: `HTTP Status Code: 500 (server_error) - Unexpected error on OpenAI's servers. This is usually temporary.`,
          impact: 'System will retry automatically. Usually resolves within minutes.'
        };
      }
      if (code === 502 || code === 503 || msg.includes('overloaded') || msg.includes('bad gateway') || msg.includes('service unavailable')) {
        return {
          what: `OpenAI servers are overloaded or temporarily unavailable.`,
          why: `HTTP Status Code: ${code || '502/503'} (service_unavailable) - High traffic or maintenance is affecting OpenAI's servers.`,
          impact: 'System will retry automatically. Check status at https://status.openai.com'
        };
      }
      if (msg.includes('context_length') || msg.includes('token') || msg.includes('maximum context length')) {
        return {
          what: `Request exceeds OpenAI's token limit.`,
          why: `HTTP Status Code: 400 (context_length_exceeded) - Your prompt plus expected response exceeds the model's context window (e.g., 8K, 32K, 128K tokens).`,
          impact: 'Reduce your prompt length or use a model with larger context window.'
        };
      }
      if (msg.includes('content_policy') || msg.includes('safety') || msg.includes('flagged')) {
        return {
          what: `Content was flagged by OpenAI's safety system.`,
          why: `HTTP Status Code: 400 (content_policy_violation) - Your request contains content that violates OpenAI's usage policies.`,
          impact: 'Modify your prompt to comply with OpenAI\'s content policy guidelines.'
        };
      }
      if (msg.includes('connection') || msg.includes('network') || msg.includes('timeout')) {
        return {
          what: `Network connection issue with OpenAI API.`,
          why: `HTTP Status Code: N/A (network_error) - Unable to reach OpenAI servers due to network issues, firewall, or timeout.`,
          impact: 'Check your internet connection. System will retry automatically.'
        };
      }
    }
    
    // ===== PERPLEXITY SPECIFIC =====
    if (provider === 'perplexity') {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('api key') || msg.includes('authentication')) {
        return {
          what: `Perplexity API authentication failed - your API key is invalid or expired.`,
          why: `HTTP Status Code: 401 (unauthorized) - The PERPLEXITY_API_KEY is incorrect, revoked, or has extra spaces/characters. Get your key from the Perplexity dashboard.`,
          impact: 'Cannot access Perplexity API. Go to Settings → Perplexity API Key and enter a valid key.'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many')) {
        return {
          what: `Perplexity rate limit exceeded - sending requests too quickly.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - You have exceeded the allowed requests per minute. Perplexity has strict rate limits especially on free tier.`,
          impact: 'System will retry automatically with exponential backoff. Consider upgrading plan for higher limits.'
        };
      }
      if (code === 403 || msg.includes('permission') || msg.includes('forbidden')) {
        return {
          what: `Perplexity permission denied - API key lacks required permissions.`,
          why: `HTTP Status Code: 403 (forbidden) - Your API key may not have access to this feature, or you need to upgrade your plan.`,
          impact: 'Contact Perplexity support to request feature access or upgrade your subscription.'
        };
      }
      if (code === 404 || msg.includes('not found')) {
        return {
          what: `Perplexity resource not found - model or endpoint doesn't exist.`,
          why: `HTTP Status Code: 404 (not_found) - The model name may be incorrect. Valid models include: llama-3.1-sonar-small-128k-online, llama-3.1-sonar-large-128k-online.`,
          impact: 'Check model names at https://docs.perplexity.ai/guides/model-cards'
        };
      }
      if (code === 400 || msg.includes('validation') || msg.includes('invalid')) {
        return {
          what: `Perplexity validation error - request parameters are incorrect.`,
          why: `HTTP Status Code: 400 (invalid_request) - The request body has missing or invalid fields. Check API docs: https://docs.perplexity.ai`,
          impact: 'Review request format and ensure all required parameters are present and valid.'
        };
      }
      if (code >= 500 || msg.includes('server error') || msg.includes('internal')) {
        return {
          what: `Perplexity server error - internal issue on Perplexity's side.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - The Perplexity API is experiencing issues or undergoing maintenance.`,
          impact: 'System will retry automatically. Usually resolves within minutes. Check status page if persists.'
        };
      }
    }
    
    // ===== GEMINI SPECIFIC =====
    if (provider === 'gemini') {
      if (code === 401 || msg.includes('api key') || msg.includes('invalid')) {
        return {
          what: `Gemini API key is invalid.`,
          why: `HTTP Status Code: 401 (UNAUTHENTICATED) - Your GEMINI_API_KEY is incorrect or expired. Get your key from Google AI Studio.`,
          impact: 'Go to https://aistudio.google.com/app/apikey to create/verify your API key.'
        };
      }
      if (code === 403 || msg.includes('permission') || msg.includes('forbidden')) {
        return {
          what: `Gemini API key lacks permissions.`,
          why: `HTTP Status Code: 403 (PERMISSION_DENIED) - Your API key doesn't have required permissions. Some features require billing enabled.`,
          impact: 'Check your API key permissions at https://aistudio.google.com/app/apikey'
        };
      }
      if (msg.includes('failed_precondition') || msg.includes('billing') || msg.includes('free tier')) {
        return {
          what: `Gemini free tier not available or billing not enabled.`,
          why: `HTTP Status Code: 400 (FAILED_PRECONDITION) - Free tier is not supported in your region, or billing needs to be enabled on your Google Cloud project.`,
          impact: 'Go to Google AI Studio to enable billing: https://aistudio.google.com/app/apikey'
        };
      }
      if (code === 429 || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('quota')) {
        return {
          what: `Gemini rate limit exceeded - too many requests per minute.`,
          why: `HTTP Status Code: 429 (RESOURCE_EXHAUSTED) - You have exceeded the allowed requests per minute (RPM) or tokens per minute (TPM).`,
          impact: 'System will retry automatically. Check limits at https://ai.google.dev/gemini-api/docs/rate-limits'
        };
      }
      if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harm')) {
        return {
          what: `Gemini blocked the request due to safety filters.`,
          why: `HTTP Status Code: 400 (SAFETY_BLOCKED) - The content violates Google's safety guidelines or terms of service.`,
          impact: 'Modify your prompt to comply with safety policies. Review terms at https://ai.google.dev/terms'
        };
      }
      if (msg.includes('deadline') || msg.includes('timeout')) {
        return {
          what: `Gemini request timed out - processing took too long.`,
          why: `HTTP Status Code: 504 (DEADLINE_EXCEEDED) - The prompt/context is too large, or the server is under heavy load.`,
          impact: 'Reduce input size or use streaming. System will retry with longer timeout.'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('invalid model')) {
        return {
          what: `Gemini model or resource not found.`,
          why: `HTTP Status Code: 404 (NOT_FOUND) - The model name is incorrect or the resource doesn't exist. Check supported models.`,
          impact: 'Verify model name at https://ai.google.dev/gemini-api/docs/models/gemini'
        };
      }
      if (code >= 500 || msg.includes('internal') || msg.includes('unavailable')) {
        return {
          what: `Gemini server error - Google's servers are experiencing issues.`,
          why: `HTTP Status Code: ${code || 500} (INTERNAL/UNAVAILABLE) - Internal server issue or service temporarily unavailable due to high traffic.`,
          impact: 'System will retry automatically. Try Gemini 1.5 Flash (lighter model) if persists.'
        };
      }
    }
    
    // ===== KIMI (MOONSHOT) SPECIFIC =====
    if (provider === 'kimi' || provider === 'moonshot') {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('api key') || msg.includes('authentication')) {
        return {
          what: `Kimi API authentication failed - API key is invalid or revoked.`,
          why: `HTTP Status Code: 401 (auth.token_invalid) - The API key is incorrect, has extra spaces/characters, or was revoked. Get your key from Moonshot Console.`,
          impact: 'Go to https://platform.moonshot.ai/console to verify or regenerate your API key.'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many')) {
        return {
          what: `Kimi rate limit exceeded - free tier has strict limits.`,
          why: `HTTP Status Code: 429 (rate_limit_reached_error) - Free tier limits: ~1 concurrent request, 3 requests/minute. You have exceeded these limits.`,
          impact: 'System will retry automatically. Consider upgrading to paid plan for higher limits.'
        };
      }
      if (msg.includes('model_not_found') || msg.includes('base_url') || msg.includes('invalid model')) {
        return {
          what: `Kimi model not found - SDK configuration issue.`,
          why: `HTTP Status Code: 404 (invalid_model) - Using OpenAI SDK without setting base_url to Moonshot API. Must set base_url="https://api.moonshot.ai/v1"`,
          impact: 'Contact developer to fix SDK configuration. Valid models: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k'
        };
      }
      if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('credits') || msg.includes('payment')) {
        return {
          what: `Kimi account has no balance - credits depleted.`,
          why: `HTTP Status Code: 402 (insufficient_balance) - Your account has run out of credits or there's a payment issue.`,
          impact: 'Go to https://platform.moonshot.ai/console → Billing to add credits.'
        };
      }
      if (code === 400 || msg.includes('bad request') || msg.includes('malformed') || msg.includes('invalid json')) {
        return {
          what: `Kimi request format is invalid.`,
          why: `HTTP Status Code: 400 (invalid_request_error) - The request has malformed JSON, invalid parameters, or wrong model format.`,
          impact: 'Check API docs at https://platform.moonshot.ai/docs and verify request format.'
        };
      }
      if (msg.includes('connection') || msg.includes('timeout') || msg.includes('network')) {
        return {
          what: `Cannot reach Kimi API - network connection issue.`,
          why: `HTTP Status Code: N/A (network_error) - Network issues, proxy configuration, firewall blocking, or request timeout.`,
          impact: 'Check internet connection. System will retry automatically.'
        };
      }
      if (code >= 500 || msg.includes('server error') || msg.includes('internal')) {
        return {
          what: `Kimi server error - Moonshot servers experiencing issues.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - Internal server issue or service temporarily unavailable.`,
          impact: 'System will retry automatically. Usually resolves within minutes.'
        };
      }
    }
    
    // ===== MISTRAL SPECIFIC =====
    if (provider === 'mistral' || msg.includes('mistral')) {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('api key') || msg.includes('authentication')) {
        return {
          what: `Mistral API authentication failed - API key is invalid or missing.`,
          why: `HTTP Status Code: 401 (Unauthorized) - Your MISTRAL_API_KEY is incorrect, not properly configured, or associated with wrong endpoint. Mistral has two endpoints: Main API (api.mistral.ai) and Codestral (codestral.mistral.ai).`,
          impact: 'Go to https://console.mistral.ai/api-keys to get/verify your API key. Make sure to use the correct endpoint for your model.'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many') || msg.includes('service tier capacity')) {
        return {
          what: `Mistral rate limit exceeded - free tier has very restrictive limits.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - Free tier limits are very restrictive. "Service tier capacity exceeded" means the shared pool is full.`,
          impact: 'System will retry automatically. Upgrade tier at https://console.mistral.ai for production use.'
        };
      }
      if (code === 400 || msg.includes('bad request') || msg.includes('malformed')) {
        return {
          what: `Mistral request format is invalid.`,
          why: `HTTP Status Code: 400 (invalid_request) - Invalid parameters, malformed JSON, or incorrect role field (Mistral uses "user", "assistant", "tool" - not "system").`,
          impact: 'Check API docs at https://docs.mistral.ai/api and verify request format.'
        };
      }
      if (code === 422 || msg.includes('validation') || msg.includes('httpvalidationerror')) {
        return {
          what: `Mistral validation error - unsupported parameters sent.`,
          why: `HTTP Status Code: 422 (HTTPValidationError) - Request contains parameters not supported by Mistral API (e.g., unsupported usage settings).`,
          impact: 'Remove unsupported parameters from request. Check Mistral API docs for supported parameters.'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model')) {
        return {
          what: `Mistral resource not found - model or endpoint doesn't exist.`,
          why: `HTTP Status Code: 404 (not_found) - The model name is incorrect or endpoint URL is wrong. Codestral models require codestral.mistral.ai endpoint.`,
          impact: 'Verify model name at https://docs.mistral.ai/getting-started/models/models_overview/'
        };
      }
      if (msg.includes('connection') || msg.includes('network') || msg.includes('connect error')) {
        return {
          what: `Cannot connect to Mistral API - network connection issue.`,
          why: `HTTP Status Code: N/A (network_error) - Network issues, firewall blocking, or server unreachable.`,
          impact: 'Check internet connection. System will retry automatically.'
        };
      }
      if (msg.includes('timeout') || msg.includes('timed out')) {
        return {
          what: `Mistral request timed out.`,
          why: `HTTP Status Code: 408/504 (timeout) - Server taking too long to respond or network latency issues.`,
          impact: 'System will retry automatically. Consider reducing request size if persists.'
        };
      }
      if (code >= 500 || msg.includes('server error') || msg.includes('internal') || msg.includes('unavailable')) {
        return {
          what: `Mistral server error - internal issue on Mistral's side.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - Internal server issue or service temporarily unavailable.`,
          impact: 'System will retry automatically. Usually resolves within minutes.'
        };
      }
      // Mistral fallback - show the detail from JSON if present
      const detailMatch = msg.match(/"detail"\s*:\s*"([^"]+)"/);
      if (detailMatch) {
        return {
          what: `Mistral API error: ${detailMatch[1]}`,
          why: `HTTP Status Code: ${code || 'Unknown'} - The Mistral API returned an error with detail: "${detailMatch[1]}"`,
          impact: 'Check your API configuration and try again. See https://docs.mistral.ai/api for troubleshooting.'
        };
      }
    }
    
    // ===== GROQ SPECIFIC =====
    if (provider === 'groq') {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('invalid api key')) {
        return {
          what: `Groq API authentication failed - your API key is invalid or expired.`,
          why: `HTTP Status Code: 401 (invalid_api_key) - The GROQ_API_KEY is incorrect, revoked, or has extra spaces/characters. API keys should start with "gsk_".`,
          impact: 'Go to https://console.groq.com/keys to create a new API key and update it in Settings.'
        };
      }
      if (code === 400 || msg.includes('bad request') || msg.includes('invalid')) {
        return {
          what: `Groq rejected the request - invalid parameters or format.`,
          why: `HTTP Status Code: 400 (invalid_request_error) - Request syntax is incorrect or contains unsupported parameters. Check the Groq API documentation.`,
          impact: 'Review your request format at https://console.groq.com/docs'
        };
      }
      if (code === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
        return {
          what: `Groq rate limit exceeded - sending requests too quickly.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - You have exceeded the allowed requests per minute. Groq has generous limits but they can be reached with rapid requests.`,
          impact: 'System will retry automatically. Check usage at https://console.groq.com/usage'
        };
      }
      if (code === 498 || msg.includes('flex tier') || msg.includes('capacity')) {
        return {
          what: `Groq Flex Tier at capacity - too many concurrent requests.`,
          why: `HTTP Status Code: 498 (flex_tier_capacity) - The Flex Tier (free tier) has reached its capacity limit. This is temporary and specific to Groq.`,
          impact: 'Wait a few seconds and retry. Consider upgrading to paid tier for guaranteed capacity.'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model')) {
        return {
          what: `Groq model not found - invalid model name.`,
          why: `HTTP Status Code: 404 (model_not_found) - The model name is incorrect. Valid models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it.`,
          impact: 'Check available models at https://console.groq.com/docs/models'
        };
      }
      if (code >= 500 || msg.includes('server error') || msg.includes('internal')) {
        return {
          what: `Groq server error - internal issue on Groq's side.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - Groq's infrastructure is experiencing issues. This is rare but can happen during high load.`,
          impact: 'System will retry automatically. Check status at https://status.groq.com'
        };
      }
    }
    
    // ===== FALCON LLM SPECIFIC (via HuggingFace) =====
    if (provider === 'falcon') {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('invalid api key')) {
        return {
          what: `HuggingFace API authentication failed - invalid token.`,
          why: `HTTP Status Code: 401 (unauthorized) - Your HuggingFace API token is incorrect, revoked, or missing. Tokens start with "hf_".`,
          impact: 'Go to https://huggingface.co/settings/tokens to create a new token and update it in Settings.'
        };
      }
      if (code === 403 || msg.includes('forbidden') || msg.includes('license')) {
        return {
          what: `Access denied to Falcon model - license agreement required.`,
          why: `HTTP Status Code: 403 (forbidden) - You need to accept the model's license agreement on HuggingFace before using it via API.`,
          impact: 'Visit https://huggingface.co/tiiuae/falcon-180B-chat and click "Agree and access repository".'
        };
      }
      if (code === 503 || msg.includes('loading') || msg.includes('unavailable')) {
        return {
          what: `Falcon model is loading - not ready yet.`,
          why: `HTTP Status Code: 503 (model_loading) - HuggingFace models "sleep" when not used. The model is currently waking up and loading into memory.`,
          impact: 'Wait 20-60 seconds and retry. First request after sleep always takes longer.'
        };
      }
      if (code === 429 || msg.includes('rate limit')) {
        return {
          what: `HuggingFace rate limit exceeded.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - Free tier has strict rate limits. You may be sending requests too quickly.`,
          impact: 'Wait before retrying or upgrade to HuggingFace Pro at https://huggingface.co/pricing'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model')) {
        return {
          what: `Falcon model not found on HuggingFace.`,
          why: `HTTP Status Code: 404 (model_not_found) - The model name is incorrect. Valid models: falcon-180b-chat, falcon-40b-instruct, falcon-7b-instruct.`,
          impact: 'Check available Falcon models at https://huggingface.co/tiiuae'
        };
      }
      if (msg.includes('timeout') || msg.includes('timed out')) {
        return {
          what: `Falcon request timed out - model took too long to respond.`,
          why: `HTTP Status Code: 504 (gateway_timeout) - Large models like Falcon-180B can be slow, especially on free tier. The model may be under heavy load.`,
          impact: 'Try a smaller model (falcon-7b-instruct) or retry during off-peak hours.'
        };
      }
      if (code >= 500 || msg.includes('server error')) {
        return {
          what: `HuggingFace server error - infrastructure issue.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - HuggingFace Inference API is experiencing issues or the model crashed.`,
          impact: 'System will retry automatically. Try a different Falcon variant if persists.'
        };
      }
    }
    
    // ===== SARVAM AI SPECIFIC =====
    if (provider === 'sarvam') {
      if (code === 401 || msg.includes('unauthorized') || msg.includes('invalid api key')) {
        return {
          what: `Sarvam AI authentication failed - invalid API key.`,
          why: `HTTP Status Code: 401 (unauthorized) - Your SARVAM_API_KEY is incorrect, revoked, or has extra spaces/characters.`,
          impact: 'Go to https://sarvam.ai/dashboard to get your API key and update it in Settings.'
        };
      }
      if (code === 400 || msg.includes('bad request') || msg.includes('invalid')) {
        return {
          what: `Sarvam AI rejected the request - invalid parameters.`,
          why: `HTTP Status Code: 400 (invalid_request) - Request format is incorrect or contains unsupported parameters for Sarvam models.`,
          impact: 'Review Sarvam API documentation for correct request format.'
        };
      }
      if (code === 429 || msg.includes('rate limit')) {
        return {
          what: `Sarvam AI rate limit exceeded.`,
          why: `HTTP Status Code: 429 (rate_limit_exceeded) - You have exceeded the allowed requests per minute for your plan.`,
          impact: 'Wait before retrying or upgrade your plan at https://sarvam.ai/pricing'
        };
      }
      if (code === 404 || msg.includes('not found') || msg.includes('model')) {
        return {
          what: `Sarvam AI model not found.`,
          why: `HTTP Status Code: 404 (model_not_found) - The model name is incorrect. Valid models: sarvam-2b, sarvam-1.`,
          impact: 'Check available models in Sarvam AI documentation.'
        };
      }
      if (code >= 500 || msg.includes('server error') || msg.includes('unavailable')) {
        return {
          what: `Sarvam AI server error - service temporarily unavailable.`,
          why: `HTTP Status Code: ${code || 500} (server_error) - Sarvam AI infrastructure is experiencing issues or undergoing maintenance.`,
          impact: 'System will retry automatically. Contact Sarvam support if issue persists.'
        };
      }
      if (msg.includes('connection') || msg.includes('network') || msg.includes('timeout')) {
        return {
          what: `Network connection issue with Sarvam AI.`,
          why: `HTTP Status Code: N/A (network_error) - Unable to reach Sarvam AI servers due to network issues or firewall.`,
          impact: 'Check your internet connection. System will retry automatically.'
        };
      }
    }
    
    // ===== GENERIC FALLBACKS =====
    if (code === 401 || msg.includes('unauthorized') || msg.includes('api key')) {
      return {
        what: `The ${rawErrorData.provider} API rejected your request due to an invalid or missing API key.`,
        why: `HTTP Status Code: 401 (unauthorized) - Your API key may be expired, incorrectly entered, or not have the required permissions.`,
        impact: 'You cannot make requests to this engine until the API key is fixed.'
      };
    }
    if (code === 403 || msg.includes('forbidden') || msg.includes('permission')) {
      return {
        what: `The ${rawErrorData.provider} API denied access to this resource.`,
        why: `HTTP Status Code: 403 (forbidden) - Your API key doesn't have permission for this operation or model.`,
        impact: 'Check your API key permissions or upgrade your subscription plan.'
      };
    }
    if (code === 404 || msg.includes('not found')) {
      return {
        what: `The ${rawErrorData.provider} resource or model was not found.`,
        why: `HTTP Status Code: 404 (not_found) - The model name, endpoint, or resource doesn't exist.`,
        impact: 'Check the model name and API endpoint configuration.'
      };
    }
    if (code === 429 || msg.includes('rate limit') || msg.includes('too many')) {
      return {
        what: `You've exceeded the rate limit for ${rawErrorData.provider}.`,
        why: `HTTP Status Code: 429 (rate_limit_exceeded) - Too many requests were sent in a short period of time.`,
        impact: 'Wait a few seconds/minutes before retrying, or upgrade your API plan.'
      };
    }
    if (code === 400 || msg.includes('bad request') || msg.includes('invalid')) {
      return {
        what: `Invalid request sent to ${rawErrorData.provider}.`,
        why: `HTTP Status Code: 400 (bad_request) - The request format is incorrect or contains invalid parameters.`,
        impact: 'Check your request format and parameters against the API documentation.'
      };
    }
    if (code === 500 || code === 502 || code === 503) {
      return {
        what: `The ${rawErrorData.provider} server encountered an internal error.`,
        why: `HTTP Status Code: ${code} (server_error) - The API service may be experiencing issues or undergoing maintenance.`,
        impact: 'Try again in a few moments. If the issue persists, check the provider status page.'
      };
    }
    if (msg.includes('timeout')) {
      return {
        what: `The request to ${rawErrorData.provider} timed out.`,
        why: `HTTP Status Code: 504/408 (timeout) - The server took too long to respond, possibly due to high load or a complex request.`,
        impact: 'Try again with a shorter prompt or wait for server load to decrease.'
      };
    }
    if (msg.includes('connection') || msg.includes('network')) {
      return {
        what: `Network connection issue with ${rawErrorData.provider}.`,
        why: `HTTP Status Code: N/A (network_error) - Unable to reach the API server due to network issues.`,
        impact: 'Check your internet connection and try again.'
      };
    }
    
    // Final fallback - show actual error message with status code
    return formatExplanation(
      rawErrorData.message || `Error from ${rawErrorData.provider}`,
      `HTTP Status Code: ${rawErrorData.statusCode ? rawErrorData.statusCode : 'Unknown'} - An error occurred while communicating with ${rawErrorData.provider}.`,
      'Check the raw error details below for more information and troubleshooting steps.'
    );
  };
  
  useEffect(() => {
    // Debug: Log the error object
    console.log('[ErrorRecoveryPanel] Error object:', error);
    console.log('[ErrorRecoveryPanel] Provider:', error.provider);
    console.log('[ErrorRecoveryPanel] Status Code:', error.statusCode, error.status, error.code);
    console.log('[ErrorRecoveryPanel] Original Error:', error.originalError);
    
    // Use provider-specific error analysis
    if (error.provider === 'gemini') {
      const analysis = analyzeGeminiError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] Gemini analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'deepseek') {
      const analysis = analyzeDeepSeekError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] DeepSeek analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'anthropic') {
      const analysis = analyzeClaudeError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] Claude analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'perplexity') {
      const analysis = analyzePerplexityError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] Perplexity analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'moonshot' || error.provider === 'kimi') {
      const analysis = analyzeKimiError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] Kimi analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'mistral') {
      const analysis = analyzeMistralError(error.originalError || error);
      console.log('[ErrorRecoveryPanel] Mistral analysis:', analysis);
      setAnalysis(analysis);
    } else if (error.provider === 'openai') {
      // OpenAI uses the generic analyzeError which has good OpenAI support
      analyzeError(error.originalError || error).then((analysis) => {
        console.log('[ErrorRecoveryPanel] OpenAI analysis:', analysis);
        setAnalysis(analysis);
      });
    } else {
      analyzeError(error).then((analysis) => {
        console.log('[ErrorRecoveryPanel] Generic analysis:', analysis);
        setAnalysis(analysis);
      });
    }
  }, [error]);
  
  // Get explanation from our fallback or analysis
  const rawExplanation = getBusinessExplanation();
  // Ensure all required fields exist with defaults
  const explanation = {
    what: rawExplanation.what || 'An error occurred',
    why: rawExplanation.why || 'Unknown error',
    impact: rawExplanation.impact || 'Please try again',
    isAutoRetryable: rawExplanation.isAutoRetryable ?? false,
    actions: rawExplanation.actions || []
  };
  const errorTitle = getErrorTitle();
  
  // Helper to check if analysis value is generic/unknown
  const isGenericMessage = (msg: string | undefined) => {
    if (!msg) return true;
    const lower = msg.toLowerCase();
    return lower.includes('unknown error') || 
           lower.includes('error details not recognized') ||
           lower.includes('request failed') ||
           lower === 'request failed' ||
           lower === 'unknown error occurred' ||
           lower.includes('check logs') ||
           lower.includes('contact support') ||
           lower.includes('unexpected error occurred');
  };
  
  // Get the best explanation - prefer specific over generic
  const getDisplayText = (analysisValue: string | undefined, explanationValue: string) => {
    // If analysis is missing or generic, use the explanation (which has provider-specific handling)
    if (isGenericMessage(analysisValue)) {
      return explanationValue;
    }
    return analysisValue;
  };
  
  const severityColors = {
    low: 'border-yellow-400 bg-yellow-50',
    medium: 'border-orange-400 bg-orange-50',
    high: 'border-red-400 bg-red-50',
    critical: 'border-red-600 bg-red-100'
  };
  
  const severityIcons = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨'
  };
  
  // Determine severity based on status code
  const getSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    const code = rawErrorData.statusCode;
    if (code === 401 || code === 403) return 'critical';
    if (code === 429) return 'high';
    if (code === 500 || code === 502 || code === 503) return 'high';
    if (code === 400 || code === 404) return 'medium';
    return 'medium';
  };
  
  const severity = analysis?.severity || getSeverity();
  const isRetryable = analysis?.retryable || [429, 500, 502, 503].includes(rawErrorData.statusCode as number);
  
  const copyToClipboard = () => {
    const errorData = {
      statusCode: rawErrorData.statusCode,
      provider: rawErrorData.provider,
      engine: rawErrorData.engine,
      rawMessage: rawErrorData.rawMessage, // Real error shown on screen
      cleanedMessage: rawErrorData.cleanedMessage, // Processed version
      fullRawJson: rawErrorData.rawJson
    };
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
  };
  
  return (
    <div className="fixed bottom-4 right-4 w-[480px] max-w-[calc(100vw-2rem)] z-50 animate-slide-up">
      <div className="rounded-xl border border-gray-200 shadow-2xl bg-white overflow-hidden">
        {/* Modern Header with Gradient */}
        <div className={`p-4 ${explanation.isAutoRetryable ? 'bg-gradient-to-r from-blue-50 to-cyan-50' : 'bg-gradient-to-r from-orange-50 to-red-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${explanation.isAutoRetryable ? 'bg-blue-100' : 'bg-orange-100'}`}>
                {explanation.isAutoRetryable ? (
                  <div className="text-2xl">🔄</div>
                ) : (
                  <AlertCircle className={`w-6 h-6 ${explanation.isAutoRetryable ? 'text-blue-600' : 'text-orange-600'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base">
                    {explanation.isAutoRetryable ? 'Auto-Retry in Progress' : 'Action Required'}
                  </h3>
                  {rawErrorData.statusCode && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${explanation.isAutoRetryable ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'}`}>
                      {rawErrorData.statusCode}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  {rawErrorData.engine}
                </p>
              </div>
            </div>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Business-Friendly Explanation */}
        <div className="p-4 space-y-4">
          {/* What's Happening - Always Visible */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm flex-1">
                <p className="text-blue-900 font-semibold mb-1">What's happening:</p>
                <p className="text-blue-800 leading-relaxed">{explanation.what}</p>
              </div>
            </div>
          </div>
          
          {expanded && (
            <>
              {/* Technical Details */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <span className="text-base">🔍</span>
                  <div className="text-sm flex-1">
                    <p className="text-gray-900 font-semibold mb-1">Technical details:</p>
                    <p className="text-gray-700 leading-relaxed font-mono text-xs">{explanation.why}</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors w-full justify-center py-1"
          >
            {expanded ? (
              <>Show less <ChevronUp size={16} /></>
            ) : (
              <>Show technical details <ChevronDown size={16} /></>
            )}
          </button>
        </div>
        
        {/* Retry Button (for auto-fixable errors that failed all retries) */}
        {isRetryable && onRetry && (
          <div className="p-4 bg-blue-50 border-t border-blue-100">
            <p className="text-sm font-semibold text-gray-900 mb-2">🔄 Auto-retry exhausted</p>
            <p className="text-xs text-gray-600 mb-3">
              All automatic retry attempts failed. You can manually retry the request.
            </p>
            <button
              onClick={async () => {
                setIsRetrying(true);
                try {
                  await onRetry();
                  onDismiss?.();
                } catch (err) {
                  // Error will be handled by parent component
                } finally {
                  setIsRetrying(false);
                }
              }}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Request
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Action Required - Modern Clean Design */}
        {!explanation.isAutoRetryable && explanation.actions && explanation.actions.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-t border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-orange-600" />
              <p className="text-sm font-bold text-gray-900">What you need to do:</p>
            </div>
            <div className="space-y-2">
              {explanation.actions.map((action: string, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-2 border border-orange-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800 leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Legacy Action Required (fallback for old analysis) */}
        {!isRetryable && (!explanation.actions || explanation.actions.length === 0) && (
          <div className="p-4 bg-white bg-opacity-60 border-t border-gray-300">
            <p className="text-sm font-semibold text-gray-900 mb-2">🔧 Action Required:</p>
            <div className="space-y-2">
              {/* Use analysis steps if available and not generic, otherwise use provider-specific defaults */}
              {analysis?.cellarMessage && !isGenericMessage(analysis.cellarMessage.technical?.[0]) ? (
                analysis.cellarMessage.technical.slice(0, 2).map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-600 font-bold">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))
              ) : (
                // Fallback: Provider-specific action steps based on status code
                <>
                  {rawErrorData.statusCode === 401 && (
                    <>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Go to Settings and verify your API key is correct</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Get a new API key from the {rawErrorData.provider} dashboard if needed</span>
                      </div>
                    </>
                  )}
                  {rawErrorData.statusCode === 403 && (
                    <>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Check your API key permissions in the {rawErrorData.provider} console</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Contact {rawErrorData.provider} support if permissions are correct</span>
                      </div>
                    </>
                  )}
                  {rawErrorData.statusCode === 404 && (
                    <>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Verify the model name is correct in Settings</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Check {rawErrorData.provider} documentation for available models</span>
                      </div>
                    </>
                  )}
                  {rawErrorData.statusCode === 400 && (
                    <>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Check the error details below for invalid parameters</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Review {rawErrorData.provider} API documentation for correct format</span>
                      </div>
                    </>
                  )}
                  {![401, 403, 404, 400].includes(rawErrorData.statusCode as number) && (
                    <>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Review the error details below for more information</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Contact {rawErrorData.provider} support with the error details</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            
          </div>
        )}
        
        {/* Full Raw Error (Collapsible) - No Copy Button */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-2 w-full text-left hover:text-gray-300 transition-colors"
          >
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
            <p className="text-xs text-gray-400 font-medium">{showRaw ? 'Hide' : 'Show'} Raw Error</p>
          </button>
          {showRaw && (
            <div className="mt-3 bg-gray-900 p-3 rounded space-y-2">
              {/* Status Code */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status Code:</span>
                <span className={`text-sm font-mono font-bold ${rawErrorData.statusCode ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {rawErrorData.statusCodeDisplay}
                </span>
              </div>
              {/* Processed Error Summary */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Error Summary:</p>
                <pre className="text-xs text-blue-400 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                  {JSON.stringify({
                    statusCode: rawErrorData.statusCode,
                    provider: rawErrorData.provider,
                    engine: rawErrorData.engine
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress Bar for Retryable Errors */}
        {isRetryable && (
          <div className="h-1 bg-gray-200">
            <div className="h-full bg-blue-600 animate-progress" style={{ width: '100%' }} />
          </div>
        )}
        
        {/* Send Error Report to Formula2GX */}
        <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500">Need help?</span>
          <button
            onClick={() => {
              const subject = encodeURIComponent(`[OneMindAI Error] ${rawErrorData.provider} - ${rawErrorData.statusCode || 'Unknown'} Error`);
              const body = encodeURIComponent(
`🚨 OneMindAI Error Report

📋 Error Summary:
• Provider: ${rawErrorData.provider}
• Engine: ${rawErrorData.engine}
• Status Code: ${rawErrorData.statusCode || 'N/A'}
• Timestamp: ${new Date().toISOString()}

📝 Error Message:
${rawErrorData.message || 'No message available'}

🔧 Technical Details:
${JSON.stringify({
  statusCode: rawErrorData.statusCode,
  provider: rawErrorData.provider,
  engine: rawErrorData.engine,
  userAgent: navigator.userAgent,
  url: window.location.href
}, null, 2)}

Sent from OneMindAI Error Recovery Panel
`
              );
              window.open(`mailto:hardik@formula2gx.com?subject=${subject}&body=${body}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send to Formula2GX
          </button>
        </div>
      </div>
    </div>
  );
}
