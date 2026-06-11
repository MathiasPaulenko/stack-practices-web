// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://stackpractices.com',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
    },
  },
  vite: {
    // Cast avoids a cosmetic type mismatch between @tailwindcss/vite and
    // Astro's bundled Vite types; the build is unaffected.
    plugins: [/** @type {any} */ (tailwindcss())],
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
