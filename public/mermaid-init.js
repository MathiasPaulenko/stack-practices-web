/* Mermaid initializer — only runs if the page has <div class="mermaid"> blocks.
   Self-hosted at /mermaid.min.js (CSP compliant).
   The rehype-mermaid-blocks plugin converts fenced ```mermaid blocks
   into <div class="mermaid"> elements before Shiki processes them.
   Loaded deferred from BaseLayout.astro. */
(function () {
  'use strict';

  var mermaidDivs = document.querySelectorAll('div.mermaid');
  if (mermaidDivs.length === 0) return;

  /* Load mermaid.min.js dynamically */
  var script = document.createElement('script');
  script.src = '/mermaid.min.js';
  script.onload = function () {
    if (typeof mermaid === 'undefined') return;

    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      suppressErrorRendering: false
    });
  };
  document.head.appendChild(script);
})();
