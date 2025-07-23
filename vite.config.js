// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/React_test/", // <-- 반드시 본인 저장소 이름
  plugins: [react()],
})