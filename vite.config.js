import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',  // Ensures that assets are correctly resolved in all pages
  build: {
    outDir: 'dist', // Where bundled files will go
    assetsDir: 'assets',  // Ensure assets go to /assets folder in the dist folder
  },
});