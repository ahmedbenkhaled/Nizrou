// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 👈 استدعاء محرك تايلوند الحديث

// https://vite.js.org/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 👈 تفعيل المحرك التلقائي داخل بيئة Vite
  ],
})