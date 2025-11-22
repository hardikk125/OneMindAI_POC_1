import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
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
