import fs from 'node:fs';
import path from 'node:path';
import fm from 'front-matter';

const GSC_PAGES = 'output/gsc-pages-28d.json';
const GSC_COMPARE = 'output/gsc-compare-pages-28d.json';
const EN_URLS = 'ref/urls.md';
const ES_URLS = 'ref/urls-es.md';
const OUTPUT = 'ref/top-100-resources.md';

const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

// Load GSC current metrics.
const gscPages = JSON.parse(fs.readFileSync(GSC_PAGES, 'utf8'));
const gscByUrl = new Map();
for (const row of gscPages) {
  gscByUrl.set(row.keys[0], row);
}

// Load GSC compare metrics.
const gscCompare = JSON.parse(fs.readFileSync(GSC_COMPARE, 'utf8'));
const compareByUrl = new Map();
for (const row of gscCompare) {
  compareByUrl.set(row.keys[0], row);
}

// Parse URL list and keep only content pages.
function parseContentUrls(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const urls = [...text.matchAll(/^- (https:\/\/[^\s]+)$/gm)].map((m) => m[1]);
  const filtered = [];
  for (const url of urls) {
    const { pathname } = new URL(url);
    const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);

    // Spanish URLs are prefixed with /es/{type}/{slug}/.
    const isSpanish = segments[0] === 'es';
    const offset = isSpanish ? 1 : 0;
    if (segments.length < offset + 2) continue;

    const type = segments[offset];
    const slug = segments[offset + 1];
    if (!CONTENT_TYPES.includes(type) || /^\d+$/.test(slug)) continue;
    filtered.push({ url, type, slug, pathname, isSpanish });
  }
  return filtered;
}

const enContent = parseContentUrls(EN_URLS);
const esContent = parseContentUrls(ES_URLS);
const esByPath = new Map(esContent.map((e) => [e.pathname, e]));

// Index content files to avoid repeated disk reads.
const contentDir = 'src/content';
const contentFiles = fs.readdirSync(contentDir, { recursive: true })
  .map((f) => path.join(contentDir, f))
  .filter((f) => fs.statSync(f).isFile() && f.endsWith('.md'));

const baseName = (f) => {
  const bn = path.basename(f);
  return bn.replace(/\.es\.md$|\.md$/, '');
};

const mdFileBySlugAndType = new Map();
for (const file of contentFiles) {
  const rel = path.relative(contentDir, file).replace(/\\/g, '/');
  const parts = rel.split('/');
  const type = parts[0];
  const slug = baseName(file);
  if (file.endsWith('.es.md')) {
    mdFileBySlugAndType.set(`${type}::${slug}::es`, file);
  } else {
    mdFileBySlugAndType.set(`${type}::${slug}::en`, file);
  }
}

function getMetrics(url) {
  return gscByUrl.get(url) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function getCompare(url) {
  return compareByUrl.get(url);
}

function getContentInfo(type, slug, lang) {
  const file = mdFileBySlugAndType.get(`${type}::${slug}::${lang}`);
  if (!file) return null;
  const content = fs.readFileSync(file, 'utf8');
  const parsed = fm(content);
  const body = parsed.body;
  const wordCount = body.split(/\s+/).filter((w) => w.length > 0).length;
  const meta = parsed.attributes.metaDescription || '';
  return {
    title: parsed.attributes.title || '',
    description: parsed.attributes.description || '',
    metaLength: meta.length,
    wordCount,
    lastUpdated: parsed.attributes.lastUpdated || '',
    difficulty: parsed.attributes.difficulty || '',
  };
}

// Score each English resource; aggregate with Spanish when available.
const resources = [];

for (const en of enContent) {
  const enMetrics = getMetrics(en.url);
  const es = esByPath.get(`/es${en.pathname}`);
  const esMetrics = es ? getMetrics(es.url) : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const totalImpressions = enMetrics.impressions + esMetrics.impressions;
  const totalClicks = enMetrics.clicks + esMetrics.clicks;
  const avgPosition =
    totalImpressions > 0
      ? (enMetrics.position * enMetrics.impressions + esMetrics.position * esMetrics.impressions) / totalImpressions
      : 0;
  const overallCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  const enCompare = getCompare(en.url);
  const esCompare = es ? getCompare(es.url) : null;
  const deltaImpressions =
    (enCompare ? enCompare.delta_impressions : 0) +
    (esCompare ? esCompare.delta_impressions : 0);
  const deltaClicks =
    (enCompare ? enCompare.delta_clicks : 0) + (esCompare ? esCompare.delta_clicks : 0);

  const info = getContentInfo(en.type, en.slug, 'en');

  // Build score.
  let score = 0;

  // Demand signal: log of impressions to avoid one dominant page.
  score += Math.log2(totalImpressions + 1) * 10;

  // Striking distance and position weight.
  if (avgPosition <= 0) {
    score += 0;
  } else if (avgPosition <= 5) {
    score += 8;
  } else if (avgPosition <= 10) {
    score += 14;
  } else if (avgPosition <= 20) {
    score += 20;
  } else if (avgPosition <= 30) {
    score += 16;
  } else if (avgPosition <= 50) {
    score += 8;
  } else {
    score += 4;
  }

  // CTR improvement opportunity.
  if (totalImpressions > 10) {
    if (overallCtr < 0.01) score += 12;
    else if (overallCtr < 0.03) score += 8;
    else if (overallCtr < 0.05) score += 4;
  }

  // Proven clicks.
  if (totalClicks > 0) score += 5;

  // Declining impressions are a strong audit signal.
  if (deltaImpressions < -20) score += 10;
  else if (deltaImpressions < -5) score += 5;

  // Positive momentum is also valuable (content can be accelerated).
  if (deltaImpressions > 5) score += 3;

  // Thin content bonus: pages with less than 300 words need expansion.
  if (info && info.wordCount < 400) score += 6;

  // Badly sized meta descriptions are quick wins.
  if (info && (info.metaLength < 50 || info.metaLength > 170)) score += 2;

  resources.push({
    en,
    es,
    type: en.type,
    slug: en.slug,
    totalImpressions,
    totalClicks,
    avgPosition,
    overallCtr,
    deltaImpressions,
    deltaClicks,
    info,
    score,
  });
}

resources.sort((a, b) => b.score - a.score);
const top100 = resources.slice(0, 100);

function formatNumber(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatCtr(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function reasonTags(r) {
  const tags = [];
  if (r.avgPosition >= 5 && r.avgPosition <= 20) tags.push('striking distance');
  if (r.totalImpressions > 50) tags.push('high impressions');
  if (r.overallCtr < 0.03 && r.totalImpressions > 10) tags.push('low CTR');
  if (r.deltaImpressions < -20) tags.push('losing impressions');
  if (r.totalClicks > 0) tags.push('proven demand');
  if (r.info && r.info.wordCount < 400) tags.push('thin content');
  if (r.info && (r.info.metaLength < 50 || r.info.metaLength > 170)) tags.push('meta fix');
  return tags.join(', ') || 'general optimization';
}

const countsByType = {};
for (const r of top100) {
  countsByType[r.type] = (countsByType[r.type] || 0) + 1;
}

const lines = [
  '# Top 100 Content Resources to Audit & Improve',
  '',
  'Selection based on Google Search Console data (last 28 days): impressions, clicks, CTR, position, impression deltas vs prior 28 days, and on-page signals (word count, meta description length).',
  '',
  '- **Total resources evaluated:** ' + resources.length,
  '- **Top 100 total impressions:** ' + formatNumber(top100.reduce((s, r) => s + r.totalImpressions, 0)),
  '- **Top 100 total clicks:** ' + formatNumber(top100.reduce((s, r) => s + r.totalClicks, 0)),
  '- **By content type:** ' + Object.entries(countsByType).map(([k, v]) => `${k}=${v}`).join(', '),
  '',
  '| # | EN URL | ES URL | Type | Impressions | Clicks | Avg Pos | CTR | Words | Meta | Δ Impr | Focus |',
  '|---|--------|--------|------|------------:|-------:|--------:|----:|------:|-----:|-------:|-------|',
];

for (let i = 0; i < top100.length; i++) {
  const r = top100[i];
  const title = r.info ? r.info.title.replace(/\|/g, '\\|') : '';
  const enUrl = r.en.url;
  const esUrl = r.es ? r.es.url : '';
  const words = r.info ? formatNumber(r.info.wordCount) : '?';
  const meta = r.info ? r.info.metaLength : '?';
  const focus = reasonTags(r);
  lines.push(
    `| ${i + 1} | ${enUrl} | ${esUrl} | ${r.type} | ${formatNumber(r.totalImpressions)} | ${formatNumber(r.totalClicks)} | ${formatNumber(r.avgPosition)} | ${formatCtr(r.overallCtr)} | ${words} | ${meta} | ${formatNumber(r.deltaImpressions)} | ${focus} |`
  );
}

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUTPUT} with top 100 resources`);
