import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.astro')) files.push(full);
  }
}
walk('src');

const old = 'class="h-[3px] bg-gradient-to-r from-brand-500 via-brand-400 to-transparent"';
const replacement = 'class="brand-accent"';
let count = 0;
for (const f of files) {
  let text = fs.readFileSync(f, 'utf8');
  if (text.includes(old)) {
    text = text.split(old).join(replacement);
    fs.writeFileSync(f, text, 'utf8');
    count++;
    console.log('Updated:', path.relative('src', f));
  }
}
console.log(`Updated ${count} files`);
