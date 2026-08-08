import fs from 'fs';

const html = fs.readFileSync('dist/guides/complete-guide-sentry-error-tracking/index.html', 'utf8');
console.log('Total:', html.length, 'chars');

const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nH2 sections:', h2s.length);
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 500) console.log(`${size.toString().padStart(6)}  ${title}`);
}

const classAttrs = [...html.matchAll(/class="[^"]*"/g)];
console.log('\nClass attrs:', classAttrs.length, 'total:', classAttrs.reduce((a, m) => a + m[0].length, 0));

const jsonld = [...html.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)];
console.log('JSON-LD:', jsonld.length, 'total:', jsonld.reduce((a, m) => a + m[0].length, 0));
