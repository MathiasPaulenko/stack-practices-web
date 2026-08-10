const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

const validCanonical = new Set();
const staticPageRoots = new Set(['', 'about', 'authors', 'contact', 'cookies', 'privacy', 'terms', 'affiliate-disclosure', 'all-resources', 'search', 'tags', 'topics', 'es']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(CONTENT_DIR);
for (const file of files) {
  const rel = path.relative(CONTENT_DIR, file);
  const dirType = rel.split(path.sep)[0];
  if (!CONTENT_TYPES.includes(dirType)) continue;

  const content = fs.readFileSync(file, 'utf8');
  const parsed = matter(content);
  const meta = parsed.attributes;
  if (!meta || !meta.slug) continue;
  const type = meta.contentType || dirType;
  if (!CONTENT_TYPES.includes(type)) continue;

  const slug = meta.slug;
  validCanonical.add(`/${type}/${slug}/`);
  validCanonical.add(`/es/${type}/${slug}/`);
}

function looksValid(href) {
  if (!href.startsWith('/')) return true; // external or relative
  const base = href.split('#')[0].split('?')[0];
  const segments = base.split('/').filter(Boolean);

  // Root /es
  if (segments.length === 0) return true;
  if (segments[0] === 'es' && segments.length === 1) return true;

  // Strip /es for validation
  let start = 0;
  if (segments[0] === 'es') start = 1;

  const remaining = segments.slice(start);
  if (remaining.length === 0) return true;

  // Static roots (with optional sub-segment)
  if (staticPageRoots.has(remaining[0])) return true;

  // Content type pages
  if (CONTENT_TYPES.includes(remaining[0])) {
    if (remaining.length === 1) return true; // listing
    if (remaining.length === 2) {
      const candidate = `/${remaining[0]}/${remaining[1]}/`;
      if (validCanonical.has(candidate) || validCanonical.has(`/es${candidate}`)) return true;
    }
  }

  return false;
}

function extractBodyLinks(body) {
  const links = [];
  const lines = body.split('\n');
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const matches = line.match(/\]\((\/[^ )\n]+)([^)]*)\)/g) || [];
    for (const match of matches) {
      const urlMatch = match.match(/\]\((\/[^ )\n]+)([^)]*)\)/);
      if (urlMatch) links.push(urlMatch[1]);
    }
  }
  return links;
}

let broken = [];
for (const file of files) {
  const rel = path.relative(CONTENT_DIR, file);
  const dirType = rel.split(path.sep)[0];
  if (!CONTENT_TYPES.includes(dirType)) continue;

  const content = fs.readFileSync(file, 'utf8');
  const fmMatch = content.match(/^[\uFEFF]?---\r?\n[\s\S]*?---\r?\n/);
  const body = fmMatch ? content.slice(fmMatch[0].length) : content;

  const links = extractBodyLinks(body);
  for (const url of links) {
    if (!looksValid(url)) {
      broken.push({ file: rel.replace(/\\/g, '/'), url });
    }
  }
}

console.log(`Broken or unresolvable body links: ${broken.length}`);
if (broken.length > 0) {
  broken.slice(0, 50).forEach(b => console.log(`  ${b.file} -> ${b.url}`));
  if (broken.length > 50) console.log(`  ... and ${broken.length - 50} more`);
}
