const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const SITE_URL = 'https://stackpractices.com';
const TODAY = new Date().toISOString().split('T')[0];

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

function walkContent(dir) {
  const slugs = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) slugs.push(...walkContent(p));
    else if (f.name.endsWith('.md') && !f.name.endsWith('.es.md')) {
      const raw = fs.readFileSync(p, 'utf8');
      const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const m = matter(content);
      if (m.attributes.slug) slugs.push(m.attributes.slug);
    }
  }
  return slugs;
}

function collectTagsAndTopics(dir, topics, tags) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) collectTagsAndTopics(p, topics, tags);
    else if (f.name.endsWith('.md') && !f.name.endsWith('.es.md')) {
      const raw = fs.readFileSync(p, 'utf8');
      const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const m = matter(content);
      if (m.attributes.topics) m.attributes.topics.forEach(t => topics.add(t));
      if (m.attributes.tags) m.attributes.tags.forEach(t => tags.add(t));
    }
  }
}

const recipes = walkContent('src/content/recipes').map(s => ({ path: '/recipes/' + s, priority: '0.8' }));
const patterns = walkContent('src/content/patterns').map(s => ({ path: '/patterns/' + s, priority: '0.8' }));
const docs = walkContent('src/content/docs').map(s => ({ path: '/docs/' + s, priority: '0.7' }));
const guides = walkContent('src/content/guides').map(s => ({ path: '/guides/' + s, priority: '0.7' }));

const topics = new Set();
const tags = new Set();
for (const dir of ['src/content/recipes', 'src/content/patterns', 'src/content/docs', 'src/content/guides']) {
  collectTagsAndTopics(dir, topics, tags);
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
