import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {ghPages} from 'vite-plugin-gh-pages';
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), ghPages(), tailwindcss(),],
  base: '/audioRepeater/',
});

