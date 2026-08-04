const fs = require('fs');

const d = JSON.parse(fs.readFileSync('ref/audit-data.json', 'utf8'));
const p = d.pages;
const m = d.mdFiles.filter(x => !x.isEs);

function top(arr, key, limit = 30, asc = true) {
  return arr.slice().sort((a, b) => asc ? a[key] - b[key] : b[key] - a[key]).slice(0, limit);
}

const detailPaths = new Set(m.map(x => `/${x.contentType}/${x.slug}/`));
const contentPages = p.filter(x => detailPaths.has(x.path));
const listingPaths = new Set(['/recipes/', '/patterns/', '/docs/', '/guides/', '/tags/', '/topics/', '/', '/es/']);
const listingPages = p.filter(x => listingPaths.has(x.path));
const tagPages = p.filter(x => x.path.startsWith('/tags/') && x.path !== '/tags/');

const summary = {
  site: d.site,
  generatedAt: d.generatedAt,
  summary: d.summary,
  buildTime: { astroBuild: '16m 2s', pagefindIndex: '76s', totalApproxSeconds: 1042 },
  issuesCounts: {},
  content: {
    byTypeEn: d.content.byTypeEn,
    byTopic: d.content.byTopic,
    byDifficulty: d.content.byDifficulty,
    totalBodyWords: d.content.totalBodyWords,
    totalCodeBlocks: d.content.totalCodeBlocks,
    aiPhraseCounts: d.content.aiPhraseCounts,
    templateHeadingCounts: d.content.templateHeadingCounts,
    authorCounts: d.content.authorCounts,
    lastUpdatedDates: d.content.lastUpdatedDates,
    missingTranslations: d.content.missingTranslations,
  },
  schema: d.schema,
  internalsSummary: d.internals.summary,
};

Object.keys(d.issues).forEach(k => {
  summary.issuesCounts[k] = Array.isArray(d.issues[k]) ? d.issues[k].length : 0;
});

summary.derived = {
  totalPages: p.length,
  contentDetailPages: contentPages.length,
  listingPages: listingPages.length,
  tagPages: tagPages.length,
  contentDescTooLong: contentPages.filter(x => x.metaDesc && x.metaDesc.length > 160).length,
  listingDescTooLong: listingPages.filter(x => x.metaDesc && x.metaDesc.length > 160).length,
  tagDescTooLong: tagPages.filter(x => x.metaDesc && x.metaDesc.length > 160).length,
  contentTitleTooLong: contentPages.filter(x => x.title && x.title.length > 60).length,
  contentMultipleH1: contentPages.filter(x => x.h1.length > 1).length,
  contentThinByWords: contentPages.filter(x => x.wordCount < 250).length,
  tagMissingHreflang: tagPages.filter(x => x.hreflang.length === 0).length,
};

summary.samples = {
  inDistNotSitemap: d.issues.inDistNotSitemap.slice(0, 50),
  thinContentPages: top(contentPages.filter(x => x.wordCount < 250), 'wordCount', 30).map(x => ({ url: x.url, words: x.wordCount })),
  titleTooLong: top(d.issues.titleTooLong, 'length', 30, true),
  descTooLong: top(d.issues.descTooLong, 'length', 30, true),
  duplicateTitles: d.issues.duplicateTitles.slice(0, 20),
  duplicateDescs: d.issues.duplicateDescs.slice(0, 20),
  missingHreflang: d.issues.missingHreflang.slice(0, 30),
  canonicalMismatch: d.issues.canonicalMismatch,
  missingAltPages: d.issues.missingAltPages,
  multipleH1: d.issues.multipleH1.slice(0, 20),
  pagesWithLowIncomingLinks: d.internals.incomingLinks ? Object.entries(d.internals.incomingLinks).filter(([k, v]) => v <= 2).sort((a, b) => a[1] - b[1]).slice(0, 30).map(([k, v]) => ({ url: k, links: v })) : [],
  bidirectionalGaps: d.internals.biGaps ? d.internals.biGaps.slice(0, 30) : [],
  aiPhrases: m.filter(x => Object.keys(x.aiPhrases).length > 0).slice(0, 30).map(x => ({ file: x.file, phrases: x.aiPhrases })),
  lowBodyLinks: m.filter(x => x.internalLinks < 3).slice(0, 30).map(x => ({ file: x.file, links: x.internalLinks })),
};

fs.writeFileSync('ref/audit-summary.json', JSON.stringify(summary, null, 2));
console.log('wrote ref/audit-summary.json', (fs.statSync('ref/audit-summary.json').size / 1024).toFixed(1), 'KB');
