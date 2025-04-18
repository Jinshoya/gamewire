// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Define the output directory for the build assets
    outDir: 'public', // All assets (main.js, CSS, etc.) will be built here

    // Input configuration for multiple HTML files
    rollupOptions: {
      input: {
        main: './index.html', // Main page
        trailers: './trailers.html', // Trailers page
      },
    },
  },

  // Ensure Vite serves assets properly
  server: {
    // Serve the public folder (for local development)
    fs: {
      allow: ['.'], // Allow access to the root directory for the public folder
    },
  },

  // Optionally, add any other Vite plugins you need here
});
