/**
 * Shiki transformer that converts repeated CSS variable inline styles
 * on token spans into short shared classes. The corresponding stylesheet
 * is included once via src/styles/global.css.
 */

const TOKEN_CLASS = {
  'var(--astro-code-foreground)': 'sf',
  'var(--astro-code-background)': 'sb',
  'var(--astro-code-token-comment)': 'sc',
  'var(--astro-code-token-constant)': 'sn',
  'var(--astro-code-token-function)': 'sfu',
  'var(--astro-code-token-keyword)': 'sk',
  'var(--astro-code-token-parameter)': 'sp',
  'var(--astro-code-token-punctuation)': 'spu',
  'var(--astro-code-token-string)': 'ss',
  'var(--astro-code-token-string-expression)': 'sse',
};

function transformStyle(node) {
  if (!node.properties || !node.properties.style) return;
  const style = node.properties.style;
  const colorMatch = style.match(/color:\s*var\(--astro-code-([^)]+)\)/);
  const bgMatch = style.match(/background-color:\s*var\(--astro-code-([^)]+)\)/);

  const classes = [];
  if (colorMatch && TOKEN_CLASS[`var(--astro-code-${colorMatch[1]})`]) {
    classes.push(TOKEN_CLASS[`var(--astro-code-${colorMatch[1]})`]);
  }
  if (bgMatch && TOKEN_CLASS[`var(--astro-code-${bgMatch[1]})`]) {
    classes.push(TOKEN_CLASS[`var(--astro-code-${bgMatch[1]})`]);
  }

  if (classes.length === 0) return;

  const existing = new Set((node.properties.class || '').split(/\s+/).filter(Boolean));
  for (const c of classes) existing.add(c);
  node.properties.class = [...existing].join(' ');
  delete node.properties.style;
}

function walk(node) {
  if (node.type === 'element') {
    transformStyle(node);
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }
}

export default function shikiClassify() {
  return {
    name: 'shiki-classify',
    pre(node) {
      walk(node);
    },
  };
}
