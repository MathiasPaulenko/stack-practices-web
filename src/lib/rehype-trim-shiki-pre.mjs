import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that trims redundant attributes from Shiki `<pre>` blocks.
 * The `css-variables` theme class and the `background-color`/`color` inline
 * styles are not needed because `pre.astro-code` and short token classes in
 * `global.css` handle all styling. `tabindex="0"` is also removed because the
 * blocks remain scrollable without focus trapping.
 */
const REDUNDANT_PRE_CLASSES = ['css-variables', 'sb', 'sf'];

export default function rehypeTrimShikiPre() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'pre' && node.properties?.class?.includes('astro-code')) {
        console.error('FOUND PRE, props keys:', Object.keys(node.properties || {}).join(','));
      }
      if (node.tagName !== 'pre' || !node.properties?.class?.includes('astro-code')) return;

      // Remove redundant classes
      if (node.properties.class) {
        const classes = node.properties.class.split(/\s+/).filter(
          (c) => !REDUNDANT_PRE_CLASSES.includes(c)
        );
        if (classes.length > 0) {
          node.properties.class = classes.join(' ');
        } else {
          delete node.properties.class;
        }
      }

      // Remove tabindex
      if (node.properties.tabindex !== undefined) {
        delete node.properties.tabindex;
      }

      // Remove data-language (not used in JS; Shiki reports language via CSS class)
      if (node.properties.dataLanguage !== undefined) {
        delete node.properties.dataLanguage;
      }
      if (node.properties['data-language'] !== undefined) {
        delete node.properties['data-language'];
      }

      // Trim inline style: keep overflow-x (or other non-color styles),
      // remove background-color and color since CSS handles them.
      if (node.properties.style) {
        const styles = node.properties.style
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s && !s.match(/^background-color:\s*var\(--astro-code/) && !s.match(/^color:\s*var\(--astro-code/));
        if (styles.length > 0) {
          node.properties.style = styles.join('; ');
        } else {
          delete node.properties.style;
        }
      }
    });
  };
}
