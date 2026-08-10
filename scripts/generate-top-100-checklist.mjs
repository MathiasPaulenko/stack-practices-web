import fs from 'node:fs';
import { execSync } from 'node:child_process';

const TOP_100 = 'ref/top-100-resources.md';
const OUTPUT = 'ref/top-100-checklist.md';
const P1_COMMIT = '9bad0629';

function getP1DoneUrls() {
  // Avoid `^` because it is a shell-escape character on Windows.
  const changed = execSync(`git show --name-only --pretty=format: ${P1_COMMIT}`, {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  const urls = new Set();
  for (const file of changed.split('\n')) {
    const trimmed = file.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^src\/content\/(recipes|patterns|docs|guides)(?:\/[^/]+)*\/([^/]+)\.md$/);
    if (!m || trimmed.endsWith('.es.md')) continue;
    const [, type, slug] = m;
    urls.add(`https://stackpractices.com/${type}/${slug}/`);
  }
  return urls;
}

function parseTop100() {
  const text = fs.readFileSync(TOP_100, 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('| ') || /^(\|[-]+)+\|?\s*$/.test(line)) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 12 || /^#/.test(parts[1])) continue;
    const [rank, enUrl, esUrl, type, impressions, clicks, position, ctr, words, meta, delta, focus] = parts.slice(1);
    if (!rank || !enUrl) continue;
    rows.push({
      rank,
      enUrl,
      esUrl,
      type,
      impressions,
      clicks,
      position,
      ctr,
      words,
      meta,
      delta,
      focus,
    });
  }
  return rows;
}

function slugFromUrl(url) {
  const { pathname } = new URL(url);
  const segments = pathname.replace(/^\/|\/$/g, '').split('/');
  return segments.at(-1) || '';
}

function main() {
  const done = getP1DoneUrls();
  const rows = parseTop100();

  let doneCount = 0;
  const lines = [
    '# Top 100 Content Resources — Checklist',
    '',
    'Use this list to track progress as you audit and improve each resource.',
    '',
    '- `[x]` = already optimized in P1.1 (title + meta description)',
    '- `[ ]` = pending',
    '',
    `**Progress:** 0 / ${rows.length} resources completed`,
    '',
    '---',
    '',
  ];

  for (const r of rows) {
    const isDone = done.has(r.enUrl);
    if (isDone) doneCount++;
    const status = isDone ? '✅ Title + meta optimized in P1.1' : '⏳ Pending';
    const slug = slugFromUrl(r.enUrl);
    const check = isDone ? '[x]' : '[ ]';

    lines.push(`${r.rank}. - ${check} **${slug}** (${r.type})`);
    lines.push(`   - Metrics: ${r.impressions} imp | pos ${r.position} | CTR ${r.ctr} | Δ impr ${r.delta}`);
    lines.push(`   - EN: ${r.enUrl}`);
    if (r.esUrl) lines.push(`   - ES: ${r.esUrl}`);
    lines.push(`   - Focus: ${r.focus}`);
    lines.push(`   - Status: ${status}`);
    lines.push(`   - Words: ${r.words} | Meta: ${r.meta} chars`);
    lines.push('');
  }

  // Update progress line.
  const progress = `**Progress:** ${doneCount} / ${rows.length} resources completed`;
  const idx = lines.findIndex((l) => l.startsWith('**Progress:**'));
  if (idx !== -1) lines[idx] = progress;

  fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
  console.log(`Wrote ${OUTPUT} — ${doneCount} already done, ${rows.length - doneCount} pending`);
}

main();
