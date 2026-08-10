import fs from 'fs';

const html = fs.readFileSync('dist/patterns/chain-of-responsibility-pattern/index.html', 'utf8');

// Find all h2 headings
const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('All H2 headings:');
for (const m of h2Matches) {
  const title = m[1].replace(/<[^>]+>/g, '').trim();
  console.log(`  pos=${m.index}  "${title}"`);
}

// Find FAQ sections
const faqSectionStart = html.indexOf('class="faq-section');
if (faqSectionStart >= 0) {
  const faqSectionEnd = html.indexOf('</section>', faqSectionStart) + 10;
  const faqSection = html.slice(faqSectionStart, faqSectionEnd);
  console.log('\nFAQ section (component):', faqSection.length, 'chars');
  // Count dt/dd in this section
  const dtCount = (faqSection.match(/<dt/g) || []).length;
  const ddCount = (faqSection.match(/<dd/g) || []).length;
  console.log('  dt:', dtCount, 'dd:', ddCount);
}

// Find the markdown FAQ section (## FAQ)
const mdFaqIdx = html.indexOf('>FAQ</h2');
if (mdFaqIdx >= 0) {
  // Find the next h2 or section after this
  const afterFaq = html.slice(mdFaqIdx);
  const nextH2 = afterFaq.indexOf('<h2', 10);
  const nextSection = afterFaq.indexOf('<section', 10);
  const endIdx = Math.min(
    nextH2 > 0 ? nextH2 : Infinity,
    nextSection > 0 ? nextSection : Infinity
  );
  const mdFaqContent = afterFaq.slice(0, endIdx > 0 ? endIdx : 5000);
  console.log('\nMarkdown FAQ section:', mdFaqContent.length, 'chars');
  const dtCount = (mdFaqContent.match(/<dt/g) || []).length;
  const ddCount = (mdFaqContent.match(/<dd/g) || []).length;
  console.log('  dt:', dtCount, 'dd:', ddCount);
}
