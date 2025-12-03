console.log('🐒 Chaos Monkey Server Starting...');

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const CONFIG = {
  port: 4000,
  targets: {
    local: 'http://localhost:5173',
    production: 'https://onemindai.vercel.app'
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));

// WebSocket
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', config: CONFIG }));
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

// Simple test route
app.get('/api/config', (req, res) => {
  res.json(CONFIG);
});

app.get('/api/suites', (req, res) => {
  res.json([
    { id: 'pageLoad', name: 'Page Load Tests', testCount: 4, requiresBrowser: true },
    { id: 'uiChaos', name: 'UI Chaos Tests', testCount: 6, requiresBrowser: true },
    { id: 'aiProviders', name: 'AI Provider Tests', testCount: 4, requiresBrowser: true },
    { id: 'security', name: 'Security Tests', testCount: 3, requiresBrowser: true },
    { id: 'performance', name: 'Performance Tests', testCount: 3, requiresBrowser: true },
    { id: 'exports', name: 'Export Tests', testCount: 2, requiresBrowser: true }
  ]);
});

// Start server
server.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🐒 CHAOS MONKEY - FRONTEND TESTING SERVER                  ║
║                                                              ║
║   Dashboard: http://localhost:${CONFIG.port}                       ║
║   API:       http://localhost:${CONFIG.port}/api                   ║
║   WebSocket: ws://localhost:${CONFIG.port}                         ║
║                                                              ║
║   Mode: FRONTEND (Puppeteer-based)                           ║
║   Browser: Visible (you'll see tests running!)               ║
║                                                              ║
║   Targets:                                                   ║
║   - Local:      ${CONFIG.targets.local.padEnd(35)}       ║
║   - Production: ${CONFIG.targets.production.padEnd(35)}       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('\n✅ Server is ready! Open http://localhost:4000 in your browser\n');
});

console.log('Server setup complete, listening on port', CONFIG.port);
