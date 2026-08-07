import { visit } from 'unist-util-visit';

const DEFAULT_MAX_FAQS = 5;

function isFaqHeading(node) {
  return (
    node.type === 'heading' &&
    node.depth === 2 &&
    node.children &&
    node.children.length > 0 &&
    node.children[0].type === 'text' &&
    /^(FAQ|Frequently Asked Questions|Preguntas Frecuentes)$/i.test(node.children[0].value.trim())
  );
}

function isQuestionParagraph(node) {
  if (node.type !== 'paragraph' || !node.children) return false;
  const first = node.children[0];
  return (
    first &&
    first.type === 'strong' &&
    first.children &&
    first.children[0] &&
    first.children[0].type === 'text' &&
    /^Q:\s*/i.test(first.children[0].value)
  );
}

export default function remarkTruncateFaq({ maxFaqs = DEFAULT_MAX_FAQS } = {}) {
  return function transformer(tree) {
    if (!tree.children) return;

    let faqStartIndex = -1;
    for (let i = 0; i < tree.children.length; i++) {
      if (isFaqHeading(tree.children[i])) {
        faqStartIndex = i;
        break;
      }
    }

    if (faqStartIndex === -1) return;

    let faqCount = 0;
    let cutIndex = -1;

    for (let i = faqStartIndex + 1; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'heading' && node.depth <= 2) break;

      if (isQuestionParagraph(node)) {
        faqCount++;
        if (faqCount > maxFaqs) {
          cutIndex = i;
          break;
        }
      }
    }

    if (cutIndex !== -1) {
      // Remove all nodes from cutIndex up to the next heading or end.
      let endIndex = tree.children.length;
      for (let i = cutIndex; i < tree.children.length; i++) {
        const node = tree.children[i];
        if (node.type === 'heading' && node.depth <= 2) {
          endIndex = i;
          break;
        }
      }
      tree.children.splice(cutIndex, endIndex - cutIndex);
    }
  };
}
