#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple markdown to HTML converter, then we'll create a basic DOCX
const { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, TextRun, HeadingLevel, AlignmentType } = require('docx');

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content;
}

function createDocxFromMarkdown(mdContent) {
  const lines = mdContent.split('\n');
  const sections = [];
  let currentSection = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines at start of section
    if (currentSection.length === 0 && !line.trim()) continue;
    
    currentSection.push(line);
    
    // Process section when we hit a heading or end of file
    if ((line.startsWith('#') && currentSection.length > 1) || i === lines.length - 1) {
      if (currentSection.length > 1) {
        sections.push(currentSection.slice(0, -1).join('\n'));
      }
      currentSection = [line];
    }
  }
  
  return sections;
}

function convertToDocxParagraphs(mdContent) {
  const lines = mdContent.split('\n');
  const paragraphs = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // H1 Heading
    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2).trim(),
          heading: HeadingLevel.HEADING_1,
          thematicBreak: false,
          spacing: { after: 200 }
        })
      );
    }
    // H2 Heading
    else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 }
        })
      );
    }
    // H3 Heading
    else if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 }
        })
      );
    }
    // H4 Heading
    else if (line.startsWith('#### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(5).trim(),
          heading: HeadingLevel.HEADING_4,
          spacing: { after: 100 }
        })
      );
    }
    // Code block
    else if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      paragraphs.push(
        new Paragraph({
          text: codeLines.join('\n'),
          style: 'Intense Quote',
          spacing: { before: 100, after: 100 }
        })
      );
    }
    // Table
    else if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      i--;
      
      // Parse table
      const rows = tableLines.map(l => 
        l.split('|').slice(1, -1).map(cell => cell.trim())
      ).filter(row => row.some(cell => cell && cell !== '---'));
      
      if (rows.length > 0) {
        const tableRows = rows.map((row, idx) => 
          new TableRow({
            cells: row.map(cellText => 
              new TableCell({
                children: [new Paragraph({
                  text: cellText,
                  bold: idx === 0
                })],
                width: { size: 100 / row.length, type: WidthType.PERCENTAGE }
              })
            )
          })
        );
        
        paragraphs.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        );
      }
    }
    // Bullet list
    else if (line.trim().startsWith('- ')) {
      paragraphs.push(
        new Paragraph({
          text: line.trim().substring(2),
          bullet: { level: 0 },
          spacing: { after: 50 }
        })
      );
    }
    // Regular paragraph
    else if (line.trim()) {
      paragraphs.push(
        new Paragraph({
          text: line.trim(),
          spacing: { after: 100 }
        })
      );
    }
    
    i++;
  }
  
  return paragraphs;
}

async function main() {
  try {
    const mdFile = path.join(__dirname, 'docs', 'API_CONFIG_FINAL_AUDIT_REPORT.md');
    const docxFile = path.join(__dirname, 'docs', 'API_CONFIG_FINAL_AUDIT_REPORT.docx');
    
    console.log('📖 Reading markdown file...');
    const mdContent = parseMarkdownFile(mdFile);
    
    console.log('🔄 Converting to DOCX format...');
    const paragraphs = convertToDocxParagraphs(mdContent);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });
    
    console.log('💾 Writing Word document...');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxFile, buffer);
    
    console.log('✅ Success!');
    console.log(`📄 Word document created: ${docxFile}`);
    console.log(`📊 File size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
