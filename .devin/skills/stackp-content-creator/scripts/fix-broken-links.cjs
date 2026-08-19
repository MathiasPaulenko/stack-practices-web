#!/usr/bin/env node
/**
 * fix-broken-links.cjs — Fix broken relatedResources links
 *
 * For each broken link, tries to find a similar existing slug.
 * If found, replaces. If not, removes the link.
 * Ensures each file keeps at least 2 relatedResources.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../../../..', 'src', 'content');

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(p));
    else if (f.name.endsWith('.md')) results.push(p);
  }
  return results;
}

// Build slug -> filePath map
const files = walk(CONTENT_DIR);
const slugMap = new Map();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const m = content.match(/^slug:\s*(.+)$/m);
  if (m) slugMap.set(m[1].trim(), f);
});

console.log(`Found ${slugMap.size} unique slugs`);

// Fuzzy match: find closest slug by token overlap
function findClosestSlug(brokenSlug) {
  const brokenTokens = brokenSlug.split('-');
  let bestMatch = null;
  let bestScore = 0;

  for (const [slug] of slugMap) {
    if (slug === brokenSlug) continue;
    const slugTokens = slug.split('-');
    let overlap = 0;
    for (const bt of brokenTokens) {
      if (slugTokens.includes(bt)) overlap++;
    }
    const score = overlap / Math.max(brokenTokens.length, slugTokens.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = slug;
    }
  }
  return bestMatch;
}

let fixedCount = 0;
let removedCount = 0;
let replacedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('relatedResources:')) return;

  const lines = content.split(/\r?\n/);
  let inRelated = false;
  let relatedStart = -1;
  let relatedEnd = -1;
  let relatedLinks = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^relatedResources:\s*$/.test(lines[i])) {
      inRelated = true;
      relatedStart = i;
      continue;
    }
    if (inRelated) {
      if (/^  -\s+/.test(lines[i])) {
        const link = lines[i].replace(/^  -\s+/, '').trim();
        relatedLinks.push({ link, lineIndex: i });
      } else if (/^[a-zA-Z]/.test(lines[i])) {
        inRelated = false;
        relatedEnd = i;
        break;
      }
    }
  }
  if (inRelated && relatedEnd === -1) relatedEnd = lines.length;

  if (relatedLinks.length === 0) return;

  let modified = false;
  const newLinks = [];

  for (const { link, lineIndex } of relatedLinks) {
    const slug = link.split('/').pop();
    if (slugMap.has(slug)) {
      newLinks.push(link);
    } else {
      const closest = findClosestSlug(slug);
      if (closest) {
        const newLink = link.replace(/[^/]+$/, closest);
        newLinks.push(newLink);
        replacedCount++;
        modified = true;
      } else {
        removedCount++;
        modified = true;
      }
    }
  }

  if (!modified) return;

  // Ensure at least 2 links
  while (newLinks.length < 2) {
    // Find a random valid slug from same content type
    const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
    const contentType = rel.split('/')[0];
    const category = rel.split('/')[1];
    for (const [slug, f] of slugMap) {
      const fRel = path.relative(CONTENT_DIR, f).replace(/\\/g, '/');
      if (fRel.startsWith(contentType + '/') && f !== file && !newLinks.some(l => l.endsWith(slug))) {
        const fParts = fRel.split('/');
        const fCat = fParts[1];
        newLinks.push(`/${contentType}/${fCat}/${slug}`);
        break;
      }
    }
    if (newLinks.length === relatedLinks.length) break; // avoid infinite loop
  }

  // Rebuild the relatedResources section
  const before = lines.slice(0, relatedStart + 1);
  const after = lines.slice(relatedEnd);
  const newRelatedLines = newLinks.map(l => `  - ${l}`);
  lines.length = 0;
  lines.push(...before, ...newRelatedLines, ...after);

  fs.writeFileSync(file, lines.join('\n'));
  fixedCount++;
});

console.log(`Fixed ${fixedCount} files`);
console.log(`Replaced ${replacedCount} broken links with closest matches`);
console.log(`Removed ${removedCount} broken links with no match`);
