const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const MAX_BODY_LINKS = 5;
const MIN_BODY_LINKS = 3;
const BATCH_SIZE = 50;
const REPORT_PATH = path.join(__dirname, '..', 'ref', 'body-links-report.json');

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

function splitFrontmatter(content) {
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
  const esEntries = new Map();

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(CONTENT_DIR, ct);
    if (!fs.existsSync(ctDir)) continue;

    const files = findAllMdFiles(ctDir);
    for (const file of files) {
      const isEs = file.endsWith('.es.md');
      const content = fs.readFileSync(file, 'utf8');
      const parsed = splitFrontmatter(content);
      if (!parsed) continue;

      const fm = parseFrontmatterFields(parsed.fmText);
      const slug = fm.slug || '';
      const contentType = fm.contentType || ct;
      const urlKey = `/${contentType}/${slug}`;
      const topics = Array.isArray(fm.topics) ? fm.topics : [];
      const tags = Array.isArray(fm.tags) ? fm.tags : [];
      const title = (fm.title || '').replace(/^["']|["']$/g, '');

      const entry = {
        file: path.relative(CONTENT_DIR, file),
        absolutePath: file,
        slug,
        contentType,
        urlKey,
        topics,
        tags,
        title,
        isEs,
      };

      if (isEs) {
        esEntries.set(urlKey, entry);
      } else {
        entries.push(entry);
        urlMap.set(urlKey, entry);
      }
    }
  }

  return { entries, urlMap, esEntries };
}

function countBodyLinks(body) {
  const linkPattern = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  let count = 0;
  let match;
  while ((match = linkPattern.exec(body)) !== null) {
    count++;
  }
  return count;
}

function findRelatedPages(page, entries, urlMap, maxResults) {
  const pageTopics = new Set(page.topics);
  const pageTags = new Set(page.tags);
  const pageUrl = page.urlKey;

  const scored = entries
    .filter((e) => e.urlKey !== pageUrl)
    .map((e) => {
      let score = 0;
      const sharedTopics = e.topics.filter((t) => pageTopics.has(t));
      const sharedTags = e.tags.filter((t) => pageTags.has(t));
      score += sharedTopics.length * 3;
      score += sharedTags.length * 1;

      if (e.contentType === 'guides') score += 0.5;
      if (e.contentType === 'patterns') score += 0.3;

      return { entry: e, score, sharedTopics, sharedTags };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults);
}

function findSections(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];
  let inCodeBlock = false;
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        startLine: i,
        endLine: lines.length - 1,
      };
    }
  }

  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return { sections, lines };
}

function isInsideCodeBlock(lineIdx, lines) {
  let inCode = false;
  for (let i = 0; i <= lineIdx; i++) {
    if (lines[i].trim().startsWith('```')) {
      inCode = !inCode;
    }
  }
  return inCode;
}

function insertSeeAlsoSection(lines, links, eol) {
  const seeAlsoHeading = '## See Also';
  const seeAlsoLines = [
    '',
    seeAlsoHeading,
    '',
    ...links.map((l) => `- [${l.text}](${l.url})`),
    '',
  ];

  let insertIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      insertIdx = i + 1;
      break;
    }
  }

  return [...lines.slice(0, insertIdx), ...seeAlsoLines.map((l) => l), ...lines.slice(insertIdx)];
}

function insertLinksInBody(body, links, isEs) {
  const { sections, lines } = findSections(body);
  const eol = body.includes('\r\n') ? '\r\n' : '\n';

  const seeAlsoSection = sections.find(
    (s) => s.title.toLowerCase().includes('see also') || s.title.toLowerCase().includes('related reading') || s.title.toLowerCase().includes('related')
  );

  if (seeAlsoSection) {
    const insertIdx = seeAlsoSection.endLine + 1;
    const newLines = [...lines];
    const linkLines = links.map((l) => `- [${l.text}](${l.url})`);

    let actualInsertIdx = insertIdx;
    while (actualInsertIdx < newLines.length && newLines[actualInsertIdx].trim() === '') {
      actualInsertIdx++;
    }

    if (actualInsertIdx >= newLines.length || !newLines[actualInsertIdx].trim().startsWith('-')) {
      newLines.splice(actualInsertIdx, 0, '', ...linkLines, '');
    } else {
      for (const ll of linkLines.reverse()) {
        newLines.splice(actualInsertIdx, 0, ll);
      }
    }

    return newLines.join(eol);
  }

  const bestPracticesSection = sections.find(
    (s) => s.title.toLowerCase().includes('best practices') || s.title.toLowerCase().includes('mejores prácticas')
  );

  if (bestPracticesSection && links.length >= 2) {
    const newLines = [...lines];
    const sectionStart = bestPracticesSection.startLine + 1;
    let insertIdx = sectionStart;

    while (insertIdx < newLines.length && newLines[insertIdx].trim() === '') {
      insertIdx++;
    }

    const link1 = links[0];
    const link2 = links[1];
    newLines.splice(insertIdx, 0, '', `- For a deeper guide, see [${link1.text}](${link1.url}).`, '');

    return newLines.join(eol);
  }

  const whenToUseSection = sections.find(
    (s) => s.title.toLowerCase().includes('when to use') || s.title.toLowerCase().includes('cuándo usar') || s.title.toLowerCase().includes('cuando usar')
  );

  if (whenToUseSection && links.length >= 2) {
    const newLines = [...lines];
    const sectionStart = whenToUseSection.startLine + 1;
    let insertIdx = sectionStart;

    while (insertIdx < newLines.length && newLines[insertIdx].trim() === '') {
      insertIdx++;
    }

    const link1 = links[0];
    newLines.splice(insertIdx, 0, '', `- For alternatives, see [${link1.text}](${link1.url}).`, '');

    return newLines.join(eol);
  }

  return insertSeeAlsoSection(lines, links, eol).join(eol);
}

function processFile(filePath, relatedPages, urlMap, esEntries, isEs) {
  if (!fs.existsSync(filePath)) return null;

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const parsed = splitFrontmatter(rawContent);
  if (!parsed) return null;

  const { fmText, body } = parsed;
  const currentLinks = countBodyLinks(body);

  if (currentLinks > 0) return null;

  const links = relatedPages.slice(0, MAX_BODY_LINKS).map((r) => {
    const title = r.entry.title.replace(/^["']|["']$/g, '');
    const url = isEs
      ? `/es/${r.entry.contentType}/${r.entry.slug}/`
      : `/${r.entry.contentType}/${r.entry.slug}/`;
    return { text: title, url };
  });

  if (links.length < MIN_BODY_LINKS) return null;

  const newBody = insertLinksInBody(body, links, isEs);
  const newContent = `---${eol}${fmText.replace(/\r\n/g, '\n').split('\n').join(eol)}${eol}---${newBody}`;

  fs.writeFileSync(filePath, newContent, 'utf8');

  return {
    linksAdded: links.length,
    links,
    section: 'auto-detected',
  };
}

function main() {
  console.log('Building entries and URL map...');
  const { entries, urlMap, esEntries } = buildAllEntries();
  console.log(`Total EN entries: ${entries.length}, URL map: ${urlMap.size}`);

  const report = {
    timestamp: new Date().toISOString(),
    batch: 0,
    processed: 0,
    skipped: 0,
    linksAdded: 0,
    details: [],
  };

  const priorityOrder = { guides: 0, patterns: 1, recipes: 2, docs: 3 };

  const pagesWithZeroLinks = entries.filter((e) => {
    const content = fs.readFileSync(e.absolutePath, 'utf8');
    const parsed = splitFrontmatter(content);
    if (!parsed) return false;
    return countBodyLinks(parsed.body) === 0;
  });

  pagesWithZeroLinks.sort((a, b) => {
    const pa = priorityOrder[a.contentType] !== undefined ? priorityOrder[a.contentType] : 9;
    const pb = priorityOrder[b.contentType] !== undefined ? priorityOrder[b.contentType] : 9;
    return pa - pb;
  });

  console.log(`Pages with 0 body links: ${pagesWithZeroLinks.length}`);
  console.log(`By type: guides=${pagesWithZeroLinks.filter(p=>p.contentType==='guides').length}, patterns=${pagesWithZeroLinks.filter(p=>p.contentType==='patterns').length}, recipes=${pagesWithZeroLinks.filter(p=>p.contentType==='recipes').length}, docs=${pagesWithZeroLinks.filter(p=>p.contentType==='docs').length}`);

  const batch = pagesWithZeroLinks.slice(0, BATCH_SIZE);
  report.batch = 1;

  for (const page of batch) {
    const related = findRelatedPages(page, entries, urlMap, MAX_BODY_LINKS + 2);

    if (related.length < MIN_BODY_LINKS) {
      console.log(`  SKIP: ${page.urlKey} - only ${related.length} related pages found`);
      report.skipped++;
      continue;
    }

    const enResult = processFile(page.absolutePath, related, urlMap, esEntries, false);
    const esPath = page.absolutePath.replace(/\.md$/, '.es.md');
    const esResult = fs.existsSync(esPath) ? processFile(esPath, related, urlMap, esEntries, true) : null;

    if (enResult) {
      report.processed++;
      report.linksAdded += enResult.linksAdded;
      if (esResult) report.linksAdded += esResult.linksAdded;

      report.details.push({
        file: page.file,
        urlKey: page.urlKey,
        contentType: page.contentType,
        enLinksAdded: enResult.linksAdded,
        esLinksAdded: esResult ? esResult.linksAdded : 0,
        links: enResult.links,
      });

      console.log(`  LINKED: ${page.urlKey} +${enResult.linksAdded} EN${esResult ? ` +${esResult.linksAdded} ES` : ''}`);
    } else {
      report.skipped++;
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n=== BATCH 1 RESULTS ===`);
  console.log(`Pages processed: ${report.processed}`);
  console.log(`Pages skipped: ${report.skipped}`);
  console.log(`Total links added: ${report.linksAdded}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main();
