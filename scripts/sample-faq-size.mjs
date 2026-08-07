import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (full.endsWith('index.html')) files.push(full);
  }
}
walk('dist/recipes');

const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
let found = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const s = JSON.parse(m[1]);
      if (s['@type'] === 'FAQPage') {
        const total = s.mainEntity.reduce((a, q) => a + q.acceptedAnswer.text.length, 0);
        const avg = Math.round(total / s.mainEntity.length);
        console.log(path.relative('dist', f), 'count', s.mainEntity.length, 'avg answer', avg, 'chars total', total);
        found++;
        break;
      }
    } catch (e) {}
  }
  if (found >= 5) break;
}
