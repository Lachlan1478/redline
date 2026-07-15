import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base matches the GitHub Pages path: https://lachlan1478.github.io/redline/
export default defineConfig({
  base: '/redline/',
  plugins: [react(), tailwindcss()],
});
