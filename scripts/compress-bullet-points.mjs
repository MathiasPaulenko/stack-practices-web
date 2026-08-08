import fs from 'fs';
import path from 'path';

const GENERIC_PHRASES = [
  /Document [^.]+\./g,
  /Monitor [^.]+\./g,
  /Alert on [^.]+\./g,
  /Review [^.]+\./g,
  /Test [^.]+\./g,
  /Use [^.]+\./g,
  /Implement [^.]+\./g,
  /Track [^.]+\./g,
  /Maintain [^.]+\./g,
  /Optimize [^.]+\./g,
  /Measure [^.]+\./g,
  /Keep [^.]+\./g,
  /Ensure [^.]+\./g,
  /Avoid [^.]+\./g,
  /Update [^.]+\./g,
  /Check [^.]+\./g,
  /Store [^.]+\./g,
  /Share [^.]+\./g,
  /Report [^.]+\./g,
  /Handle [^.]+\./g,
  /Schedule [^.]+\./g,
  /Clean up [^.]+\./g,
  /Eliminate [^.]+\./g,
  /Remove [^.]+\./g,
  /Delete [^.]+\./g,
  /Configure [^.]+\./g,
  /Automate [^.]+\./g,
  /Generate [^.]+\./g,
  /Include [^.]+\./g,
  /Compare [^.]+\./g,
  /Identify [^.]+\./g,
  /Investigate [^.]+\./g,
  /Prioritize [^.]+\./g,
  /Minimize [^.]+\./g,
  /Balance [^.]+\./g,
  /Right-size [^.]+\./g,
];

function compressBulletPoint(line) {
  // Match a bullet point: "- **Term**: sentence1. sentence2. ..."
  const match = line.match(/^(\s*-\s+\*\*[^*]+\*\*:\s*)(.+)$/);
  if (!match) return line;

  const prefix = match[1];
  let body = match[2];

  // Remove generic filler sentences from the body
  const sentences = body.match(/[^.!?]+[.!?]+/g) || [body];
  const originalCount = sentences.length;

  const filtered = sentences.filter((s) => {
    const trimmed = s.trim();
    // Keep the first 1-2 substantive sentences; remove generic filler
    if (GENERIC_PHRASES.some((re) => re.test(trimmed))) {
      return false;
    }
    return true;
  });

  // Always keep at least the first sentence so the bullet is not empty
  const result = filtered.length > 0 ? filtered.join(' ').trim() : sentences[0].trim();

  if (result !== body.trim()) {
    return prefix + result;
  }
  return line;
}

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
let totalFiles = 0;
let totalBullets = 0;
let totalChars = 0;

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*-\s+\*\*[^*]+\*\*:/)) {
      const compressed = compressBulletPoint(lines[i]);
      if (compressed !== lines[i]) {
        totalChars += lines[i].length - compressed.length;
        lines[i] = compressed;
        totalBullets++;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(f, lines.join('\n'));
    totalFiles++;
  }
}

console.log(`Compressed ${totalBullets} bullet points in ${totalFiles} files, removed ${totalChars} chars`);
