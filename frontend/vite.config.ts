import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  // Where Django lives, for links to its own pages (sign in). Production: the
  // API origin. Development: the proxy target, or VITE_BACKEND_ORIGIN to differ.
  const backendOrigin = (
    env.VITE_BACKEND_ORIGIN ||
    env.VITE_API_BASE_URL ||
    env.VITE_DEV_API_PROXY ||
    'http://127.0.0.1:8000'
  ).replace(/\/+$/, '')

  // HTTPS in development.
  // 1. Preferred: a locally trusted certificate made with mkcert, stored as
  //    .certs/dev.pem and .certs/dev-key.pem (gitignored). Picked up
  //    automatically. Required for hostnames on the browser HSTS list such as
  //    *.vercel.app, where Chrome forces https and rejects self-signed certs.
  // 2. Fallback: VITE_DEV_HTTPS=1 serves a self-signed certificate (browser
  //    warns once). Fine for localhost or a made-up hostname, not for vercel.app.
  const certFile = fileURLToPath(new URL('./.certs/dev.pem', import.meta.url))
  const keyFile = fileURLToPath(new URL('./.certs/dev-key.pem', import.meta.url))
  const trustedCert = existsSync(certFile) && existsSync(keyFile)
  const selfSigned = !trustedCert && (env.VITE_DEV_HTTPS === '1' || env.VITE_DEV_HTTPS === 'true')

  return {
    plugins: [react(), tailwindcss(), ...(selfSigned ? [basicSsl()] : [])],
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
      https: trustedCert ? { cert: readFileSync(certFile), key: readFileSync(keyFile) } : undefined,
      // Hostnames the dev server will answer for besides localhost. Add the
      // production domain here if you point it at 127.0.0.1 in /etc/hosts.
      allowedHosts: ['maatverify.vercel.app'],
      // In development the browser only talks to Vite; Vite forwards /api/* to
      // Django. That keeps CORS out of the picture until you deploy.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:8000',
          changeOrigin: true,
          // The target may use a local mkcert certificate Node does not know.
          secure: false,
        },
      },
    },
  }
})
