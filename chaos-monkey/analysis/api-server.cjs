/**
 * Chaos Monkey Analysis API Server
 * Tracks and stores editable analysis data with change history
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3847;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// File paths
const CSV_PATH = path.join(__dirname, 'chaos-analysis-data.csv');
const HISTORY_PATH = path.join(__dirname, 'change-history.json');

// Initialize history file if not exists
if (!fs.existsSync(HISTORY_PATH)) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify({ changes: [] }, null, 2));
}

// Parse CSV to JSON
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || '';
    });
    row.id = i; // Add unique ID
    data.push(row);
  }
  
  return { headers, data };
}

// Parse a single CSV line (handles commas in values)
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

// Convert JSON back to CSV
function toCSV(headers, data) {
  const headerLine = headers.join(',');
  const dataLines = data.map(row => {
    return headers.map(h => {
      const val = row[h] || '';
      // Quote values containing commas
      return val.includes(',') ? `"${val}"` : val;
    }).join(',');
  });
  
  return [headerLine, ...dataLines].join('\n');
}

// GET - Fetch all analysis data
app.get('/api/chaos-analysis', (req, res) => {
  try {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const { headers, data } = parseCSV(csvContent);
    
    // Group by category for graph visualization
    const grouped = {
      definition: data.filter(d => d.category === 'definition'),
      benefits: data.filter(d => d.category === 'benefit'),
      values: data.filter(d => d.category === 'value'),
      dependencies: data.filter(d => d.category === 'dependency'),
      risks: data.filter(d => d.category === 'risk'),
      metrics: data.filter(d => d.category === 'metric')
    };
    
    // Calculate overall stats
    const stats = {
      totalItems: data.length,
      avgConfidence: Math.round(data.reduce((sum, d) => sum + (parseInt(d.confidence_level) || 0), 0) / data.length),
      aiAchievable: data.filter(d => d.ai_achievable === 'Yes').length,
      manualRequired: data.filter(d => d.ai_achievable === 'Partial' || d.ai_achievable === 'No').length,
      highEffort: data.filter(d => d.manual_effort === 'Very High' || d.manual_effort === 'High').length
    };
    
    res.json({
      success: true,
      headers,
      data,
      grouped,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Fetch change history
app.get('/api/chaos-analysis/history', (req, res) => {
  try {
    const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    res.json({ success: true, ...history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update a single row
app.put('/api/chaos-analysis/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const { headers, data } = parseCSV(csvContent);
    
    const rowIndex = data.findIndex(d => d.id === parseInt(id));
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: 'Row not found' });
    }
    
    // Store old values for history
    const oldRow = { ...data[rowIndex] };
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (headers.includes(key)) {
        data[rowIndex][key] = updates[key];
      }
    });
    
    // Update timestamp
    data[rowIndex].last_updated = new Date().toISOString();
    data[rowIndex].updated_by = updates.updated_by || 'user';
    
    // Save to CSV
    const newCSV = toCSV(headers, data);
    fs.writeFileSync(CSV_PATH, newCSV);
    
    // Log change to history
    const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    history.changes.push({
      timestamp: new Date().toISOString(),
      rowId: parseInt(id),
      field: data[rowIndex].field,
      oldValues: oldRow,
      newValues: data[rowIndex],
      updatedBy: updates.updated_by || 'user'
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    
    res.json({ success: true, updated: data[rowIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Add new row
app.post('/api/chaos-analysis', (req, res) => {
  try {
    const newRow = req.body;
    
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const { headers, data } = parseCSV(csvContent);
    
    // Set defaults
    newRow.last_updated = new Date().toISOString();
    newRow.updated_by = newRow.updated_by || 'user';
    newRow.id = data.length + 1;
    
    data.push(newRow);
    
    // Save to CSV
    const newCSV = toCSV(headers, data);
    fs.writeFileSync(CSV_PATH, newCSV);
    
    // Log to history
    const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    history.changes.push({
      timestamp: new Date().toISOString(),
      action: 'create',
      rowId: newRow.id,
      field: newRow.field,
      newValues: newRow,
      updatedBy: newRow.updated_by
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    
    res.json({ success: true, created: newRow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Remove a row
app.delete('/api/chaos-analysis/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const { headers, data } = parseCSV(csvContent);
    
    const rowIndex = data.findIndex(d => d.id === parseInt(id));
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: 'Row not found' });
    }
    
    const deletedRow = data.splice(rowIndex, 1)[0];
    
    // Save to CSV
    const newCSV = toCSV(headers, data);
    fs.writeFileSync(CSV_PATH, newCSV);
    
    // Log to history
    const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    history.changes.push({
      timestamp: new Date().toISOString(),
      action: 'delete',
      rowId: parseInt(id),
      field: deletedRow.field,
      deletedValues: deletedRow,
      updatedBy: req.body?.updated_by || 'user'
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    
    res.json({ success: true, deleted: deletedRow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Graph data for visualization
app.get('/api/chaos-analysis/graph', (req, res) => {
  try {
    const segment = req.query.segment || 'Chaos Monkey';
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const { data: allData } = parseCSV(csvContent);
    
    // Filter by segment
    const data = allData.filter(d => d.segment === segment);
    
    // Build nodes and links for graph visualization
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    
    // Segment configurations
    const segmentConfig = {
      'Chaos Monkey': {
        id: 'chaos-monkey',
        label: 'Chaos Monkey',
        color: '#ec4899'
      },
      'OneMindAI Best Response': {
        id: 'onemindai',
        label: 'OneMindAI Best Response',
        color: '#10b981'
      }
    };
    
    const config = segmentConfig[segment] || segmentConfig['Chaos Monkey'];
    
    // Add central node for this segment
    nodes.push({
      id: config.id,
      label: config.label,
      type: 'central',
      size: 40,
      color: config.color
    });
    nodeMap.set(config.id, true);
    
    // Add category nodes
    const categories = ['benefit', 'value', 'dependency', 'risk', 'metric'];
    const categoryColors = {
      benefit: '#10b981',
      value: '#3b82f6',
      dependency: '#f59e0b',
      risk: '#ef4444',
      metric: '#8b5cf6',
      definition: '#6b7280'
    };
    
    categories.forEach(cat => {
      nodes.push({
        id: `cat-${cat}`,
        label: cat.charAt(0).toUpperCase() + cat.slice(1) + 's',
        type: 'category',
        size: 25,
        color: categoryColors[cat]
      });
      links.push({
        source: config.id,
        target: `cat-${cat}`,
        strength: 0.8
      });
    });
    
    // Add data nodes
    data.forEach(row => {
      if (row.category && row.category !== 'definition') {
        const nodeId = `node-${row.id}`;
        nodes.push({
          id: nodeId,
          label: row.field,
          value: row.value,
          type: 'item',
          category: row.category,
          confidence: parseInt(row.confidence_level) || 0,
          aiAchievable: row.ai_achievable,
          manualEffort: row.manual_effort,
          impact: row.impact_if_missing,
          size: 15 + (parseInt(row.confidence_level) || 0) / 10,
          color: categoryColors[row.category]
        });
        
        // Link to category
        links.push({
          source: `cat-${row.category}`,
          target: nodeId,
          strength: 0.5
        });
        
        // Parse dependencies and create links
        if (row.dependencies) {
          row.dependencies.split('|').forEach(dep => {
            const depId = `dep-${dep.trim().replace(/\s+/g, '-').toLowerCase()}`;
            if (!nodeMap.has(depId)) {
              nodes.push({
                id: depId,
                label: dep.trim(),
                type: 'dependency-ref',
                size: 12,
                color: '#94a3b8'
              });
              nodeMap.set(depId, true);
            }
            links.push({
              source: nodeId,
              target: depId,
              strength: 0.3,
              dashed: true
            });
          });
        }
      }
    });
    
    res.json({
      success: true,
      nodes,
      links,
      stats: {
        totalNodes: nodes.length,
        totalLinks: links.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🐒 Chaos Monkey Analysis API Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  API:        http://localhost:${PORT}/api/chaos-analysis      ║
║  Graph:      http://localhost:${PORT}/api/chaos-analysis/graph║
║  History:    http://localhost:${PORT}/api/chaos-analysis/history║
║  Dashboard:  http://localhost:${PORT}/index.html              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
