import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
const main = html.slice(mainStart, mainEnd);

// Find all section/article/div blocks at top level of main
// Measure by h2 headers
const h2Matches = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('H2 sections in main:');
let prevEnd = 0;
for (const m of h2Matches) {
  const sectionStart = m.index;
  const sectionText = main.slice(prevEnd, sectionStart);
  const title = m[1].replace(/<[^>]+>/g, '').trim();
  console.log(`  ${sectionText.length.toString().padStart(6)} chars  ${title.slice(0, 60)}`);
  prevEnd = sectionStart;
}
const lastSection = main.slice(prevEnd);
console.log(`  ${lastSection.length.toString().padStart(6)} chars  (rest)`);

// Look for repeated patterns - related resources, code blocks
const codeBlocks = main.match(/<pre[\s\S]*?<\/pre>/g) || [];
console.log('\nCode blocks:', codeBlocks.length, 'total chars:', codeBlocks.reduce((a, s) => a + s.length, 0));

const tables = main.match(/<table[\s\S]*?<\/table>/g) || [];
console.log('Tables:', tables.length, 'total chars:', tables.reduce((a, s) => a + s.length, 0));

const links = main.match(/<a [^>]*href[^>]*>/g) || [];
console.log('Links:', links.length);

// Related resources section
const relatedIdx = main.indexOf('related');
console.log('\nRelated resources area:', relatedIdx >= 0 ? main.slice(relatedIdx - 100, relatedIdx + 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200) : 'not found');
