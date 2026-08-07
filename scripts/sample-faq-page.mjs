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

const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
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
        process.exit(0);
      }
    } catch (e) {}
  }
}
