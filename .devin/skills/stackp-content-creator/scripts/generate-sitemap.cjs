const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const BASE_URL = 'https://stackpractices.com';
const contentDir = path.join(__dirname, '../../../..', 'src', 'content');
const outputFile = path.join(__dirname, '../../../..', 'public', 'sitemap.xml');

function scanDir(dir, basePath = '') {
  const results = {};
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    if (fs.statSync(fullPath).isDirectory()) {
      Object.assign(results, scanDir(fullPath, relativePath));
    } else if (item.endsWith('.md') && !item.endsWith('.es.md')) {
      results[relativePath] = fullPath;
    }
  }
  return results;
}

function getPriority(urlPath) {
  if (urlPath === '/') return '1.0';
  if (urlPath === '/all-resources/') return '0.9';
  if (urlPath.startsWith('/topics/')) return '0.7';
  if (['/privacy/', '/terms/', '/cookies/'].some(p => urlPath.endsWith(p))) return '0.3';
  return '0.8';
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const allFiles = scanDir(contentDir);
const resources = [];
const topicSet = new Set();

for (const [relativePath, fullPath] of Object.entries(allFiles)) {
  const content = fs.readFileSync(fullPath, 'utf8');
  const parsed = matter(content);
  const meta = parsed.attributes;

  const slug = meta.slug || path.basename(fullPath, '.md');
  const topics = Array.isArray(meta.topics) ? meta.topics : [];
  topics.forEach(t => topicSet.add(t));

  const parts = relativePath.split('/');
  const contentType = parts[0];
  if (contentType && slug) {
    const hasEs = fs.existsSync(fullPath.replace('.md', '.es.md'));
    // Use frontmatter lastUpdated if present; otherwise fall back to file modification time
    const fileMtime = fs.statSync(fullPath).mtime.toISOString().split('T')[0];
    const lastmod = meta.lastUpdated ? formatDate(meta.lastUpdated) : fileMtime;
    resources.push({
      type: contentType,
      slug,
      lastmod,
      hasEs
    });
  }
}

const staticPages = [
  { path: '/', priority: '1.0' },
  { path: '/recipes/', priority: '0.8' },
  { path: '/patterns/', priority: '0.8' },
  { path: '/docs/', priority: '0.8' },
  { path: '/guides/', priority: '0.8' },
  { path: '/topics/', priority: '0.8' },
  { path: '/all-resources/', priority: '0.9' },
  { path: '/about/', priority: '0.6' },
  { path: '/contact/', priority: '0.5' },
  { path: '/privacy/', priority: '0.3' },
  { path: '/terms/', priority: '0.3' },
  { path: '/cookies/', priority: '0.3' },
];

const topicPaths = Array.from(topicSet).sort().map(topic => `/topics/${topic}/`);

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

const emittedUrls = new Set();

function normalizePath(p) {
  if (p === '/') return '/';
  if (p.endsWith('/')) return p;
  return p + '/';
}

function addUrl(rawPath, priority, lastmod, hasEs = true) {
  const path = normalizePath(rawPath);
  const enUrl = `${BASE_URL}${path}`;
  const esUrl = `${BASE_URL}/es${path}`;

  // Deduplicate: skip if EN URL already emitted
  if (emittedUrls.has(enUrl)) return;
  emittedUrls.add(enUrl);

  xml += '  <url>\n';
  xml += `    <loc>${escapeXml(enUrl)}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += '    <changefreq>weekly</changefreq>\n';
  xml += `    <priority>${priority}</priority>\n`;
  if (hasEs) {
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}"/>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esUrl)}"/>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}"/>\n`;
  }
  xml += '  </url>\n';

  if (hasEs) {
    if (emittedUrls.has(esUrl)) return;
    emittedUrls.add(esUrl);

    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(esUrl)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += `    <priority>${priority}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}"/>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esUrl)}"/>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}"/>\n`;
    xml += '  </url>\n';
  }
}

const today = formatDate();

for (const page of staticPages) {
  addUrl(page.path, page.priority, today, true);
}

for (const topicPath of topicPaths) {
  addUrl(topicPath, getPriority(topicPath), today, true);
}

for (const resource of resources) {
  const path = `/${resource.type}/${resource.slug}`;
  addUrl(path, getPriority(path), resource.lastmod, resource.hasEs);
}

xml += '</urlset>\n';

fs.writeFileSync(outputFile, xml);
const urlCount = (xml.match(/<url>/g) || []).length;
console.log(`Generated sitemap.xml with ${urlCount} URLs`);
console.log(`  Static pages: ${staticPages.length * 2}`);
console.log(`  Topics: ${topicPaths.length * 2}`);
console.log(`  Resources: ${resources.filter(r => r.hasEs).length * 2 + resources.filter(r => !r.hasEs).length}`);
