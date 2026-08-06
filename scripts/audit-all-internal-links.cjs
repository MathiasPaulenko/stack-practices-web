const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

function findAllMdFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAllMdFiles(fullPath, files);
    } else if (item.endsWith('.md') && !item.endsWith('.es.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function countBodyLinks(body) {
  return (body.match(/\]\(\/[^)]+\)/g) || []).length;
}

const contentDir = 'src/content';
const allFiles = findAllMdFiles(contentDir);

const warnings = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const parsed = matter(content);
  const bodyLinks = countBodyLinks(parsed.body);
  const relatedLinks = Array.isArray(parsed.attributes.relatedResources)
    ? parsed.attributes.relatedResources.length
    : 0;
  const totalInternalLinks = bodyLinks + relatedLinks;

  if (totalInternalLinks < 3) {
    warnings.push({ file, bodyLinks, relatedLinks, totalInternalLinks });
  }
}

// Sort by total link count ascending
warnings.sort((a, b) => a.totalInternalLinks - b.totalInternalLinks);

console.log('========================================');
console.log('AUDIT: INTERNAL LINKS (ALL BATCHES)');
console.log('========================================');
console.log('Files with < 3 total internal links (body + relatedResources):');
console.log();

for (const w of warnings) {
  const esFile = w.file.replace('.md', '.es.md');
  const hasEs = fs.existsSync(esFile);
  console.log(`  ${w.totalInternalLinks} total links (body: ${w.bodyLinks}, related: ${w.relatedLinks}): ${w.file}`);
  if (hasEs) {
    const esContent = fs.readFileSync(esFile, 'utf8');
    const esParsed = matter(esContent);
    const esBodyLinks = countBodyLinks(esParsed.body);
    const esRelatedLinks = Array.isArray(esParsed.attributes.relatedResources)
      ? esParsed.attributes.relatedResources.length
      : 0;
    const esTotal = esBodyLinks + esRelatedLinks;
    console.log(`           ES: ${esTotal} total links (body: ${esBodyLinks}, related: ${esRelatedLinks}): ${esFile}`);
  }
}

console.log();
console.log(`Total files needing more links: ${warnings.length}`);
