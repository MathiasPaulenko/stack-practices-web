#!/usr/bin/env node
/**
 * Normalizes internal body links in markdown files to always use trailing slash.
 * Fixes: [text](/recipes/slug) -> [text](/recipes/slug/)
 * Skips: links with #fragments, ?queries, external URLs, and already-correct links.
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const INTERNAL_PATH_RE = /^\/(?:recipes|patterns|guides|docs|es\/recipes|es\/patterns|es\/guides|es\/docs)\//;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.endsWith('.md')) yield full;
  }
}

let filesFixed = 0;
let linksFixed = 0;

for (const file of walk(CONTENT_DIR)) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix body links: [text](/recipes/slug) -> [text](/recipes/slug/)
  content = content.replace(
    /\]\((\/(?:recipes|patterns|guides|docs|es\/recipes|es\/patterns|es\/guides|es\/docs)\/[^)\s#?]+)\)/g,
    (match, url) => {
      if (url.endsWith('/')) return match;
      linksFixed++;
      changed = true;
      return match.replace(url, url + '/');
    }
  );

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    filesFixed++;
  }
}

console.log(`Fixed ${linksFixed} internal links in ${filesFixed} files.`);
