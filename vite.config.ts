import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// dev/preview: ส่ง /api ไปยัง DPM API (npm run server)
const apiProxy = { '/api': 'http://localhost:3001' }

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
