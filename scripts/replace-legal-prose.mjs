import fs from 'fs';

const files = [
  'src/pages/terms.astro',
  'src/pages/privacy.astro',
  'src/pages/legal-notice.astro',
  'src/pages/cookies.astro',
  'src/pages/affiliate-disclosure.astro',
  'src/pages/es/terms.astro',
  'src/pages/es/privacy.astro',
  'src/pages/es/legal-notice.astro',
  'src/pages/es/cookies.astro',
  'src/pages/es/affiliate-disclosure.astro',
];

const old = 'class="prose prose-slate mx-auto max-w-3xl px-4 py-10 sm:px-6"';
const replacement = 'class="legal-prose"';

let count = 0;
for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  if (t.includes(old)) {
    t = t.split(old).join(replacement);
    fs.writeFileSync(f, t, 'utf8');
    count++;
  }
}
console.log(`Updated ${count} files`);
