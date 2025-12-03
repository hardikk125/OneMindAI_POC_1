import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { motion } from 'framer-motion';
import { Copy, Check, Loader2, Brain } from 'lucide-react';

interface StreamingRendererProps {
  engineId: string;
  engineName: string;
  provider: string;
  model: string;
  isStreaming: boolean;
  content: string;
  onContentChange: (content: string) => void;
  error?: string;
  tokens?: { input: number; output: number };
  cost?: number;
  duration?: number;
}

export function StreamingRenderer({
  engineId,
  engineName,
  provider,
  model,
  isStreaming,
  content,
  onContentChange,
  error,
  tokens,
  cost,
  duration,
}: StreamingRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Configure marked for better rendering
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  // Update HTML content when text changes
  useEffect(() => {
    if (content) {
      const html = marked.parse(content) as string;
      setHtmlContent(html);
      
      // Auto-scroll to bottom
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    } else {
      setHtmlContent('');
    }
  }, [content]);

  // Copy functionality
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Provider colors and icons
  const providerConfig = {
    anthropic: {
      gradient: 'from-purple-500 to-blue-500',
      icon: '🤖',
      name: 'Claude',
    },
    openai: {
      gradient: 'from-emerald-500 to-teal-500',
      icon: '🧠',
      name: 'ChatGPT',
    },
    gemini: {
      gradient: 'from-blue-500 to-indigo-500',
      icon: '💎',
      name: 'Gemini',
    },
    mistral: {
      gradient: 'from-orange-500 to-red-500',
      icon: '🌪️',
      name: 'Mistral',
    },
  };

  const config = providerConfig[provider as keyof typeof providerConfig] || {
    gradient: 'from-gray-500 to-gray-700',
    icon: '🤖',
    name: provider,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${config.gradient} flex items-center justify-center shadow-md`}>
            <span className="text-white font-bold text-lg">{config.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.name}</h3>
            <p className="text-xs text-gray-500">{model}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Streaming...
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={!content}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div
          ref={containerRef}
          className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-sm">⚠️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          ) : content ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : isStreaming ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Brain className="w-5 h-5 animate-pulse" />
              <span className="text-sm">Waiting for response...</span>
            </div>
          ) : (
            <div className="text-gray-400 text-sm italic">
              Response will appear here after generation...
            </div>
          )}

          {/* Streaming cursor */}
          {isStreaming && content && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
          )}
        </div>

        {/* Streaming progress bar */}
        {isStreaming && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Metrics */}
      {(tokens || cost !== undefined || duration !== undefined) && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {tokens && (
              <>
                <div>
                  <p className="text-gray-500">Input Tokens</p>
                  <p className="font-semibold text-gray-900">{tokens.input.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Output Tokens</p>
                  <p className="font-semibold text-gray-900">{tokens.output.toLocaleString()}</p>
                </div>
              </>
            )}
            {cost !== undefined && (
              <div>
                <p className="text-gray-500">Cost</p>
                <p className="font-semibold text-gray-900">${cost.toFixed(4)}</p>
              </div>
            )}
            {duration !== undefined && (
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-semibold text-gray-900">{(duration / 1000).toFixed(2)}s</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
