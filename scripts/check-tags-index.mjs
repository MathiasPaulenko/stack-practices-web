import fs from 'fs';
const html = fs.readFileSync('dist/tags/index.html', 'utf8');
console.log('Total:', html.length);
const cards = [...html.matchAll(/class="tag-card/g)];
console.log('Tag cards:', cards.length);
const classAttrs = [...html.matchAll(/class="[^"]*"/g)];
console.log('Class attrs:', classAttrs.length, 'total:', classAttrs.reduce((a, m) => a + m[0].length, 0));

// Count data-search attributes
const dataSearch = [...html.matchAll(/data-search="[^"]*"/g)];
console.log('data-search attrs:', dataSearch.length, 'total:', dataSearch.reduce((a, m) => a + m[0].length, 0));
