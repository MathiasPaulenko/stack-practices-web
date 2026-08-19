const fs = require('fs');
const path = require('path');

const CONTENT_DIR = 'src/content';
const errors = [];
const warnings = [];

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(p));
    else if (f.name.endsWith('.md')) results.push(p);
  }
  return results;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};
  const yaml = match[1];
  const data = {};
  let currentKey = null;
  let currentArr = null;
  for (const line of yaml.split('\n')) {
    const arrMatch = line.match(/^  - (.+)$/);
    if (arrMatch && currentArr !== null) {
      currentArr.push(arrMatch[1].trim());
      continue;
    }
    const keyMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const val = keyMatch[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        data[key] = val.replace(/^["']|["']$/g, '');
      }
      if (line.trim().endsWith(':')) {
        currentArr = [];
        data[key] = currentArr;
      } else {
        currentArr = null;
      }
      currentKey = key;
    }
  }
  return data;
}

const files = walk(CONTENT_DIR);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const data = parseFrontmatter(content);
  const display = file.replace('src/content/', '');

  if (!data.title) errors.push(display + ': missing title');
  if (data.title && data.title.length > 60) warnings.push(display + ': title too long (' + data.title.length + ' chars): "' + data.title + '"');

  if (!data.metaDescription) errors.push(display + ': missing metaDescription');
  if (data.metaDescription && data.metaDescription.length > 170) warnings.push(display + ': metaDescription too long (' + data.metaDescription.length + ' chars)');

  if (data.seo) {
    // Can't easily parse nested objects with this simple parser, skip nested seo checks
  }

  if (data.contentType === 'guides') {
    const faqMatch = content.match(/#{2,3}\s*(FAQ|Frequently Asked Questions|Preguntas Frecuentes)/i);
    if (!faqMatch) warnings.push(display + ': missing FAQ section');
    else {
      const faqSection = content.slice(content.indexOf(faqMatch[0]));
      const headingCount = (faqSection.match(/#{3}\s*/g) || []).length;
      const boldCount = (faqSection.match(/\*\*[PQ][:：]/g) || []).length;
      const qCount = Math.max(headingCount, boldCount);
      if (qCount < 3) warnings.push(display + ': only ' + qCount + ' FAQ questions (need >=3)');
    }
  }
}

console.log('TOTAL_FILES:', files.length);
console.log('ERRORS:', errors.length);
errors.slice(0, 30).forEach(e => console.log('  [ERROR]', e));
if (errors.length > 30) console.log('  ... and', errors.length - 30, 'more errors');
console.log('WARNINGS:', warnings.length);
warnings.slice(0, 30).forEach(w => console.log('  [WARN]', w));
if (warnings.length > 30) console.log('  ... and', warnings.length - 30, 'more warnings');
