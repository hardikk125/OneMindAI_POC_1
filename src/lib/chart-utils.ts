/**
 * Chart Detection and Extraction Utilities
 * 
 * This module provides functions to detect and extract Mermaid charts
 * from AI-generated content, allowing them to be rendered separately.
 */

export interface ChartExtractionResult {
  charts: string[];
  remainingContent: string;
}

/**
 * Extract Mermaid charts from AI response text
 * 
 * This function scans text for Mermaid code blocks and extracts them
 * so they can be rendered separately from regular text content.
 * 
 * @param content - The raw content from AI response
 * @returns Object containing extracted charts and remaining content
 */
export function extractMermaidCharts(content: string): ChartExtractionResult {
  const charts: string[] = [];
  let remainingContent = content;

  // Pattern 1: ```mermaid code blocks (most common format)
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  
  while ((match = mermaidBlockRegex.exec(content)) !== null) {
    charts.push(match[1].trim());
    // Replace chart code with placeholder for better text flow
    remainingContent = remainingContent.replace(match[0], `\n\n📊 **Chart ${charts.length}** (rendered below)\n\n`);
  }

  // Pattern 2: Standalone mermaid syntax (without code fence)
  // This handles cases where AI outputs raw mermaid syntax
  const standaloneMermaidRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|xychart-beta)[\s\S]*?(?=\n\n|$)/gm;
  
  while ((match = standaloneMermaidRegex.exec(content)) !== null) {
    // Only add if not already captured in code block
    const chartCode = match[0].trim();
    if (!charts.some(c => c.includes(chartCode))) {
      charts.push(chartCode);
      remainingContent = remainingContent.replace(match[0], `\n\n📊 **Chart ${charts.length}** (rendered below)\n\n`);
    }
  }

  // Pattern 3: xychart-beta (standalone charts)
  const xyChartRegex = /xychart-beta[\s\S]*?(?=\n\n|$)/g;
  
  while ((match = xyChartRegex.exec(content)) !== null) {
    const chartCode = match[0].trim();
    if (!charts.some(c => c.includes(chartCode))) {
      charts.push(chartCode);
      remainingContent = remainingContent.replace(match[0], `\n\n📊 **Chart ${charts.length}** (rendered below)\n\n`);
    }
  }

  return { charts, remainingContent };
}

/**
 * Check if content contains any charts (Mermaid, ASCII, matplotlib, Chart.js, etc.)
 * 
 * @param content - The content to check
 * @returns true if content contains charts, false otherwise
 */
export function hasCharts(content: string): boolean {
  // Mermaid charts
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  const standaloneMermaidRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|xychart-beta)/gm;
  
  // Python matplotlib/seaborn charts
  const matplotlibRegex = /(?:import\s+matplotlib|from\s+matplotlib|plt\.|sns\.|seaborn)/i;
  const pythonChartRegex = /(?:\.bar\(|\.pie\(|\.scatter\(|\.plot\(|\.hist\(|\.heatmap\(|\.boxplot\(|\.imshow\()/;
  
  // Chart.js patterns
  const chartJsRegex = /(?:new\s+Chart\(|Chart\.register|type:\s*['"](?:bar|line|pie|doughnut|radar|scatter|bubble|polarArea)['"]|chartjs|chart\.js)/i;
  
  // ASCII/Text-based bar charts (like the one in the image)
  const asciiBarChartRegex = /^\s*\d+\s*\|\s*[█▓▒░■□▪▫●○◆◇★☆\-=\#\*]+/m;
  const asciiBarChartAlt = /[█▓▒░]{3,}|[■□▪▫]{3,}|[\-=\#\*]{5,}\s*\w+/;
  
  // Text-based horizontal bar patterns (numbers on left, bars on right)
  const textBarPattern = /^\s*\d+\s*\|[\s\S]*?(?:January|February|March|April|May|June|July|August|September|October|November|December|\w+\s*\(\d+[KkMm]?\))/m;
  
  // D3.js patterns
  const d3Regex = /(?:d3\.|import\s+\*\s+as\s+d3|from\s+['"]d3['"])/i;
  
  // Plotly patterns
  const plotlyRegex = /(?:plotly\.|Plotly\.|import\s+plotly|go\.(?:Bar|Scatter|Pie|Heatmap|Line))/i;
  
  // Recharts patterns (React)
  const rechartsRegex = /(?:from\s+['"]recharts['"]|<(?:BarChart|LineChart|PieChart|AreaChart|ScatterChart|RadarChart))/i;
  
  // ApexCharts patterns
  const apexChartsRegex = /(?:ApexCharts|new\s+ApexCharts|apexcharts)/i;
  
  // Highcharts patterns
  const highchartsRegex = /(?:Highcharts\.|highcharts|chart:\s*\{\s*type:\s*['"])/i;
  
  // ECharts patterns
  const echartsRegex = /(?:echarts\.|ECharts|setOption\s*\(\s*\{)/i;
  
  return (
    mermaidBlockRegex.test(content) || 
    standaloneMermaidRegex.test(content) ||
    matplotlibRegex.test(content) ||
    pythonChartRegex.test(content) ||
    chartJsRegex.test(content) ||
    asciiBarChartRegex.test(content) ||
    asciiBarChartAlt.test(content) ||
    textBarPattern.test(content) ||
    d3Regex.test(content) ||
    plotlyRegex.test(content) ||
    rechartsRegex.test(content) ||
    apexChartsRegex.test(content) ||
    highchartsRegex.test(content) ||
    echartsRegex.test(content)
  );
}

/**
 * Get chart type from mermaid code
 * 
 * @param chartCode - The mermaid chart code
 * @returns The chart type (e.g., 'flowchart', 'pie', 'sequence')
 */
export function getChartType(chartCode: string): string {
  const firstLine = chartCode.trim().split('\n')[0].toLowerCase();
  
  if (firstLine.startsWith('graph')) return 'graph';
  if (firstLine.startsWith('flowchart')) return 'flowchart';
  if (firstLine.startsWith('sequencediagram')) return 'sequence';
  if (firstLine.startsWith('classdiagram')) return 'class';
  if (firstLine.startsWith('statediagram')) return 'state';
  if (firstLine.startsWith('erdiagram')) return 'er';
  if (firstLine.startsWith('gantt')) return 'gantt';
  if (firstLine.startsWith('pie')) return 'pie';
  if (firstLine.startsWith('gitgraph')) return 'git';
  if (firstLine.startsWith('xychart')) return 'xychart';
  
  return 'unknown';
}

/**
 * Validate mermaid chart syntax (basic validation)
 * 
 * @param chartCode - The mermaid chart code
 * @returns true if syntax appears valid, false otherwise
 */
export function isValidMermaidSyntax(chartCode: string): boolean {
  if (!chartCode || chartCode.trim().length === 0) return false;
  
  const validKeywords = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph', 'xychart-beta'
  ];
  
  const firstLine = chartCode.trim().split('\n')[0];
  return validKeywords.some(keyword => firstLine.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Convert text-based flowchart to Mermaid syntax
 * 
 * @param text - The text-based flowchart
 * @returns Mermaid flowchart syntax
 */
export function convertTextFlowchart(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const mermaidLines: string[] = ['flowchart TD'];
  const nodeMap = new Map<string, string>();
  let nodeCounter = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip headers and legends
    if (line.includes('Legend:') || line.includes('Rectangles:') || 
        line.includes('Diamonds:') || line.includes('Arrows:')) {
      break;
    }
    
    // Handle start/end nodes
    if (line.toLowerCase().includes('start')) {
      mermaidLines.push('A[Start]');
      nodeMap.set('Start', 'A');
    } else if (line.toLowerCase().includes('end')) {
      const nodeId = String.fromCharCode(65 + nodeCounter++);
      mermaidLines.push(`${nodeId}[End]`);
      nodeMap.set('End', nodeId);
    }
    // Handle action nodes (rectangles)
    else if (line.includes('Display') || line.includes('User') || 
             line.includes('Login') || line.includes('Validate') || 
             line.includes('Redirect') || line.includes('Show')) {
      const nodeId = String.fromCharCode(65 + nodeCounter++);
      const cleanText = line.replace(/[|>]/g, '').trim();
      mermaidLines.push(`${nodeId}["${cleanText}"]`);
      nodeMap.set(cleanText, nodeId);
    }
    // Handle decision nodes (diamonds)
    else if (line.includes('?') || line.includes('Are') || line.includes('Fields') || 
             line.includes('Credentials') || line.includes('Correct')) {
      const nodeId = String.fromCharCode(65 + nodeCounter++);
      const cleanText = line.replace(/[|>]/g, '').trim();
      mermaidLines.push(`${nodeId}{"${cleanText}"}`);
      nodeMap.set(cleanText, nodeId);
    }
  }
  
  // Add connections based on flow
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    if (currentLine.includes('v') && nextLine.trim()) {
      const currentText = currentLine.replace(/[|>v]/g, '').trim();
      const nextText = nextLine.replace(/[|>v]/g, '').trim();
      
      const currentNode = Array.from(nodeMap.values()).find(nodeId => 
        mermaidLines.some(line => line.includes(nodeId) && line.includes(currentText))
      );
      const nextNode = Array.from(nodeMap.values()).find(nodeId => 
        mermaidLines.some(line => line.includes(nodeId) && line.includes(nextText))
      );
      
      if (currentNode && nextNode) {
        // Handle yes/no branches
        if (currentText.includes('Empty?')) {
          mermaidLines.push(`${currentNode} -->|No| ${nextNode}`);
        } else if (currentText.includes('Correct?')) {
          mermaidLines.push(`${currentNode} -->|Yes| ${nextNode}`);
        } else {
          mermaidLines.push(`${currentNode} --> ${nextNode}`);
        }
      }
    }
  }
  
  return mermaidLines.join('\n');
}

/**
 * Convert Python matplotlib pie chart to Mermaid syntax
 * 
 * @param pythonCode - The Python matplotlib code
 * @returns Mermaid pie chart syntax
 */
export function convertPythonPieChart(pythonCode: string): string {
  const mermaidLines: string[] = ['pie title Gender Distribution in India'];
  
  // Extract labels from Python code
  const labelsMatch = pythonCode.match(/labels\s*=\s*\[(.*?)\]/s);
  const sizesMatch = pythonCode.match(/sizes\s*=\s*\[(.*?)\]/s);
  
  if (labelsMatch && sizesMatch) {
    const labels = labelsMatch[1].split(',').map(s => s.replace(/['"]/g, '').trim());
    const sizes = sizesMatch[1].split(',').map(s => parseFloat(s.trim()));
    
    // Create Mermaid pie chart syntax
    labels.forEach((label, index) => {
      if (index < sizes.length) {
        mermaidLines.push(`"${label}" : ${sizes[index]}`);
      }
    });
  }
  
  return mermaidLines.join('\n');
}

/**
 * Detect and convert text-based charts to Mermaid
 * 
 * @param content - The content to analyze
 * @returns Content with converted charts
 */
export function detectAndConvertTextCharts(content: string): string {
  let processedContent = content;
  
  // 1. Look for text-based flowcharts patterns
  const textFlowchartPattern = /(?:Start|Begin)[\s\S]*?(?:End|Finish)/gi;
  const flowchartMatches = content.match(textFlowchartPattern);
  
  if (flowchartMatches && flowchartMatches.length > 0) {
    flowchartMatches.forEach((match) => {
      // Check if it's not already a Mermaid chart
      if (!match.includes('flowchart') && !match.includes('```mermaid')) {
        const mermaidChart = convertTextFlowchart(match);
        processedContent = processedContent.replace(match, `\n\n\`\`\`mermaid\n${mermaidChart}\`\`\`\n\n`);
      }
    });
  }
  
  // 2. Look for Python matplotlib pie charts
  const pythonPieChartPattern = /import matplotlib\.pyplot as plt[\s\S]*?plt\.pie\([\s\S]*?plt\.show\(\)/gi;
  const pieChartMatches = content.match(pythonPieChartPattern);
  
  if (pieChartMatches && pieChartMatches.length > 0) {
    pieChartMatches.forEach((match) => {
      // Check if it's not already a Mermaid chart
      if (!match.includes('```mermaid')) {
        const mermaidChart = convertPythonPieChart(match);
        processedContent = processedContent.replace(match, `\n\n\`\`\`mermaid\n${mermaidChart}\`\`\`\n\n`);
      }
    });
  }
  
  // 3. Look for textual pie charts (percentages)
  const textualPieChartPattern = /(?:Men|Women|Male|Female|Other)[\s\S]*?(?:\d+%|\d+\.\d+%)/gi;
  const textualMatches = content.match(textualPieChartPattern);
  
  if (textualMatches && textualMatches.length > 0) {
    textualMatches.forEach((match) => {
      // Check if it's not already a Mermaid chart and not part of Python code
      if (!match.includes('```mermaid') && !match.includes('plt.') && !match.includes('matplotlib')) {
        const mermaidChart = convertTextualPieChart(match);
        if (mermaidChart) {
          processedContent = processedContent.replace(match, `\n\n\`\`\`mermaid\n${mermaidChart}\`\`\`\n\n`);
        }
      }
    });
  }
  
  return processedContent;
}

/**
 * Convert textual pie chart data to Mermaid syntax
 * 
 * @param text - The textual pie chart data
 * @returns Mermaid pie chart syntax
 */
export function convertTextualPieChart(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const mermaidLines: string[] = ['pie title Data Distribution'];
  
  // Look for patterns like "Men: 51%" or "Women: 49%"
  const percentagePattern = /(.+?):\s*(\d+(?:\.\d+)?%?)/g;
  let match;
  
  while ((match = percentagePattern.exec(text)) !== null) {
    const label = match[1].trim();
    const value = match[2].replace('%', '');
    mermaidLines.push(`"${label}" : ${value}`);
  }
  
  // Only return if we found data
  return mermaidLines.length > 1 ? mermaidLines.join('\n') : '';
}

/**
 * Extract table data from markdown table
 * 
 * @param tableText - The markdown table text
 * @returns Parsed table data with headers and rows
 */
export interface TableData {
  headers: string[];
  rows: string[][];
}

export function parseMarkdownTable(tableText: string): TableData | null {
  const lines = tableText.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < 3) return null; // Need at least header, separator, and one row
  
  // Extract headers
  const headerLine = lines[0];
  const headers = headerLine.split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0);
  
  // Skip separator line (line with dashes)
  const dataLines = lines.slice(2);
  
  // Extract rows
  const rows: string[][] = [];
  for (const line of dataLines) {
    const cells = line.split('|')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return { headers, rows };
}

/**
 * Detect if table contains numeric data suitable for charting
 * 
 * @param tableData - Parsed table data
 * @returns true if table has numeric columns
 */
export function isChartableTable(tableData: TableData): boolean {
  if (!tableData || tableData.rows.length === 0) return false;
  
  // Check if at least one column (excluding first) has numeric data
  for (let colIndex = 1; colIndex < tableData.headers.length; colIndex++) {
    let numericCount = 0;
    for (const row of tableData.rows) {
      if (row[colIndex]) {
        const value = row[colIndex].replace(/[$,€£¥%]/g, '').trim();
        if (!isNaN(parseFloat(value))) {
          numericCount++;
        }
      }
    }
    // If more than 50% of values are numeric, it's chartable
    if (numericCount > tableData.rows.length * 0.5) {
      return true;
    }
  }
  
  return false;
}

/**
 * Determine the best chart type for table data
 * 
 * @param tableData - Parsed table data
 * @returns Recommended chart type
 */
export function detectChartType(tableData: TableData): 'bar' | 'line' | 'pie' | 'scatter' {
  if (!tableData || tableData.rows.length === 0) return 'bar';
  
  const numColumns = tableData.headers.length;
  const numRows = tableData.rows.length;
  
  // Pie chart: Single numeric column, few rows (< 10)
  if (numColumns === 2 && numRows <= 10) {
    return 'pie';
  }
  
  // Line chart: Time series or sequential data
  const firstHeader = tableData.headers[0].toLowerCase();
  if (firstHeader.includes('time') || firstHeader.includes('date') || 
      firstHeader.includes('year') || firstHeader.includes('month') ||
      firstHeader.includes('day') || firstHeader.includes('quarter')) {
    return 'line';
  }
  
  // Scatter: Two numeric columns
  if (numColumns === 2) {
    const firstColNumeric = tableData.rows.every(row => 
      !isNaN(parseFloat(row[0].replace(/[$,€£¥%]/g, '')))
    );
    const secondColNumeric = tableData.rows.every(row => 
      !isNaN(parseFloat(row[1].replace(/[$,€£¥%]/g, '')))
    );
    
    if (firstColNumeric && secondColNumeric) {
      return 'scatter';
    }
  }
  
  // Default: Bar chart
  return 'bar';
}

/**
 * Convert table data to ECharts configuration
 * 
 * @param tableData - Parsed table data
 * @param chartType - Type of chart to generate
 * @returns ECharts configuration object
 */
export function tableToEChartsConfig(tableData: TableData, chartType?: 'bar' | 'line' | 'pie' | 'scatter'): any {
  if (!tableData || tableData.rows.length === 0) return null;
  
  const type = chartType || detectChartType(tableData);
  
  // Extract labels (first column)
  const labels = tableData.rows.map(row => row[0]);
  
  // Extract numeric data from remaining columns
  const datasets: any[] = [];
  
  for (let colIndex = 1; colIndex < tableData.headers.length; colIndex++) {
    const data = tableData.rows.map(row => {
      const value = row[colIndex]?.replace(/[$,€£¥%]/g, '').trim();
      return parseFloat(value) || 0;
    });
    
    datasets.push({
      name: tableData.headers[colIndex],
      data: data
    });
  }
  
  // Generate ECharts config based on type
  if (type === 'pie') {
    return {
      title: {
        text: 'Data Distribution',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: tableData.headers[1] || 'Value',
          type: 'pie',
          radius: '50%',
          data: labels.map((label, index) => ({
            name: label,
            value: datasets[0].data[index]
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  } else if (type === 'line') {
    return {
      title: {
        text: 'Trend Analysis',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: datasets.map(d => d.name),
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels
      },
      yAxis: {
        type: 'value'
      },
      series: datasets.map(dataset => ({
        name: dataset.name,
        type: 'line',
        data: dataset.data,
        smooth: true
      }))
    };
  } else if (type === 'scatter') {
    return {
      title: {
        text: 'Scatter Plot',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ({c})'
      },
      xAxis: {
        name: tableData.headers[0]
      },
      yAxis: {
        name: tableData.headers[1]
      },
      series: [
        {
          name: 'Data Points',
          type: 'scatter',
          data: tableData.rows.map(row => [
            parseFloat(row[0].replace(/[$,€£¥%]/g, '')) || 0,
            parseFloat(row[1].replace(/[$,€£¥%]/g, '')) || 0
          ]),
          symbolSize: 10
        }
      ]
    };
  } else {
    // Bar chart (default)
    return {
      title: {
        text: 'Comparison',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: datasets.map(d => d.name),
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: labels
      },
      yAxis: {
        type: 'value'
      },
      series: datasets.map(dataset => ({
        name: dataset.name,
        type: 'bar',
        data: dataset.data,
        emphasis: {
          focus: 'series'
        }
      }))
    };
  }
}

/**
 * Extract all markdown tables from content
 * 
 * @param content - The content to search
 * @returns Array of table texts
 */
export function extractMarkdownTables(content: string): string[] {
  const tables: string[] = [];
  const lines = content.split('\n');
  
  let currentTable: string[] = [];
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if line is part of a table (contains |)
    if (trimmed.includes('|')) {
      inTable = true;
      currentTable.push(line);
    } else if (inTable && trimmed.length === 0) {
      // End of table (empty line)
      if (currentTable.length >= 3) {
        tables.push(currentTable.join('\n'));
      }
      currentTable = [];
      inTable = false;
    } else if (inTable) {
      // Non-table line while in table - end table
      if (currentTable.length >= 3) {
        tables.push(currentTable.join('\n'));
      }
      currentTable = [];
      inTable = false;
    }
  }
  
  // Handle table at end of content
  if (currentTable.length >= 3) {
    tables.push(currentTable.join('\n'));
  }
  
  return tables;
}

/**
 * Convert all chartable tables in content to chart components
 * 
 * @param content - The markdown content
 * @returns Content with chart placeholders and chart configs
 */
export function convertTablesToCharts(content: string): { 
  content: string; 
  charts: Array<{ id: string; config: any; sourceTable: string }> 
} {
  const tables = extractMarkdownTables(content);
  const charts: Array<{ id: string; config: any; sourceTable: string }> = [];
  let processedContent = content;
  
  tables.forEach((tableText, index) => {
    const tableData = parseMarkdownTable(tableText);
    
    if (tableData && isChartableTable(tableData)) {
      const chartId = `table-chart-${index}-${Date.now()}`;
      const chartConfig = tableToEChartsConfig(tableData);
      
      if (chartConfig) {
        charts.push({
          id: chartId,
          config: chartConfig,
          sourceTable: tableText
        });
        
        // Add chart placeholder after the table
        processedContent = processedContent.replace(
          tableText,
          `${tableText}\n\n📊 **Interactive Chart** (generated from table above)\n<div data-chart-id="${chartId}"></div>\n\n`
        );
      }
    }
  });
  
  return { content: processedContent, charts };
}

/**
 * Detect chart type from content
 * 
 * @param content - The content to analyze
 * @returns Object with chart type and library detected
 */
export function detectChartLibrary(content: string): { library: string; chartType: string } | null {
  // Mermaid
  if (/```mermaid|^(graph|flowchart|sequenceDiagram|pie|gantt|xychart)/m.test(content)) {
    return { library: 'mermaid', chartType: 'diagram' };
  }
  
  // Python matplotlib/seaborn
  if (/matplotlib|plt\.|seaborn|sns\./.test(content)) {
    if (/\.heatmap\(|\.imshow\(/.test(content)) return { library: 'matplotlib', chartType: 'heatmap' };
    if (/\.bar\(|\.barh\(/.test(content)) return { library: 'matplotlib', chartType: 'bar' };
    if (/\.pie\(/.test(content)) return { library: 'matplotlib', chartType: 'pie' };
    if (/\.scatter\(/.test(content)) return { library: 'matplotlib', chartType: 'scatter' };
    if (/\.plot\(/.test(content)) return { library: 'matplotlib', chartType: 'line' };
    if (/\.hist\(/.test(content)) return { library: 'matplotlib', chartType: 'histogram' };
    if (/\.boxplot\(/.test(content)) return { library: 'matplotlib', chartType: 'boxplot' };
    return { library: 'matplotlib', chartType: 'unknown' };
  }
  
  // Chart.js
  if (/Chart\(|chartjs|chart\.js/i.test(content)) {
    const typeMatch = content.match(/type:\s*['"](\w+)['"]/);
    return { library: 'chartjs', chartType: typeMatch ? typeMatch[1] : 'unknown' };
  }
  
  // ASCII/Text bar chart
  if (/^\s*\d+\s*\|[\s█▓▒░■□▪▫●○◆◇★☆\-=\#\*]+/m.test(content) || /[█▓▒░]{3,}/.test(content)) {
    return { library: 'ascii', chartType: 'bar' };
  }
  
  // D3.js
  if (/d3\.|from\s+['"]d3['"]/i.test(content)) {
    return { library: 'd3', chartType: 'custom' };
  }
  
  // Plotly
  if (/plotly\.|Plotly\./i.test(content)) {
    if (/go\.Heatmap|Heatmap\(/.test(content)) return { library: 'plotly', chartType: 'heatmap' };
    if (/go\.Bar|Bar\(/.test(content)) return { library: 'plotly', chartType: 'bar' };
    if (/go\.Pie|Pie\(/.test(content)) return { library: 'plotly', chartType: 'pie' };
    if (/go\.Scatter|Scatter\(/.test(content)) return { library: 'plotly', chartType: 'scatter' };
    return { library: 'plotly', chartType: 'unknown' };
  }
  
  // Recharts
  if (/recharts|<(?:BarChart|LineChart|PieChart)/i.test(content)) {
    if (/<BarChart/.test(content)) return { library: 'recharts', chartType: 'bar' };
    if (/<LineChart/.test(content)) return { library: 'recharts', chartType: 'line' };
    if (/<PieChart/.test(content)) return { library: 'recharts', chartType: 'pie' };
    if (/<AreaChart/.test(content)) return { library: 'recharts', chartType: 'area' };
    if (/<ScatterChart/.test(content)) return { library: 'recharts', chartType: 'scatter' };
    return { library: 'recharts', chartType: 'unknown' };
  }
  
  // Highcharts
  if (/Highcharts\./i.test(content)) {
    return { library: 'highcharts', chartType: 'unknown' };
  }
  
  // ECharts
  if (/echarts\.|setOption\s*\(/i.test(content)) {
    return { library: 'echarts', chartType: 'unknown' };
  }
  
  // ApexCharts
  if (/ApexCharts/i.test(content)) {
    return { library: 'apexcharts', chartType: 'unknown' };
  }
  
  return null;
}

/**
 * Extract ASCII bar chart data and convert to structured format
 * 
 * @param content - The ASCII chart content
 * @returns Extracted chart data or null
 */
export function extractAsciiBarChart(content: string): { labels: string[]; values: number[]; title?: string } | null {
  const lines = content.split('\n');
  const labels: string[] = [];
  const values: number[] = [];
  let title: string | undefined;
  
  // Look for title (usually before the chart)
  const titleMatch = content.match(/^([A-Z][^|\n]+(?:\(\d{4}\))?)\s*$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }
  
  // Pattern: "120 | ████████████████████████████████████████ December (120K)"
  const barPattern = /^\s*(\d+)\s*\|\s*[█▓▒░■□▪▫●○◆◇★☆\-=\#\*\s]+\s*(\w+)\s*\((\d+[KkMm]?)\)/;
  
  for (const line of lines) {
    const match = line.match(barPattern);
    if (match) {
      const label = match[2];
      let value = match[3];
      
      // Convert K/M notation
      let numValue = parseFloat(value.replace(/[KkMm]/g, ''));
      if (/[Kk]/.test(value)) numValue *= 1000;
      if (/[Mm]/.test(value)) numValue *= 1000000;
      
      labels.push(label);
      values.push(numValue);
    }
  }
  
  if (labels.length > 0) {
    return { labels, values, title };
  }
  
  return null;
}
