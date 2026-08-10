import fs from 'fs';
import path from 'path';

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (f.endsWith('.md')) files.push(full);
  }
  return files;
}

const allFiles = walk('src/content');

// Collect all H2 titles from files with >= 400 lines
const h2InBigFiles = {};
for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  if (lines.length < 400) continue;

  const h2s = [...text.matchAll(/^##\s+(.+)$/gm)];
  for (let i = 0; i < h2s.length; i++) {
    const title = h2s[i][1].trim();
    const start = h2s[i].index;
    const end = i + 1 < h2s.length ? h2s[i + 1].index : text.length;
    const sectionLines = text.slice(start, end).split('\n').length;

    if (!h2InBigFiles[title]) h2InBigFiles[title] = { count: 0, totalLines: 0, files: [] };
    h2InBigFiles[title].count++;
    h2InBigFiles[title].totalLines += sectionLines;
    h2InBigFiles[title].files.push(path.relative('src/content', f));
  }
}

// Show sections that appear in multiple big files and are likely padding
const sorted = Object.entries(h2InBigFiles)
  .filter(([_, s]) => s.count >= 3)
  .sort((a, b) => b[1].totalLines - a[1].totalLines);

console.log('H2 sections in files >= 400 lines (appearing in >= 3 files):');
console.log('Count  TotalLines  AvgLines  Section');
for (const [title, { count, totalLines }] of sorted) {
  const avg = Math.round(totalLines / count);
  console.log(`${String(count).padStart(5)}  ${String(totalLines).padStart(9)}  ${String(avg).padStart(7)}  ${title}`);
}
