const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const contentDir = path.join(__dirname, '../../../..', 'src', 'content');
const publicContentDir = path.join(__dirname, '../../../..', 'public', 'assets', 'content');

function scanDir(dir, basePath = '') {
  const results = {};
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = basePath ? path.join(basePath, item) : item;
    if (fs.statSync(fullPath).isDirectory()) {
      Object.assign(results, scanDir(fullPath, relativePath));
    } else if (item.endsWith('.md') && !item.endsWith('.es.md')) {
      results[relativePath] = fullPath;
    }
  }
  return results;
}

function normalizeMetadata(meta) {
  const normalized = { ...meta };
  if (normalized.seo && typeof normalized.seo.keywords === 'string') {
    normalized.seo = {
      ...normalized.seo,
      keywords: normalized.seo.keywords.split(',').map((k) => k.trim()),
    };
  }
  return normalized;
}

function validateMetadata(meta, filePath) {
  const required = ['title', 'description', 'slug', 'topics', 'tags', 'difficulty', 'lastUpdated'];
  const missing = required.filter((key) => {
    const val = meta[key];
    return val === undefined || val === null || val === '' ||
      (Array.isArray(val) && val.length === 0);
  });

  if (missing.length > 0) {
    console.error(`\n❌ Validation failed for: ${filePath}`);
    console.error(`   Missing or empty fields: ${missing.join(', ')}`);
    throw new Error(`Invalid frontmatter in ${path.basename(filePath)}`);
  }
}

function generateIndex(files, lang) {
  const entries = [];
  for (const [relativePath, fullPath] of Object.entries(files)) {
    let fileToRead = fullPath;
    let outputPath = relativePath;
    if (lang === 'es') {
      const esPath = fullPath.replace('.md', '.es.md');
      if (fs.existsSync(esPath)) {
        fileToRead = esPath;
        outputPath = relativePath.replace('.md', '.es.md');
      }
    }

    const content = fs.readFileSync(fileToRead, 'utf8');
    const parsed = matter(content);
    const meta = normalizeMetadata(parsed.attributes);
    validateMetadata(meta, fileToRead);

    entries.push({
      path: outputPath.replace(/\\/g, '/'),
      metadata: meta,
    });
  }
  return entries;
}

function writeIndexFile(entries, outputPath, lang) {
  const data = {
    lang,
    count: entries.length,
    entries,
  };
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Generated ${outputPath} with ${entries.length} entries`);
}

if (!fs.existsSync(publicContentDir)) {
  fs.mkdirSync(publicContentDir, { recursive: true });
}

const files = scanDir(contentDir);

const enEntries = generateIndex(files, 'en');
writeIndexFile(enEntries, path.join(publicContentDir, 'index-en.json'), 'en');

const esEntries = generateIndex(files, 'es');
writeIndexFile(esEntries, path.join(publicContentDir, 'index-es.json'), 'es');

console.log('Content index generation complete.');
