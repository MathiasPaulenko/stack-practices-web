// @ts-check
import { defineConfig } from 'astro/config';

import rehypeShortCode from './src/lib/rehype-short-code.mjs';
import remarkTruncateFaq from './src/lib/remark-truncate-faq.mjs';

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
    remarkPlugins: [[remarkTruncateFaq, { maxFaqs: 5 }]],
    rehypePlugins: [rehypeShortCode],
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
