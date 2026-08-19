const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '../../../..', 'src', 'content');

const validPaths = new Set();
const slugToType = {};

function walk(dir, basePath) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = basePath ? path.join(basePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      walk(full, rel);
    } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.es.md')) {
      const content = fs.readFileSync(full, 'utf-8');
      const parsed = matter(content);
      const meta = parsed.attributes;
      const slug = meta.slug;
      const type = meta.contentType || rel.split(path.sep)[0];
      if (slug && type) {
        validPaths.add(`/${type}/${slug}`);
        validPaths.add(`/${rel.replace(/\\/g, '/').replace(/\.md$/, '')}`);
        slugToType[slug] = type;
      }
    }
  }
}

walk(CONTENT_DIR, '');

console.log('Total indexed resources:', Object.keys(slugToType).length);

let broken = [];
let filesChecked = 0;

function checkDir(dir, basePath) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = basePath ? path.join(basePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      checkDir(full, rel);
    } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.es.md')) {
      filesChecked++;
      const content = fs.readFileSync(full, 'utf-8');
      const parsed = matter(content);
      const meta = parsed.attributes;
      const related = meta.relatedResources || [];
      for (const link of related) {
        const cleanLink = link.replace(/\\/g, '/');
        if (!validPaths.has(cleanLink)) {
          broken.push({
            file: rel.replace(/\\/g, '/'),
            link: cleanLink,
            slug: meta.slug,
            type: meta.contentType || rel.split(path.sep)[0]
          });
        }
      }
    }
  }
}

checkDir(CONTENT_DIR, '');

console.log('Files checked:', filesChecked);
console.log('Broken relatedResources:', broken.length);

if (broken.length > 0) {
  broken.forEach(b => {
    console.log(`  ${b.file} -> ${b.link}`);
  });

  console.log('\nSuggested fixes:');
  for (const b of broken) {
    const targetSlug = b.link.split('/').pop();
    const correctType = slugToType[targetSlug];
    if (correctType) {
      console.log(`  ${b.link} -> /${correctType}/${targetSlug}`);
    } else {
      console.log(`  ${b.link} -> SLUG NOT FOUND: ${targetSlug}`);
    }
  }
  process.exit(1);
} else {
  console.log('\n✅ All relatedResources links are valid.');
  process.exit(0);
}
