import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import MermaidChart from './MermaidChart';
import { ChartCodeRenderer } from './ChartCodeRenderer';
import { TableChartRenderer } from './TableChartRenderer';
import { convertTablesToCharts } from '../lib/chart-utils';

interface SelectableMarkdownRendererProps {
  content: string;
  engineName: string;
  onComponentSelect: (component: {id: string, engineName: string, content: string, type: string}) => void;
  onComponentDeselect: (id: string) => void;
  selectedIds: string[];
  isStreaming?: boolean;
}

export function SelectableMarkdownRenderer({ 
  content, 
  engineName, 
  onComponentSelect, 
  onComponentDeselect,
  selectedIds,
  isStreaming = false 
}: SelectableMarkdownRendererProps) {
  const [parsedContent, setParsedContent] = useState<Array<{id: string, type: string, content: string, html: string}>>([]);
  const [tableCharts, setTableCharts] = useState<Array<{id: string, config: any, sourceTable: string}>>([]);
  const [rawStreamingContent, setRawStreamingContent] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastParsedLengthRef = useRef<number>(0);

  useEffect(() => {
    // Always update raw content immediately for real-time display
    setRawStreamingContent(content);
    
    // Debounce expensive parsing during streaming
    if (isStreaming) {
      // Only re-parse if content has grown significantly (every ~100 characters or 300ms)
      const contentGrowth = content.length - lastParsedLengthRef.current;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Parse immediately on first chunk or large growth
      if (lastParsedLengthRef.current === 0 || contentGrowth > 100) {
        parseContent();
        lastParsedLengthRef.current = content.length;
      } else {
        // Otherwise debounce
        debounceTimerRef.current = setTimeout(() => {
          parseContent();
          lastParsedLengthRef.current = content.length;
        }, 300);
      }
      return;
    }
    
    // Immediate parse when not streaming
    parseContent();
    lastParsedLengthRef.current = content.length;
  }, [content, engineName, isStreaming]);

  const parseContent = () => {
    // Convert tables to charts FIRST (before markdown processing)
    const { content: contentWithChartPlaceholders, charts: detectedTableCharts } = convertTablesToCharts(content);
    setTableCharts(detectedTableCharts);
    
    // Parse markdown into components (headings with their content, paragraphs, lists, code blocks, tables)
    const lines = contentWithChartPlaceholders.split('\n');
    const components: Array<{id: string, type: string, content: string, html: string}> = [];
    let currentBlock = '';
    let currentType = '';
    let inCodeBlock = false;
    let inList = false;
    let inTable = false;
    let headingWithContent = '';
    let collectingHeadingContent = false;
    let currentHeadingLevel = 0;

    const addComponent = (type: string, content: string) => {
      if (content.trim()) {
        const html = marked.parse(content) as string;
        components.push({
          id: `${engineName}-${components.length}`,
          type,
          content,
          html
        });
      }
    };

    lines.forEach((line, index) => {
      // Code block detection (including charts like mermaid)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          currentBlock += line + '\n';
          
          // Detect chart types
          const isChart = currentBlock.match(/```(mermaid|chart|plotly|vega|d3)/i);
          const blockType = isChart ? 'chart' : 'code';
          
          if (collectingHeadingContent) {
            headingWithContent += currentBlock;
          } else {
            addComponent(blockType, currentBlock);
          }
          currentBlock = '';
          inCodeBlock = false;
        } else {
          if (currentBlock && !collectingHeadingContent) {
            addComponent(currentType || 'paragraph', currentBlock);
          } else if (currentBlock && collectingHeadingContent) {
            headingWithContent += currentBlock;
          }
          currentBlock = line + '\n';
          currentType = 'code';
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        currentBlock += line + '\n';
        return;
      }

      // Table detection (markdown tables with | separators)
      if (line.trim().match(/^\|.*\|$/)) {
        if (!inTable) {
          if (currentBlock && !collectingHeadingContent) {
            addComponent(currentType || 'paragraph', currentBlock);
            currentBlock = '';
          } else if (currentBlock && collectingHeadingContent) {
            headingWithContent += currentBlock;
            currentBlock = '';
          }
          inTable = true;
          currentType = 'table';
        }
        currentBlock += line + '\n';
        return;
      } else if (inTable && line.trim() === '') {
        if (collectingHeadingContent) {
          headingWithContent += currentBlock;
        } else {
          addComponent('table', currentBlock);
        }
        currentBlock = '';
        inTable = false;
        currentType = '';
        return;
      } else if (inTable) {
        currentBlock += line + '\n';
        return;
      }

      // Heading detection - collect heading and all its content until next heading of same or higher level
      const headingMatch = line.match(/^(#{1,6})\s/);
      if (headingMatch) {
        const headingLevel = headingMatch[1].length;
        
        // Save previous heading with its content
        if (collectingHeadingContent && headingWithContent) {
          addComponent('heading', headingWithContent);
          headingWithContent = '';
        }
        
        // Save any pending block
        if (currentBlock && !collectingHeadingContent) {
          addComponent(currentType || 'paragraph', currentBlock);
        }
        
        // Start new heading collection
        headingWithContent = line + '\n';
        collectingHeadingContent = true;
        currentHeadingLevel = headingLevel;
        currentBlock = '';
        currentType = '';
        inList = false;
        return;
      }

      // If we're collecting heading content, add everything to it
      if (collectingHeadingContent) {
        headingWithContent += line + '\n';
        return;
      }

      // List detection (only when NOT collecting heading content)
      if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
        if (!inList && currentBlock) {
          addComponent(currentType || 'paragraph', currentBlock);
          currentBlock = '';
        }
        currentBlock += line + '\n';
        currentType = 'list';
        inList = true;
        return;
      }

      // Empty line - end current block
      if (line.trim() === '') {
        if (currentBlock.trim()) {
          addComponent(currentType || 'paragraph', currentBlock);
          currentBlock = '';
          currentType = '';
          inList = false;
        }
        return;
      }

      // Continue current block or start new paragraph
      if (inList || currentType === 'paragraph' || !currentType) {
        currentBlock += line + '\n';
        if (!currentType) currentType = 'paragraph';
      }
    });

    // Add remaining blocks
    if (collectingHeadingContent && headingWithContent.trim()) {
      addComponent('heading', headingWithContent);
    }
    if (currentBlock.trim() && !collectingHeadingContent) {
      addComponent(currentType || 'paragraph', currentBlock);
    }

    setParsedContent(components);
  };

  const toggleSelection = (component: {id: string, type: string, content: string, html: string}) => {
    if (selectedIds.includes(component.id)) {
      onComponentDeselect(component.id);
    } else {
      onComponentSelect({
        id: component.id,
        engineName,
        content: component.content,
        type: component.type
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Render table charts */}
      {tableCharts.map((chart) => (
        <div
          key={chart.id}
          className="group relative rounded-lg border-2 border-purple-200 bg-purple-50 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">📊 Auto-Generated Chart</span>
          </div>
          <TableChartRenderer chart={chart} />
        </div>
      ))}
      
      {parsedContent.map((component) => {
        const isSelected = selectedIds.includes(component.id);
        
        return (
          <div
            key={component.id}
            className={`group relative rounded-lg transition-all ${
              isSelected 
                ? 'bg-green-50 border-2 border-green-400 shadow-sm' 
                : 'hover:bg-slate-50 border-2 border-transparent'
            }`}
          >
            {/* Selectable content */}
            <div 
              className="pr-12 pl-3 py-2 cursor-pointer"
              onClick={() => toggleSelection(component)}
            >
              {component.type === 'chart' && component.content.includes('```mermaid') ? (
                <MermaidChart chart={component.content.replace(/```mermaid\n?|```/g, '').trim()} />
              ) : component.type === 'code' && (
                component.content.includes('matplotlib') ||
                component.content.includes('seaborn') ||
                component.content.includes('plt.') ||
                component.content.includes('DataFrame')
              ) ? (
                <ChartCodeRenderer code={component.content} language="python" />
              ) : (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: component.html }}
                />
              )}
            </div>

            {/* Selection checkbox */}
            <button
              onClick={() => toggleSelection(component)}
              className={`absolute top-2 right-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-slate-300 text-transparent group-hover:border-green-400 group-hover:text-slate-400'
              }`}
              title={isSelected ? 'Deselect' : 'Select'}
            >
              {isSelected ? '✓' : '○'}
            </button>
          </div>
        );
      })}
      
      {/* Show raw streaming content at the end during streaming */}
      {isStreaming && rawStreamingContent.length > (parsedContent.reduce((sum, c) => sum + c.content.length, 0)) && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            <span className="font-semibold">Streaming...</span>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
            {rawStreamingContent.substring(parsedContent.reduce((sum, c) => sum + c.content.length, 0))}
          </div>
        </div>
      )}
    </div>
  );
}
