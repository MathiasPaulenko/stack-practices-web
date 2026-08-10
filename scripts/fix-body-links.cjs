const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

const DO_WRITE = process.argv.includes('--write');

// Valid canonical URLs: /{contentType}/{slug}/ and /es/{contentType}/{slug}/
const validCanonical = new Set();
// For quick lookup: /{contentType}/{slug} without trailing slash
const validIndexKey = new Set();
// Known page roots that should end with a trailing slash on the live site.
const INTERNAL_PAGE_ROOTS = new Set(['about', 'authors', 'contact', 'cookies', 'privacy', 'terms', 'affiliate-disclosure', 'all-resources', 'search', 'tags', 'topics']);

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

function addValid(entry, file) {
  const parsed = matter(entry);
  const meta = parsed.attributes;
  if (!meta || !meta.slug) return;
  const type = meta.contentType || file.split(path.sep)[0];
  if (!type || !CONTENT_TYPES.includes(type)) return;
  const slug = meta.slug;
  validCanonical.add(`/${type}/${slug}/`);
  validCanonical.add(`/es/${type}/${slug}/`);
  validIndexKey.add(`/${type}/${slug}`);
  validIndexKey.add(`/es/${type}/${slug}`);
}

function fixLinkPath(rawPath) {
  // Split hash / query to preserve them.
  const hashIdx = rawPath.indexOf('#');
  const queryIdx = rawPath.indexOf('?');
  let sepIdx = -1;
  if (hashIdx !== -1) sepIdx = hashIdx;
  if (queryIdx !== -1 && (sepIdx === -1 || queryIdx < sepIdx)) sepIdx = queryIdx;

  const base = sepIdx === -1 ? rawPath : rawPath.slice(0, sepIdx);
  const suffix = sepIdx === -1 ? '' : rawPath.slice(sepIdx);

  // Only process absolute internal paths.
  if (!base.startsWith('/')) return rawPath;

  // Skip known static assets and file paths (anything with a file extension).
  const pathWithoutQueryHash = base.split('?')[0].split('#')[0];
  const lastSegment = pathWithoutQueryHash.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) return rawPath;

  // Skip root.
  if (base === '/') return rawPath;

  // Determine locale prefix.
  let prefix = '';
  let rest = base;
  if (rest.startsWith('/es/')) {
    prefix = '/es';
    rest = rest.slice(4);
  } else if (rest.startsWith('/es')) {
    // Should not happen without trailing slash, but be safe.
    prefix = '/es';
    rest = rest.slice(3);
  }

  // Ensure rest starts with /
  if (!rest.startsWith('/')) rest = '/' + rest;

  const segments = rest.split('/').filter(Boolean);
  if (segments.length === 0) {
    // Root, e.g. /es
    return (prefix || '') + '/' + suffix;
  }

  const root = segments[0];

  // Content type paths.
  if (CONTENT_TYPES.includes(root)) {
    if (segments.length === 1) {
      return (prefix || '') + '/' + root + '/' + suffix;
    }

    if (segments.length === 2) {
      const slug = segments[1];
      const canonical = (prefix || '') + '/' + root + '/' + slug + '/';
      if (validCanonical.has(canonical)) {
        return canonical + suffix;
      }
      // If the "slug" is actually a subfolder and there is a third part? No, length is 2.
      return rawPath;
    }

    if (segments.length >= 3) {
      // Likely /<type>/<folder>/<slug>(/...). Try removing the folder segment.
      const slug = segments[2];
      const candidate = (prefix || '') + '/' + root + '/' + slug + '/';
      if (validCanonical.has(candidate)) {
        return candidate + suffix;
      }
      // Sometimes the slug itself might be further nested? Not in this project.
      return rawPath;
    }
  }

  // Static page roots (about, tags, topics, etc.)
  if (INTERNAL_PAGE_ROOTS.has(root)) {
    if (segments.length === 1) {
      return (prefix || '') + '/' + root + '/' + suffix;
    }
    // e.g. /tags/pattern
    if (segments.length === 2) {
      return (prefix || '') + '/' + root + '/' + segments[1] + '/' + suffix;
    }
  }

  return rawPath;
}

function replaceLinksInSegment(segment) {
  // Match markdown link URL path inside (). Capture optional title after a space.
  return segment.replace(/\]\((\/[^ )\n]+)([^)]*)\)/g, (match, url, title) => {
    const newUrl = fixLinkPath(url);
    if (newUrl === url) return match;
    return `](${newUrl}${title})`;
  });
}

function processBody(body) {
  // Simple code-fence aware replacement. Fenced code blocks (triple backticks)
  // are preserved; all other segments are processed for markdown links.
  const lines = body.split('\n');
  let inFence = false;
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      result.push(line);
      continue;
    }
    if (inFence) {
      result.push(line);
    } else {
      result.push(replaceLinksInSegment(line));
    }
  }
  return result.join('\n');
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  // Preserve the original frontmatter block exactly, including leading BOM if present.
  const fmMatch = content.match(/^[\uFEFF]?---\r?\n([\s\S]*?)---\r?\n/);
  if (!fmMatch) return { changed: false };

  const prefix = fmMatch[0];
  const body = content.slice(prefix.length);
  const newBody = processBody(body);
  if (newBody === body) return { changed: false };

  if (DO_WRITE) {
    fs.writeFileSync(file, prefix + newBody, 'utf8');
  }

  return { changed: true, beforeBody: body, afterBody: newBody };
}

// Build valid URL index.
const files = walk(CONTENT_DIR);
for (const file of files) {
  const rel = path.relative(CONTENT_DIR, file);
  const dirParts = rel.split(path.sep);
  // Determine content type from top-level folder for files without frontmatter.
  const ctFromDir = dirParts[0];
  if (!CONTENT_TYPES.includes(ctFromDir)) continue;

  const entry = fs.readFileSync(file, 'utf8');
  addValid(entry, rel);
}

console.log(`Indexed ${validCanonical.size} canonical URLs`);

let changedCount = 0;
let filesChanged = 0;
let unchangedCount = 0;
const remainingBroken = [];

for (const file of files) {
  const rel = path.relative(CONTENT_DIR, file);
  const dirParts = rel.split(path.sep);
  if (!CONTENT_TYPES.includes(dirParts[0])) continue;

  const result = processFile(file);
  if (result.changed) {
    filesChanged++;
    const beforeLines = result.beforeBody.split('\n');
    const afterLines = result.afterBody.split('\n');
    for (let i = 0; i < beforeLines.length; i++) {
      if (beforeLines[i] !== afterLines[i]) changedCount++;
    }
  } else {
    unchangedCount++;
  }
}

console.log(`Files processed: ${files.length}`);
console.log(`Files changed: ${filesChanged}`);
console.log(`Unchanged files: ${unchangedCount}`);
console.log(`Lines/links updated: ${changedCount}`);

if (!DO_WRITE) {
  console.log('\nDry-run complete. Run with --write to apply changes.');
} else {
  console.log('\nChanges applied.');
}
