// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://stackpractices.com',
  output: 'static',
  trailingSlash: 'always',
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
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
