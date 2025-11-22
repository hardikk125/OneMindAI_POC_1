import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import MermaidChart from './MermaidChart';
import { ChartCodeRenderer } from './ChartCodeRenderer';
import { TableChartRenderer } from './TableChartRenderer';
import { extractMermaidCharts, detectAndConvertTextCharts, convertTablesToCharts } from '../lib/chart-utils';
import { ScrollProgress } from './ui/scroll-progress';
import { terminalLogger } from '../lib/terminal-logger';
import * as echarts from 'echarts';

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

  // Copy entire response to clipboard
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
    const { content: contentWithChartPlaceholders, charts: detectedTableCharts } = convertTablesToCharts(content);
    setTableCharts(detectedTableCharts);
    
    if (detectedTableCharts.length > 0) {
      console.log(`[TERMINAL] ✅ Detected ${detectedTableCharts.length} chartable table(s)`);
      detectedTableCharts.forEach((chart, index) => {
        terminalLogger.chartRendered('table-generated', chart.config.series?.length || 0, 'ECharts');
      });
    }

    // Extract code blocks
    terminalLogger.libraryTriggered('Regex', 'Code Block Extraction', contentWithChartPlaceholders.substring(0, 100));
    
    const extractedCodeBlocks: Array<{code: string, language: string, id: string}> = [];
    const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(contentWithChartPlaceholders)) !== null) {
      const language = match[1].trim() || 'text';
      const code = match[2].trim();
      const id = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if this is chart-related code
      if (language === 'python' && (
        code.includes('matplotlib') || 
        code.includes('seaborn') || 
        code.includes('plt.') ||
        code.includes('sns.') ||
        code.includes('import pandas') ||
        code.includes('DataFrame')
      )) {
        extractedCodeBlocks.push({ code, language, id });
        terminalLogger.codeBlockExtracted(language, code.length, id);
      }
    }
    
    setCodeBlocks(extractedCodeBlocks);

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
      
      const html = marked.parse(processedText) as string;
      
      terminalLogger.markdownParsed(
        processedText.length, 
        html.length, 
        ['tables', 'bold', 'italic', 'links', 'lists']
      );
      
      // Process with marked - no inline copy buttons for now to avoid HTML escaping issues
      const finalHtml = html;

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
      
      {/* Copy All Button */}
      <button
        onClick={handleCopyAll}
        className="absolute top-2 right-0 z-10 flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
        title="Copy entire response"
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
            Copy All
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
