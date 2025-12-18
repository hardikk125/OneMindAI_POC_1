#!/usr/bin/env node

/**
 * Convert Markdown to DOCX using docx library
 * npm install docx
 */

const { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType, TextRun, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

function readMarkdown(filepath) {
  return fs.readFileSync(filepath, 'utf-8');
}

function parseTable(lines, startIdx) {
  const headers = [];
  const rows = [];
  let idx = startIdx;
  
  // Parse header
  if (idx < lines.length && lines[idx].includes('|')) {
    const headerLine = lines[idx].trim();
    const headerCells = headerLine.split('|').slice(1, -1).map(h => h.trim());
    headers.push(...headerCells);
    idx++;
    
    // Skip separator line
    if (idx < lines.length && lines[idx].includes('---')) {
      idx++;
    }
    
    // Parse data rows
    while (idx < lines.length && lines[idx].includes('|')) {
      const rowLine = lines[idx].trim();
      if (!rowLine || rowLine.startsWith('#')) break;
      
      const rowCells = rowLine.split('|').slice(1, -1).map(cell => cell.trim());
      if (rowCells.length > 0 && rowCells.some(cell => cell)) {
        rows.push(rowCells);
      }
      idx++;
    }
  }
  
  return { headers, rows, nextIdx: idx };
}

function createTableFromMarkdown(headers, rows) {
  const tableRows = [];
  
  // Header row
  const headerCells = headers.map(header => 
    new TableCell({
      children: [new Paragraph({
        text: header,
        bold: true,
        alignment: AlignmentType.LEFT
      })],
      shading: { fill: 'D3D3D3' }
    })
  );
  tableRows.push(new TableRow({ children: headerCells }));
  
  // Data rows
  rows.forEach(row => {
    const dataCells = row.map(cell => 
      new TableCell({
        children: [new Paragraph({
          text: cell,
          alignment: AlignmentType.LEFT
        })]
      })
    );
    tableRows.push(new TableRow({ children: dataCells }));
  });
  
  return new Table({
    rows: tableRows,
    width: { size: 100, type: 'pct' }
  });
}

function markdownToDocx(mdFilepath, docxFilepath) {
  const content = readMarkdown(mdFilepath);
  const lines = content.split('\n');
  const sections = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }
    
    // Handle headings
    if (line.startsWith('# ')) {
      sections.push(new Paragraph({
        text: line.slice(2).trim(),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }));
      i++;
    } else if (line.startsWith('## ')) {
      sections.push(new Paragraph({
        text: line.slice(3).trim(),
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 150 }
      }));
      i++;
    } else if (line.startsWith('### ')) {
      sections.push(new Paragraph({
        text: line.slice(4).trim(),
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 100 }
      }));
      i++;
    } else if (line.startsWith('#### ')) {
      sections.push(new Paragraph({
        text: line.slice(5).trim(),
        heading: HeadingLevel.HEADING_4,
        spacing: { after: 100 }
      }));
      i++;
    }
    // Handle tables
    else if (line.includes('|')) {
      const { headers, rows, nextIdx } = parseTable(lines, i);
      if (headers.length > 0 && rows.length > 0) {
        sections.push(createTableFromMarkdown(headers, rows));
        sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
      i = nextIdx;
    }
    // Handle horizontal rules
    else if (line.startsWith('---')) {
      sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      i++;
    }
    // Handle regular text
    else if (line.trim()) {
      // Clean markdown formatting
      let text = line
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/_/g, '')
        .trim();
      
      if (text) {
        sections.push(new Paragraph({
          text: text,
          spacing: { after: 100 }
        }));
      }
      i++;
    } else {
      i++;
    }
  }
  
  const doc = new Document({
    sections: [{
      children: sections
    }]
  });
  
  Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(docxFilepath, buffer);
    console.log(`✅ Successfully converted to: ${docxFilepath}`);
  }).catch(err => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  });
}

const mdFile = path.join(__dirname, 'docs', 'HARDCODED_VALUES_FULL_AUDIT.md');
const docxFile = path.join(__dirname, 'docs', 'HARDCODED_VALUES_FULL_AUDIT.docx');

markdownToDocx(mdFile, docxFile);
