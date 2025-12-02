import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make proxy URL available to frontend
    'import.meta.env.VITE_PROXY_URL': JSON.stringify(process.env.VITE_PROXY_URL || 'http://localhost:3002'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Increase chunk size warning limit (we'll optimize below)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks for code splitting
        manualChunks: {
          // React core - loaded first
          'vendor-react': ['react', 'react-dom'],
          
          // AI SDKs - lazy loaded when needed
          'vendor-ai-openai': ['openai'],
          'vendor-ai-anthropic': ['@anthropic-ai/sdk'],
          'vendor-ai-google': ['@google/generative-ai'],
          
          // Charting libraries - lazy loaded
          'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          'vendor-echarts': ['echarts'],
          'vendor-plotly': ['plotly.js-dist-min', 'react-plotly.js'],
          
          // Mermaid - lazy loaded for diagrams
          'vendor-mermaid': ['mermaid'],
          
          // Document export - lazy loaded
          'vendor-export': ['docx', 'pdfmake', 'jspdf', 'html2canvas'],
          
          // Markdown processing
          'vendor-markdown': ['marked', 'dompurify'],
          
          // Animation
          'vendor-animation': ['framer-motion'],
          
          // Utilities
          'vendor-utils': ['zustand', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    // Security headers for development
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api/perplexity': {
        target: 'https://api.perplexity.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/perplexity/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward the Authorization header from the original request
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // Log what's being sent to Perplexity
            console.log('🔄 Proxying to Perplexity:', {
              method: proxyReq.method,
              path: proxyReq.path,
              hasAuth: !!req.headers.authorization
            });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 Perplexity Response:', {
              status: proxyRes.statusCode,
              statusMessage: proxyRes.statusMessage
            });
          });
        },
      },
      '/api/mistral': {
        target: 'https://api.mistral.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mistral/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward the Authorization header from the original request
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        },
      },
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward the Authorization header from the original request
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            console.log('🔄 Proxying to DeepSeek:', {
              method: proxyReq.method,
              path: proxyReq.path,
              hasAuth: !!req.headers.authorization
            });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 DeepSeek Response:', {
              status: proxyRes.statusCode,
              statusMessage: proxyRes.statusMessage
            });
          });
        },
      },
    },
  },
})
