const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

const REPLACEMENTS = {
  '/guides/api-error-handling-guideline': '/guides/rest-api-design-guide',
  '/guides/real-time-notifications': '/recipes/real-time-notifications',
  '/patterns/redis-pub-sub-python': '/recipes/redis-pub-sub-python',
  '/patterns/python-jwt-refresh-token-rotation': '/recipes/python-jwt-refresh-token-rotation',
  '/guides/caching-strategies': '/guides/caching-strategies-guide',
  '/patterns/container-security-scanning': '/recipes/container-security-scanning',
  '/guides/structured-logging': '/guides/complete-guide-structured-logging',
  '/guides/git-workflow': '/recipes/git-workflow',
  '/patterns/code-review-checklist-template': '/docs/code-review-checklist-template',
  '/patterns/infrastructure-as-code-guide': '/guides/infrastructure-as-code-guide',
  '/guides/graphql-error-handling-best-practices': '/recipes/graphql-error-handling-best-practices',
  '/patterns/file-upload-validation': '/recipes/file-upload-validation',
  '/patterns/stream-processing-guide': '/guides/stream-processing-guide',
  '/patterns/encryption-at-rest': '/guides/complete-guide-encryption-at-rest',
  '/guides/gcp-cloud-functions-nodejs': '/recipes/gcp-cloud-functions-nodejs',
};

const REMOVALS = [
  '/patterns/caching/api-rate-limiting',
  '/patterns/caching/concurrent-data-structures',
  '/guides/testing/contributing-guide',
  '/patterns/api-rate-limiting',
  '/patterns/concurrent-data-structures',
  '/guides/contributing-guide',
];

function findAllMdFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAllMdFiles(fullPath, files);
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function buildUrlMap() {
  const urlMap = new Set();
  const allFiles = findAllMdFiles(CONTENT_DIR);

  for (const file of allFiles) {
    if (file.endsWith('.es.md')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const parts = content.split('---');
    if (parts.length < 3) continue;
    const fmText = parts[1].replace(/\r\n/g, '\n');
    const fmLines = fmText.split('\n');

    let slug = '';
    let contentType = '';

    for (const line of fmLines) {
      const slugMatch = line.match(/^slug:\s*(.+)$/);
      if (slugMatch) slug = slugMatch[1].trim().replace(/^["']|["']$/g, '');

      const ctMatch = line.match(/^contentType:\s*(.+)$/);
      if (ctMatch) contentType = ctMatch[1].trim();
    }

    if (!contentType) {
      const relPath = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      contentType = relPath.split('/')[0];
    }

    if (slug && contentType) {
      urlMap.add(`/${contentType}/${slug}`);
    }
  }

  return urlMap;
}

function fixFile(filePath, urlMap, report) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const parts = rawContent.split('---');
  if (parts.length < 3) return;

  const fmText = parts[1];
  const body = parts.slice(2).join('---');
  const fmLines = fmText.split(/\r?\n/);

  let inRelatedResources = false;
  let modified = false;
  const changes = [];

  const newFmLines = fmLines.map((line) => {
    const trimmed = line.trim();

    if (trimmed === 'relatedResources:') {
      inRelatedResources = true;
      return line;
    }

    if (inRelatedResources) {
      const arrMatch = line.match(/^(\s*)-\s+(.+)$/);
      if (arrMatch) {
        const indent = arrMatch[1];
        const originalPath = arrMatch[2].trim().replace(/\/$/, '');

        if (REPLACEMENTS[originalPath]) {
          const replacement = REPLACEMENTS[originalPath];
          if (urlMap.has(replacement)) {
            modified = true;
            changes.push({ from: originalPath, to: replacement, action: 'replaced' });
            return `${indent}- ${replacement}`;
          } else {
            report.missingReplacements.push({
              file: path.relative(CONTENT_DIR, filePath),
              original: originalPath,
              suggested: replacement,
              reason: 'replacement URL not found in urlMap',
            });
            return line;
          }
        }

        if (REMOVALS.includes(originalPath)) {
          modified = true;
          changes.push({ from: originalPath, to: null, action: 'removed' });
          return null;
        }

        return line;
      }

      if (trimmed && !trimmed.startsWith('-')) {
        inRelatedResources = false;
      }
    }

    return line;
  });

  const filteredLines = newFmLines.filter((l) => l !== null);

  if (!modified) return;

  const newContent = `---${eol}${filteredLines.join(eol)}${eol}---${body}`;
  fs.writeFileSync(filePath, newContent, 'utf8');

  report.modifiedFiles.push({
    file: path.relative(CONTENT_DIR, filePath),
    changes,
  });
}

function main() {
  console.log('Building URL map...');
  const urlMap = buildUrlMap();
  console.log(`URL map size: ${urlMap.size} entries`);

  console.log('\nVerifying replacement URLs exist...');
  for (const [old, replacement] of Object.entries(REPLACEMENTS)) {
    const exists = urlMap.has(replacement);
    console.log(`  ${old} -> ${replacement} : ${exists ? 'OK' : 'NOT FOUND'}`);
  }

  console.log('\nScanning and replacing broken URLs in all files...');
  const report = {
    timestamp: new Date().toISOString(),
    modifiedFiles: [],
    missingReplacements: [],
    summary: {
      totalFilesModified: 0,
      totalReplaced: 0,
      totalRemoved: 0,
    },
  };

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(CONTENT_DIR, ct);
    if (!fs.existsSync(ctDir)) continue;

    const files = findAllMdFiles(ctDir);
    for (const file of files) {
      fixFile(file, urlMap, report);
    }
  }

  report.summary.totalFilesModified = report.modifiedFiles.length;
  report.summary.totalReplaced = report.modifiedFiles.reduce(
    (sum, f) => sum + f.changes.filter((c) => c.action === 'replaced').length,
    0
  );
  report.summary.totalRemoved = report.modifiedFiles.reduce(
    (sum, f) => sum + f.changes.filter((c) => c.action === 'removed').length,
    0
  );

  console.log(`\n=== RESULTS ===`);
  console.log(`Files modified: ${report.summary.totalFilesModified}`);
  console.log(`URLs replaced: ${report.summary.totalReplaced}`);
  console.log(`URLs removed: ${report.summary.totalRemoved}`);

  if (report.missingReplacements.length > 0) {
    console.log(`\nMissing replacements:`);
    for (const m of report.missingReplacements) {
      console.log(`  ${m.file}: ${m.original} -> ${m.suggested} (${m.reason})`);
    }
  }

  console.log(`\nModified files (first 50):`);
  for (const entry of report.modifiedFiles.slice(0, 50)) {
    for (const c of entry.changes) {
      if (c.action === 'replaced') {
        console.log(`  ${entry.file}: ${c.from} -> ${c.to}`);
      } else {
        console.log(`  ${entry.file}: removed ${c.from}`);
      }
    }
  }
  if (report.modifiedFiles.length > 50) {
    console.log(`  ... and ${report.modifiedFiles.length - 50} more files`);
  }
}

main();
