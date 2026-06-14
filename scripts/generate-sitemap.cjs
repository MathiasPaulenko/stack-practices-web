const fs = require('fs');

const SITE_URL = 'https://stackpractices.com';
const TODAY = '2026-06-12';

const staticPages = [
  { path: '/', priority: '1.0' },
  { path: '/recipes', priority: '0.8' },
  { path: '/patterns', priority: '0.8' },
  { path: '/docs', priority: '0.8' },
  { path: '/guides', priority: '0.8' },
  { path: '/topics', priority: '0.8' },
  { path: '/tags', priority: '0.8' },
  { path: '/about', priority: '0.6' },
  { path: '/contact', priority: '0.5' },
  { path: '/privacy', priority: '0.3' },
  { path: '/terms', priority: '0.3' },
  { path: '/cookies', priority: '0.3' },
  { path: '/legal-notice', priority: '0.3' },
  { path: '/affiliate-disclosure', priority: '0.3' },
];

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};
  const yaml = match[1];
  const data = {};
  let currentArr = null;
  let currentKey = null;
  for (const line of yaml.split('\n')) {
    const arrMatch = line.match(/^  - (.+)$/);
    if (arrMatch && currentArr !== null) {
      currentArr.push(arrMatch[1].trim());
      continue;
    }
    const keyMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const val = keyMatch[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        data[key] = val.replace(/^["']|["']$/g, '');
      }
      if (line.trim().endsWith(':')) {
        currentArr = [];
        data[key] = currentArr;
      } else {
        currentArr = null;
      }
      currentKey = key;
    }
  }
  return data;
}

function walkContent(dir) {
  const slugs = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + f.name;
    if (f.isDirectory()) slugs.push(...walkContent(p));
    else if (f.name.endsWith('.md') && !f.name.endsWith('.es.md')) {
      const content = fs.readFileSync(p, 'utf8');
      const data = parseFrontmatter(content);
      if (data.slug) slugs.push(data.slug);
    }
  }
  return slugs;
}

const recipes = walkContent('src/content/recipes').map(s => ({ path: '/recipes/' + s, priority: '0.8' }));
const patterns = walkContent('src/content/patterns').map(s => ({ path: '/patterns/' + s, priority: '0.8' }));
const docs = walkContent('src/content/docs').map(s => ({ path: '/docs/' + s, priority: '0.7' }));
const guides = walkContent('src/content/guides').map(s => ({ path: '/guides/' + s, priority: '0.7' }));

const topics = new Set();
const tags = new Set();

for (const dir of ['src/content/recipes', 'src/content/patterns', 'src/content/docs', 'src/content/guides']) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!f.isDirectory()) continue;
    for (const file of fs.readdirSync(dir + '/' + f.name, { withFileTypes: true })) {
      if (file.name.endsWith('.md') && !file.name.endsWith('.es.md')) {
        const content = fs.readFileSync(dir + '/' + f.name + '/' + file.name, 'utf8');
        const data = parseFrontmatter(content);
        if (data.topics) data.topics.forEach(t => topics.add(t));
        if (data.tags) data.tags.forEach(t => tags.add(t));
      }
    }
  }
}

const topicPages = Array.from(topics).map(t => ({ path: '/topics/' + t, priority: '0.7' }));
const tagPages = Array.from(tags).map(t => ({ path: '/tags/' + t, priority: '0.5' }));

const allUrls = [...staticPages, ...recipes, ...patterns, ...docs, ...guides, ...topicPages, ...tagPages];

function writeUrl(path, priority) {
  const normalized = path === '/' ? path : path.endsWith('/') ? path : path + '/';
  const en = SITE_URL + normalized;
  const es = SITE_URL + '/es' + normalized;
  return '  <url>\n' +
    '    <loc>' + en + '</loc>\n' +
    '    <lastmod>' + TODAY + '</lastmod>\n' +
    '    <changefreq>weekly</changefreq>\n' +
    '    <priority>' + priority + '</priority>\n' +
    '    <xhtml:link rel="alternate" hreflang="en" href="' + en + '"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="es" href="' + es + '"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="x-default" href="' + en + '"/>\n' +
    '  </url>\n';
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
for (const u of allUrls) {
  xml += writeUrl(u.path, u.priority);
}
// ES static pages
for (const u of staticPages) {
  if (u.path === '/') continue;
  xml += writeUrl('/es' + u.path, u.priority);
}
xml += '</urlset>\n';

fs.writeFileSync('public/sitemap.xml', xml);
console.log('Sitemap generated with', allUrls.length + staticPages.length - 1, 'URLs');
