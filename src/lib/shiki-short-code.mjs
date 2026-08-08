const MAX_HIGHLIGHT_LINES = 10;

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
      if (lineCount > MAX_HIGHLIGHT_LINES) {
        // The HAST structure from Shiki is:
        // pre > code > (span.line > span.token...)*
        // Replace the code's children with a single text node.
        const code = node.children.find(
          (c) => c && c.type === 'element' && c.tagName === 'code',
        );
        if (code) {
          code.children = [{ type: 'text', value: source }];
        }
      }

      // Remove tabindex that Shiki adds to scrollable pre elements; the blocks
      // remain scrollable without focus trapping and it removes ~14 chars per block.
      if (node.properties && node.properties.tabindex !== undefined) {
        delete node.properties.tabindex;
      }

      // Remove data-language; it is not used by JS and Shiki reports language via
      // the language-specific class name. This saves ~253 KB across ~15,800 blocks.
      if (node.properties) {
        if (node.properties['data-language'] !== undefined) {
          delete node.properties['data-language'];
        }
        if (node.properties.dataLanguage !== undefined) {
          delete node.properties.dataLanguage;
        }
      }
    },
  };
}
