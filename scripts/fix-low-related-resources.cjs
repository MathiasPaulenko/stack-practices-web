const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const MAX_RELATED = 7;
const TARGET_MIN = 5;
const REPORT_PATH = path.join(__dirname, '..', 'ref', 'low-related-fix-report.json');

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

function buildUrlMap() {
  const urlMap = new Set();

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
      urlMap.add(urlKey);
    }
  }

  return urlMap;
}

function getCurrentRelatedResources(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontmatterRaw(content);
  if (!parsed) return [];

  const fm = parseFrontmatterFields(parsed.fmText);
  return Array.isArray(fm.relatedResources) ? fm.relatedResources : [];
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
  console.log('Building URL map...');
  const urlMap = buildUrlMap();
  console.log(`URL map size: ${urlMap.size}`);

  const auditData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ref', 'internal-linking-data.json'), 'utf8')
  );

  const lowPages = (auditData.suggestions || []).filter((s) => s.current <= 2);
  console.log(`Pages with <=2 relatedResources: ${lowPages.length}`);

  const report = {
    timestamp: new Date().toISOString(),
    pagesProcessed: 0,
    linksAdded: 0,
    skipped: 0,
    details: [],
  };

  for (const page of lowPages) {
    const enPath = path.join(CONTENT_DIR, page.file);
    const esPath = enPath.replace(/\.md$/, '.es.md');

    const currentRelated = getCurrentRelatedResources(enPath);
    const currentCount = currentRelated.length;

    if (currentCount >= TARGET_MIN) {
      report.skipped++;
      continue;
    }

    const toAdd = [];
    for (const sug of page.suggestions || []) {
      if (toAdd.length + currentCount >= TARGET_MIN) break;
      if (toAdd.length >= MAX_RELATED - currentCount) break;

      const sugUrl = sug.url.replace(/\/$/, '');
      if (!urlMap.has(sugUrl)) {
        console.log(`  SKIP suggestion ${sugUrl} - not in urlMap`);
        continue;
      }
      if (currentRelated.includes(sugUrl) || toAdd.includes(sugUrl)) continue;

      toAdd.push(sugUrl);
    }

    if (toAdd.length === 0) {
      console.log(`  NO SUGGESTIONS for ${page.urlKey}`);
      report.skipped++;
      continue;
    }

    let added = 0;
    for (const url of toAdd) {
      const enOk = addRelatedResourceToFile(enPath, url);
      const esOk = fs.existsSync(esPath) ? addRelatedResourceToFile(esPath, url) : false;

      if (enOk) {
        added++;
        report.linksAdded++;
      }
    }

    if (added > 0) {
      report.pagesProcessed++;
      report.details.push({
        file: page.file,
        urlKey: page.urlKey,
        previousCount: currentCount,
        addedCount: added,
        newCount: currentCount + added,
        addedUrls: toAdd,
      });
      console.log(`  LINKED: ${page.urlKey} +${added} (now ${currentCount + added})`);
    } else {
      report.skipped++;
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n=== RESULTS ===`);
  console.log(`Pages processed: ${report.pagesProcessed}`);
  console.log(`Pages skipped: ${report.skipped}`);
  console.log(`Total links added: ${report.linksAdded}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main();
