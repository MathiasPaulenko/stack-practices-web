/* remark-mermaid-blocks.mjs
 *
 * Remark plugin that converts fenced ```mermaid code blocks into
 * raw HTML <div class="mermaid"> nodes before Shiki processes them.
 * This prevents Shiki from syntax-highlighting Mermaid syntax and
 * allows Mermaid.js to render them client-side.
 *
 * Must run BEFORE other remark plugins that process code blocks.
 */

/** @type {import('unified').Plugin} */
export default function remarkMermaidBlocks() {
  return (tree) => {
    walk(tree);
  };
}

function walk(node) {
  if (!node.children) return;

  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];

    // Check if this is a fenced code block with lang "mermaid"
    if (child.type === 'code' && child.lang === 'mermaid') {
      const rawText = child.value || '';

      // Replace with an HTML node that Shiki will skip
      node.children[i] = {
        type: 'html',
        value: '<div class="mermaid">' + escapeHtml(rawText) + '</div>',
      };
      continue;
    }

    // Recurse into children
    walk(child);
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
