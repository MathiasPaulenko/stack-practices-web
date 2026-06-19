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

const files = findMarkdownFiles('src/content/recipes');
let fixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  const fm = parts[1];
  // Fix keywords that start with [ES] which breaks YAML
  const newFm = fm.replace(
    /(seo:\s*\n(?:\s*keywords:\s*\n(?:\s*- \[ES\] .+\n)+))/g,
    (match) => {
      return match.replace(/- \[ES\] /g, '- ');
    }
  );
  
  if (newFm !== fm) {
    const newContent = '---' + newFm + '---' + parts.slice(2).join('---');
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed keywords YAML:', file);
    fixed++;
  }
}

console.log('Fixed', fixed, 'files with broken YAML keywords.');
