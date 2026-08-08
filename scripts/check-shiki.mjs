import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
console.log('File size:', html.length);

// Check for shiki classes
const shikiCount = (html.match(/astro-code/g) || []).length;
console.log('astro-code count:', shikiCount);

// Check for shiki syntax highlighting spans
const shikiSpans = (html.match(/class="shiki/g) || []).length;
console.log('shiki span count:', shikiSpans);

// Check if pre/code blocks have syntax highlighting
const preBlocks = (html.match(/<pre/g) || []).length;
console.log('pre blocks:', preBlocks);

// Check first pre block
const firstPre = html.indexOf('<pre');
if (firstPre >= 0) {
  const preEnd = html.indexOf('</pre>', firstPre) + 6;
  const preContent = html.slice(firstPre, preEnd);
  console.log('\nFirst pre block (first 500 chars):');
  console.log(preContent.slice(0, 500));
}
