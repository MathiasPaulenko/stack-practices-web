const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const REPORT_PATH = path.join(__dirname, '..', 'ref', 'fix-report.json');

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

function parseFrontmatter(content) {
  const parts = content.split('---');
  if (parts.length < 3) return null;
  const fmText = parts[1];
  const body = parts.slice(2).join('---');
  return { fmText, body };
}

function buildUrlMap() {
  const urlMap = new Set();
  const allFiles = findAllMdFiles(CONTENT_DIR);

  for (const file of allFiles) {
    if (file.endsWith('.es.md')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const parsed = parseFrontmatter(content);
    if (!parsed) continue;

    const fmLines = parsed.fmText.replace(/\r\n/g, '\n').split('\n');
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

function normalizePath(url) {
  const cleaned = url.replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length <= 3) return cleaned;
  return `/${parts[1]}/${parts[parts.length - 1]}`;
}

function fixFile(filePath, urlMap, report) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const parsed = parseFrontmatter(rawContent);
  if (!parsed) return;

  const { fmText, body } = parsed;
  const fmLines = fmText.split(/\r?\n/);

  let inRelatedResources = false;
  let modified = false;
  const fixedPaths = [];
  const stillBroken = [];

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

        if (urlMap.has(originalPath)) {
          return line;
        }

        const normalized = normalizePath(originalPath);

        if (urlMap.has(normalized)) {
          modified = true;
          fixedPaths.push({ from: originalPath, to: normalized });
          return `${indent}- ${normalized}`;
        }

        stillBroken.push(originalPath);
        return line;
      }

      if (trimmed && !trimmed.startsWith('-')) {
        inRelatedResources = false;
      }
    }

    return line;
  });

  if (!modified) {
    if (stillBroken.length > 0) {
      report.stillBroken.push({
        file: path.relative(CONTENT_DIR, filePath),
        brokenPaths: stillBroken,
      });
    }
    return;
  }

  const newContent = `---${eol}${newFmLines.join(eol)}${eol}---${body}`;

  fs.writeFileSync(filePath, newContent, 'utf8');

  report.modifiedFiles.push({
    file: path.relative(CONTENT_DIR, filePath),
    fixedPaths,
  });

  if (stillBroken.length > 0) {
    report.stillBroken.push({
      file: path.relative(CONTENT_DIR, filePath),
      brokenPaths: stillBroken,
    });
  }
}

function main() {
  console.log('Building URL map from all EN content files...');
  const urlMap = buildUrlMap();
  console.log(`URL map size: ${urlMap.size} entries`);

  const report = {
    timestamp: new Date().toISOString(),
    modifiedFiles: [],
    stillBroken: [],
    summary: {
      totalFilesScanned: 0,
      totalFilesModified: 0,
      totalPathsFixed: 0,
      totalStillBroken: 0,
    },
  };

  console.log('\nScanning and fixing all .md and .es.md files...');

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(CONTENT_DIR, ct);
    if (!fs.existsSync(ctDir)) continue;

    const files = findAllMdFiles(ctDir);
    for (const file of files) {
      report.summary.totalFilesScanned++;
      fixFile(file, urlMap, report);
    }
  }

  report.summary.totalFilesModified = report.modifiedFiles.length;
  report.summary.totalPathsFixed = report.modifiedFiles.reduce(
    (sum, f) => sum + f.fixedPaths.length,
    0
  );
  report.summary.totalStillBroken = report.stillBroken.reduce(
    (sum, f) => sum + f.brokenPaths.length,
    0
  );

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n=== RESULTS ===`);
  console.log(`Files scanned: ${report.summary.totalFilesScanned}`);
  console.log(`Files modified: ${report.summary.totalFilesModified}`);
  console.log(`Paths fixed: ${report.summary.totalPathsFixed}`);
  console.log(`Still broken: ${report.summary.totalStillBroken}`);
  console.log(`\nReport written to: ${REPORT_PATH}`);

  if (report.stillBroken.length > 0) {
    console.log(`\nFiles with still-broken paths (first 30):`);
    for (const entry of report.stillBroken.slice(0, 30)) {
      console.log(`  ${entry.file}:`);
      for (const bp of entry.brokenPaths) {
        console.log(`    - ${bp}`);
      }
    }
    if (report.stillBroken.length > 30) {
      console.log(`  ... and ${report.stillBroken.length - 30} more files`);
    }
  }
}

main();
