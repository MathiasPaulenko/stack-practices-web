#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

const RENAME_MAP = {
  'common mistakes': 'Additional Common Mistakes',
  'errores comunes': 'Errores Comunes Adicionales',
  'faq': 'Additional FAQ',
  'error budget policy': 'Error Budget Policy Enforcement',
  'testing and quality assurance': 'Testing and QA Checklist',
  'testing y quality assurance': 'Testing y QA Checklist',
};

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
    if (lines[i].trim().startsWith('```')) {
      inCode = !inCode;
    }
  }
  return inCode;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const h2Occurrences = new Map();
  const fixes = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^## (.+?)\s*$/);
    if (!match) continue;
    if (isInCodeBlock(lines, i)) continue;

    const heading = match[1].trim().toLowerCase();
    const indices = h2Occurrences.get(heading) || [];
    indices.push(i);
    h2Occurrences.set(heading, indices);
  }

  for (const [heading, indices] of h2Occurrences) {
    if (indices.length < 2) continue;

    const firstIdx = indices[0];
    const secondIdx = indices[1];

    const firstLine = lines[firstIdx];
    const secondLine = lines[secondIdx];

    const firstContent = firstLine.match(/^## (.+?)\s*$/)[1];
    const secondContent = secondLine.match(/^## (.+?)\s*$/)[1];

    const linesBetween = secondIdx - firstIdx;
    const isEmptyFirst = linesBetween <= 2;

    if (isEmptyFirst) {
      fixes.push({ type: 'remove-empty', lineIdx: firstIdx, heading: firstContent });
    } else {
      const renameTo = RENAME_MAP[heading];
      if (renameTo) {
        fixes.push({ type: 'rename', lineIdx: secondIdx, oldHeading: secondContent, newHeading: renameTo });
      } else {
        fixes.push({ type: 'rename', lineIdx: secondIdx, oldHeading: secondContent, newHeading: secondContent + ' (Additional)' });
      }
    }
  }

  if (fixes.length === 0) return 0;

  fixes.sort((a, b) => b.lineIdx - a.lineIdx);

  for (const fix of fixes) {
    if (fix.type === 'remove-empty') {
      if (lines[fix.lineIdx + 1] === '' && lines[fix.lineIdx + 2] !== undefined) {
        lines.splice(fix.lineIdx, 2);
      } else {
        lines.splice(fix.lineIdx, 1);
      }
    } else if (fix.type === 'rename') {
      lines[fix.lineIdx] = `## ${fix.newHeading}`;
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return fixes.length;
}

const allFiles = findMdFiles(CONTENT_DIR);
let totalFixed = 0;
let filesFixed = 0;

for (const file of allFiles) {
  const fixed = fixFile(file);
  if (fixed > 0) {
    filesFixed++;
    totalFixed += fixed;
    console.log(`Fixed ${fixed} duplicate(s): ${path.relative(CONTENT_DIR, file)}`);
  }
}

console.log(`\nTotal files fixed: ${filesFixed}`);
console.log(`Total duplicates resolved: ${totalFixed}`);
