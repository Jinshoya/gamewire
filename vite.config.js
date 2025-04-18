import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // the directory to build the files into
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html', // Make sure the entry point is correct
    },
  },
});