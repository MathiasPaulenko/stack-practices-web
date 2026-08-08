const DEFAULT_MAX_FAQS = 0;

const FAQ_HEADING_RE = /^(FAQ|Frequently Asked Questions|Additional FAQ|Additional Frequently Asked Questions|Preguntas Frecuentes|Preguntas más frecuentes|Preguntas frecuentes adicionales|FAQ adicional|FAQ adicionales)$/i;
const Q_PREFIX_RE = /^[QP]:\s*/i;
const QUESTION_PHRASE_RE = /^(how (do|can|should)|what (is|are|does)|when (should|do)|why (does|is|should)|can i|should i|is it|is this|are there|are these|does .+ (work|support)|will it|would it|could i|do i need|¿?cómo|¿?cuándo|¿?por qu[eé]|¿?qu[eé]|¿?debo|¿?debería|¿?puedo|¿?es|¿?hay|¿?tiene|¿?soporta)/i;
const NON_QUESTION_RE = /^(scenario|escenario|example|ejemplo|case|caso|step|paso|phase|fase|\d+\.|.*\b(summary|resumen|conclusion|conclusión))\b/i;
const SENTENCE_END_RE = /[.!?]\s+/g;

function isFaqHeading(node) {
  return (
    node.type === 'heading' &&
    node.depth === 2 &&
    node.children &&
    node.children.length > 0 &&
    node.children[0].type === 'text' &&
    FAQ_HEADING_RE.test(node.children[0].value.trim())
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
    Q_PREFIX_RE.test(first.children[0].value)
  );
}

function isQuestionHeading(node) {
  if (node.type !== 'heading' || node.depth !== 3 || !node.children) return false;
  const text = node.children
    .filter((c) => c.type === 'text' || c.type === 'inlineCode')
    .map((c) => c.value)
    .join('')
    .trim();
  if (NON_QUESTION_RE.test(text)) return false;
  // Most FAQ questions end with a question mark; also accept explicit question phrases.
  return /\?$/.test(text) || QUESTION_PHRASE_RE.test(text);
}

function truncateAnswerText(text, maxSentences) {
  const matches = [...text.matchAll(SENTENCE_END_RE)];
  if (matches.length <= maxSentences - 1) return text;
  const cutAt = matches[maxSentences - 1].index + matches[maxSentences - 1][0].length - 1;
  return text.slice(0, cutAt).trim() + ' …';
}

function truncateParagraphAnswer(node, maxSentences) {
  if (!node.children) return;
  const first = node.children[0];
  if (!first || first.type !== 'strong' || !first.children) return;
  const rest = node.children.slice(1);
  const text = rest
    .map((c) => (c.type === 'text' ? c.value : c.type === 'inlineCode' ? c.value : ' '))
    .join('')
    .trim();
  if (text.length > 0) {
    const truncated = truncateAnswerText(text, maxSentences);
    node.children = [first, { type: 'text', value: ' ' + truncated }];
  }
}

function truncateFollowingParagraph(node, maxSentences) {
  if (!node.children || node.children.length === 0) return;
  const text = node.children
    .map((c) => (c.type === 'text' ? c.value : c.type === 'inlineCode' ? c.value : ' '))
    .join('')
    .trim();
  if (text.length > 0) {
    const truncated = truncateAnswerText(text, maxSentences);
    node.children = [{ type: 'text', value: truncated }];
  }
}

function processFaqSection(tree, startIndex, maxFaqs, maxSentences) {
  let faqCount = 0;
  let cutIndex = -1;
  let i = startIndex + 1;

  while (i < tree.children.length) {
    const node = tree.children[i];
    if (node.type === 'heading' && node.depth <= 2) break;

    if (isQuestionParagraph(node) || isQuestionHeading(node)) {
      faqCount++;
      if (faqCount <= maxFaqs) {
        if (isQuestionParagraph(node)) {
          truncateParagraphAnswer(node, maxSentences);
        } else {
          // For H3 questions: keep only the first paragraph, truncated to maxSentences,
          // and remove all following nodes until the next question heading or section boundary.
          let firstParagraphIndex = -1;
          let j = i + 1;
          while (j < tree.children.length) {
            const next = tree.children[j];
            if (next.type === 'heading' || isQuestionParagraph(next) || isQuestionHeading(next)) {
              break;
            }
            if (next.type === 'paragraph') {
              firstParagraphIndex = j;
              break;
            }
            j++;
          }

          if (firstParagraphIndex !== -1) {
            truncateFollowingParagraph(tree.children[firstParagraphIndex], maxSentences);
            const removeStart = firstParagraphIndex + 1;
            let removeEnd = tree.children.length;
            for (let k = removeStart; k < tree.children.length; k++) {
              const nextNode = tree.children[k];
              if (nextNode.type === 'heading' && nextNode.depth <= 3) {
                removeEnd = k;
                break;
              }
            }
            tree.children.splice(removeStart, removeEnd - removeStart);
          }
        }
      }
      if (faqCount > maxFaqs) {
        cutIndex = i;
        break;
      }
    }
    i++;
  }

  if (cutIndex !== -1) {
    let endIndex = tree.children.length;
    for (let k = cutIndex; k < tree.children.length; k++) {
      const node = tree.children[k];
      if (node.type === 'heading' && node.depth <= 2) {
        endIndex = k;
        break;
      }
    }
    tree.children.splice(cutIndex, endIndex - cutIndex);
  }
}

export default function remarkTruncateFaq({
  maxFaqs = DEFAULT_MAX_FAQS,
  maxSentences = 3,
  removeSection = true,
} = {}) {
  return function transformer(tree) {
    if (!tree.children) return;

    // Process every FAQ section in the document (main and additional).
    // When removeSection is true, the entire FAQ section (heading + content)
    // is removed from the rendered markdown because the RecipeArticle component
    // renders FAQs with proper semantic <dl> markup and FAQPage JSON-LD.
    let removed = 0;
    for (let i = 0; i < tree.children.length; i++) {
      if (isFaqHeading(tree.children[i])) {
        if (removeSection) {
          // Find the end of this section (next H2 or end of document)
          let endIndex = tree.children.length;
          for (let k = i + 1; k < tree.children.length; k++) {
            if (tree.children[k].type === 'heading' && tree.children[k].depth <= 2) {
              endIndex = k;
              break;
            }
          }
          tree.children.splice(i, endIndex - i);
          removed += endIndex - i;
          i--; // Adjust index after removal
        } else {
          processFaqSection(tree, i, maxFaqs, maxSentences);
        }
      }
    }
  };
}
