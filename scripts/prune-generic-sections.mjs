import fs from 'fs';
import path from 'path';

// Sections that are generic padding added by scripts and add little unique value.
// These are formulaic bullet-point lists that repeat the same pattern:
// "Do X. Document Y. Monitor Z. Alert on W. Review quarterly."
const PADDING_SECTIONS = new Set([
  'Sustainability',
  'Industry Standards and Frameworks',
  'Reporting and Communication',
  'Compliance and Governance',
  'Automation and Tooling',
  'Advanced Optimization',
  'Serverless Architecture Patterns',
  'Serverless Data Processing',
  'Serverless Anti-Patterns',
  'Serverless Cold Start Mitigation',
  'Migration Strategies',
  'Serverless Cost Optimization',
  'Serverless Security Best Practices',
  'Serverless Testing Strategies',
  'Serverless Deployment Patterns',
  'Serverless Monitoring and Observability',
  'Serverless Performance Optimization',
  'Serverless Error Handling',
  'Serverless Debugging Techniques',
  'Serverless Scalability Patterns',
  'Serverless Resilience Patterns',
  'Serverless Governance',
  'Serverless Compliance',
  'Serverless Sustainability',
  'Serverless Reporting',
  'Serverless Automation',
  'Serverless Industry Standards',
  'Serverless Advanced Techniques',
  'Cloud Architecture Patterns',
  'Cloud Cost Optimization',
  'Cloud Security Best Practices',
  'Cloud Monitoring Strategies',
  'Cloud Deployment Patterns',
  'Cloud Performance Optimization',
  'Cloud Error Handling',
  'Cloud Scalability Patterns',
  'Cloud Resilience Patterns',
  'Cloud Governance',
  'Cloud Compliance',
  'Cloud Sustainability',
  'Cloud Reporting',
  'Cloud Automation',
  'Cloud Industry Standards',
  'Cloud Advanced Techniques',
  'Data Architecture Patterns',
  'Data Security Best Practices',
  'Data Monitoring Strategies',
  'Data Deployment Patterns',
  'Data Performance Optimization',
  'Data Error Handling',
  'Data Scalability Patterns',
  'Data Resilience Patterns',
  'Data Governance',
  'Data Compliance',
  'Data Sustainability',
  'Data Reporting',
  'Data Automation',
  'Data Industry Standards',
  'Data Advanced Techniques',
  'API Architecture Patterns',
  'API Security Best Practices',
  'API Monitoring Strategies',
  'API Deployment Patterns',
  'API Performance Optimization',
  'API Error Handling',
  'API Scalability Patterns',
  'API Resilience Patterns',
  'API Governance',
  'API Compliance',
  'API Sustainability',
  'API Reporting',
  'API Automation',
  'API Industry Standards',
  'API Advanced Techniques',
]);

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
let totalPruned = 0;
let filesPruned = 0;
let totalLinesRemoved = 0;

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const totalLines = lines.length;

  // Only prune files well above 350 lines (leave 50-line margin)
  if (totalLines < 400) continue;

  // Find H2 sections to remove
  const h2s = [...text.matchAll(/^##\s+(.+)$/gm)];
  const sectionsToRemove = [];

  for (let i = 0; i < h2s.length; i++) {
    const title = h2s[i][1].trim();
    if (PADDING_SECTIONS.has(title)) {
      const startLine = text.slice(0, h2s[i].index).split('\n').length - 1;
      let endLine;
      if (i + 1 < h2s.length) {
        endLine = text.slice(0, h2s[i + 1].index).split('\n').length - 1;
      } else {
        endLine = lines.length;
      }
      const sectionLines = endLine - startLine;
      // Only remove if file stays above 350 lines
      if (totalLines - totalLinesRemoved - sectionLines >= 350) {
        sectionsToRemove.push({ startLine, endLine, title, sectionLines });
        totalLinesRemoved += sectionLines;
      }
    }
  }

  if (sectionsToRemove.length === 0) continue;

  // Remove sections (from bottom to top to preserve line numbers)
  const newLines = [...lines];
  for (const { startLine, endLine, title } of sectionsToRemove.reverse()) {
    newLines.splice(startLine, endLine - startLine);
  }

  fs.writeFileSync(f, newLines.join('\n'));
  filesPruned++;
  totalPruned += sectionsToRemove.length;
  console.log(`Pruned ${sectionsToRemove.length} sections from ${path.relative('src/content', f)} (${totalLines} -> ${newLines.length} lines)`);
  for (const { title, sectionLines } of sectionsToRemove) {
    console.log(`  - ${title} (${sectionLines} lines)`);
  }
}

console.log(`\nTotal: pruned ${totalPruned} sections from ${filesPruned} files, removed ${totalLinesRemoved} lines`);
