import fs from 'fs';

const text = fs.readFileSync('src/content/patterns/design/chain-of-responsibility-pattern.md', 'utf8');

// Check around FAQ start
const around = text.slice(20940, 20940 + 500);
console.log('Around FAQ start:');
console.log(around);

// Check the end of the file
console.log('\n\nEnd of file (last 500 chars):');
console.log(text.slice(-500));

// Count lines
const lines = text.split('\n');
console.log('\nTotal lines:', lines.length);

// Check if there's a --- delimiter after FAQ
const faqLine = lines.findIndex((l) => l.startsWith('## FAQ'));
console.log('FAQ at line:', faqLine);
console.log('Lines after FAQ:', lines.length - faqLine);

// Show lines around 21440-21450 (about 500 chars after FAQ start)
const faqLineContent = lines.slice(faqLine, faqLine + 20);
console.log('\nFirst 20 lines after FAQ heading:');
faqLineContent.forEach((l, i) => console.log(`  ${faqLine + i}: ${l.slice(0, 100)}`));
