import { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronDown, ChevronUp, Copy, Settings } from 'lucide-react';
import { analyzeError, analyzeDeepSeekError, analyzeGeminiError, analyzeClaudeError, analyzePerplexityError, analyzeKimiError, analyzeMistralError, ErrorAnalysis } from '../lib/error-recovery-engine';

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
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
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
    } else {
      analyzeError(error).then((analysis) => {
        console.log('[ErrorRecoveryPanel] Generic analysis:', analysis);
        setAnalysis(analysis);
      });
    }
  }, [error]);
  
  if (!analysis) return null;
  
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
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis.rawError);
    // You could add a toast notification here
  };
  
  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50 animate-slide-up">
      <div className={`rounded-lg border-2 shadow-2xl ${severityColors[analysis.severity]}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{severityIcons[analysis.severity]}</span>
            <div>
              <h3 className="font-bold text-gray-900">{analysis.code.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-gray-600">
                {analysis.retryable ? '🔄 Retrying automatically' : '⚠️ Manual action required'}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Plain English Explanation */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-gray-800 font-medium mb-1">What's happening:</p>
              <p className="text-gray-700">{analysis.plainEnglish.whatItMeans}</p>
            </div>
          </div>
          
          {expanded && (
            <>
              <div className="flex items-start gap-2">
                <span className="text-lg">🤔</span>
                <div className="text-sm">
                  <p className="text-gray-800 font-medium mb-1">Why this happened:</p>
                  <p className="text-gray-700">{analysis.plainEnglish.whyItHappens}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-lg">⚡</span>
                <div className="text-sm">
                  <p className="text-gray-800 font-medium mb-1">Impact:</p>
                  <p className="text-gray-700">{analysis.plainEnglish.howItAffects}</p>
                </div>
              </div>
            </>
          )}
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp size={16} /></>
            ) : (
              <>Show more details <ChevronDown size={16} /></>
            )}
          </button>
        </div>
        
        {/* Retry Button (for auto-fixable errors that failed all retries) */}
        {analysis.retryable && onRetry && (
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
        
        {/* Cellar Message (if not retryable) */}
        {!analysis.retryable && analysis.cellarMessage && (
          <div className="p-4 bg-white bg-opacity-60 border-t border-gray-300">
            <p className="text-sm font-semibold text-gray-900 mb-2">🔧 Action Required:</p>
            <div className="space-y-2">
              {analysis.cellarMessage.technical.slice(0, 2).map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-bold">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setShowRaw(!showRaw);
                  if (!showRaw) copyToClipboard();
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
              >
                <Copy size={14} />
                {showRaw ? 'Hide' : 'Show'} Raw Error
              </button>
              <button
                onClick={() => {
                  // Navigate to settings - you can customize this route
                  window.location.href = '/settings';
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Settings size={14} />
                Go to Settings
              </button>
            </div>
          </div>
        )}
        
        {/* Raw Error (Collapsible) */}
        {showRaw && (
          <div className="p-4 bg-gray-900 border-t border-gray-700">
            <pre className="text-xs text-green-400 overflow-auto max-h-40 font-mono">
              {analysis.rawError}
            </pre>
          </div>
        )}
        
        {/* Progress Bar for Retryable Errors */}
        {analysis.retryable && (
          <div className="h-1 bg-gray-200">
            <div className="h-full bg-blue-600 animate-progress" style={{ width: '100%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
