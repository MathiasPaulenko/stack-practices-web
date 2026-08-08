import fs from 'fs';

const html = fs.readFileSync('dist/patterns/chain-of-responsibility-pattern/index.html', 'utf8');

// Get the full markdown FAQ section
const mdFaqStart = html.indexOf('>FAQ</h2');
const relResStart = html.indexOf('>Related Resources</h2');
const mdFaqSection = html.slice(mdFaqStart, relResStart > 0 ? relResStart : mdFaqStart + 100000);
console.log('Markdown FAQ section size:', mdFaqSection.length, 'chars');

// Count Q&A pairs in markdown section
const mdStrongQ = (mdFaqSection.match(/<strong>Q:/g) || []).length;
const mdParagraphs = (mdFaqSection.match(/<p>/g) || []).length;
console.log('Markdown FAQ: <strong>Q: =', mdStrongQ, '<p> =', mdParagraphs);

// Now check: does the markdown FAQ section end before all 174 Q&As are rendered?
// Find the last <strong>Q: in the markdown section
const lastQ = mdFaqSection.lastIndexOf('<strong>Q:');
console.log('Last <strong>Q: position in section:', lastQ);
if (lastQ > 0) {
  const around = mdFaqSection.slice(lastQ - 100, lastQ + 200);
  console.log('Around last Q:', around.replace(/<[^>]+>/g, '|').slice(0, 300));
}

// Check what comes right before "Related Resources"
const beforeRel = html.slice(relResStart - 500, relResStart + 100);
console.log('\nBefore "Related Resources":', beforeRel.replace(/<[^>]+>/g, '|').slice(0, 300));
