const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const MAX_RELATED = 7;
const REPORT_PATH = path.join(__dirname, '..', 'ref', 'bidirectional-fix-report.json');

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

function parseFrontmatterRaw(content) {
  const parts = content.split('---');
  if (parts.length < 3) return null;
  return { fmText: parts[1], body: parts.slice(2).join('---') };
}

function parseFrontmatterFields(fmText) {
  const fm = {};
  let currentKey = null;
  let currentSubKey = null;
  const lines = fmText.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch && !line.startsWith(' ')) {
      currentKey = kvMatch[1];
      currentSubKey = null;
      if (kvMatch[2]) {
        fm[currentKey] = kvMatch[2].replace(/^["']|["']$/g, '');
      } else {
        fm[currentKey] = [];
      }
      continue;
    }

    const subMatch = line.match(/^  (\w+):\s*(.*)$/);
    if (subMatch && currentKey) {
      currentSubKey = subMatch[1];
      if (!fm[currentKey] || typeof fm[currentKey] !== 'object' || Array.isArray(fm[currentKey])) {
        fm[currentKey] = {};
      }
      if (subMatch[2]) {
        fm[currentKey][currentSubKey] = subMatch[2];
      } else {
        fm[currentKey][currentSubKey] = [];
      }
      continue;
    }

    const arrMatch = line.match(/^  -\s+(.*)$/);
    if (arrMatch && currentKey) {
      if (Array.isArray(fm[currentKey])) {
        fm[currentKey].push(arrMatch[1].trim());
      }
      continue;
    }

    const subArrMatch = line.match(/^    -\s+(.*)$/);
    if (subArrMatch && currentKey && currentSubKey) {
      if (Array.isArray(fm[currentKey][currentSubKey])) {
        fm[currentKey][currentSubKey].push(subArrMatch[1].trim());
      }
      continue;
    }
  }

  return fm;
}

function buildAllEntries() {
  const entries = [];
  const urlMap = new Map();

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(CONTENT_DIR, ct);
    if (!fs.existsSync(ctDir)) continue;

    const files = findAllMdFiles(ctDir);
    for (const file of files) {
      if (file.endsWith('.es.md')) continue;

      const content = fs.readFileSync(file, 'utf8');
      const parsed = parseFrontmatterRaw(content);
      if (!parsed) continue;

      const fm = parseFrontmatterFields(parsed.fmText);
      const slug = fm.slug || '';
      const contentType = fm.contentType || ct;
      const urlKey = `/${contentType}/${slug}`;
      const topics = Array.isArray(fm.topics) ? fm.topics : [];
      const tags = Array.isArray(fm.tags) ? fm.tags : [];
      const relatedResources = Array.isArray(fm.relatedResources) ? fm.relatedResources : [];

      const entry = {
        file: path.relative(CONTENT_DIR, file),
        absolutePath: file,
        esPath: file.replace(/\.md$/, '.es.md'),
        slug,
        contentType,
        urlKey,
        topics,
        tags,
        relatedResources,
        title: fm.title || '',
      };

      entries.push(entry);
      urlMap.set(urlKey, entry);
    }
  }

  return { entries, urlMap };
}

function addRelatedResourceToFile(filePath, urlToAdd) {
  if (!fs.existsSync(filePath)) return false;

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const parsed = parseFrontmatterRaw(rawContent);
  if (!parsed) return false;

  const { fmText, body } = parsed;
  const fmLines = fmText.split(/\r?\n/);

  let inRelated = false;
  let lastRelatedIdx = -1;
  let alreadyExists = false;

  for (let i = 0; i < fmLines.length; i++) {
    const trimmed = fmLines[i].trim();

    if (trimmed === 'relatedResources:') {
      inRelated = true;
      continue;
    }

    if (inRelated) {
      const arrMatch = fmLines[i].match(/^(\s*)-\s+(.+)$/);
      if (arrMatch) {
        const resPath = arrMatch[2].trim().replace(/\/$/, '');
        if (resPath === urlToAdd) {
          alreadyExists = true;
          break;
        }
        lastRelatedIdx = i;
      } else if (trimmed && !trimmed.startsWith('-')) {
        inRelated = false;
      }
    }
  }

  if (alreadyExists) return false;

  let indent = '  ';
  if (lastRelatedIdx >= 0) {
    const match = fmLines[lastRelatedIdx].match(/^(\s*)-/);
    if (match) indent = match[1];
  }

  const newLine = `${indent}- ${urlToAdd}`;

  let newFmLines;
  if (lastRelatedIdx >= 0) {
    newFmLines = [...fmLines.slice(0, lastRelatedIdx + 1), newLine, ...fmLines.slice(lastRelatedIdx + 1)];
  } else {
    let insertIdx = fmLines.length;
    for (let i = fmLines.length - 1; i >= 0; i--) {
      if (fmLines[i].trim() !== '') {
        insertIdx = i + 1;
        break;
      }
    }
    newFmLines = [...fmLines.slice(0, insertIdx), 'relatedResources:', newLine, ...fmLines.slice(insertIdx)];
  }

  const newContent = `---${eol}${newFmLines.join(eol)}${eol}---${body}`;
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

function main() {
  console.log('Building entries and URL map...');
  const { entries, urlMap } = buildAllEntries();
  console.log(`Total EN entries: ${entries.length}, URL map: ${urlMap.size}`);

  const report = {
    timestamp: new Date().toISOString(),
    gapsFound: 0,
    gapsClosed: 0,
    gapsSkippedFull: 0,
    gapsSkippedNoSharedTopics: 0,
    filesModified: [],
    summary: {
      totalFilesModified: 0,
      totalLinksAdded: 0,
    },
  };

  for (const entryA of entries) {
    for (const resUrl of entryA.relatedResources) {
      const normalized = resUrl.replace(/\/$/, '');
      const entryB = urlMap.get(normalized);
      if (!entryB) continue;

      if (entryB.relatedResources.includes(entryA.urlKey)) continue;

      report.gapsFound++;

      const sharedTopics = entryA.topics.filter((t) => entryB.topics.includes(t));
      if (sharedTopics.length === 0) {
        report.gapsSkippedNoSharedTopics++;
        continue;
      }

      if (entryB.relatedResources.length >= MAX_RELATED) {
        report.gapsSkippedFull++;
        continue;
      }

      const enOk = addRelatedResourceToFile(entryB.absolutePath, entryA.urlKey);
      const esOk = fs.existsSync(entryB.esPath) ? addRelatedResourceToFile(entryB.esPath, entryA.urlKey) : false;

      if (enOk) {
        entryB.relatedResources.push(entryA.urlKey);
        report.gapsClosed++;
        report.summary.totalLinksAdded++;
        report.filesModified.push({
          file: entryB.file,
          addedLink: entryA.urlKey,
          sharedTopics,
        });
      }
    }
  }

  report.summary.totalFilesModified = new Set(report.filesModified.map((f) => f.file)).size;

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n=== RESULTS ===`);
  console.log(`Bidirectional gaps found: ${report.gapsFound}`);
  console.log(`Gaps closed (links added): ${report.gapsClosed}`);
  console.log(`Skipped (target full): ${report.gapsSkippedFull}`);
  console.log(`Skipped (no shared topics): ${report.gapsSkippedNoSharedTopics}`);
  console.log(`Files modified: ${report.summary.totalFilesModified}`);
  console.log(`Total links added: ${report.summary.totalLinksAdded}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main();
