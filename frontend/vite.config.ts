import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  // Where Django lives. Production: the API origin. Development: the proxy target.
  const backendOrigin = (env.VITE_API_BASE_URL || env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000').replace(/\/+$/, '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_BACKEND_ORIGIN': JSON.stringify(backendOrigin),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // In development the browser only talks to Vite; Vite forwards /api/* to
      // Django. That keeps CORS out of the picture until you deploy.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
