import fs from 'fs';

const html = fs.readFileSync('dist/patterns/chain-of-responsibility-pattern/index.html', 'utf8');

// Find the markdown FAQ section
const mdFaqStart = html.indexOf('>FAQ</h2');
const mdFaqArea = html.slice(mdFaqStart, mdFaqStart + 3000);
console.log('=== Markdown FAQ section (first 3000 chars) ===');
console.log(mdFaqArea.replace(/<[^>]+>/g, '|').slice(0, 500));

// Find the component FAQ section
const compFaqStart = html.indexOf('class="faq-section');
const compFaqArea = html.slice(compFaqStart, compFaqStart + 3000);
console.log('\n=== Component FAQ section (first 3000 chars) ===');
console.log(compFaqArea.replace(/<[^>]+>/g, '|').slice(0, 500));

// Count Q&A in each section
const mdFaqEnd = html.indexOf('<section', mdFaqStart + 100);
const mdFaqContent = html.slice(mdFaqStart, mdFaqEnd > 0 ? mdFaqEnd : mdFaqStart + 50000);
const mdStrongQ = (mdFaqContent.match(/<strong>Q:/g) || []).length;
console.log('\nMarkdown FAQ: <strong>Q: count =', mdStrongQ);

const compFaqEnd = html.indexOf('</section>', compFaqStart) + 10;
const compFaqContent = html.slice(compFaqStart, compFaqEnd);
const compDt = (compFaqContent.match(/<dt/g) || []).length;
console.log('Component FAQ: <dt> count =', compDt);
console.log('Component FAQ section size:', compFaqContent.length, 'chars');
