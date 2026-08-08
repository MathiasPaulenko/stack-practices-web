import fs from 'fs';
import path from 'path';

const SKIPPED = new Set(['pagefind', '_astro']);

function walk(dir, ext, out) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!SKIPPED.has(f)) walk(full, ext, out);
    } else if (f.endsWith(ext)) {
      out.push(full);
    }
  }
}

function minifyResource(obj) {
  const out = {};
  if (obj.title !== undefined) out.t = obj.title;
  if (obj.description !== undefined) out.d = obj.description;
  if (obj.href !== undefined) out.h = obj.href;
  if (obj.difficulty !== undefined) out.g = obj.difficulty;
  if (obj.tags !== undefined) out.tg = obj.tags;
  // contentType is not consumed by client JS, drop it.
  return out;
}

function minifyTag(obj) {
  const out = {};
  if (obj.tag !== undefined) out.t = obj.tag;
  if (obj.count !== undefined) out.c = obj.count;
  return out;
}

function minifyJsonFile(file) {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (Array.isArray(json.entries)) {
      json.e = json.entries.map((entry) => minifyResource(entry));
      delete json.entries;
    }

    if (Array.isArray(json.tags)) {
      json.tg = json.tags.map((tag) => minifyTag(tag));
      delete json.tags;
      delete json.total;
    }

    if (json.faqSchema !== undefined) {
      // leave faq JSON untouched
      return 0;
    }

    fs.writeFileSync(file, JSON.stringify(json));
    return JSON.stringify(json).length;
  } catch {
    return 0;
  }
}

function minifyHtmlScripts(file) {
  let html = fs.readFileSync(file, 'utf8');
  const scripts = [];
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
    // Only inline scripts (no src)
    if (/\ssrc\s*=/.test(attrs)) return match;

    let original = body;
    let next = original;
    // ListingPage script
    next = next.replace(/\bdata\.entries\b/g, 'data.e');
    next = next.replace(/\bentry\.title\b/g, 'entry.t');
    next = next.replace(/\bentry\.description\b/g, 'entry.d');
    next = next.replace(/\bentry\.href\b/g, 'entry.h');
    next = next.replace(/\bentry\.difficulty\b/g, 'entry.g');
    next = next.replace(/\bentry\.tags\b/g, 'entry.tg');
    // tags/[tag].astro script
    next = next.replace(/\bdata\.entries\b/g, 'data.e');
    next = next.replace(/\bitem\.title\b/g, 'item.t');
    next = next.replace(/\bitem\.description\b/g, 'item.d');
    next = next.replace(/\bitem\.href\b/g, 'item.h');
    next = next.replace(/\bitem\.tags\b/g, 'item.tg');
    // tags/index.astro script
    next = next.replace(/\bdata\.tags\b/g, 'data.tg');
    next = next.replace(/\bt\.tag\b/g, 't.t');
    next = next.replace(/\bt\.count\b/g, 't.c');

    if (next !== original) {
      scripts.push(file);
    }
    return `<script${attrs}>${next}</script>`;
  });

  if (scripts.length > 0) {
    fs.writeFileSync(file, html);
  }
  return scripts.length;
}

const jsonFiles = [];
walk('dist', '.json', jsonFiles);
let jsonTotalSaved = 0;
for (const f of jsonFiles) {
  const before = fs.statSync(f).size;
  const after = minifyJsonFile(f);
  if (after > 0 && after !== before) {
    jsonTotalSaved += before - after;
  }
}

const htmlFiles = [];
walk('dist', '.html', htmlFiles);
let htmlScriptsChanged = 0;
for (const f of htmlFiles) {
  htmlScriptsChanged += minifyHtmlScripts(f);
}

console.error(`Minified ${jsonFiles.length} JSON files, saved ${(jsonTotalSaved / 1024 / 1024).toFixed(2)} MB`);
console.error(`Updated inline scripts in ${htmlScriptsChanged} HTML files`);
