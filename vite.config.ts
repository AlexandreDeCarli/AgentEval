import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileStorePlugin } from './vite-plugin-file-store'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    fileStorePlugin('data'),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || '2.5.0'),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})

