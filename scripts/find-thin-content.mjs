import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.md')) files.push(full);
  }
}
walk('src/content');

const warn = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
  if (lines >= 300 && lines < 350) {
    warn.push({ file: path.relative('src/content', f), lines });
  }
}
warn.sort((a, b) => a.lines - b.lines);
console.log('WARN (300-349 lines):', warn.length);
for (const w of warn.slice(0, 30)) {
  console.log(`  ${w.lines} ${w.file}`);
}
if (warn.length > 30) console.log(`  ... and ${warn.length - 30} more`);
