import fs from 'fs';

const replacements = [
  // listing intro text
  ['class="mt-3 max-w-3xl text-slate-600 leading-relaxed"', 'class="listing-intro"'],
  // listing heading
  ['class="text-xl font-semibold text-slate-900"', 'class="listing-heading"'],
  // listing container
  ['class="mx-auto max-w-6xl px-4 py-8 sm:px-6"', 'class="listing-container"'],
  ['class="mx-auto max-w-6xl px-4 py-10 sm:px-6"', 'class="listing-container"'],
  // listing grid
  ['class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"', 'class="listing-grid"'],
];

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

let total = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  let count = 0;
  for (const [old, replacement] of replacements) {
    if (text.includes(old)) {
      text = text.split(old).join(replacement);
      count++;
    }
  }
  if (count > 0) {
    fs.writeFileSync(f, text, 'utf8');
    total++;
    console.log(`Updated: ${f} (${count} replacements)`);
  }
}
console.log(`Updated ${total} files`);
