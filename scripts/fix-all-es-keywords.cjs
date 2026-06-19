const fs = require('fs');
const path = require('path');

function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.es.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findMarkdownFiles('src/content');
let fixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if file contains [ES] in keywords area
  if (!content.includes('[ES]')) continue;
  
  // Fix keywords that start with [ES] which breaks YAML
  // Match lines like "    - [ES] keyword" and replace with "    - keyword"
  const newContent = content.replace(
    /(  keywords:\n(?:    - \[ES\] .+\n?)+)/g,
    (match) => {
      return match.replace(/- \[ES\] /g, '- ');
    }
  );
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed keywords:', file);
    fixed++;
  }
}

console.log('Fixed', fixed, 'files with broken YAML keywords.');
