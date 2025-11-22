import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download } from 'lucide-react';

interface MermaidChartProps {
  chart: string;
  className?: string;
  chartNumber?: number;
}

/**
 * MermaidChart Component
 * 
 * Renders Mermaid diagrams and charts with interactive features:
 * - Copy chart code
 * - Download as SVG
 * - Error handling with fallback display
 * - Loading states
 */
export default function MermaidChart({ chart, className = '', chartNumber }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');

  // Initialize Mermaid with custom theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      themeVariables: {
        primaryColor: '#3b82f6',        // Blue primary
        primaryTextColor: '#fff',
        primaryBorderColor: '#2563eb',
        lineColor: '#3b82f6',
        secondaryColor: '#8b5cf6',      // Purple secondary
        tertiaryColor: '#ec4899',       // Pink accent
        backgroundColor: '#f8fafc',     // Light background
        mainBkg: '#ffffff',
        secondBkg: '#f1f5f9',
        tertiaryBkg: '#e0e7ff',
        textColor: '#1e293b',
        border1: '#cbd5e1',
        border2: '#94a3b8',
        arrowheadColor: '#3b82f6',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
      },
    });
  }, []);

  // Render chart
  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setIsLoading(true);
        setError(null);

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID for this chart
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the chart - Mermaid converts text to SVG
        const { svg } = await mermaid.render(id, chart);

        // Store SVG for download
        setSvgContent(svg);

        // Insert the SVG into the container
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render chart');
        setIsLoading(false);
      }
    };

    renderChart();
  }, [chart]);

  // Copy chart code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Download chart as SVG
  const handleDownload = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-${chartNumber || Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Error state display
  if (error) {
    return (
      <div className={`p-4 border-2 border-red-300 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-red-700 mb-1">Chart Rendering Error</div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <details className="text-xs text-red-500">
              <summary className="cursor-pointer hover:underline font-medium mb-2">
                Show chart code
              </summary>
              <pre className="mt-2 p-3 bg-red-100 rounded overflow-x-auto border border-red-200">
                <code className="text-xs">{chart}</code>
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className={`mermaid-chart-wrapper ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-semibold text-gray-700">
            {chartNumber ? `Chart ${chartNumber}` : 'Chart'}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Copy chart code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          
          {svgContent && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-100 hover:bg-blue-200 transition-colors text-blue-700"
              title="Download as SVG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white shadow-sm">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-12 text-gray-500">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <div className="text-sm">Rendering chart...</div>
            </div>
          </div>
        )}

        {/* Chart SVG */}
        <div
          ref={containerRef}
          className="mermaid-chart-content overflow-x-auto p-6"
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </div>

      {/* Chart Info */}
      <div className="mt-2 px-1">
        <div className="text-xs text-gray-500 italic">
          💡 Powered by Mermaid.js - Interactive diagram rendering
        </div>
      </div>
    </div>
  );
}
