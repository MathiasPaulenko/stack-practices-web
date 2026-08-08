import fs from 'fs';
import path from 'path';

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (f.endsWith('.md') && !f.includes('.es.')) files.push(full);
  }
  return files;
}

const recipes = walk('src/content/recipes');
console.log(`English recipe files: ${recipes.length}`);

// Count H2 frequency and average section size
const h2Stats = {};
for (const f of recipes) {
  const text = fs.readFileSync(f, 'utf8');
  const h2s = [...text.matchAll(/^##\s+(.+)$/gm)];
  for (let i = 0; i < h2s.length; i++) {
    const title = h2s[i][1].trim();
    const start = h2s[i].index;
    const end = i + 1 < h2s.length ? h2s[i + 1].index : text.length;
    const sectionSize = end - start;
    const sectionText = text.slice(start, end);
    if (!h2Stats[title]) h2Stats[title] = { count: 0, totalSize: 0, totalLines: 0 };
    h2Stats[title].count++;
    h2Stats[title].totalSize += sectionSize;
    h2Stats[title].totalLines += sectionText.split('\n').length;
  }
}

// Sort by frequency
const sorted = Object.entries(h2Stats).sort((a, b) => b[1].count - a[1].count);
console.log('\nH2 sections by frequency:');
console.log('Count  AvgLines  Section');
for (const [title, { count, totalSize }] of sorted.slice(0, 45)) {
  const avgLines = Math.round(totalSize / count / 50); // rough estimate
  console.log(`${String(count).padStart(5)}  ${String(avgLines).padStart(7)}  ${title}`);
}
