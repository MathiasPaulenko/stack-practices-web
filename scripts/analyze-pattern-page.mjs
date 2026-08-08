import fs from 'fs';

const html = fs.readFileSync('dist/patterns/chain-of-responsibility-pattern/index.html', 'utf8');
console.log('Total:', html.length);

const headEnd = html.indexOf('</head>') + 7;
console.log('Head:', headEnd);

const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
console.log('Main:', mainEnd - mainStart);

const codeBlocks = html.match(/<pre[\s\S]*?<\/pre>/g) || [];
console.log('Code blocks:', codeBlocks.length, 'total:', codeBlocks.reduce((a, s) => a + s.length, 0));

const jsonld = html.match(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) || [];
console.log('JSON-LD:', jsonld.length, jsonld.reduce((a, s) => a + s.length, 0));

const classMatches = html.match(/class="[^"]+"/g) || [];
console.log('Class attrs:', classMatches.length, classMatches.reduce((a, s) => a + s.length, 0));

// H2 sections
const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nH2 sections:', h2Matches.length);
let prevEnd = html.indexOf('<main');
for (const m of h2Matches) {
  if (m.index < prevEnd) continue;
  const sectionText = html.slice(prevEnd, m.index);
  const title = m[1].replace(/<[^>]+>/g, '').trim();
  console.log(`  ${sectionText.length.toString().padStart(6)}  ${title.slice(0, 60)}`);
  prevEnd = m.index;
}
