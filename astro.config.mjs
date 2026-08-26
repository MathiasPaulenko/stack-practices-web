// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

import shikiShortCode from './src/lib/shiki-short-code.mjs';
import shikiClassify from './src/lib/shiki-classify.mjs';
import rehypeTrimShikiPre from './src/lib/rehype-trim-shiki-pre.mjs';
import remarkMermaidBlocks from './src/lib/remark-mermaid-blocks.mjs';
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
      // shikiShortCode keeps very long blocks plain to avoid oversized HTML; see src/lib/shiki-short-code.mjs
      transformers: [shikiShortCode(), shikiClassify()],
    },
    remarkPlugins: [remarkMermaidBlocks, remarkTruncateFaq],
    rehypePlugins: [rehypeTrimShikiPre],
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
