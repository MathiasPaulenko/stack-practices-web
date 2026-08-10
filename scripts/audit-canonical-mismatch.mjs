import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://stackpractices.com';
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

let mismatches = [];
let missing = 0;
for (const f of files) {
  const relRaw = path.relative('dist', f).replace(/\\/g, '/');
  let expectedCanonical;
  if (relRaw === '404.html') {
    expectedCanonical = `${BASE_URL}/404`;
  } else if (relRaw === 'index.html') {
    expectedCanonical = `${BASE_URL}/`;
  } else {
    const rel = relRaw.replace(/\/index\.html$/, '/');
    expectedCanonical = `${BASE_URL}/${rel}`;
  }
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!m) {
    missing++;
    continue;
  }
  const canonical = m[1];
  if (canonical !== expectedCanonical) {
    mismatches.push({ file: rel, expected: expectedCanonical, actual: canonical });
  }
}

console.log('Files:', files.length);
console.log('Missing canonical:', missing);
console.log('Mismatches:', mismatches.length);
for (const x of mismatches.slice(0, 20)) {
  console.log('  file:', x.file);
  console.log('    expected:', x.expected);
  console.log('    actual:  ', x.actual);
}
if (mismatches.length > 20) console.log('  ... and', mismatches.length - 20, 'more');
