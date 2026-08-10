const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'ref', 'internal-linking-data.json');
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

function addToRelatedResources(content, url) {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') {
    // No frontmatter or malformed; leave as-is
    return content;
  }

  let i = 1;
  let inRelated = false;
  let relatedStart = -1;
  let relatedEnd = -1;

  while (i < lines.length && lines[i].trim() !== '---') {
    const line = lines[i];
    if (line.match(/^relatedResources:\s*$/)) {
      inRelated = true;
      relatedStart = i;
      i++;
      continue;
    }

    if (inRelated) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        // Compare to target URL (ignore trailing slash)
        const itemUrl = trimmed.slice(2).replace(/\/$/, '');
        if (itemUrl === url.replace(/\/$/, '')) {
          return content;
        }
        i++;
        continue;
      }
      if (trimmed === '') {
        i++;
        continue;
      }
      // Reached next field (top-level key)
      relatedEnd = i;
      break;
    }
    i++;
  }

  if (!inRelated) return content;

  if (relatedEnd === -1) {
    relatedEnd = i;
  }

  lines.splice(relatedEnd, 0, `  - ${url}`);
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Missing ${DATA_PATH}; run node scripts/internal-linking-audit.cjs first.`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const { biGaps } = data;

  if (!biGaps || biGaps.length === 0) {
    console.log('No bidirectional gaps found.');
    return;
  }

  // Group source URLs by target file (EN and ES versions)
  const additions = new Map();

  for (const gap of biGaps) {
    const targetRel = gap.to;
    const sourceUrl = gap.fromUrl;
    if (!targetRel || !sourceUrl) continue;

    const targetEn = path.join(CONTENT_DIR, targetRel);
    if (fs.existsSync(targetEn)) {
      if (!additions.has(targetEn)) additions.set(targetEn, new Set());
      additions.get(targetEn).add(sourceUrl);
    }

    const targetEs = targetEn.replace(/\.md$/, '.es.md');
    if (fs.existsSync(targetEs)) {
      if (!additions.has(targetEs)) additions.set(targetEs, new Set());
      additions.get(targetEs).add(sourceUrl);
    }
  }

  let updatedFiles = 0;
  let addedLinks = 0;

  for (const [file, urls] of additions) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const url of urls) {
      content = addToRelatedResources(content, url);
    }
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      updatedFiles++;
      addedLinks += urls.size;
    }
  }

  console.log(`Processed ${biGaps.length} bidirectional gaps.`);
  console.log(`Updated ${updatedFiles} files.`);
  console.log(`Added ${addedLinks} related resource links.`);
}

main();
