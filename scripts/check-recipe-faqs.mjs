import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');

const compFaqStart = html.indexOf('class="faq-section');
if (compFaqStart >= 0) {
  const compFaqEnd = html.indexOf('</section>', compFaqStart) + 10;
  const compFaqContent = html.slice(compFaqStart, compFaqEnd);
  const compDt = (compFaqContent.match(/<dt/g) || []).length;
  console.log('Recipe FAQ: <dt> count =', compDt);
  console.log('Recipe FAQ section size:', compFaqContent.length, 'chars');
} else {
  console.log('No FAQ section found');
}

// Check if there's still a markdown FAQ section
const mdFaqIdx = html.indexOf('>FAQ</h2');
console.log('Markdown FAQ heading present:', mdFaqIdx >= 0);
