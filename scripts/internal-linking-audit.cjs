const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

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
  const fmText = parts[1].replace(/\r\n/g, '\n');
  const body = parts.slice(2).join('---').trim();

  const fm = {};
  let currentKey = null;
  let currentSubKey = null;
  const lines = fmText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Top-level key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch && !line.startsWith(' ')) {
      currentKey = kvMatch[1];
      currentSubKey = null;
      if (kvMatch[2]) {
        fm[currentKey] = kvMatch[2];
      } else {
        fm[currentKey] = [];
      }
      continue;
    }

    // Sub-object key (e.g., seo:)
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

    // Array item under top-level key
    const arrMatch = line.match(/^  -\s+(.*)$/);
    if (arrMatch && currentKey) {
      if (Array.isArray(fm[currentKey])) {
        fm[currentKey].push(arrMatch[1].trim());
      }
      continue;
    }

    // Array item under sub-object key
    const subArrMatch = line.match(/^    -\s+(.*)$/);
    if (subArrMatch && currentKey && currentSubKey) {
      if (Array.isArray(fm[currentKey][currentSubKey])) {
        fm[currentKey][currentSubKey].push(subArrMatch[1].trim());
      }
      continue;
    }
  }

  return { fm, body };
}

function extractData() {
  const allEntries = [];
  const urlMap = new Map(); // /contentType/slug -> entry

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(CONTENT_DIR, ct);
    if (!fs.existsSync(ctDir)) continue;

    const files = findAllMdFiles(ctDir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = parseFrontmatter(content);
      if (!parsed) continue;

      const { fm, body } = parsed;
      const isEs = file.endsWith('.es.md');
      const relativePath = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');

      const slug = fm.slug || '';
      const contentType = fm.contentType || ct;
      const urlKey = `/${contentType}/${slug}`;
      const fullUrl = isEs ? `/es/${contentType}/${slug}/` : `/${contentType}/${slug}/`;

      const topics = Array.isArray(fm.topics) ? fm.topics : [];
      const tags = Array.isArray(fm.tags) ? fm.tags : [];
      const relatedResources = Array.isArray(fm.relatedResources) ? fm.relatedResources : [];

      // Extract body links
      const bodyLinks = [];
      const linkRegex = /\]\((\/[^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(body)) !== null) {
        bodyLinks.push(m[1]);
      }

      const entry = {
        file: relativePath,
        absolutePath: file,
        slug,
        contentType,
        isEs,
        locale: isEs ? 'es' : 'en',
        urlKey,
        fullUrl,
        topics,
        tags,
        relatedResources,
        bodyLinks,
        title: fm.title || '',
        difficulty: fm.difficulty || '',
        lineCount: body.split('\n').length,
      };

      allEntries.push(entry);

      // Only add EN entries to the urlMap (since relatedResources use EN paths)
      if (!isEs) {
        urlMap.set(urlKey, entry);
      }
    }
  }

  return { allEntries, urlMap };
}

function auditBrokenLinks(allEntries, urlMap) {
  const broken = [];
  for (const entry of allEntries) {
    for (const res of entry.relatedResources) {
      // Normalize: remove trailing slash
      const normalized = res.replace(/\/$/, '');
      if (!urlMap.has(normalized)) {
        broken.push({
          source: entry.file,
          sourceLocale: entry.locale,
          brokenLink: res,
          normalized,
        });
      }
    }
  }
  return broken;
}

function mapClusters(allEntries) {
  const enEntries = allEntries.filter(e => !e.isEs);

  // By topic
  const topicClusters = new Map();
  for (const entry of enEntries) {
    for (const topic of entry.topics) {
      if (!topicClusters.has(topic)) topicClusters.set(topic, []);
      topicClusters.get(topic).push(entry);
    }
  }

  // By tag
  const tagClusters = new Map();
  for (const entry of enEntries) {
    for (const tag of entry.tags) {
      if (!tagClusters.has(tag)) tagClusters.set(tag, []);
      tagClusters.get(tag).push(entry);
    }
  }

  return { topicClusters, tagClusters };
}

function detectOrphans(allEntries, urlMap) {
  const enEntries = allEntries.filter(e => !e.isEs);

  // Build incoming link map
  const incomingLinks = new Map(); // urlKey -> count
  for (const entry of enEntries) {
    // From relatedResources of other entries
    for (const res of entry.relatedResources) {
      const normalized = res.replace(/\/$/, '');
      incomingLinks.set(normalized, (incomingLinks.get(normalized) || 0) + 1);
    }
    // From body links
    for (const link of entry.bodyLinks) {
      const normalized = link.replace(/\/$/, '').replace(/^\/es\//, '/');
      if (urlMap.has(normalized)) {
        incomingLinks.set(normalized, (incomingLinks.get(normalized) || 0) + 1);
      }
    }
  }

  const orphans = [];
  for (const entry of enEntries) {
    const incoming = incomingLinks.get(entry.urlKey) || 0;
    if (incoming === 0) {
      orphans.push(entry);
    }
  }

  return { orphans, incomingLinks };
}

function countCrossLinks(entries, urlMap) {
  let count = 0;
  for (const entry of entries) {
    for (const res of entry.relatedResources) {
      const normalized = res.replace(/\/$/, '');
      if (urlMap.has(normalized)) {
        const target = urlMap.get(normalized);
        // Check if target is in the same cluster
        if (entries.some(e => e.urlKey === target.urlKey)) {
          count++;
        }
      }
    }
  }
  return count;
}

function findBidirectionalGaps(allEntries, urlMap) {
  const enEntries = allEntries.filter(e => !e.isEs);
  const gaps = [];

  for (const entry of enEntries) {
    for (const res of entry.relatedResources) {
      const normalized = res.replace(/\/$/, '');
      const target = urlMap.get(normalized);
      if (!target) continue;

      // Check if target links back to entry
      const targetLinks = target.relatedResources.map(r => r.replace(/\/$/, ''));
      if (!targetLinks.includes(entry.urlKey)) {
        // Check if they share topics
        const sharedTopics = entry.topics.filter(t => target.topics.includes(t));
        if (sharedTopics.length > 0) {
          gaps.push({
            from: entry.file,
            to: target.file,
            fromUrl: entry.urlKey,
            toUrl: target.urlKey,
            sharedTopics,
          });
        }
      }
    }
  }

  return gaps;
}

function suggestRelatedResources(entry, allEntries, urlMap) {
  if (entry.relatedResources.length >= 3) return null;

  const enEntries = allEntries.filter(e => !e.isEs && e.urlKey !== entry.urlKey);
  const current = new Set(entry.relatedResources.map(r => r.replace(/\/$/, '')));

  // Score by shared topics and tags
  const scored = enEntries.map(e => {
    let score = 0;
    const sharedTopics = entry.topics.filter(t => e.topics.includes(t));
    const sharedTags = entry.tags.filter(t => e.tags.includes(t));
    score += sharedTopics.length * 3;
    score += sharedTags.length * 1;
    // Prefer same content type slightly less than cross-type
    if (e.contentType === entry.contentType) score += 0.5;
    // Prefer guides (more depth)
    if (e.contentType === 'guides') score += 0.3;
    return { entry: e, score, sharedTopics, sharedTags };
  });

  const suggestions = scored
    .filter(s => s.score > 0 && !current.has(s.entry.urlKey))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5 - entry.relatedResources.length)
    .map(s => ({
      url: s.entry.urlKey,
      title: s.entry.title,
      score: s.score,
      sharedTopics: s.sharedTopics,
      sharedTags: s.sharedTags,
    }));

  return suggestions.length > 0 ? suggestions : null;
}

function main() {
  console.log('Extracting all content data...');
  const { allEntries, urlMap } = extractData();

  const enEntries = allEntries.filter(e => !e.isEs);
  const esEntries = allEntries.filter(e => e.isEs);

  console.log(`\nTotal EN entries: ${enEntries.length}`);
  console.log(`Total ES entries: ${esEntries.length}`);
  console.log(`URL map size: ${urlMap.size}`);

  // 1. Audit broken links
  console.log('\n--- AUDITING BROKEN LINKS ---');
  const broken = auditBrokenLinks(allEntries, urlMap);
  console.log(`Broken relatedResources links: ${broken.length}`);
  for (const b of broken.slice(0, 50)) {
    console.log(`  ${b.source} -> ${b.brokenLink}`);
  }
  if (broken.length > 50) console.log(`  ... and ${broken.length - 50} more`);

  // 2. Map clusters
  console.log('\n--- MAPPING CLUSTERS ---');
  const { topicClusters, tagClusters } = mapClusters(allEntries);

  const topicStats = [];
  for (const [topic, entries] of topicClusters) {
    const crossLinks = countCrossLinks(entries, urlMap);
    const maxPossibleLinks = entries.length * (entries.length - 1);
    const coverage = maxPossibleLinks > 0 ? (crossLinks / maxPossibleLinks * 100).toFixed(1) : 0;
    topicStats.push({ topic, count: entries.length, crossLinks, coverage: parseFloat(coverage) });
  }
  topicStats.sort((a, b) => b.count - a.count);
  console.log('\nTopic clusters:');
  for (const t of topicStats) {
    console.log(`  ${t.topic}: ${t.count} pages, ${t.crossLinks} cross-links, ${t.coverage}% coverage`);
  }

  // Top 30 tags
  const tagStats = [];
  for (const [tag, entries] of tagClusters) {
    if (entries.length < 3) continue;
    const crossLinks = countCrossLinks(entries, urlMap);
    tagStats.push({ tag, count: entries.length, crossLinks });
  }
  tagStats.sort((a, b) => b.count - a.count);
  console.log('\nTop 30 tag clusters (3+ pages):');
  for (const t of tagStats.slice(0, 30)) {
    console.log(`  ${t.tag}: ${t.count} pages, ${t.crossLinks} cross-links`);
  }

  // 3. Detect orphans
  console.log('\n--- DETECTING ORPHAN PAGES ---');
  const { orphans, incomingLinks } = detectOrphans(allEntries, urlMap);
  console.log(`Orphan pages (0 incoming links): ${orphans.length}`);
  for (const o of orphans.slice(0, 50)) {
    console.log(`  ${o.file} (topics: ${o.topics.join(', ')})`);
  }
  if (orphans.length > 50) console.log(`  ... and ${orphans.length - 50} more`);

  // Pages with low incoming links (1-2)
  const lowLinks = enEntries.filter(e => {
    const count = incomingLinks.get(e.urlKey) || 0;
    return count > 0 && count <= 2;
  });
  console.log(`\nPages with 1-2 incoming links: ${lowLinks.length}`);

  // 4. relatedResources stats
  console.log('\n--- RELATED RESOURCES STATS ---');
  const noRelated = enEntries.filter(e => e.relatedResources.length === 0);
  const oneRelated = enEntries.filter(e => e.relatedResources.length === 1);
  const twoRelated = enEntries.filter(e => e.relatedResources.length === 2);
  const threePlus = enEntries.filter(e => e.relatedResources.length >= 3);
  console.log(`Pages with 0 relatedResources: ${noRelated.length}`);
  console.log(`Pages with 1 relatedResources: ${oneRelated.length}`);
  console.log(`Pages with 2 relatedResources: ${twoRelated.length}`);
  console.log(`Pages with 3+ relatedResources: ${threePlus.length}`);

  // 5. Bidirectional gaps
  console.log('\n--- BIDIRECTIONAL LINK GAPS ---');
  const biGaps = findBidirectionalGaps(allEntries, urlMap);
  console.log(`Bidirectional gaps (A->B but not B->A, shared topics): ${biGaps.length}`);
  for (const g of biGaps.slice(0, 30)) {
    console.log(`  ${g.from} -> ${g.to} (shared: ${g.sharedTopics.join(', ')})`);
  }
  if (biGaps.length > 30) console.log(`  ... and ${biGaps.length - 30} more`);

  // 6. Body links stats
  console.log('\n--- BODY LINKS STATS ---');
  const noBodyLinks = enEntries.filter(e => e.bodyLinks.length === 0);
  const fewBodyLinks = enEntries.filter(e => e.bodyLinks.length > 0 && e.bodyLinks.length < 3);
  console.log(`Pages with 0 body links: ${noBodyLinks.length}`);
  console.log(`Pages with 1-2 body links: ${fewBodyLinks.length}`);
  console.log(`Pages with 3+ body links: ${enEntries.filter(e => e.bodyLinks.length >= 3).length}`);

  // 7. Suggest related resources for pages with < 3
  console.log('\n--- SUGGESTED RELATED RESOURCES (pages with <3) ---');
  const suggestions = [];
  for (const entry of enEntries) {
    if (entry.relatedResources.length < 3) {
      const sugg = suggestRelatedResources(entry, allEntries, urlMap);
      if (sugg) {
        suggestions.push({ entry, suggestions: sugg });
      }
    }
  }
  console.log(`Pages needing more relatedResources: ${suggestions.length}`);
  for (const s of suggestions.slice(0, 20)) {
    console.log(`  ${s.entry.file} (${s.entry.relatedResources.length} current):`);
    for (const sug of s.suggestions) {
      console.log(`    -> ${sug.url} (score: ${sug.score}, topics: ${sug.sharedTopics.join(',')})`);
    }
  }
  if (suggestions.length > 20) console.log(`  ... and ${suggestions.length - 20} more`);

  // 8. Content type breakdown
  console.log('\n--- CONTENT TYPE BREAKDOWN ---');
  for (const ct of CONTENT_TYPES) {
    const ctEntries = enEntries.filter(e => e.contentType === ct);
    const ctOrphans = orphans.filter(e => e.contentType === ct);
    const ctNoRelated = ctEntries.filter(e => e.relatedResources.length === 0);
    const ctNoBody = ctEntries.filter(e => e.bodyLinks.length === 0);
    console.log(`  ${ct}: ${ctEntries.length} pages, ${ctOrphans.length} orphans, ${ctNoRelated.length} no related, ${ctNoBody.length} no body links`);
  }

  // 9. ES link audit
  console.log('\n--- ES LINK AUDIT ---');
  const esBroken = broken.filter(b => b.sourceLocale === 'es');
  const esNoRelated = esEntries.filter(e => e.relatedResources.length === 0);
  console.log(`ES broken links: ${esBroken.length}`);
  console.log(`ES pages with 0 relatedResources: ${esNoRelated.length}`);

  // Write full JSON output for further analysis
  const output = {
    summary: {
      totalEn: enEntries.length,
      totalEs: esEntries.length,
      totalBroken: broken.length,
      totalOrphans: orphans.length,
      totalNoRelated: noRelated.length,
      totalLowRelated: oneRelated.length + twoRelated.length,
      totalBiGaps: biGaps.length,
      totalNoBodyLinks: noBodyLinks.length,
    },
    topicStats,
    tagStats: tagStats.slice(0, 50),
    broken,
    orphans: orphans.map(o => ({ file: o.file, urlKey: o.urlKey, topics: o.topics, tags: o.tags, contentType: o.contentType })),
    biGaps: biGaps.slice(0, 200),
    suggestions: suggestions.map(s => ({
      file: s.entry.file,
      urlKey: s.entry.urlKey,
      current: s.entry.relatedResources.length,
      topics: s.entry.topics,
      tags: s.entry.tags,
      suggestions: s.suggestions,
    })),
    incomingLinks: Object.fromEntries(
      [...incomingLinks.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, 200)
    ),
  };

  const outputPath = path.join(__dirname, '..', 'ref', 'internal-linking-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nFull data written to: ${outputPath}`);
}

main();
