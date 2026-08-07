// @ts-check
import { defineConfig } from 'astro/config';

import shikiShortCode from './src/lib/shiki-short-code.mjs';
import shikiClassify from './src/lib/shiki-classify.mjs';
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
      theme: 'css-variables',
      wrap: false,
      transformers: [shikiShortCode(), shikiClassify()],
    },
    remarkPlugins: [
      remarkTruncateFaq,
    ],
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
