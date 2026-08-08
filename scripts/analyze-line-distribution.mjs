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
const lineCounts = recipes.map((f) => {
  const text = fs.readFileSync(f, 'utf8');
  return { file: path.relative('src/content', f), lines: text.split('\n').length };
});

lineCounts.sort((a, b) => b.lines - a.lines);

const buckets = { '<300': 0, '300-349': 0, '350-399': 0, '400-499': 0, '500-599': 0, '600+': 0 };
for (const { lines } of lineCounts) {
  if (lines < 300) buckets['<300']++;
  else if (lines < 350) buckets['300-349']++;
  else if (lines < 400) buckets['350-399']++;
  else if (lines < 500) buckets['400-499']++;
  else if (lines < 600) buckets['500-599']++;
  else buckets['600+']++;
}

console.log('Line count distribution (EN recipes only):');
for (const [range, count] of Object.entries(buckets)) {
  console.log(`  ${range.padEnd(10)} ${count} files`);
}

console.log(`\nTotal: ${lineCounts.length} files`);
console.log(`Median: ${lineCounts[Math.floor(lineCounts.length / 2)].lines} lines`);
console.log(`Mean: ${Math.round(lineCounts.reduce((a, x) => a + x.lines, 0) / lineCounts.length)} lines`);
console.log(`Min: ${lineCounts[lineCounts.length - 1].lines} lines (${lineCounts[lineCounts.length - 1].file})`);
console.log(`Max: ${lineCounts[0].lines} lines (${lineCounts[0].file})`);

// Show files above 400 lines (candidates for pruning)
const above400 = lineCounts.filter((x) => x.lines >= 400);
console.log(`\nFiles with >= 400 lines: ${above400.length} (can prune safely)`);
