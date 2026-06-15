const fs = require('fs');

const pages = [
  'dist/tags/python/index.html',
  'dist/es/tags/python/index.html',
  'dist/topics/api/index.html',
  'dist/es/topics/api/index.html',
];

pages.forEach(f => {
  const h = fs.readFileSync(f, 'utf8');
  const ld = h.match(/<script type="application\/ld\+json">([^<]+)<\/script>/g) || [];
  const bc = ld.find(s => s.includes('BreadcrumbList'));
  console.log(f.replace('dist/', '').replace('/index.html', ''), ':', bc ? 'HAS BreadcrumbList' : 'MISSING');
});
