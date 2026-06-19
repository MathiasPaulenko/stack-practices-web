const fs = require('fs');
const path = require('path');

const TAGS_TO_REMOVE = new Set([
  'consul', 'state-machines', 'packer', 'nextjs', 'astro', 'grafana', 'csp', 'hsts'
]);

function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findMarkdownFiles('src/content/recipes');
let modified = 0;
let tagsRemoved = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  const fm = parts[1];
  const tagMatch = fm.match(/tags:\s*\n((?:\s*-\s*[^\n]+\n?)*)/);
  if (!tagMatch) continue;
  
  const lines = tagMatch[1].trim().split('\n');
  const originalTags = lines.map(l => l.replace(/^\s*-\s*/, '').trim());
  const newTags = originalTags.filter(t => !TAGS_TO_REMOVE.has(t));
  
  if (newTags.length < originalTags.length) {
    const newTagsBlock = newTags.map(t => `  - ${t}`).join('\n') + '\n';
    const newFm = fm.replace(tagMatch[0], `tags:\n${newTagsBlock}`);
    const newContent = '---' + newFm + '---' + parts.slice(2).join('---');
    fs.writeFileSync(file, newContent, 'utf8');
    modified++;
    tagsRemoved += originalTags.length - newTags.length;
  }
}

console.log('Modified ' + modified + ' files. Tags removed: ' + tagsRemoved);
