/* render-mermaid.mjs
 *
 * Scans all Markdown files in src/content/ for fenced ```mermaid blocks,
 * renders each to an SVG file using @mermaid-js/mermaid-cli (mmdc),
 * and saves them to public/assets/diagrams/{slug}-{index}.svg.
 *
 * The remark-mermaid-blocks.mjs plugin then replaces the fenced blocks
 * with <img> tags pointing to the pre-rendered SVGs.
 *
 * Usage: node scripts/render-mermaid.mjs
 * Or:    npm run mermaid:render
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const CONTENT_DIR = 'src/content';
const OUTPUT_DIR = 'public/assets/diagrams';
const MMDC_BIN = process.platform === 'win32'
  ? 'node_modules/.bin/mmdc.cmd'
  : 'node_modules/.bin/mmdc';

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Find all .md files recursively
function findMdFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findMdFiles(CONTENT_DIR);
let totalRendered = 0;
let totalSkipped = 0;

for (const mdFile of files) {
  const content = readFileSync(mdFile, 'utf-8');

  // Extract all mermaid code blocks (handle CRLF and LF)
  const mermaidRegex = /```mermaid\r?\n([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    blockIndex++;
    const mermaidCode = match[1].trim();

    // Generate slug from file path:
    // src/content/recipes/api/api-documentation-openapi.md → api-documentation-openapi
    // src/content/recipes/api/api-documentation-openapi.es.md → api-documentation-openapi-es
    const relPath = relative(CONTENT_DIR, mdFile).replace(/\\/g, '/');
    const parts = relPath.replace('.md', '').split('/');
    const slug = parts.slice(2).join('-').replace(/\.es$/, '-es');

    const svgName = `${slug}-${blockIndex}.svg`;
    const svgPath = join(OUTPUT_DIR, svgName);

    // Write mermaid code to a temp .mmd file
    const tempMmd = join(OUTPUT_DIR, `_temp-${slug}-${blockIndex}.mmd`);
    writeFileSync(tempMmd, mermaidCode, 'utf-8');

    try {
      // Use system Chrome to avoid puppeteer download issues
      const puppeteerConfig = join(OUTPUT_DIR, '_puppeteer-config.json');
      writeFileSync(puppeteerConfig, JSON.stringify({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox'],
      }));

      const result = spawnSync('npx', [
        'mmdc',
        '-i', tempMmd,
        '-o', svgPath,
        '-t', 'default',
        '-b', 'white',
        '--scale', '1',
        '-p', puppeteerConfig,
      ], {
        stdio: 'pipe',
        timeout: 60000,
        shell: true,
      });

      try { unlinkSync(puppeteerConfig); } catch {}

      if (result.status !== 0) {
        throw new Error(result.stderr?.toString() || 'mmdc failed');
      }

      totalRendered++;
      console.log(`  \u2713 ${svgName}`);
    } catch (err) {
      totalSkipped++;
      console.error(`  \u2717 ${svgName}: ${err.message}`);
    } finally {
      try { unlinkSync(tempMmd); } catch {}
    }
  }
}

console.log(`\nRendered: ${totalRendered} SVGs`);
console.log(`Skipped:  ${totalSkipped}`);
console.log(`Output:   ${OUTPUT_DIR}/`);
