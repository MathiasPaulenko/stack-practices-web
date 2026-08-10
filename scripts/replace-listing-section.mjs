import fs from 'fs';

const files = [
  'src/pages/tags/[tag].astro',
  'src/pages/es/tags/[tag].astro',
  'src/pages/tags/index.astro',
  'src/pages/es/tags/index.astro',
  'src/pages/topics/[topic].astro',
  'src/pages/es/topics/[topic].astro',
  'src/pages/topics/index.astro',
  'src/pages/es/topics/index.astro',
];

const old = 'class="border-b border-slate-200 bg-white"';
const replacement = 'class="listing-section"';

let total = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  if (text.includes(old)) {
    text = text.split(old).join(replacement);
    fs.writeFileSync(f, text, 'utf8');
    total++;
    console.log(`Updated: ${f}`);
  }
}
console.log(`Updated ${total} files`);
