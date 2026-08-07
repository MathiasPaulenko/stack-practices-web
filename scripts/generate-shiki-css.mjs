import { createHighlighter } from 'shiki';
import fs from 'fs';

const highlighter = await createHighlighter({
  langs: [],
  themes: ['github-dark'],
});

const theme = highlighter.getTheme('github-dark');
const tokens = theme.settings?.tokenColors || [];

const map = new Map();
for (const rule of tokens) {
  const scopes = Array.isArray(rule.scope) ? rule.scope : rule.scope ? [rule.scope] : [];
  const color = rule.settings?.foreground;
  if (!color || scopes.length === 0) continue;
  for (const scope of scopes) {
    if (!map.has(scope)) map.set(scope, color);
  }
}

const vars = [];
// Map common Shiki css-variable token names to their source scopes.
const mapping = {
  'token-comment': ['comment'],
  'token-constant': ['constant', 'number', 'boolean', 'variable.other.constant'],
  'token-function': ['entity.name.function', 'support.function', 'function'],
  'token-keyword': ['keyword', 'storage.type', 'storage.modifier'],
  'token-parameter': ['variable.parameter', 'parameter'],
  'token-punctuation': ['punctuation'],
  'token-string': ['string'],
  'token-string-expression': ['string.template', 'string.interpolated', 'entity.name.tag'],
};

for (const [varName, scopes] of Object.entries(mapping)) {
  for (const scope of scopes) {
    if (map.has(scope)) {
      vars.push(`  --astro-code-${varName}: ${map.get(scope)};`);
      break;
    }
  }
}

// Fallbacks if a scope was not found.
const fallback = {
  'token-comment': '#6A737D',
  'token-constant': '#79B8FF',
  'token-function': '#B392F0',
  'token-keyword': '#F97583',
  'token-parameter': '#FFAB70',
  'token-punctuation': '#E1E4E8',
  'token-string': '#9ECBFF',
  'token-string-expression': '#9ECBFF',
};

for (const [varName, color] of Object.entries(fallback)) {
  if (!vars.some((v) => v.includes(`--astro-code-${varName}:`))) {
    vars.push(`  --astro-code-${varName}: ${color};`);
  }
}

const css = `:root {\n  --astro-code-foreground: #E1E4E8;\n  --astro-code-background: #24292E;\n${vars.join('\n')}\n}\n`;
fs.writeFileSync('src/styles/shiki-variables.css', css);
console.log('wrote src/styles/shiki-variables.css');
