import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = 'dist';

const OUTPUTS = {
  en: 'ref/urls.md',
  es: 'ref/urls-es.md',
};

const EXCLUDED_ROOT_FILES = new Set(['sitemap.xml', 'rss.xml', 'robots.txt', 'ads.txt']);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, files);
    } else if (name.isFile() && name.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function collectUrls(rootDir, prefix) {
  const htmlFiles = walk(rootDir).sort();
  return htmlFiles
    .map((file) => {
      const rel = path.relative(rootDir, file).replace(/\\/g, '/');

      // Skip root utility files that are not pages.
      if (!rel.includes('/') && EXCLUDED_ROOT_FILES.has(rel)) {
        return null;
      }

      const urlPath = rel.replace(/\/?index\.html$/, '');
      const base = prefix ? `https://stackpractices.com/${prefix}` : 'https://stackpractices.com';
      return `${base}${urlPath ? '/' + urlPath : ''}${urlPath ? '/' : ''}`;
    })
    .filter(Boolean);
}

function groupUrls(urls) {
  const buckets = {
    recipes: [],
    patterns: [],
    docs: [],
    guides: [],
    topics: [],
    tags: [],
    other: [],
  };

  for (const url of urls) {
    const { pathname } = new URL(url);
    const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    // Drop the leading /es segment for Spanish URLs.
    const first = segments[0] === 'es' ? segments[1] : segments[0];

    if (!first) {
      buckets.other.push(url);
      continue;
    }

    if (first === 'recipes') {
      buckets.recipes.push(url);
    } else if (first === 'patterns') {
      buckets.patterns.push(url);
    } else if (first === 'docs') {
      buckets.docs.push(url);
    } else if (first === 'guides') {
      buckets.guides.push(url);
    } else if (first === 'topics') {
      buckets.topics.push(url);
    } else if (first === 'tags') {
      buckets.tags.push(url);
    } else {
      buckets.other.push(url);
    }
  }

  return buckets;
}

function writeMarkdown(outputPath, title, sourceDir, urls) {
  const displayNames = {
    recipes: 'Recipes',
    patterns: 'Patterns',
    docs: 'Docs',
    guides: 'Guides',
    topics: 'Topics',
    tags: 'Tags',
    other: 'Other',
  };

  const order = ['recipes', 'patterns', 'docs', 'guides', 'topics', 'tags', 'other'];
  const buckets = groupUrls(urls);

  const lines = [
    `# ${title}`,
    '',
    `Generated from \`${sourceDir}\` build output on 2026-08-10. Total URLs: ${urls.length}`,
    '',
  ];

  for (const key of order) {
    const items = buckets[key];
    if (!items.length) continue;
    lines.push(`## ${displayNames[key]} (${items.length})`);
    lines.push('');
    for (const u of items) {
      lines.push(`- ${u}`);
    }
    lines.push('');
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

// English: all dist pages except dist/es. Also include root 404.html as /404.html.
const enFiles = walk(DIST_DIR).filter((f) => !f.startsWith(path.join(DIST_DIR, 'es') + path.sep));
const enUrls = enFiles
  .map((file) => {
    const rel = path.relative(DIST_DIR, file).replace(/\\/g, '/');
    if (EXCLUDED_ROOT_FILES.has(rel)) return null;

    // Root HTML files that are not index.html are standalone files (e.g. 404.html).
    if (!rel.includes('/')) {
      return `https://stackpractices.com/${rel}`;
    }

    const urlPath = rel.replace(/\/?index\.html$/, '');
    return `https://stackpractices.com${urlPath ? '/' + urlPath : ''}${urlPath ? '/' : ''}`;
  })
  .filter(Boolean)
  .sort();

// Spanish: dist/es.
const esUrls = collectUrls(path.join(DIST_DIR, 'es'), 'es');

writeMarkdown(OUTPUTS.en, 'URLs (English)', 'dist', enUrls);
writeMarkdown(OUTPUTS.es, 'URLs (Spanish)', 'dist/es', esUrls);

console.log(`Wrote ${OUTPUTS.en} with ${enUrls.length} EN URLs`);
console.log(`Wrote ${OUTPUTS.es} with ${esUrls.length} ES URLs`);
