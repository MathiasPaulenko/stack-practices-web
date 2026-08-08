import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');

// Find all h2 headings
const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('All H2 headings:');
for (const m of h2Matches) {
  const title = m[1].replace(/<[^>]+>/g, '').trim();
  console.log(`  pos=${m.index}  "${title}"`);
}
