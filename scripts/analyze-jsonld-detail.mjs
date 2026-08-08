import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
console.log('JSON-LD blocks:', jsonldBlocks.length);
for (const m of jsonldBlocks) {
  const json = JSON.parse(m[1]);
  const types = Array.isArray(json) ? json : [json];
  for (const t of types) {
    console.log(`\nType: ${t['@type']}, chars: ${JSON.stringify(t).length}`);
    const fields = Object.keys(t);
    console.log('Fields:', fields.join(', '));
    if (t.mainEntity && Array.isArray(t.mainEntity)) {
      console.log(`FAQs: ${t.mainEntity.length}`);
      for (const faq of t.mainEntity.slice(0, 2)) {
        const q = faq.acceptedAnswer?.text || '';
        console.log(`  Q: ${(faq.name || '').slice(0, 80)}... A chars: ${q.length}`);
      }
    }
  }
}
