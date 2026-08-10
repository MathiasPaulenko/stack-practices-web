import fs from 'fs';

const html = fs.readFileSync('dist/patterns/chain-of-responsibility-pattern/index.html', 'utf8');

// Find the main content area
const mainStart = html.indexOf('<div class="article-prose article-prose--main"');
const mainEnd = html.indexOf('</main>');
const content = html.slice(mainStart, mainEnd);

console.log('Content area:', content.length, 'chars');

// Count tag frequencies
const tags = {};
const tagRegex = /<(\w+)([^>]*)>/g;
let m;
while ((m = tagRegex.exec(content)) !== null) {
  const tag = m[1];
  tags[tag] = (tags[tag] || 0) + 1;
}
console.log('\nTag frequencies:');
const sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]);
for (const [tag, count] of sortedTags.slice(0, 20)) {
  console.log(`  ${tag}: ${count}`);
}

// Find repeated inline code blocks
const codeTags = content.match(/<code[^>]*>[\s\S]*?<\/code>/g) || [];
console.log('\nInline code tags:', codeTags.length, 'total chars:', codeTags.reduce((a, s) => a + s.length, 0));

// Find all class attributes in content
const classMatches = content.match(/class="[^"]+"/g) || [];
const freq = {};
for (const c of classMatches) {
  freq[c] = (freq[c] || 0) + 1;
}
const sorted = Object.entries(freq)
  .filter(([c]) => c.length > 20)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 15);
console.log('\nTop repeated classes in content:');
for (const [c, n] of sorted) {
  console.log(`  ${n}x ${c.length}ch = ${n * c.length}ch  ${c.slice(0, 100)}`);
}

// Check for data attributes
const dataAttrs = content.match(/data-[a-z]+="[^"]*"/g) || [];
console.log('\nData attributes:', dataAttrs.length, 'total chars:', dataAttrs.reduce((a, s) => a + s.length, 0));

// Check for aria attributes
const ariaAttrs = content.match(/aria-[a-z]+="[^"]*"/g) || [];
console.log('Aria attributes:', ariaAttrs.length, 'total chars:', ariaAttrs.reduce((a, s) => a + s.length, 0));
