/* Lightbox — click-to-zoom for images and Mermaid SVGs.
   Adds click handlers to all <img> inside <main> on page load.
   Matches the qa-practices-web lightbox pattern. */
(function () {
  'use strict';

  function addImageClickHandlers() {
    var main = document.getElementById('main');
    if (!main) return;

    var images = main.querySelectorAll('img');
    images.forEach(function (img) {
      if (img.classList.contains('lightbox-enabled')) return;

      img.classList.add('lightbox-enabled');
      img.style.cursor = 'zoom-in';

      img.addEventListener('click', function () {
        openLightbox(img.src, img.alt);
      });

      img.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(img.src, img.alt);
        }
      });

      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge image: ' + (img.alt || ''));
    });
  }

  function openLightbox(src, alt) {
    // Create overlay if it doesn't exist
    var overlay = document.querySelector('.lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Image lightbox');
      overlay.setAttribute('tabindex', '-1');

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lightbox-close';
      closeBtn.setAttribute('aria-label', 'Close image');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', closeLightbox);

      var img = document.createElement('img');
      img.className = 'lightbox-img';
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.setAttribute('aria-label', 'Enlarged image, click or press Escape to close');
      img.addEventListener('click', function (e) { e.stopPropagation(); });

      overlay.appendChild(closeBtn);
      overlay.appendChild(img);
      overlay.addEventListener('click', closeLightbox);
      overlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
      });

      document.body.appendChild(overlay);
    }

    var img = overlay.querySelector('.lightbox-img');
    img.src = src;
    img.alt = alt || 'Enlarged image';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(function () { overlay.focus(); }, 0);
  }

  function closeLightbox() {
    var overlay = document.querySelector('.lightbox-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addImageClickHandlers);
  } else {
    addImageClickHandlers();
  }

  // Re-init on Astro page transitions
  document.addEventListener('astro:page-load', addImageClickHandlers);
})();
