import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

const faqIds = [
  'faq',
  'frequently-asked-questions',
  'additional-faq',
  'additional-frequently-asked-questions',
  'preguntas-frecuentes',
  'preguntas-más-frecuentes',
  'preguntas-frecuentes-adicionales',
  'faq-adicional',
  'faq-adicionales',
];
const h2Re = new RegExp(`<h2 id="(${faqIds.join('|')})">`);

let total = 0;
let count = 0;
let largest = 0;
let largestFile = '';

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(h2Re);
  if (m) {
    const start = m.index;
    const next = html.indexOf('<h2', start + 10);
    const section = html.slice(start, next === -1 ? start + 50000 : next);
    total += section.length;
    count++;
    if (section.length > largest) {
      largest = section.length;
      largestFile = f.replace(/^dist\\/, '').replace(/\\/g, '/');
    }
  }
}

console.log('Pages with FAQ:', count);
console.log('Total FAQ size:', (total / 1024 / 1024).toFixed(2) + ' MB');
console.log('Average FAQ size:', count ? (total / count / 1024).toFixed(1) + ' KB' : 'N/A');
console.log('Largest FAQ section:', (largest / 1024).toFixed(1) + ' KB in', largestFile);
