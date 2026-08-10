const fs = require('fs');
const s = JSON.parse(fs.readFileSync('ref/audit-summary.json', 'utf8'));

function section(title, body) { return `## ${title}\n\n${body}\n\n`; }
function table(data, columns, labels) {
  if (!data || data.length === 0) return '_No data._';
  const head = '| ' + labels.join(' | ') + ' |';
  const sep = '|' + labels.map(() => ' --- |').join('');
  const body = data.map(r => '| ' + columns.map(c => String(r[c] ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ') + ' |');
  return [head, sep, ...body].join('\n');
}

let md = `# StackPractices Forensic Audit Summary\n\n`;
md += `Generated: ${s.generatedAt}\n\n`;
md += `Site: ${s.site.url}\n\n`;

md += section('Inventory', `
- Dist HTML pages: ${s.summary.distHtmlPages}
- Markdown files: ${s.summary.mdFiles}
- Sitemap URLs: ${s.summary.sitemapUrls}
- Build JS size: ${(s.summary.buildAssets.jsSize/1024).toFixed(1)} KB
- Build CSS size: ${(s.summary.buildAssets.cssSize/1024).toFixed(1)} KB
- Build image size: ${(s.summary.buildAssets.imgSize/1024).toFixed(1)} KB
- Build HTML size: ${(s.summary.buildAssets.htmlSize/1024/1024).toFixed(1)} MB
- Astro build time: ${s.buildTime.astroBuild}
- Pagefind index time: ${s.buildTime.pagefindIndex}
`);

md += section('Issue Counts', table(Object.entries(s.issuesCounts).map(([k,v])=>({issue:k,count:v})), ['issue','count'], ['Issue','Count']));

md += section('Derived Counts', table(Object.entries(s.derived).map(([k,v])=>({metric:k,count:v})), ['metric','count'], ['Metric','Count']));

md += section('Content Distribution', `
By type (EN):\n\n${table(Object.entries(s.content.byTypeEn).map(([k,v])=>({type:k,count:v})), ['type','count'], ['Type','Count'])}
\nBy difficulty:\n\n${table(Object.entries(s.content.byDifficulty).map(([k,v])=>({difficulty:k,count:v})), ['difficulty','count'], ['Difficulty','Count'])}
\nAI phrase counts:\n\n${table(Object.entries(s.content.aiPhraseCounts).map(([k,v])=>({phrase:k,count:v})), ['phrase','count'], ['Phrase','Count'])}
\nTemplate heading counts:\n\n${table(Object.entries(s.content.templateHeadingCounts).map(([k,v])=>({heading:k,count:v})), ['heading','count'], ['Heading','Count'])}
\nAuthor counts:\n\n${table(Object.entries(s.content.authorCounts).map(([k,v])=>({author:k,count:v})), ['author','count'], ['Author','Count'])}
`);

md += section('Schema Types', table(Object.entries(s.schema.types).map(([k,v])=>({type:k,count:v})), ['type','count'], ['Type','Count']));

md += section('Samples', `
### In dist but not in sitemap (first 50)\n${table(s.samples.inDistNotSitemap.map(x=>({url:x})), ['url'], ['URL'])}
\n### Title too long (first 30)\n${table(s.samples.titleTooLong, ['url','length','title'], ['URL','Length','Title'])}
\n### Description too long (first 30)\n${table(s.samples.descTooLong, ['url','length'], ['URL','Length'])}
\n### Duplicate titles (first 20)\n${table(s.samples.duplicateTitles, ['title','count'], ['Title','Count'])}
\n### Duplicate descriptions (first 20)\n${table(s.samples.duplicateDescs, ['description','count'], ['Description','Count'])}
\n### Missing hreflang (first 30)\n${table(s.samples.missingHreflang.map(x=>({url:x})), ['url'], ['URL'])}
\n### Canonical mismatch\n${table(s.samples.canonicalMismatch, ['url','canonical'], ['URL','Canonical'])}
\n### Missing alt\n${table(s.samples.missingAltPages, ['url','missing'], ['URL','Missing'])}
\n### Multiple H1 (first 20)\n${table(s.samples.multipleH1.map(x=>({url:x})), ['url'], ['URL'])}
\n### Pages with low incoming links\n${table(s.samples.pagesWithLowIncomingLinks, ['url','links'], ['URL','Links'])}
\n### Bidirectional link gaps (first 30)\n${table(s.samples.bidirectionalGaps, ['from','to','sharedTopics'], ['From','To','Shared topics'])}
\n### AI phrase usage in content\n${table(s.samples.aiPhrases, ['file','phrases'], ['File','Phrases'])}
\n### Low body links\n${table(s.samples.lowBodyLinks, ['file','links'], ['File','Links'])}
`);

fs.writeFileSync('ref/audit-summary.md', md);
console.log('wrote ref/audit-summary.md', (fs.statSync('ref/audit-summary.md').size/1024).toFixed(1), 'KB');
