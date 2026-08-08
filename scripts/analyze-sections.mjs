import fs from 'fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('H2:', h2s.length);
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 500) console.log(`${size.toString().padStart(6)}  ${title}`);
}
