const MAX_HIGHLIGHT_LINES = 30;

function countLines(text) {
  // Astro/Shiki preserves a trailing newline; ignore it.
  const trimmed = text.replace(/\n$/, '');
  if (!trimmed) return 0;
  return trimmed.split('\n').length;
}

function getText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(getText).join('');
  }
  return '';
}

function visit(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child, visitor);
    }
  }
}

export default function rehypeShortCode() {
  return function transformer(tree) {
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'pre') return;

      const code = node.children.find(
        (c) => c && c.type === 'element' && c.tagName === 'code',
      );
      if (!code) return;

      const text = getText(code);
      if (countLines(text) <= MAX_HIGHLIGHT_LINES) return;

      // Replace highlighted tokens with a single plain text node.
      code.children = [{ type: 'text', value: text }];

      // Keep the dark background from the Shiki theme but remove token-specific
      // attributes that no longer apply. This preserves visual continuity.
      if (node.properties) {
        if (node.properties.tabindex !== undefined) {
          delete node.properties.tabindex;
        }
      }
    });
  };
}
