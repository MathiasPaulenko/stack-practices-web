import fs from 'fs';

const files = [
  'src/pages/tags/[tag].astro',
  'src/pages/es/tags/[tag].astro',
  'src/pages/tags/index.astro',
  'src/pages/es/tags/index.astro',
  'src/components/ListingPage.astro',
];

const old = 'class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"';
const replacement = 'class="load-more-btn"';

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
