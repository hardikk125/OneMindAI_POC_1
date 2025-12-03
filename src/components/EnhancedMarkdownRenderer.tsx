import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import MermaidChart from './MermaidChart';
import { ChartCodeRenderer } from './ChartCodeRenderer';
import { TableChartRenderer } from './TableChartRenderer';
import { extractMermaidCharts, detectAndConvertTextCharts, convertTablesToCharts } from '../lib/chart-utils';
import { ScrollProgress } from './ui/scroll-progress';
import { terminalLogger } from '../lib/terminal-logger';
import * as echarts from 'echarts';
import { superDebugBus } from '../lib/super-debug-bus';

// Configure marked to support GFM tables
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface EnhancedMarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function EnhancedMarkdownRenderer({ content, isStreaming = false }: EnhancedMarkdownRendererProps) {
  const [processedContent, setProcessedContent] = useState('');
  const [images, setImages] = useState<Array<{url: string, alt: string, id: string}>>([]);
  const [mermaidCharts, setMermaidCharts] = useState<string[]>([]);
  const [codeBlocks, setCodeBlocks] = useState<Array<{code: string, language: string, id: string}>>([]);
  const [tableCharts, setTableCharts] = useState<Array<{id: string, config: any, sourceTable: string}>>([]);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Super Debug: Component render tracking
  useEffect(() => {
    superDebugBus.emit('COMPONENT_RENDER', 'EnhancedMarkdownRenderer mounted/updated', {
      details: { contentLength: content?.length || 0, isStreaming }
    });
  }, [content, isStreaming]);

  // Copy entire response to clipboard with beautiful HTML formatting
  const handleCopyAll = async () => {
    try {
      // Format the content as beautiful HTML
      const formattedHtml = formatContentAsHtml(content);
      
      // Create both HTML and plain text versions
      const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
      const textBlob = new Blob([content], { type: 'text/plain' });
      
      try {
        // Try the modern clipboard API with multiple formats
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
      } catch (e) {
        // Fallback: copy plain text only
        await navigator.clipboard.writeText(content);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Format content as beautiful HTML with styled tables
  const formatContentAsHtml = (text: string): string => {
    let html = text;
    
    // Escape HTML helper
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Extract and protect code blocks
    const codeBlocks: string[] = [];
    html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      const escapedCode = escapeHtml(code.trim());
      codeBlocks.push(`
        <pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.5; margin: 12px 0;">
          <code>${escapedCode}</code>
        </pre>
      `);
      return placeholder;
    });
    
    // Extract and protect inline code
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
      inlineCodes.push(`<code style="background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 13px;">${escapeHtml(code)}</code>`);
      return placeholder;
    });
    
    // Extract and process tables
    const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]*\|\n?)*)/g;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 3) return match;
      
      const headerRow = lines[0];
      const dataRows = lines.slice(2);
      const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
      
      let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
              ${headers.map(h => `<th style="padding: 12px 16px; text-align: left; color: white; font-weight: 600; border: 1px solid #2563eb;">${escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
      `;
      
      dataRows.forEach((row, rowIndex) => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        const bgColor = rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff';
        tableHtml += `
          <tr style="background: ${bgColor};">
            ${cells.map(c => `<td style="padding: 10px 16px; border: 1px solid #e2e8f0; color: #374151;">${escapeHtml(c)}</td>`).join('')}
          </tr>
        `;
      });
      
      tableHtml += `</tbody></table>`;
      return tableHtml;
    });
    
    // Headers
    html = html.replace(/^### (.+)$/gim, '<h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0;">$1</h3>');
    html = html.replace(/^## (.+)$/gim, '<h2 style="color: #1e40af; font-size: 18px; font-weight: 700; margin: 20px 0 10px 0;">$1</h2>');
    html = html.replace(/^# (.+)$/gim, '<h1 style="color: #1e40af; font-size: 22px; font-weight: 700; margin: 24px 0 12px 0;">$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');
    
    // Paragraphs and line breaks
    html = html.replace(/\n\n+/g, '</p><p style="margin: 12px 0;">');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in container
    html = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.7; color: #1f2937;"><p style="margin: 12px 0;">${html}</p></div>`;
    
    // Restore code blocks
    codeBlocks.forEach((code, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, code);
    });
    
    // Restore inline code
    inlineCodes.forEach((code, index) => {
      html = html.replace(`___INLINE_CODE_${index}___`, code);
    });
    
    return html;
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: string = 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`Copied ${type} to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Extract text content from HTML
  const extractTextFromHTML = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      setImages([]);
      setMermaidCharts([]);
      setCodeBlocks([]);
      setTableCharts([]);
      return;
    }

    // Convert tables to charts FIRST (before markdown processing)
    terminalLogger.libraryTriggered('Table Detection', 'Scanning for chartable tables', content.substring(0, 100));
    
    // Super Debug: File handoff and library trigger
    superDebugBus.emitFileHandoff('OneMindAI.tsx', 'EnhancedMarkdownRenderer.tsx', 'Raw streaming content');
    superDebugBus.emitLibrary('chart-utils', 'convertTablesToCharts()', 'Detecting chartable tables in content', content.substring(0, 100));
    
    const startTableDetection = Date.now();
    const { content: contentWithChartPlaceholders, charts: detectedTableCharts } = convertTablesToCharts(content);
    setTableCharts(detectedTableCharts);
    
    if (detectedTableCharts.length > 0) {
      console.log(`[TERMINAL] ✅ Detected ${detectedTableCharts.length} chartable table(s)`);
      
      // Super Debug: Table detected
      superDebugBus.emit('TABLE_DETECTED', `Detected ${detectedTableCharts.length} chartable table(s)`, {
        details: { tableCount: detectedTableCharts.length },
        processingTime: Date.now() - startTableDetection
      });
      
      detectedTableCharts.forEach((chart, index) => {
        terminalLogger.chartRendered('table-generated', chart.config.series?.length || 0, 'ECharts');
        
        // Super Debug: Chart generated
        superDebugBus.emit('CHART_GENERATED', `Chart ${index + 1} generated from table`, {
          details: { chartType: chart.config.series?.[0]?.type || 'unknown', seriesCount: chart.config.series?.length || 0 },
          library: 'ECharts'
        });
        superDebugBus.emitLibrary('ECharts', 'setOption()', 'Rendering chart from table data', JSON.stringify(chart.config).substring(0, 100));
      });
    }

    // Extract code blocks
    terminalLogger.libraryTriggered('Regex', 'Code Block Extraction', contentWithChartPlaceholders.substring(0, 100));
    
    // Super Debug: Code block extraction
    superDebugBus.emitLibrary('Regex', 'exec()', 'Extracting code blocks from content', contentWithChartPlaceholders.substring(0, 100));
    
    const extractedCodeBlocks: Array<{code: string, language: string, id: string}> = [];
    const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(contentWithChartPlaceholders)) !== null) {
      const language = match[1].trim() || 'text';
      const code = match[2].trim();
      const id = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if this is chart-related code (language-agnostic for matplotlib)
      const isPythonChart = (
        code.includes('matplotlib') || 
        code.includes('seaborn') || 
        code.includes('plt.') ||
        code.includes('plt.barh') ||
        code.includes('plt.bar') ||
        code.includes('plt.pie') ||
        code.includes('plt.scatter') ||
        code.includes('plt.plot') ||
        code.includes('plt.hist') ||
        code.includes('plt.heatmap') ||
        code.includes('sns.') ||
        code.includes('import pandas') ||
        code.includes('DataFrame')
      );
      
      // Check for Chart.js code (any language)
      const isChartJs = (
        code.includes('new Chart(') ||
        code.includes('Chart.register') ||
        code.includes('Chart(ctx') ||
        /type:\s*['"](?:bar|line|pie|doughnut|radar|scatter|polarArea|bubble)['"]/.test(code)
      );
      
      // Check for ASCII/text-based charts (bar charts with | and block characters)
      const isAsciiChart = (
        /^\s*\|?\s*\w+\s*[█▓▒░■□▪▫]+/m.test(code) ||
        /[█▓▒░]{3,}/.test(code) ||
        /^\s*\d+[\s,]*\|/m.test(code)
      );
      
      // Check for D3.js code
      const isD3Chart = (
        code.includes('d3.') ||
        code.includes("from 'd3'") ||
        code.includes('import * as d3')
      );
      
      // Check for Plotly code
      const isPlotlyChart = (
        code.includes('plotly') ||
        code.includes('Plotly') ||
        code.includes('go.Bar') ||
        code.includes('go.Scatter') ||
        code.includes('go.Pie')
      );
      
      // Check for HTML with embedded charts
      const isHtmlChart = (
        code.includes('<canvas') && (code.includes('Chart') || code.includes('chart'))
      );
      
      const isChartCode = isPythonChart || isChartJs || isAsciiChart || isD3Chart || isPlotlyChart || isHtmlChart;
      
      console.log(`[ChartDetection] Language: ${language}, isPython: ${isPythonChart}, isChartJs: ${isChartJs}, isAscii: ${isAsciiChart}, detected: ${isChartCode}`);
      console.log(`[ChartDetection] Code snippet: ${code.substring(0, 100)}...`);
      
      if (isChartCode) {
        extractedCodeBlocks.push({ code, language, id });
        terminalLogger.codeBlockExtracted(language, code.length, id);
        console.log(`[ChartDetection] ✅ Added chart code block: ${id}`);
        
        // Super Debug: Code block extracted
        superDebugBus.emit('CODE_BLOCK_EXTRACTED', `Code block extracted: ${language} (${code.length} chars)`, {
          details: { language, codeLength: code.length, id },
          codeSnippet: code.substring(0, 100)
        });
      }
    }
    
    setCodeBlocks(extractedCodeBlocks);
    
    // Super Debug: State update
    if (extractedCodeBlocks.length > 0) {
      superDebugBus.emitStateUpdate('codeBlocks', '[]', `[${extractedCodeBlocks.length} blocks]`);
    }

    // DISABLED: Mermaid chart extraction (using ECharts instead)
    // const contentWithMermaid = detectAndConvertTextCharts(contentWithChartPlaceholders);
    // const { charts: extractedCharts, remainingContent } = extractMermaidCharts(contentWithMermaid);
    // setMermaidCharts(extractedCharts);
    
    setMermaidCharts([]); // Disable Mermaid charts
    const remainingContent = contentWithChartPlaceholders; // Use content with chart placeholders

    // Process remaining content to detect images and add copy buttons
    const processContent = (text: string) => {
      let processedText = text;
      const foundImages: Array<{url: string, alt: string, id: string}> = [];

      // Unicode-safe btoa helper
      const unicodeBtoa = (str: string): string => {
        try {
          const cleanStr = str.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
          return btoa(unescape(encodeURIComponent(cleanStr)));
        } catch (e) {
          return encodeURIComponent(str);
        }
      };

      // Handle DALL-E style image generation prompts
      const dallePromptRegex = /\[Image:\s*([^\]]+)\]/gi;
      processedText = processedText.replace(dallePromptRegex, (match, prompt) => {
        const imageId = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `![Generated Image: ${prompt}](data:image/svg+xml;base64,${unicodeBtoa(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
              Generating: ${prompt}
            </text>
            <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
              AI Image Generation
            </text>
          </svg>
        `)})})`;
      });

      // Handle bare URLs that might be images
      const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))/gi;
      processedText = processedText.replace(urlRegex, (match, url) => {
        return `![Image](${url})`;
      });

      // Process with marked
      terminalLogger.libraryTriggered('marked.parse()', 'Markdown to HTML conversion', 
        processedText.substring(0, 100), 
        'HTML output'
      );
      
      // Super Debug: Markdown library trigger
      superDebugBus.emitLibrary('marked', 'parse()', 'Converting markdown to HTML', processedText.substring(0, 100));
      
      const startParse = Date.now();
      const html = marked.parse(processedText) as string;
      const parseTime = Date.now() - startParse;
      
      // Count elements in the content
      const elementsDetected = {
        tables: (html.match(/<table/g) || []).length,
        codeBlocks: (html.match(/<pre><code/g) || []).length,
        images: (html.match(/<img/g) || []).length,
        links: (html.match(/<a /g) || []).length,
        lists: (html.match(/<ul|<ol/g) || []).length,
        headings: (html.match(/<h[1-6]/g) || []).length
      };
      
      // Super Debug: Markdown parsed
      superDebugBus.emit('MARKDOWN_PARSE', `Markdown parsed: ${processedText.length} → ${html.length} chars`, {
        inputSize: processedText.length,
        outputSize: html.length,
        processingTime: parseTime,
        elementsDetected,
        inputPreview: processedText.substring(0, 100),
        outputPreview: html.substring(0, 100)
      });
      
      terminalLogger.markdownParsed(
        processedText.length, 
        html.length, 
        ['tables', 'bold', 'italic', 'links', 'lists']
      );
      
      // Clean up excessive whitespace and empty paragraphs
      let finalHtml = html
        // Remove empty paragraphs
        .replace(/<p>\s*<\/p>/g, '')
        // Remove multiple consecutive <br> tags
        .replace(/(<br\s*\/?>\s*){2,}/g, '<br>')
        // Remove <br> at the start of paragraphs
        .replace(/<p>\s*<br\s*\/?>/g, '<p>')
        // Remove <br> at the end of paragraphs
        .replace(/<br\s*\/?>\s*<\/p>/g, '</p>')
        // Remove excessive whitespace between elements
        .replace(/>\s{2,}</g, '> <')
        // Clean up whitespace around list items
        .replace(/<\/li>\s+<li>/g, '</li><li>');
      
      // Super Debug: DOM injection
      superDebugBus.emit('DOM_INJECT', `HTML injected: ${finalHtml.length} bytes`, {
        outputSize: finalHtml.length,
        processingTime: parseTime
      });

      setImages(foundImages);
      return finalHtml;
    };

    const processed = processContent(remainingContent);
    setProcessedContent(processed);
  }, [content]);

  // Custom image component for better rendering
  const ImageComponent = ({ src, alt, id }: { src: string; alt: string; id: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Check if it's a data URL or external image
    const isDataUrl = src.startsWith('data:');
    const isGeneratedImage = alt.includes('Generated Image:');

    return (
      <div key={id} className="my-4">
        <div className="relative inline-block">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {hasError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-red-500 text-sm">
                🖼️ Failed to load image: {alt}
              </div>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              className={`max-w-full h-auto rounded-lg shadow-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              style={{
                maxHeight: isGeneratedImage ? '400px' : '600px',
                width: 'auto'
              }}
            />
          )}
          
          {isGeneratedImage && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              AI Generated
            </div>
          )}
        </div>
        
        {alt && !hasError && (
          <div className="text-sm text-gray-600 mt-2 italic text-center">
            {alt}
          </div>
        )}
      </div>
    );
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollContainerRef} className="prose prose-sm max-w-none relative group">
      {/* Scroll Progress Indicator */}
      <div className="pointer-events-none absolute left-0 top-0 w-full z-20">
        <div className="absolute left-0 top-0 h-1 w-full bg-gray-200 dark:bg-gray-800" />
        <ScrollProgress 
          containerRef={scrollContainerRef} 
          className="absolute top-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" 
        />
      </div>
      
      {/* Copy All Button - Always visible */}
      <button
        onClick={handleCopyAll}
        className={`absolute top-2 right-0 z-10 flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md text-white transition-all shadow-md ${
          copied 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }`}
        title="Copy response with beautiful formatting"
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            📋 Copy
          </>
        )}
      </button>

      {/* Render processed HTML content */}
      <div 
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: processedContent }}
        className="markdown-content"
      />
      
      {/* Render Mermaid charts */}
      {mermaidCharts.length > 0 && (
        <div className="my-6 space-y-6">
          {mermaidCharts.map((chart, index) => (
            <MermaidChart
              key={`chart-${index}`}
              chart={chart}
              chartNumber={index + 1}
              className="mermaid-chart-section"
            />
          ))}
        </div>
      )}
      
      {/* Render Python chart code blocks with preview */}
      {codeBlocks.length > 0 && (
        <div className="my-6 space-y-6">
          {codeBlocks.map((block) => (
            <div key={block.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Code Section */}
              <div className="bg-gray-900 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Python Code</span>
                  <button
                    onClick={() => copyToClipboard(block.code, 'code')}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code>{block.code}</code>
                </pre>
              </div>
              
              {/* Chart Preview Section */}
              <ChartCodeRenderer code={block.code} language={block.language} />
            </div>
          ))}
        </div>
      )}
      
      {/* Render Table-Generated Charts */}
      {tableCharts.length > 0 && (
        <div className="my-6 space-y-6">
          {tableCharts.map((chart) => (
            <TableChartRenderer key={chart.id} chart={chart} />
          ))}
        </div>
      )}
      
      {/* Handle images separately for better control */}
      {images.map((image) => (
        <ImageComponent
          key={image.id}
          src={image.url}
          alt={image.alt}
          id={image.id}
        />
      ))}
      
      {/* Streaming indicator */}
      {isStreaming && content && (
        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
      )}
    </div>
  );
}
