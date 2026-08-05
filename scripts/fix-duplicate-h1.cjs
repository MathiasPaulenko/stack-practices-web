#!/usr/bin/env node
/**
 * Remove the top markdown H1 title from content files.
 *
 * The Astro article components (RecipeArticle, PatternArticle, GuideArticle,
 * DocArticle) already render the frontmatter `title` as the page <h1>. When the
 * markdown body also starts with `# Title`, the rendered page ends up with two
 * <h1> elements. This script removes the first non-code H1 heading after the
 * YAML frontmatter and downgrades any additional non-code H1 headings to H2.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

function findMdFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isInCodeBlock(lines, lineIndex) {
  let inCode = false;
  for (let i = 0; i < lineIndex; i++) {
    const line = lines[i];
    if (typeof line !== 'string') continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
    }
  }
  return inCode;
}

function findBodyStart(lines) {
  if (lines.length < 2 || !lines[0].startsWith('---')) return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) return i + 1;
  }
  return 0;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const bodyStart = findBodyStart(lines);

  const h1Indices = [];
  for (let i = bodyStart; i < lines.length; i++) {
    if (isInCodeBlock(lines, i)) continue;
    if (/^#\s+/.test(lines[i]) && !/^##\s+/.test(lines[i])) {
      h1Indices.push(i);
    }
  }

  if (h1Indices.length === 0) return { changed: false, removed: 0, downgraded: 0 };

  let removed = 0;
  let downgraded = 0;

  // Remove the first H1 (the top title) and the following blank line if any,
  // so the body starts cleanly with the next heading.
  const firstIdx = h1Indices[0];
  const endIdx = firstIdx + 1;
  if (lines[endIdx] !== undefined && lines[endIdx].trim() === '') {
    lines.splice(firstIdx, 2);
    removed = 1;
  } else {
    lines.splice(firstIdx, 1);
    removed = 1;
  }

  // Re-scan for any remaining non-code H1s and downgrade them to H2.
  // Because we removed a line, re-scan from the original body start.
  for (let i = bodyStart; i < lines.length; i++) {
    if (isInCodeBlock(lines, i)) continue;
    if (/^#\s+/.test(lines[i]) && !/^##\s+/.test(lines[i])) {
      lines[i] = '#' + lines[i];
      downgraded++;
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return { changed: true, removed, downgraded };
}

const allFiles = findMdFiles(CONTENT_DIR);
let filesChanged = 0;
let totalRemoved = 0;
let totalDowngraded = 0;

for (const file of allFiles) {
  const result = fixFile(file);
  if (result.changed) {
    filesChanged++;
    totalRemoved += result.removed;
    totalDowngraded += result.downgraded;
    console.log(`Fixed: ${path.relative(CONTENT_DIR, file)} (-${result.removed} H1, +${result.downgraded} H2)`);
  }
}

console.log(`\nTotal files changed: ${filesChanged}`);
console.log(`Top H1 titles removed: ${totalRemoved}`);
console.log(`Additional H1s downgraded to H2: ${totalDowngraded}`);
