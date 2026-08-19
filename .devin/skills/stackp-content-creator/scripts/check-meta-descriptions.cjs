const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../../../..', 'src', 'content');

function walk(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files;
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry.endsWith('.md')) files.push(full);
  }
  return files;
}

function extractFrontmatter(content) {
  const clean = content.replace(/^\uFEFF/, '');
  if (!clean.startsWith('---')) return null;
  const end = clean.indexOf('---', 3);
  if (end === -1) return null;
  return clean.slice(3, end).trim().replace(/\r\n/g, '\n');
}

function getMetaDescription(frontmatter) {
  if (!frontmatter) return null;
  const nestedMatch = frontmatter.match(/^seo:[\s\S]*?\n\s+metaDescription:\s*(.+)$/m);
  if (nestedMatch) return nestedMatch[1].trim().replace(/^["']|["']$/g, '');
  const rootMatch = frontmatter.match(/^metaDescription:\s*(.+)$/m);
  if (rootMatch) return rootMatch[1].trim().replace(/^["']|["']$/g, '');
  return null;
}

function getTitle(frontmatter) {
  if (!frontmatter) return 'Untitled';
  const match = frontmatter.match(/^title:\s*(.+)$/m);
  if (!match) return 'Untitled';
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const allFiles = walk(dir);
const issues = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const fm = extractFrontmatter(content);
  const metaDesc = getMetaDescription(fm);
  const title = getTitle(fm);
  const relative = file.replace(/\\/g, '/').replace(dir.replace(/\\/g, '/'), '');

  if (!metaDesc) {
    issues.push({ file: relative, title, issue: 'MISSING', value: null });
  } else if (metaDesc.length < 120) {
    issues.push({ file: relative, title, issue: 'TOO_SHORT', value: metaDesc });
  } else if (metaDesc.length > 170) {
    issues.push({ file: relative, title, issue: 'TOO_LONG', value: metaDesc });
  }
}

console.log('Meta description check complete.\n');
console.log('Files checked:', allFiles.length);
console.log('Issues found:', issues.length);
console.log('\nBreakdown:');

const missing = issues.filter(i => i.issue === 'MISSING');
const tooShort = issues.filter(i => i.issue === 'TOO_SHORT');
const tooLong = issues.filter(i => i.issue === 'TOO_LONG');

console.log('  Missing:', missing.length);
console.log('  Too short (<120 chars):', tooShort.length);
console.log('  Too long (>170 chars):', tooLong.length);

if (missing.length > 0) {
  console.log('\n--- MISSING metaDescription ---');
  missing.forEach(i => {
    console.log(`\n  ${i.file}`);
    console.log(`    title: "${i.title}"`);
  });
}

if (tooShort.length > 0) {
  console.log('\n--- TOO SHORT metaDescription (<120 chars) ---');
  tooShort.forEach(i => {
    console.log(`\n  ${i.file}`);
    console.log(`    title: "${i.title}"`);
    console.log(`    value: "${i.value}" (${i.value.length} chars)`);
  });
}

if (tooLong.length > 0) {
  console.log('\n--- TOO LONG metaDescription (>170 chars) ---');
  tooLong.slice(0, 20).forEach(i => {
    console.log(`\n  ${i.file}`);
    console.log(`    title: "${i.title}"`);
    console.log(`    value: "${i.value.substring(0, 80)}..." (${i.value.length} chars)`);
  });
  if (tooLong.length > 20) {
    console.log(`\n  ... and ${tooLong.length - 20} more`);
  }
}

if (issues.length > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All meta descriptions are valid.');
  process.exit(0);
}
