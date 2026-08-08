import fs from 'fs';

const html = fs.readFileSync('dist/es/recipes/cost-optimization/index.html', 'utf8');
console.log('Total:', html.length, 'chars');

// H2 sections
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nH2 sections:', h2s.length);
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 300) console.log(`${size.toString().padStart(6)}  ${title}`);
}

// Main parts
const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
const main = html.slice(mainStart, mainEnd);
console.log('\nMain:', main.length, 'chars');

const codeBlocks = [...html.matchAll(/<pre[^>]*>[\s\S]*?<\/pre>/g)];
console.log('Code blocks:', codeBlocks.length, 'total:', codeBlocks.reduce((a, m) => a + m[0].length, 0));

const classAttrs = [...html.matchAll(/class="[^"]*"/g)];
console.log('Class attrs:', classAttrs.length, 'total:', classAttrs.reduce((a, m) => a + m[0].length, 0));

const jsonld = [...html.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)];
console.log('JSON-LD:', jsonld.length, 'total:', jsonld.reduce((a, m) => a + m[0].length, 0));
