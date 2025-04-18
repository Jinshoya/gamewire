import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'index.html', // Ensure your main entry point (could be trailers.html)
    },
  },
  plugins: [
    // If you want more advanced HTML handling, use this plugin
    {
      name: 'inject-main-js',
      transformIndexHtml(html) {
        // This will dynamically insert the correct bundled script tag into your trailers.html
        return html.replace(
          /<\/body>/,
          `<script type="module" src="/assets/[hashed-main-js-file].js"></script></body>`
        );
      },
    },
  ],
});
