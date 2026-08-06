#!/usr/bin/env node
/**
 * Backfill `publishedAt` into content frontmatter based on the first git commit
 * date for each file. Uses `git log --name-only --diff-filter=A --reverse` to
 * build a first-add map, then inserts `publishedAt` right after `lastUpdated`
 * in files that don't already have it.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

function getFirstCommitMap() {
  const out = execSync(
    'git log --name-only --diff-filter=A --reverse --format="%aI" -- src/content/',
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );

  const map = new Map();
  let currentDate = null;

  for (const line of out.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      // This is an ISO date line, which marks a new commit.
      currentDate = trimmed.slice(0, 10); // YYYY-MM-DD
      continue;
    }

    if (currentDate && !map.has(trimmed)) {
      map.set(trimmed, currentDate);
    }
  }

  return map;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const firstCommitMap = getFirstCommitMap();
  const files = walk(CONTENT_DIR);

  let updated = 0;
  let skipped = 0;
  let missingGit = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!firstCommitMap.has(rel)) {
      missingGit++;
      continue;
    }

    const text = fs.readFileSync(file, 'utf8');
    if (/^publishedAt:/m.test(text)) {
      skipped++;
      continue;
    }

    if (!/^lastUpdated:/m.test(text)) {
      missingGit++;
      continue;
    }

    const publishedDate = firstCommitMap.get(rel);
    const newText = text.replace(
      /^(lastUpdated:\s*"[^"]*")\n/m,
      `$1\npublishedAt: "${publishedDate}"\n`
    );

    if (newText === text) {
      // Fallback to unquoted lastUpdated
      const newText2 = text.replace(
        /^(lastUpdated:\s*[^\n]+)\n/m,
        `$1\npublishedAt: "${publishedDate}"\n`
      );
      if (newText2 !== text) {
        fs.writeFileSync(file, newText2, 'utf8');
        updated++;
      }
    } else {
      fs.writeFileSync(file, newText, 'utf8');
      updated++;
    }
  }

  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already has publishedAt): ${skipped}`);
  console.log(`Missing git history / no lastUpdated: ${missingGit}`);
}

main();
