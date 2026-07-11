const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '..', 'src', 'content');
const collections = ['recipes', 'patterns', 'guides', 'docs'];

let totalFiles = 0;
let failCount = 0;
const results = { fail: [], warn: [], ok: 0 };

for (const col of collections) {
  const colDir = path.join(contentDir, col);
  if (!fs.existsSync(colDir)) continue;

  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  }
  walk(colDir);

  for (const file of files) {
    totalFiles++;
    const lines = fs.readFileSync(file, 'utf-8').split('\n').length;
    const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

    if (lines < 300) {
      failCount++;
      results.fail.push({ file: rel, lines });
    } else if (lines < 350) {
      results.warn.push({ file: rel, lines });
    } else {
      results.ok++;
    }
  }
}

const summary = [
  '=== THIN CONTENT ANALYSIS ===',
  `Total files: ${totalFiles}`,
  `OK (350+ lines): ${results.ok}`,
  `WARN (300-349 lines): ${results.warn.length}`,
  `FAIL (<300 lines): ${failCount}`,
  '',
];

if (results.warn.length > 0) {
  summary.push('--- WARN (300-349 lines, close to threshold) ---');
  results.warn.sort((a, b) => a.lines - b.lines).forEach(r => {
    summary.push(`  ${r.lines} lines: ${r.file}`);
  });
  summary.push('');
}

if (results.fail.length > 0) {
  summary.push('--- FAIL (<300 lines) ---');
  results.fail.sort((a, b) => a.lines - b.lines).forEach(r => {
    summary.push(`  ${r.lines} lines: ${r.file}`);
  });
} else {
  summary.push('No thin content found. All files are 300+ lines.');
}

const output = summary.join('\n');
console.log(output);

// Also write to ref/thin-content-report.txt
const reportPath = path.join(__dirname, '..', 'ref', 'thin-content-report.txt');
fs.writeFileSync(reportPath, output, 'utf-8');
console.log(`\nFull report written to: ref/thin-content-report.txt`);
