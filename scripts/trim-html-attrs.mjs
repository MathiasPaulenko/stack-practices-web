import fs from 'fs';
import path from 'path';

// Remove unused/unnecessary HTML attributes to reduce size:
// - data-language on <pre> (not used by JS or CSS; Shiki reports language via class)
// - xmlns on <svg> (not required for inline SVG in HTML5)

const htmlFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.html')) htmlFiles.push(full);
  }
}
walk('dist');

let totalSaved = 0;
let removedDataLanguage = 0;
let removedXmlns = 0;

for (const f of htmlFiles) {
  let html = fs.readFileSync(f, 'utf8');
  const before = html.length;

  // Remove data-language="..." from <pre> tags.
  html = html.replace(/<pre\b([^>]*)\sdata-language="[^"]*"([^>]*)>/g, (match, beforeAttrs, afterAttrs) => {
    removedDataLanguage++;
    return `<pre${beforeAttrs}${afterAttrs}>`;
  });

  // Remove xmlns="..." from <svg> tags. Inline SVG in HTML5 does not need it.
  html = html.replace(/<svg\b([^>]*)\sxmlns="[^"]*"([^>]*)>/g, (match, beforeAttrs, afterAttrs) => {
    removedXmlns++;
    return `<svg${beforeAttrs}${afterAttrs}>`;
  });

  const after = html.length;
  totalSaved += before - after;
  if (after !== before) {
    fs.writeFileSync(f, html);
  }
}

console.error(`Removed data-language from ${removedDataLanguage} <pre> tags`);
console.error(`Removed xmlns from ${removedXmlns} <svg> tags`);
console.error(`Saved ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
