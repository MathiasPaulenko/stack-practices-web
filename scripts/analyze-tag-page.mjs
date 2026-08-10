import fs from 'fs';

const html = fs.readFileSync('dist/tags/serverless/index.html', 'utf8');
console.log('Total:', html.length, 'chars');

const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
const main = html.slice(mainStart, mainEnd);
console.log('Main:', main.length, 'chars');

const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>') + 7;
const head = html.slice(headStart, headEnd);
console.log('Head:', head.length, 'chars');

const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nH2 sections:', h2s.length);

// Count class attributes
const classAttrs = [...html.matchAll(/class="[^"]*"/g)];
console.log('Class attrs:', classAttrs.length, 'total:', classAttrs.reduce((a, m) => a + m[0].length, 0));

// Count internal links
const links = [...html.matchAll(/<a[^>]*href="([^"]+)"/g)];
console.log('Links:', links.length);

// Find listing grid
const listingGrid = html.indexOf('listing-grid');
console.log('Listing grid present:', listingGrid >= 0);

// Top 10 repeated classes
const classFreq = {};
for (const m of classAttrs) {
  const c = m[0];
  classFreq[c] = (classFreq[c] || 0) + 1;
}
const sortedClasses = Object.entries(classFreq)
  .filter(([c, n]) => c.length > 15 && n > 5)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 10);
console.log('\nTop repeated classes:');
for (const [c, n] of sortedClasses) {
  console.log(`  ${n}x ${c.length}ch = ${n * c.length}ch  ${c.slice(0, 80)}`);
}
