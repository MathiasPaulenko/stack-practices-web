#!/usr/bin/env node
'use strict';

/**
 * content-improvement-pipeline.cjs
 *
 * Runs the full validation chain used after improving a StackPractices resource.
 * It is meant to be called by Devin or a human after editing content.
 *
 * Usage:
 *   node scripts/content-improvement-pipeline.cjs [slug-or-identifier]
 *
 * The slug is only used for naming the summary report; all validation commands
 * run against the whole site because the current scripts do not support a
 * single-file target.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COMMANDS = [
  { name: 'content:quality', cmd: 'npm run content:quality' },
  { name: 'content:links', cmd: 'npm run content:links' },
  { name: 'content:validate', cmd: 'npm run content:validate' },
  { name: 'check', cmd: 'npm run check' },
  { name: 'build', cmd: 'npm run build' },
  { name: 'sitemap', cmd: 'npm run sitemap' },
];

const OUTPUT_DIR = 'ref/output';

function sanitizeSlug(input) {
  return String(input || 'all')
    .replace(/[<>:"/\\|?*\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function runCommand(name, cmd) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return {
      name,
      cmd,
      startedAt,
      status: 'OK',
      exitCode: 0,
      output: stdout,
    };
  } catch (err) {
    return {
      name,
      cmd,
      startedAt,
      status: 'FAILED',
      exitCode: err.status || 1,
      output: (err.stdout || '') + (err.stderr ? '\n--- STDERR ---\n' + err.stderr : ''),
    };
  }
}

function lastLines(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

function main() {
  const slug = sanitizeSlug(process.argv[2]);
  console.log(`Running content improvement pipeline for: ${slug}`);

  const results = [];
  let allOk = true;

  for (const { name, cmd } of COMMANDS) {
    console.log(`\n>>> ${name}`);
    const result = runCommand(name, cmd);
    results.push(result);
    if (result.status === 'FAILED') {
      allOk = false;
      console.error(`FAILED: ${name} (exit ${result.exitCode})`);
    } else {
      console.log(`OK: ${name}`);
    }
  }

  const summaryLines = [
    `# Content Improvement Pipeline Summary — ${slug}`,
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**All passed:** ${allOk ? 'Yes' : 'No'}`,
    '',
    '## Steps',
  ];

  for (const r of results) {
    summaryLines.push(`### ${r.name} — ${r.status}`);
    summaryLines.push(`- Command: \`${r.cmd}\``);
    summaryLines.push(`- Exit code: ${r.exitCode}`);
    summaryLines.push('');
    summaryLines.push('```text');
    summaryLines.push(lastLines(r.output, 6000));
    summaryLines.push('```');
    summaryLines.push('');
  }

  const summaryText = summaryLines.join('\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `improvement-pipeline-${slug}.md`);
  fs.writeFileSync(outPath, summaryText, 'utf-8');

  console.log(`\nSummary written to: ${outPath}`);
  process.exit(allOk ? 0 : 1);
}

main();
