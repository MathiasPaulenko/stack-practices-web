const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const MAX_RELATED = 7;
const MAX_LINKS_PER_ORPHAN = 3;

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

function findRelatedPages(orphan, entries, urlMap) {
  const orphanTopics = new Set(orphan.topics);
  const orphanTags = new Set(orphan.tags);
  const orphanUrl = orphan.urlKey;

  const scored = entries
    .filter((e) => e.urlKey !== orphanUrl)
    .filter((e) => e.relatedResources.length < MAX_RELATED)
    .filter((e) => !e.relatedResources.includes(orphanUrl))
    .map((e) => {
      let score = 0;
      const sharedTopics = e.topics.filter((t) => orphanTopics.has(t));
      const sharedTags = e.tags.filter((t) => orphanTags.has(t));
      score += sharedTopics.length * 3;
      score += sharedTags.length * 1;

      if (e.contentType === 'guides') score += 0.5;
      if (e.contentType === 'patterns') score += 0.3;

      return { entry: e, score, sharedTopics, sharedTags };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_LINKS_PER_ORPHAN);
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
        const path = arrMatch[2].trim().replace(/\/$/, '');
        if (path === urlToAdd) {
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

  const orphanData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ref', 'internal-linking-data.json'), 'utf8'));
  const orphans = orphanData.orphans;

  const priorityOrder = { guides: 0, patterns: 1, recipes: 2, docs: 3 };
  orphans.sort((a, b) => {
    const pa = priorityOrder[a.contentType] !== undefined ? priorityOrder[a.contentType] : 9;
    const pb = priorityOrder[b.contentType] !== undefined ? priorityOrder[b.contentType] : 9;
    return pa - pb;
  });

  console.log(`\nTotal orphans to process: ${orphans.length}`);
  console.log(`By type: guides=${orphans.filter(o=>o.contentType==='guides').length}, patterns=${orphans.filter(o=>o.contentType==='patterns').length}, recipes=${orphans.filter(o=>o.contentType==='recipes').length}, docs=${orphans.filter(o=>o.contentType==='docs').length}`);

  const report = {
    timestamp: new Date().toISOString(),
    processed: 0,
    skipped: 0,
    linksAdded: 0,
    details: [],
  };

  const batchSize = 50;
  const batch = orphans.slice(0, batchSize);

  for (const orphan of batch) {
    if (!urlMap.has(orphan.urlKey)) {
      console.log(`SKIP: ${orphan.urlKey} not in urlMap (content may have been removed)`);
      report.skipped++;
      continue;
    }

    const related = findRelatedPages(orphan, entries, urlMap);

    if (related.length === 0) {
      console.log(`NO MATCHES: ${orphan.urlKey} (topics: ${orphan.topics.join(', ')})`);
      report.skipped++;
      continue;
    }

    let linksAddedForOrphan = 0;
    const targets = [];

    for (const r of related) {
      const enPath = r.entry.absolutePath;
      const esPath = r.entry.esPath;

      const enOk = addRelatedResourceToFile(enPath, orphan.urlKey);
      const esOk = fs.existsSync(esPath) ? addRelatedResourceToFile(esPath, orphan.urlKey) : false;

      if (enOk) {
        r.entry.relatedResources.push(orphan.urlKey);
        linksAddedForOrphan++;
        report.linksAdded++;
        targets.push({
          file: r.entry.file,
          url: r.entry.urlKey,
          score: r.score,
          sharedTopics: r.sharedTopics,
        });
      }

      if (!esOk && fs.existsSync(esPath)) {
        console.log(`  WARN: ES file already has link or failed: ${esPath}`);
      }
    }

    if (linksAddedForOrphan > 0) {
      report.processed++;
      report.details.push({
        orphan: orphan.urlKey,
        topics: orphan.topics,
        contentType: orphan.contentType,
        linksAdded: linksAddedForOrphan,
        targets,
      });
      console.log(`LINKED: ${orphan.urlKey} -> ${targets.map(t=>t.url).join(', ')}`);
    } else {
      report.skipped++;
      console.log(`SKIP: ${orphan.urlKey} - all targets full or already linked`);
    }
  }

  const reportPath = path.join(__dirname, '..', 'ref', 'orphan-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n=== BATCH RESULTS ===`);
  console.log(`Orphans processed (linked): ${report.processed}`);
  console.log(`Orphans skipped: ${report.skipped}`);
  console.log(`Total links added: ${report.linksAdded}`);
  console.log(`Report: ${reportPath}`);
}

main();
