import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

//https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
  },
  base: command === 'build' ? '/grupo4/' : '/',
}))
