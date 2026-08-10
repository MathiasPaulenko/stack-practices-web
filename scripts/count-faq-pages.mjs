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
let found = 0;
let noFaq = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let has = false;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const s = JSON.parse(m[1]);
      if (s['@type'] === 'FAQPage') {
        has = true;
        found++;
      }
    } catch (e) {}
  }
  if (!has) noFaq++;
}
console.log('FAQPage count:', found, 'no FAQ:', noFaq);
