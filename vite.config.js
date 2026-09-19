import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Plugin: quitar 'crossorigin' del HTML generado
function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/ crossorigin/g, '')
        .replace(/<link rel="modulepreload"[^>]*>/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|react-router-dom)/ },
            { name: 'firebase-vendor', test: /node_modules\/(firebase|@firebase)/ },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})