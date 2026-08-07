const MAX_HIGHLIGHT_LINES = 15;

/**
 * Shiki transformer that renders code blocks with more than MAX_HIGHLIGHT_LINES
 * as plain text instead of tokenized HTML. This significantly reduces the size
 * of long code blocks in the generated HTML while preserving syntax highlighting
 * for short, easy-to-scan snippets.
 */
export default function shikiShortCode() {
  return {
    name: 'shiki-short-code',
    pre(node) {
      // `this.source` is the original code string.
      const source = this.source;
      if (!source) return;

      const lineCount = source.split('\n').length;
      if (lineCount <= MAX_HIGHLIGHT_LINES) return;

      // The HAST structure from Shiki is:
      // pre > code > (span.line > span.token...)*
      // Replace the code's children with a single text node.
      const code = node.children.find(
        (c) => c && c.type === 'element' && c.tagName === 'code',
      );
      if (!code) return;

      code.children = [{ type: 'text', value: source }];

      // Remove tabindex that Shiki adds to scrollable pre elements; with plain
      // text we keep the block scrollable but don't need focus trapping.
      if (node.properties && node.properties.tabindex !== undefined) {
        delete node.properties.tabindex;
      }
    },
  };
}
