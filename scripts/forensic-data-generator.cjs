#!/usr/bin/env node
/**
 * Forensic data generator for StackPractices.
 * Scans the built dist/ and source content/ to produce ref/audit-data.json,
 * a single evidence file for the Website Forensic Audit and related prompts.
 */

const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'src', 'content');
const PUBLIC = path.join(ROOT, 'public');
const REF = path.join(ROOT, 'ref');

const AI_PHRASES = [
  'delve into', 'navigate the landscape', 'in the realm of', 'crucial', 'vital',
  'comprehensive guide to', 'it is important to note', 'in conclusion',
  'in summary', 'it should be noted', 'as mentioned earlier', 'remember that',
  'ultimately', 'overall', 'with this in mind', 'for related guidance, see',
  'does not exist in isolation', 'plays a key role', 'a wide range of',
  'a number of', 'in order to', 'due to the fact that',
];

const TEMPLATE_HEADINGS = [
  'overview', 'when to use', 'solution', 'explanation', 'variants',
  'best practices', 'common mistakes', 'frequently asked questions', 'faq',
  'references', 'related resources',
];

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, callback);
    } else {
      callback(full);
    }
  }
}

function urlFromDist(relPath) {
  // relPath like "recipes/parse-json/index.html" or "404.html"
  const withSlashes = relPath.replace(/\\/g, '/');
  if (withSlashes.endsWith('/index.html')) {
    return 'https://stackpractices.com/' + withSlashes.slice(0, -'index.html'.length);
  }
  if (withSlashes === 'index.html') {
    return 'https://stackpractices.com/';
  }
  return 'https://stackpractices.com/' + withSlashes.replace(/\.html$/, '/');
}

function pathFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '');
  }
}

function extractSimple(html, regex, flags = 'i') {
  const m = html.match(new RegExp(regex, flags));
  return m ? m[1].trim() : null;
}

function extractAll(html, regex, group = 1, flags = 'ig') {
  const out = [];
  const re = new RegExp(regex, flags);
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[group].trim());
  }
  return out;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function analyzeHtml(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(DIST, filePath).replace(/\\/g, '/');
  const url = urlFromDist(relPath);

  const title = extractSimple(html, '<title>([^<]*)<\/title>');
  const metaDesc = extractSimple(html, '<meta[^>]*name="description"[^>]*content="([^"]*)"');
  const metaRobots = extractSimple(html, '<meta[^>]*name="robots"[^>]*content="([^"]*)"');
  const canonical = extractSimple(html, '<link[^>]*rel="canonical"[^>]*href="([^"]*)"');

  const hreflang = [];
  const hlRe = /<link[^>]*rel="alternate"[^>]*hreflang="([^"]*)"[^>]*href="([^"]*)"/gi;
  let hm;
  while ((hm = hlRe.exec(html)) !== null) {
    hreflang.push({ lang: hm[1], href: hm[2] });
  }

  const ogUrl = extractSimple(html, '<meta[^>]*property="og:url"[^>]*content="([^"]*)"');
  const ogImage = extractSimple(html, '<meta[^>]*property="og:image"[^>]*content="([^"]*)"');

  const h1 = extractAll(html, '<h1[^>]*>([\\s\\S]*?)<\/h1>', 1, 'gi').map(stripTags);
  const h2 = extractAll(html, '<h2[^>]*>([\\s\\S]*?)<\/h2>', 1, 'gi').map(stripTags);
  const h3 = extractAll(html, '<h3[^>]*>([\\s\\S]*?)<\/h3>', 1, 'gi').map(stripTags);
  const h4 = extractAll(html, '<h4[^>]*>([\\s\\S]*?)<\/h4>', 1, 'gi').map(stripTags);
  const h5 = extractAll(html, '<h5[^>]*>([\\s\\S]*?)<\/h5>', 1, 'gi').map(stripTags);
  const h6 = extractAll(html, '<h6[^>]*>([\\s\\S]*?)<\/h6>', 1, 'gi').map(stripTags);

  // JSON-LD
  const jsonLd = [];
  const ldRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jm;
  while ((jm = ldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(jm[1].trim());
      jsonLd.push(obj);
    } catch { /* ignore malformed */ }
  }

  // Main content word count
  let mainHtml = '';
  const mainMatch = html.match(/<main[^>]*data-pagefind-body[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) mainHtml = mainMatch[1];
  else {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) mainHtml = bodyMatch[1];
  }
  const visibleText = stripTags(mainHtml);
  const wordCount = countWords(visibleText);

  // Images
  const imgTags = extractAll(html, '<img[^>]*>', 0, 'gi');
  const images = imgTags.map(tag => {
    const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || '';
    const src = (tag.match(/src="([^"]*)"/i) || [])[1] || '';
    return { src, alt, missingAlt: !alt && !tag.includes('aria-hidden') };
  });

  // Links
  const aRe = /<a[^>]*href="([^"]*)"[^>]*>/gi;
  const internalLinks = [];
  const externalLinks = [];
  let am;
  while ((am = aRe.exec(html)) !== null) {
    const href = am[1].trim();
    if (href.startsWith('/') || href.startsWith('https://stackpractices.com')) {
      internalLinks.push(href);
    } else if (href.startsWith('http') || href.startsWith('//')) {
      externalLinks.push(href);
    }
  }

  // Scripts and styles
  const scripts = extractAll(html, '<script[^>]*src="([^"]*)"[^>]*>', 1, 'gi');
  const inlineScripts = (html.match(/<script[\s\S]*?<\/script>/gi) || []).length;
  const styles = extractAll(html, '<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"', 1, 'gi');

  return {
    url,
    path: pathFromUrl(url),
    relPath,
    size: fs.statSync(filePath).size,
    title,
    metaDesc,
    metaRobots,
    canonical,
    hreflang,
    ogUrl,
    ogImage,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    jsonLd,
    wordCount,
    images,
    missingAlt: images.filter(i => i.missingAlt).length,
    internalLinks,
    externalLinks,
    scripts,
    inlineScripts,
    styles,
  };
}

function analyzeMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const parsed = matter(raw);
  const meta = parsed.attributes || {};
  const body = parsed.body || '';
  const isEs = rel.endsWith('.es.md');
  const baseRel = isEs ? rel.replace('.es.md', '.md') : rel;

  const wordCount = countWords(body);
  const lineCount = raw.split('\n').length;
  const headingMatches = body.match(/^#{1,6}\s+/gm) || [];
  const h1 = (body.match(/^#\s+/gm) || []).length;
  const h2 = (body.match(/^##\s+/gm) || []).length;
  const h3 = (body.match(/^###\s+/gm) || []).length;
  const codeBlocks = (body.match(/^```[\s\S]*?^```/gm) || []).length;
  const images = (body.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const internalLinks = (body.match(/\]\(\/[^)]+\)/g) || []).length;

  const lowerBody = body.toLowerCase();
  const aiPhrases = {};
  for (const phrase of AI_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const count = (lowerBody.match(re) || []).length;
    if (count) aiPhrases[phrase] = count;
  }

  const templateHeadings = {};
  for (const h of TEMPLATE_HEADINGS) {
    const re = new RegExp('^#{1,6}\\s+' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'gim');
    const count = (body.match(re) || []).length;
    if (count) templateHeadings[h] = count;
  }

  return {
    file: rel,
    baseRel,
    isEs,
    locale: isEs ? 'es' : 'en',
    slug: meta.slug || '',
    contentType: meta.contentType || rel.split('/')[2],
    title: meta.title || '',
    description: meta.description || '',
    metaDescription: meta.metaDescription || '',
    difficulty: meta.difficulty || '',
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    relatedResources: Array.isArray(meta.relatedResources) ? meta.relatedResources : [],
    author: meta.author || '',
    lastUpdated: meta.lastUpdated || '',
    draft: !!meta.draft,
    noindex: !!meta.noindex,
    seo: meta.seo || {},
    wordCount,
    lineCount,
    h1,
    h2,
    h3,
    codeBlocks,
    images,
    internalLinks,
    aiPhrases,
    templateHeadings,
  };
}

function parseSitemap(xml) {
  const urls = [];
  const urlRe = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = urlRe.exec(xml)) !== null) {
    const block = m[1];
    const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1] || '';
    const lastmod = (block.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1] || '';
    const hreflangs = [];
    const hlRe = /<xhtml:link[^>]*href="([^"]*)"[^>]*hreflang="([^"]*)"/g;
    let h;
    while ((h = hlRe.exec(block)) !== null) {
      hreflangs.push({ lang: h[2], href: h[1] });
    }
    urls.push({ loc, path: pathFromUrl(loc), lastmod, hreflangs });
  }
  return urls;
}

function loadRobots() {
  const robotsPath = path.join(PUBLIC, 'robots.txt');
  if (!fs.existsSync(robotsPath)) return { exists: false, raw: '' };
  const raw = fs.readFileSync(robotsPath, 'utf8');
  const sitemap = (raw.match(/Sitemap:\s*(.*)/i) || [])[1] || '';
  const disallows = [];
  const dRe = /Disallow:\s*(.*)/gi;
  let dm;
  while ((dm = dRe.exec(raw)) !== null) disallows.push(dm[1].trim());
  return { exists: true, raw, sitemap, disallows };
}

function main() {
  console.log('Scanning built dist/...');
  const pages = [];
  walk(DIST, (full) => {
    if (full.endsWith('.html')) {
      pages.push(analyzeHtml(full));
    }
  });

  console.log(`Scanned ${pages.length} HTML pages.`);

  console.log('Scanning source content/...');
  const mdFiles = [];
  walk(CONTENT, (full) => {
    if (full.endsWith('.md')) {
      mdFiles.push(analyzeMarkdown(full));
    }
  });

  console.log(`Scanned ${mdFiles.length} Markdown files.`);

  const sitemapXml = fs.existsSync(path.join(PUBLIC, 'sitemap.xml'))
    ? fs.readFileSync(path.join(PUBLIC, 'sitemap.xml'), 'utf8')
    : '';
  const sitemap = parseSitemap(sitemapXml);

  const robots = loadRobots();

  // Build fast lookup maps
  const pageByPath = new Map();
  for (const p of pages) pageByPath.set(p.path, p);
  const mdBySlug = new Map();
  for (const m of mdFiles) mdBySlug.set(`${m.contentType}/${m.slug}`, m);

  // Sitemap vs dist
  const sitemapPaths = new Set(sitemap.map(u => u.path));
  const distPaths = new Set(pages.map(p => p.path));
  const inSitemapNotDist = [...sitemapPaths].filter(p => !distPaths.has(p));
  const inDistNotSitemap = [...distPaths].filter(p => !sitemapPaths.has(p));

  // Duplicates
  const titles = {};
  const descs = {};
  for (const p of pages) {
    if (p.title) titles[p.title] = (titles[p.title] || 0) + 1;
    if (p.metaDesc) descs[p.metaDesc] = (descs[p.metaDesc] || 0) + 1;
  }
  const duplicateTitles = Object.entries(titles).filter(([_, c]) => c > 1).map(([t, c]) => ({ title: t, count: c }));
  const duplicateDescs = Object.entries(descs).filter(([_, c]) => c > 1).map(([d, c]) => ({ description: d, count: c }));

  const titleTooLong = pages.filter(p => p.title && p.title.length > 60).map(p => ({ url: p.url, length: p.title.length, title: p.title }));
  const descTooLong = pages.filter(p => p.metaDesc && p.metaDesc.length > 160).map(p => ({ url: p.url, length: p.metaDesc.length }));
  const descTooShort = pages.filter(p => p.metaDesc && p.metaDesc.length < 50).map(p => ({ url: p.url, length: p.metaDesc.length }));

  const missingH1 = pages.filter(p => p.h1.length === 0).map(p => p.url);
  const multipleH1 = pages.filter(p => p.h1.length > 1).map(p => ({ url: p.url, count: p.h1.length }));
  const missingCanonical = pages.filter(p => !p.canonical).map(p => p.url);

  const missingHreflang = pages.filter(p => p.hreflang.length === 0).map(p => p.url);
  const hreflangIssues = [];
  for (const p of pages) {
    if (p.hreflang.length === 0) continue;
    const hasEn = p.hreflang.some(h => h.lang === 'en');
    const hasEs = p.hreflang.some(h => h.lang === 'es');
    const hasXDefault = p.hreflang.some(h => h.lang === 'x-default');
    if (!hasEn || !hasEs || !hasXDefault) {
      hreflangIssues.push({ url: p.url, hasEn, hasEs, hasXDefault });
    }
  }

  const canonicalMismatch = [];
  for (const p of pages) {
    if (p.canonical && p.canonical !== p.url) {
      canonicalMismatch.push({ url: p.url, canonical: p.canonical });
    }
  }

  const thinPages = pages.filter(p => p.wordCount < 200).map(p => ({ url: p.url, words: p.wordCount }));
  const missingAltPages = pages.filter(p => p.missingAlt > 0).map(p => ({ url: p.url, missing: p.missingAlt }));

  // Schema presence
  const schemaTypes = {};
  for (const p of pages) {
    for (const ld of p.jsonLd) {
      const t = ld['@type'];
      if (t) {
        const key = Array.isArray(t) ? t.join(',') : t;
        schemaTypes[key] = (schemaTypes[key] || 0) + 1;
      }
    }
  }
  const pagesWithoutSchema = pages.filter(p => p.jsonLd.length === 0).map(p => p.url);

  // Content stats
  const contentByType = {};
  const contentByTopic = {};
  const contentByDifficulty = {};
  const contentByTypeEn = {};
  const aiPhraseCounts = {};
  const templateHeadingCounts = {};
  let totalBodyWords = 0;
  let totalCodeBlocks = 0;
  const lastUpdatedDates = {};
  const authorCounts = {};
  let missingTranslations = 0;
  const enBaseRels = new Set();

  // First pass: collect English base rels
  for (const m of mdFiles) {
    if (!m.isEs) enBaseRels.add(m.baseRel);
  }

  for (const m of mdFiles) {
    contentByType[m.contentType] = (contentByType[m.contentType] || 0) + 1;
    if (!m.isEs) contentByTypeEn[m.contentType] = (contentByTypeEn[m.contentType] || 0) + 1;
    for (const t of m.topics) contentByTopic[t] = (contentByTopic[t] || 0) + 1;
    contentByDifficulty[m.difficulty] = (contentByDifficulty[m.difficulty] || 0) + 1;
    totalBodyWords += m.wordCount;
    totalCodeBlocks += m.codeBlocks;
    if (m.isEs && !enBaseRels.has(m.baseRel)) missingTranslations++;
    for (const [phrase, count] of Object.entries(m.aiPhrases)) {
      aiPhraseCounts[phrase] = (aiPhraseCounts[phrase] || 0) + count;
    }
    for (const [h, count] of Object.entries(m.templateHeadings)) {
      templateHeadingCounts[h] = (templateHeadingCounts[h] || 0) + count;
    }
    const lu = String(m.lastUpdated).split('T')[0];
    lastUpdatedDates[lu] = (lastUpdatedDates[lu] || 0) + 1;
    authorCounts[m.author] = (authorCounts[m.author] || 0) + 1;
  }

  // Dist build assets
  let jsSize = 0;
  let cssSize = 0;
  let imgSize = 0;
  let htmlSize = 0;
  const jsFiles = [];
  const cssFiles = [];
  const imageFiles = [];
  walk(DIST, (full) => {
    const size = fs.statSync(full).size;
    if (full.endsWith('.html')) htmlSize += size;
    else if (full.endsWith('.js')) { jsSize += size; jsFiles.push(path.relative(DIST, full).replace(/\\/g, '/')); }
    else if (full.endsWith('.css')) { cssSize += size; cssFiles.push(path.relative(DIST, full).replace(/\\/g, '/')); }
    else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(full)) { imgSize += size; imageFiles.push(path.relative(DIST, full).replace(/\\/g, '/')); }
  });

  const auditData = {
    generatedAt: new Date().toISOString(),
    site: {
      domain: 'stackpractices.com',
      url: 'https://stackpractices.com',
    },
    summary: {
      distHtmlPages: pages.length,
      mdFiles: mdFiles.length,
      sitemapUrls: sitemap.length,
      buildAssets: {
        jsSize,
        cssSize,
        imgSize,
        htmlSize,
        jsFiles: jsFiles.length,
        cssFiles: cssFiles.length,
        imageFiles: imageFiles.length,
      },
    },
    pages: pages,
    allPageUrls: pages.map(p => p.url),
    mdFiles: mdFiles,
    sitemap,
    robots,
    issues: {
      inSitemapNotDist,
      inDistNotSitemap,
      duplicateTitles,
      duplicateDescs,
      titleTooLong,
      descTooLong,
      descTooShort,
      missingH1,
      multipleH1,
      missingCanonical,
      canonicalMismatch,
      missingHreflang,
      hreflangIssues,
      thinPages,
      missingAltPages,
      pagesWithoutSchema,
    },
    content: {
      byType: contentByType,
      byTypeEn: contentByTypeEn,
      byTopic: contentByTopic,
      byDifficulty: contentByDifficulty,
      totalBodyWords,
      totalCodeBlocks,
      aiPhraseCounts,
      templateHeadingCounts,
      lastUpdatedDates,
      authorCounts,
      missingTranslations,
    },
    schema: {
      types: schemaTypes,
    },
    internals: JSON.parse(fs.readFileSync(path.join(REF, 'internal-linking-data.json'), 'utf8')),
  };

  if (!fs.existsSync(REF)) fs.mkdirSync(REF, { recursive: true });
  fs.writeFileSync(path.join(REF, 'audit-data.json'), JSON.stringify(auditData, null, 2));
  console.log(`Wrote ref/audit-data.json (${(fs.statSync(path.join(REF, 'audit-data.json')).size / 1024).toFixed(1)} KB)`);
}

main();
