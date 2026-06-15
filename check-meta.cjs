const fs = require('fs');

const pages = [
  'dist/recipes/index.html',
  'dist/patterns/index.html', 
  'dist/guides/index.html',
  'dist/docs/index.html',
  'dist/es/recipes/index.html',
  'dist/es/patterns/index.html',
];

pages.forEach(f => {
  const h = fs.readFileSync(f, 'utf8');
  const d = h.match(/<meta name="description" content="([^"]+)"/);
  console.log(f.replace('dist/', '').replace('/index.html', ''), ':', d ? d[1].substring(0, 70) : 'MISSING');
});
