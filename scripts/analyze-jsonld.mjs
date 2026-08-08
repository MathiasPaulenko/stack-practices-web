import fs from 'fs';
import path from 'path';

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (full.endsWith('.html')) files.push(full);
  }
  return files;
}

const allFiles = walk('dist');

// Sample 50 recipe pages
const recipes = allFiles.filter((f) => {
  const rel = path.relative('dist', f).replace(/\\/g, '/');
  const stripped = rel.startsWith('es/') ? rel.slice(3) : rel;
  return stripped.startsWith('recipes/') && stripped.endsWith('index.html');
});

console.log(`Recipe pages: ${recipes.length}`);

let totalJsonLd = 0;
let totalHtml = 0;
const jsonLdTypes = {};

for (const f of recipes) {
  const html = fs.readFileSync(f, 'utf8');
  totalHtml += html.length;

  const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const m of jsonldBlocks) {
    totalJsonLd += m[0].length;
    try {
      const json = JSON.parse(m[1]);
      const types = Array.isArray(json) ? json.map((x) => x['@type']) : [json['@type']];
      for (const t of types) {
        jsonLdTypes[t] = (jsonLdTypes[t] || 0) + 1;
      }
    } catch (e) {
      jsonLdTypes['parse_error'] = (jsonLdTypes['parse_error'] || 0) + 1;
    }
  }
}

console.log(`Total HTML: ${(totalHtml / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total JSON-LD: ${(totalJsonLd / 1024 / 1024).toFixed(2)} MB (${((totalJsonLd / totalHtml) * 100).toFixed(1)}% of HTML)`);
console.log(`\nJSON-LD types:`);
for (const [t, n] of Object.entries(jsonLdTypes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${n}`);
}

// Show a sample JSON-LD
const sample = fs.readFileSync(recipes[0], 'utf8');
const sampleJsonld = [...sample.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
console.log(`\nSample JSON-LD from ${path.relative('dist', recipes[0])}:`);
for (const m of sampleJsonld) {
  try {
    const json = JSON.parse(m[1]);
    const types = Array.isArray(json) ? json : [json];
    for (const t of types) {
      console.log(`  Type: ${t['@type']}, size: ${JSON.stringify(t).length} chars`);
    }
  } catch (e) {
    console.log(`  Parse error, size: ${m[0].length}`);
  }
}
