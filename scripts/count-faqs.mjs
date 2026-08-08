import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.md') && !f.includes('.es.')) {
      const text = fs.readFileSync(full, 'utf8');
      const faqMatch = text.match(/faqs:\s*\n([\s\S]*?)(?=\n[a-z]|\n---|$)/);
      if (faqMatch) {
        const faqText = faqMatch[1];
        const count = (faqText.match(/-\s*question:/g) || []).length;
        if (count > 10) {
          console.log(`${count}  ${path.relative('src/content', full)}`);
        }
      }
    }
  }
}
walk('src/content');
