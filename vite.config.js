import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'index.html', // Or trailers.html if you are using that as your entry point
    },
  },
  plugins: [
    {
      name: 'html-inject',
      transformIndexHtml(html) {
        // Check if the current HTML file is trailers.html
        if (html.includes('trailers.html')) {
          // Dynamically insert the script tag pointing to the correct bundled file
          return html.replace(
            /<\/body>/,
            `<script type="module" src="/assets/index-xxxx.js"></script></body>` // Replace `index-xxxx.js` with your dynamically generated filename
          );
        }

        return html;
      },
    },
  ],
});
