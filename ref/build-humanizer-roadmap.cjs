const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.resolve('src/content');

function walkMarkdown(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkMarkdown(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

// Tier 1: always flag
const TIER_1 = [
  'delve', 'landscape', 'tapestry', 'realm', 'paradigm', 'embark', 'beacon',
  'testament', 'robust', 'comprehensive', 'cutting-edge', 'leverage', 'pivotal',
  'underscores', 'meticulous', 'seamless', 'game-changer', 'utilize', 'watershed',
  'nestled', 'vibrant', 'thriving', 'showcasing', 'deep dive', 'unpack', 'bustling',
  'intricate', 'complexities', 'ever-evolving', 'enduring', 'daunting', 'holistic',
  'actionable', 'impactful', 'learnings', 'thought leader', 'best practices',
  'at its core', 'synergy', 'interplay', 'in order to', 'due to the fact that',
  'serves as', 'features', 'boasts', 'presents', 'commence', 'ascertain', 'endeavor',
  'keen', 'embrace', 'symphony', 'hit differently', 'only time will tell',
  'the future looks bright', 'deep dive', 'dive into', 'watershed moment',
  'marking a pivotal moment', 'cutting-edge'
];

// Tier 2: flag in clusters (2+ in same paragraph)
const TIER_2 = [
  'harness', 'navigate', 'foster', 'elevate', 'unleash', 'streamline', 'empower',
  'bolster', 'spearhead', 'resonate', 'revolutionize', 'facilitate', 'underpin',
  'nuanced', 'crucial', 'multifaceted', 'ecosystem', 'myriad', 'plethora',
  'encompass', 'catalyze', 'reimagine', 'galvanize', 'augment', 'cultivate',
  'illuminate', 'elucidate', 'juxtapose', 'paradigm-shifting', 'transformative',
  'cornerstone', 'paramount', 'poised', 'burgeoning', 'nascent', 'quintessential',
  'overarching', 'underpinning', 'transformation'
];

// Tier 3: flag by density
const TIER_3 = [
  'significant', 'significantly', 'innovative', 'innovation', 'effective', 'effectively',
  'dynamic', 'dynamics', 'scalable', 'scalability', 'compelling', 'unprecedented',
  'exceptional', 'exceptionally', 'remarkable', 'remarkably', 'sophisticated',
  'instrumental', 'world-class', 'state-of-the-art', 'best-in-class'
];

const REPLACEMENTS = {
  'best practices': 'what works',
  'Best Practices': 'What works',
  'Best practices': 'What works',
  'features': 'capabilities',
  'Features': 'Capabilities',
  'feature': 'capability',
  'Feature': 'Capability',
  'dynamic': 'live',
  'Dynamic': 'Live',
  'significant': 'major',
  'significantly': 'considerably',
  'robust': 'reliable',
  'comprehensive': 'thorough',
  'leverage': 'use',
  'Leverage': 'Use',
  'actionable': 'useful',
  'Actionable': 'Useful',
  'impactful': 'effective',
  'Impactful': 'Effective',
  'effective': 'useful',
  'Effective': 'Useful',
  'effectively': 'well',
  'Effectively': 'Well',
  'scalable': 'growth-ready',
  'Scalable': 'Growth-ready',
  'scalability': 'growth',
  'Scalability': 'Growth',
  'ecosystem': 'platform',
  'Ecosystem': 'Platform',
  'serves as': 'works as',
  'Serves as': 'Works as',
  'landscape': 'space',
  'Landscape': 'Space',
  'vibrant': 'rich',
  'Vibrant': 'Rich',
  'enduring': 'long-lasting',
  'Enduring': 'Long-lasting',
  'seamless': 'smooth',
  'Seamless': 'Smooth',
  'beacon': 'signal',
  'Beacon': 'Signal',
  'holistic': 'complete',
  'Holistic': 'Complete',
  'innovative': 'novel',
  'Innovative': 'Novel',
  'innovation': 'improvement',
  'Innovation': 'Improvement',
  'sophisticated': 'advanced',
  'Sophisticated': 'Advanced',
  'unprecedented': 'new',
  'Unprecedented': 'New',
  'world-class': 'top-tier',
  'World-class': 'Top-tier',
  'state-of-the-art': 'modern',
  'State-of-the-art': 'Modern',
  'best-in-class': 'leading',
  'Best-in-class': 'Leading',
  'transformation': 'change',
  'Transformation': 'Change',
  'utilize': 'use',
  'Utilize': 'Use',
  'commence': 'start',
  'Commence': 'Start',
  'ascertain': 'find out',
  'Ascertain': 'Find out',
  'endeavor': 'effort',
  'Endeavor': 'Effort',
  'commence': 'start',
  'Commence': 'Start',
  'pivotal': 'key',
  'Pivotal': 'Key',
  'paramount': 'critical',
  'Paramount': 'Critical',
  'crucial': 'critical',
  'Crucial': 'Critical',
  'intricate': 'complex',
  'Intricate': 'Complex',
  'meticulous': 'careful',
  'Meticulous': 'Careful',
  'daunting': 'hard',
  'Daunting': 'Hard',
  'harness': 'use',
  'Harness': 'Use',
  'navigate': 'handle',
  'Navigate': 'Handle',
  'foster': 'encourage',
  'Foster': 'Encourage',
  'elevate': 'improve',
  'Elevate': 'Improve',
  'unleash': 'unlock',
  'Unleash': 'Unlock',
  'streamline': 'simplify',
  'Streamline': 'Simplify',
  'empower': 'enable',
  'Empower': 'Enable',
  'bolster': 'strengthen',
  'Bolster': 'Strengthen',
  'spearhead': 'lead',
  'Spearhead': 'Lead',
  'resonate': 'connect',
  'Resonate': 'Connect',
  'revolutionize': 'transform',
  'Revolutionize': 'Transform',
  'facilitate': 'make easier',
  'Facilitate': 'Make easier',
  'underpin': 'support',
  'Underpin': 'Support',
  'nuanced': 'subtle',
  'Nuanced': 'Subtle',
  'multifaceted': 'multi-part',
  'Multifaceted': 'Multi-part',
  'myriad': 'many',
  'Myriad': 'Many',
  'plethora': 'many',
  'Plethora': 'Many',
  'encompass': 'cover',
  'Encompass': 'Cover',
  'catalyze': 'trigger',
  'Catalyze': 'Trigger',
  'reimagine': 'rethink',
  'Reimagine': 'Rethink',
  'galvanize': 'spur',
  'Galvanize': 'Spur',
  'augment': 'expand',
  'Augment': 'Expand',
  'cultivate': 'build',
  'Cultivate': 'Build',
  'illuminate': 'clarify',
  'Illuminate': 'Clarify',
  'elucidate': 'explain',
  'Elucidate': 'Explain',
  'juxtapose': 'contrast',
  'Juxtapose': 'Contrast',
  'paradigm-shifting': 'groundbreaking',
  'Paradigm-shifting': 'Groundbreaking',
  'transformative': 'powerful',
  'Transformative': 'Powerful',
  'cornerstone': 'foundation',
  'Cornerstone': 'Foundation',
  'poised': 'ready',
  'Poised': 'Ready',
  'burgeoning': 'growing',
  'Burgeoning': 'Growing',
  'nascent': 'emerging',
  'Nascent': 'Emerging',
  'quintessential': 'typical',
  'Quintessential': 'Typical',
  'overarching': 'overall',
  'Overarching': 'Overall',
  'underpinning': 'foundation',
  'Underpinning': 'Foundation',
  'delve': 'explore',
  'Delve': 'Explore',
  'tapestry': 'mix',
  'Tapestry': 'Mix',
  'realm': 'area',
  'Realm': 'Area',
  'paradigm': 'model',
  'Paradigm': 'Model',
  'embark': 'start',
  'Embark': 'Start',
  'testament': 'proof',
  'Testament': 'Proof',
  'cutting-edge': 'modern',
  'Cutting-edge': 'Modern',
  'watershed': 'turning point',
  'Watershed': 'Turning point',
  'nestled': 'located',
  'Nestled': 'Located',
  'thriving': 'active',
  'Thriving': 'Active',
  'showcasing': 'showing',
  'Showcasing': 'Showing',
  'unpack': 'break down',
  'Unpack': 'Break down',
  'bustling': 'busy',
  'Bustling': 'Busy',
  'complexities': 'complexity',
  'Complexities': 'Complexity',
  'ever-evolving': 'always changing',
  'Ever-evolving': 'Always changing',
  'at its core': 'at heart',
  'At its core': 'At heart',
  'synergy': 'combined effect',
  'Synergy': 'Combined effect',
  'interplay': 'interaction',
  'Interplay': 'Interaction',
  'in order to': 'to',
  'In order to': 'To',
  'due to the fact that': 'because',
  'Due to the fact that': 'Because',
  'boasts': 'has',
  'Boasts': 'Has',
  'presents': 'shows',
  'Presents': 'Shows',
  'keen': 'eager',
  'Keen': 'Eager',
  'embrace': 'adopt',
  'Embrace': 'Adopt',
  'symphony': 'combination',
  'Symphony': 'Combination',
  'hit differently': 'stand out',
  'Hit differently': 'Stand out',
  'only time will tell': 'wait and see',
  'Only time will tell': 'Wait and see',
  'the future looks bright': 'it is promising',
  'The future looks bright': 'It is promising',
  'dive into': 'explore',
  'Dive into': 'Explore',
  'watershed moment': 'turning point',
  'Watershed moment': 'Turning point',
  'marking a pivotal moment': 'marking a key moment',
  'Marking a pivotal moment': 'Marking a key moment',
};

function wordMatches(text, word) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  return Array.from(text.matchAll(re));
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

function computeTTR(text) {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  const unique = new Set(words);
  return words.length ? unique.size / words.length : 0;
}

function splitParagraphs(body) {
  return body.split(/\n\n+/).filter(p => p.trim());
}

function auditFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parts = raw.split('---');
  const body = parts.length >= 3 ? parts.slice(2).join('---') : raw;
  const paragraphs = splitParagraphs(body);
  const wordCount = countWords(body);
  const ttr = computeTTR(body);
  const findings = [];
  let vocabScore = 0;
  let structuralScore = 0;

  const vocabWeight = (word) => {
    if (word === 'best practices') return 1;
    if (word === 'features') return 1;
    if (word === 'actionable') return 1;
    if (word === 'robust' || word === 'comprehensive') return 1;
    return 5;
  };

  for (const word of TIER_1) {
    const matches = wordMatches(body, word);
    if (matches.length) {
      findings.push({ tier: 1, type: 'word', label: word, count: matches.length, examples: matches.slice(0, 3).map(m => m[0]) });
      vocabScore += matches.length * vocabWeight(word);
    }
  }

  for (const word of TIER_2) {
    let total = 0;
    const paraHits = [];
    for (const para of paragraphs) {
      const matches = wordMatches(para, word);
      if (matches.length >= 2) {
        total += matches.length;
        const snippet = para.slice(0, 120).replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
        paraHits.push(`${matches.length} in "${snippet}"`);
      }
    }
    if (total) {
      findings.push({ tier: 2, type: 'word', label: word, count: total, cluster: true, examples: paraHits.slice(0, 2) });
      vocabScore += total * 2;
    }
  }

  for (const word of TIER_3) {
    const matches = wordMatches(body, word);
    if (matches.length) {
      findings.push({ tier: 3, type: 'word', label: word, count: matches.length, examples: matches.slice(0, 3).map(m => m[0]) });
      vocabScore += matches.length * 1;
    }
  }

  const emDashes = (body.match(/[—]/g) || []).length + (body.match(/(?<!-)--(?!-)/g) || []).length;
  if (emDashes) {
    findings.push({ tier: 'P', type: 'pattern', label: 'em-dash', count: emDashes, weight: 0.2 });
    structuralScore += emDashes * 0.2;
  }

  const boldCount = (body.match(/\*\*[^\*]+\*\*/g) || []).length;
  if (boldCount > 40) {
    findings.push({ tier: 'P', type: 'pattern', label: 'bold-overuse', count: boldCount, weight: 0.2 });
    structuralScore += boldCount * 0.2;
  }

  const bulletLists = body.match(/^\s*[-*]\s+/gm) || [];
  if (bulletLists.length > 12) {
    findings.push({ tier: 'P', type: 'pattern', label: 'long-bullet-list', count: bulletLists.length, weight: 0.2 });
    structuralScore += bulletLists.length * 0.2;
  }

  const passiveBe = (body.match(/\b(is|are|was|were)\s+\w+ed\b/gi) || []).length;
  if (passiveBe > 10) {
    findings.push({ tier: 'P', type: 'pattern', label: 'possible-passive', count: passiveBe, weight: 0.1 });
    structuralScore += passiveBe * 0.1;
  }

  const score = vocabScore + structuralScore;

  // Identify top vocab words with recommended replacements
  const vocabFindings = findings.filter(f => f.tier !== 'P' && f.type === 'word').sort((a, b) => b.count - a.count);
  const actionable = vocabFindings.slice(0, 5).map(f => {
    const replacements = [];
    const labels = [f.label.toLowerCase()];
    for (const key of Object.keys(REPLACEMENTS)) {
      if (key.toLowerCase() === f.label.toLowerCase()) {
        replacements.push(REPLACEMENTS[key]);
      }
    }
    // include case variants
    const seen = new Set();
    const uniqueReplacements = [];
    for (const label of labels) {
      const r = REPLACEMENTS[label] || REPLACEMENTS[label.charAt(0).toUpperCase() + label.slice(1)];
      if (r && !seen.has(r.toLowerCase())) {
        seen.add(r.toLowerCase());
        uniqueReplacements.push(r);
      }
    }
    return { word: f.label, count: f.count, suggestion: uniqueReplacements[0] || '(manual review)' };
  });

  return {
    filePath,
    relative: path.relative(process.cwd(), filePath),
    wordCount,
    ttr,
    findings,
    vocabScore,
    structuralScore,
    score,
    actionable,
  };
}

function isEnglish(filePath) {
  return !path.basename(filePath).endsWith('.es.md');
}

function spanishPair(filePath) {
  const base = filePath.replace(/\.md$/, '.es.md');
  if (fs.existsSync(base)) return base;
  return null;
}

function batchName(idx) {
  return `Batch ${String(idx).padStart(2, '0')}`;
}

function main() {
  const files = walkMarkdown(CONTENT_DIR);
  const results = files.map(auditFile).filter(r => r.wordCount > 50);

  // Humanized files so far (rough list from previous sessions)
  const humanized = new Set([
    'src/content/guides/deployment/feature-flags-guide.md',
    'src/content/guides/planning/cost-optimization-cloud-guide.md',
    'src/content/recipes/ai/image-generation.md',
    'src/content/recipes/ai/image-generation.es.md',
    'src/content/guides/frontend/accessibility-wcag-guide.md',
    'src/content/guides/frontend/accessibility-wcag-guide.es.md',
    'src/content/guides/data/real-time-analytics-guide.md',
    'src/content/guides/data/real-time-analytics-guide.es.md',
    'src/content/guides/data/caching-strategies-guide.md',
    'src/content/guides/data/caching-strategies-guide.es.md',
    'src/content/guides/observability/alert-management-guide.md',
    'src/content/guides/observability/alert-management-guide.es.md',
    'src/content/recipes/api/graphql-apollo-server.md',
    'src/content/guides/deployment/a-b-testing-guide.md',
    'src/content/guides/deployment/a-b-testing-guide.es.md',
    'src/content/guides/data/etl-pipeline-guide.md',
    'src/content/guides/architecture/vertical-slice-architecture-guide.md',
    'src/content/guides/architecture/vertical-slice-architecture-guide.es.md',
    'src/content/recipes/testing/visual-regression-testing.md',
    'src/content/docs/templates/changelog-template.md',
    'src/content/docs/templates/changelog-template.es.md',
    'src/content/patterns/design/content-delivery-network-pattern.md',
    'src/content/patterns/design/content-delivery-network-pattern.es.md',
  ]);

  const enResults = results.filter(r => isEnglish(r.filePath));
  const vocabSorted = [...enResults].sort((a, b) => b.vocabScore - a.vocabScore);
  const withVocab = vocabSorted.filter(r => r.vocabScore > 0);
  const withStruct = [...enResults].sort((a, b) => b.structuralScore - a.structuralScore).filter(r => r.structuralScore > 0);

  const lines = [];
  lines.push('# Humanizer Roadmap');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Scope: ${enResults.length} English markdown files in src/content`);
  lines.push('');
  lines.push('## Goal');
  lines.push('');
  lines.push('Humanize all English content in `src/content` by replacing AI-isms with natural language, then mirror the changes in the Spanish translations. Structural patterns (em-dashes, bold, lists) are secondary and only addressed when they clearly hurt readability.');
  lines.push('');
  lines.push('## Progress');
  lines.push('');
  lines.push(`- **English files with vocab AI-isms:** ${withVocab.length}`);
  lines.push(`- **English files with structural flags:** ${withStruct.length}`);
  lines.push(`- **Files already humanized (EN+ES):** ${humanized.size}`);
  lines.push(`- **Batches planned (vocab, 5 EN files each):** ${Math.ceil(withVocab.length / 5)}`);
  lines.push('');
  lines.push('## Top site-wide vocab issues');
  lines.push('');
  lines.push('| Word | Occurrences | Suggested replacement | Notes |');
  lines.push('|------|-------------|----------------------|-------|');
  const wordCounts = {};
  for (const r of results) {
    for (const f of r.findings.filter(f => f.tier !== 'P' && f.type === 'word')) {
      const key = f.label.toLowerCase();
      wordCounts[key] = (wordCounts[key] || 0) + f.count;
    }
  }
  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [word, count] of sortedWords) {
    const suggestion = REPLACEMENTS[word] || REPLACEMENTS[word.charAt(0).toUpperCase() + word.slice(1)] || '(manual review)';
    let notes = '';
    if (['features', 'best practices', 'dynamic', 'significant', 'effective'].includes(word)) notes = 'high priority';
    lines.push(`| ${word} | ${count} | ${suggestion} | ${notes} |`);
  }
  lines.push('');
  lines.push('## Vocab batches');
  lines.push('');
  lines.push('Process each batch left-to-right. For every English file, apply the same edits to its `.es.md` pair when one exists.');
  lines.push('');
  const BATCH_SIZE = 5;
  for (let i = 0; i < withVocab.length; i += BATCH_SIZE) {
    const batch = withVocab.slice(i, i + BATCH_SIZE);
    const num = Math.floor(i / BATCH_SIZE) + 1;
    lines.push(`### ${batchName(num)} (priority: ${num <= 3 ? 'high' : num <= 6 ? 'medium' : 'low'})`);
    lines.push('');
    lines.push('| File | Vocab | Top fixes | ES pair | Status |');
    lines.push('|------|-------|-----------|---------|--------|');
    for (const r of batch) {
      const top = r.actionable.slice(0, 3).map(a => `${a.word} → ${a.suggestion}`).join(', ') || '(none)';
      const pair = spanishPair(r.filePath);
      const status = humanized.has(r.relative) ? 'done' : 'pending';
      lines.push(`| ${r.relative} | ${r.vocabScore.toFixed(1)} | ${top} | ${pair ? path.relative(process.cwd(), pair) : 'none'} | ${status} |`);
    }
    lines.push('');
  }
  lines.push('## Structural cleanup candidates');
  lines.push('');
  lines.push('Only edit these if the formatting feels overwhelming after the vocab pass. Most are templates and guides that naturally use many bullets and bold labels.');
  lines.push('');
  lines.push('| File | Struct | Issues |');
  lines.push('|------|--------|--------|');
  for (const r of withStruct.slice(0, 30)) {
    const top = r.findings.filter(f => f.tier === 'P').slice(0, 3).map(f => `${f.label} (${f.count})`).join(', ');
    lines.push(`| ${r.relative} | ${r.structuralScore.toFixed(1)} | ${top} |`);
  }
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push('1. Run `node ref/audit-ai-isms.cjs` after each batch to refresh `ref/ai-ism-audit-report.md`.');
  lines.push('2. Apply the `avoid-ai-writing` skill in edit mode to keep changes minimal and targeted.');
  lines.push('3. For every English file, update the matching `.es.md` file with equivalent terminology.');
  lines.push('4. Run validation scripts: `validate-content.cjs`, `check-meta-descriptions.cjs`, `check-broken-links.cjs`, `check-missing-translations.cjs`, `check-orphan-translations.cjs`.');
  lines.push('5. Run `npm run check` and `npm run build`.');
  lines.push('6. Commit with `style(content): humanize batch X` if everything passes.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('This roadmap is a heuristic guide. Review each suggestion in context; do not blindly replace technical terms.');

  const outPath = path.resolve('ref/humanizer-roadmap.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`Roadmap written to ${outPath}`);
  console.log(`English files with vocab issues: ${withVocab.length}`);
  console.log(`Batches planned: ${Math.ceil(withVocab.length / 5)}`);
}

main();
