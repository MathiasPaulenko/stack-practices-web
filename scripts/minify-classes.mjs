import fs from 'fs';
import path from 'path';

const ROOT = process.argv[2] || 'dist';

// Hard safelist: these classes are used by JS, Pagefind, Shiki, or are critical.
const STATIC_SAFELIST = new Set([
  'astro-code',
  'line',
  'hidden',
  'flex',
  'prose',
  'copy-btn',
  'copied',
  'code-tabs',
  'code-tabs__list',
  'code-tabs__tab',
  'code-tabs__panel',
  'skip-link',
  'sr-only',
  'pagefind-ui',
  // Difficulty badge variants referenced dynamically by ListingPage.createCard
  'difficulty-badge--beginner',
  'difficulty-badge--intermediate',
  'difficulty-badge--advanced',
  // Pagefind search badge variants referenced dynamically by search.astro
  'pagefind-ui__content-badge--recipe',
  'pagefind-ui__content-badge--pattern',
  'pagefind-ui__content-badge--doc',
  'pagefind-ui__content-badge--guide',
  'pagefind-ui__content-badge--receta',
  'pagefind-ui__content-badge--patron',
  'pagefind-ui__content-badge--guia',
  // Listing card class referenced by inline JS querySelectorAll
  'tag-card',
]);

// Short token classes used by shikiClassify
['sc', 'sk', 'ss', 'sn', 'sp', 'spu', 'sfu', 'sb', 'sse', 'sf'].forEach((c) => STATIC_SAFELIST.add(c));

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) { return ''; }
}

function walk(dir, ext, out) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, ext, out);
    else if (f.endsWith(ext)) out.push(full);
  }
}

// Valid class chars in HTML attributes. We keep the dot/escaped colon classes untouched.

function isMinifiable(c) {
  return (
    c.length > 3 &&
    !/[\/:\[\].]/.test(c) &&
    !/^\d/.test(c)
  );
}

// Collect all class names from HTML and CSS
const allClasses = new Set();

// From CSS files: only plain class selectors, stop before backslash escapes.
const cssFiles = [];
walk(ROOT, '.css', cssFiles);
for (const f of cssFiles) {
  const css = readFile(f);
  const re = /\.([a-zA-Z][a-zA-Z0-9_-]*)(?=[^a-zA-Z0-9_\\-]|$)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const cls = m[1];
    // Do not treat a bare prefix like 'hover' from '.hover\:...' as a class.
    if (isMinifiable(cls)) allClasses.add(cls);
  }
}

// From HTML files
const htmlFiles = [];
walk(ROOT, '.html', htmlFiles);
for (const f of htmlFiles) {
  const html = readFile(f);
  const re = /class="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) {
      if (isMinifiable(c)) allClasses.add(c);
    }
  }
}

// Safelist every identifier/word found in public JS or inline scripts to avoid
// renaming classes that client-side code references as string literals.
const jsTokens = new Set();
const publicJs = [];
walk('public', '.js', publicJs);
for (const f of publicJs) {
  const js = readFile(f);
  const idRe = /\b[a-zA-Z][a-zA-Z0-9_-]*\b/g;
  let m;
  while ((m = idRe.exec(js)) !== null) {
    jsTokens.add(m[0]);
  }
}

for (const f of htmlFiles) {
  const html = readFile(f);
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  const idRe = /\b[a-zA-Z][a-zA-Z0-9_-]*\b/g;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    // Skip external scripts with src
    const openTag = html.slice(sm.index, sm.index + sm[0].indexOf('>') + 1);
    if (/\bsrc\s*=/.test(openTag)) continue;
    const script = sm[1];
    let m;
    while ((m = idRe.exec(script)) !== null) {
      jsTokens.add(m[0]);
    }
  }
}

const safelist = new Set([...STATIC_SAFELIST, ...jsTokens]);

const toMinify = [...allClasses].filter((c) => !safelist.has(c));

// Generate short names: a-z, aa-zz, ...
const chars = 'abcdefghijklmnopqrstuvwxyz';
function* nameGen() {
  for (let n = 1; ; n++) {
    yield* gen(n, '');
  }
  function* gen(n, p) {
    if (n === 0) yield p;
    else for (const ch of chars) yield* gen(n - 1, p + ch);
  }
}

const existing = new Set([...allClasses, ...safelist]);
const gen = nameGen();
const mapping = new Map();
for (const c of toMinify) {
  let next;
  do {
    next = gen.next().value;
  } while (existing.has(next) || mapping.has(next));
  mapping.set(c, next);
  existing.add(next);
}

console.error(`Minifying ${mapping.size} class names`);

const sortedMapping = [...mapping.entries()].sort((a, b) => b[0].length - a[0].length);

function escapeClass(c) {
  return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply to CSS: sort by length desc so longer class names are replaced first.
for (const f of cssFiles) {
  let css = readFile(f);
  for (const [old, n] of sortedMapping) {
    const re = new RegExp(`\\.${escapeClass(old)}(?=[^a-zA-Z0-9_\\-]|$)`, 'g');
    css = css.replace(re, `.${n}`);
  }
  fs.writeFileSync(f, css);
}

// Apply to HTML, skipping <script> blocks so inlined JS literals like
// a.innerHTML = '<div class="...">' are not corrupted.
for (const f of htmlFiles) {
  let html = readFile(f);
  const parts = html.split(/(<script[^>]*>[\s\S]*?<\/script>)/g);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(/class="([^"]*)"/g, (_, val) => {
      const classes = val.split(/\s+/).filter(Boolean).map((c) => mapping.get(c) || c).join(' ');
      return `class="${classes}"`;
    });
  }
  html = parts.join('');
  fs.writeFileSync(f, html);
}

console.error('Done');
