(function () {
  'use strict';

  // Consent / AdSense helper
  window.spConsent = window.spConsent || {
    STORAGE_KEY: 'sp-cookie-consent',
    getStoredConsent: function() {
      try {
        var raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    },
    loadAdSense: function() {
      if (window.spAdsLoaded) return;
      window.spAdsLoaded = true;
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9762280383707953';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  };
  (function() {
    var consent = window.spConsent.getStoredConsent();
    if (consent && consent.ad_storage === 'granted') {
      window.spConsent.loadAdSense();
    }
  })();

  // Mobile menu
  (function () {
    const toggle = document.getElementById('mobile-menu-toggle');
    const panel = document.getElementById('mobile-nav');
    if (!toggle || !panel) return;

    const focusables = () =>
      Array.from(
        panel.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled') && !el.hasAttribute('hidden'));

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open
        ? (toggle.dataset.closeLabel || 'Close navigation menu')
        : (toggle.dataset.openLabel || 'Open navigation menu'));
      if (open) {
        panel.classList.remove('hidden');
        const first = focusables()[0];
        if (first) first.focus();
      } else {
        panel.classList.add('hidden');
        toggle.focus();
      }
    }

    toggle.addEventListener('click', () => {
      setOpen(panel.classList.contains('hidden'));
    });

    panel.addEventListener('keydown', (e) => {
      const focusable = focusables();
      if (e.key === 'Tab' && focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    });

    document.addEventListener('click', (e) => {
      if (
        !panel.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        setOpen(false);
      }
    });

    if (window.matchMedia) {
      const mql = window.matchMedia('(min-width: 768px)');
      mql.addEventListener('change', (e) => {
        if (e.matches) setOpen(false);
      });
    }
  })();

  // TOC
  (function () {
    const prose = document.querySelector('.prose');
    const tocList = document.getElementById('toc-list');
    const tocNav = document.getElementById('toc-nav');
    if (!prose || !tocList || !tocNav) return;

    const headings = Array.from(prose.querySelectorAll('h2[id]'));
    if (headings.length < 2) return;

    const ul = document.createElement('ul');
    ul.className = 'space-y-0.5';

    headings.forEach(function (h) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.className = 'block py-1 text-sm text-slate-600 hover:text-brand-600 transition-colors';
      a.textContent = h.textContent;
      li.appendChild(a);
      ul.appendChild(li);
    });

    tocList.appendChild(ul);
    tocNav.style.display = '';
  })();

  // FAQ accordion
  (function () {
    const prose = document.querySelector('.prose');
    if (!prose) return;

    const headings = Array.from(prose.querySelectorAll('h2'));
    const faqH2 = headings.find((h) => /frequently asked questions|preguntas frecuentes/i.test(h.textContent || ''));
    if (!faqH2) return;

    const items = [];
    let el = faqH2.nextElementSibling;
    while (el && el.tagName !== 'H2') {
      const strong = el.querySelector('strong');
      const text = (el.textContent || '').trim();
      if (strong && /^Q:/i.test(strong.textContent || '')) {
        const qText = (strong.textContent || '').replace(/^Q:\s*/i, '').trim();
        let aHtml = el.innerHTML;
        const strongEnd = aHtml.indexOf('</strong>');
        if (strongEnd !== -1) {
          aHtml = aHtml.slice(strongEnd + 9);
          aHtml = aHtml.replace(/^[:\s]*/, '').replace(/<br\s*\/?>/gi, ' ').trim();
        } else {
          aHtml = text.replace(/^.+?\?\s*/i, '').trim();
        }
        items.push({ question: qText, answerHtml: aHtml, element: el });
      }
      el = el.nextElementSibling;
    }
    if (items.length === 0) return;

    const container = document.createElement('div');
    container.className = 'mt-4 space-y-3';

    items.forEach((item) => {
      const details = document.createElement('details');
      details.className = 'group rounded-xl border border-slate-200 bg-white open:border-brand-300 open:shadow-sm';

      const summary = document.createElement('summary');
      summary.className = 'flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 select-none';
      summary.innerHTML = '<span>' + item.question + '</span>' +
        '<svg class="h-4 w-4 shrink-0 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
      details.appendChild(summary);

      const content = document.createElement('div');
      content.className = 'px-5 pb-4 text-sm text-slate-600';

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = item.answerHtml;
      const answerText = tempDiv.textContent || '';
      const hasBullets = /^\s*-\s/m.test(answerText);

      if (hasBullets) {
        const ul = document.createElement('ul');
        ul.className = 'space-y-1.5';
        const lines = answerText.split('\n').filter((l) => l.trim());
        lines.forEach((line) => {
          const trimmed = line.trim().replace(/^[-*]\s*/, '');
          if (!trimmed) return;
          const li = document.createElement('li');
          li.className = 'flex items-start gap-2';
          li.innerHTML = '<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"></span><span>' + trimmed + '</span>';
          ul.appendChild(li);
        });
        content.appendChild(ul);
      } else {
        const p = document.createElement('p');
        p.innerHTML = item.answerHtml;
        content.appendChild(p);
      }

      details.appendChild(content);
      details.appendChild(document.createTextNode('\n'));
      container.appendChild(details);
      item.element.remove();
    });

    faqH2.after(container);
  })();

  // Copy button for code blocks
  (function () {
    function init() {
      document.querySelectorAll('pre.astro-code').forEach(function (pre) {
        if (pre.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Copy code');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copy</span>';

        btn.addEventListener('click', function () {
          const code = pre.querySelector('code');
          if (!code) return;
          navigator.clipboard.writeText(code.textContent || '').then(function () {
            btn.classList.add('copied');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>';
            setTimeout(function () {
              btn.classList.remove('copied');
              btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copy</span>';
            }, 2000);
          });
        });

        pre.appendChild(btn);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
    } else {
      setTimeout(init, 0);
    }
  })();

  // Language code tabs
  (function () {
    const LANGS = new Set([
      'python', 'javascript', 'typescript', 'java', 'sql', 'bash', 'shell',
      'docker', 'dockerfile', 'git', 'go', 'golang', 'rust', 'c#', 'csharp',
      'php', 'ruby', 'kotlin', 'c++', 'c', 'json', 'yaml', 'html', 'css',
    ]);

    function initGroups(root) {
      const headings = Array.from(root.querySelectorAll('h3'));
      const items = [];
      for (const h of headings) {
        const label = (h.textContent || '').trim();
        if (!LANGS.has(label.toLowerCase())) continue;
        const pre = h.nextElementSibling;
        if (!pre || pre.tagName !== 'PRE') continue;
        items.push({ heading: h, pre, label });
      }
      if (items.length === 0) return;

      const groups = [];
      let current = [items[0]];
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        if (prev.pre.nextElementSibling === items[i].heading) {
          current.push(items[i]);
        } else {
          groups.push(current);
          current = [items[i]];
        }
      }
      groups.push(current);

      let uid = 0;
      for (const group of groups) {
        if (group.length < 2) continue;
        buildTabs(group, uid++);
      }
    }

    function buildTabs(group, uid) {
      const first = group[0];
      const anchor = document.createComment('code-tabs');
      first.heading.before(anchor);

      const wrapper = document.createElement('div');
      wrapper.className = 'code-tabs';

      const tablist = document.createElement('div');
      tablist.className = 'code-tabs__list';
      tablist.setAttribute('role', 'tablist');
      tablist.setAttribute('aria-label', 'Language variants');

      const panels = [];

      group.forEach((item, i) => {
        const tabId = 'ct-' + uid + '-tab-' + i;
        const panelId = 'ct-' + uid + '-panel-' + i;

        const tab = document.createElement('button');
        tab.className = 'code-tabs__tab';
        tab.id = tabId;
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panelId);
        tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        tab.tabIndex = i === 0 ? 0 : -1;
        tab.textContent = item.label;
        tablist.appendChild(tab);

        const panel = document.createElement('div');
        panel.className = 'code-tabs__panel';
        panel.id = panelId;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabId);
        if (i !== 0) panel.hidden = true;
        panel.appendChild(item.pre);
        panels.push(panel);

        item.heading.remove();
      });

      wrapper.appendChild(tablist);
      panels.forEach((p) => wrapper.appendChild(p));
      anchor.replaceWith(wrapper);

      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      function select(idx) {
        tabs.forEach((t, j) => {
          const selected = j === idx;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.tabIndex = selected ? 0 : -1;
          panels[j].hidden = !selected;
        });
      }
      tablist.addEventListener('click', (e) => {
        const t = e.target.closest('[role="tab"]');
        if (!t) return;
        select(tabs.indexOf(t));
      });
      tablist.addEventListener('keydown', (e) => {
        const idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        let next = -1;
        if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== -1) {
          e.preventDefault();
          tabs[next].focus();
          select(next);
        }
      });
    }

    const root = document.querySelector('.prose');
    if (root) initGroups(root);
  })();

  // Cookie banner
  (function () {
    const STORAGE_KEY = 'sp-cookie-consent';
    const banner = document.getElementById('cookie-banner');
    const modal = document.getElementById('cookie-modal');
    const acceptBtn = document.getElementById('cookie-accept');
    const rejectBtn = document.getElementById('cookie-reject');
    const manageBtn = document.getElementById('cookie-manage');
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');
    const toggleAnalytics = document.getElementById('toggle-analytics');
    const toggleAdvertising = document.getElementById('toggle-advertising');

    if (!banner) return;

    function getConsent() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    }

    function setConsent(consent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      updateGtagConsent(consent);
      if (consent.ad_storage === 'granted' && window.spConsent) {
        window.spConsent.loadAdSense();
      }
    }

    function updateGtagConsent(consent) {
      if (typeof gtag !== 'function') return;
      gtag('consent', 'update', {
        'analytics_storage': consent.analytics_storage || 'denied',
        'ad_storage': consent.ad_storage || 'denied',
        'ad_user_data': consent.ad_user_data || 'denied',
        'ad_personalization': consent.ad_personalization || 'denied'
      });
    }

    var stored = getConsent();

    if (stored) {
      updateGtagConsent(stored);
      if (stored.ad_storage === 'granted' && window.spConsent) {
        window.spConsent.loadAdSense();
      }
    } else {
      banner.classList.remove('hidden');
    }

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        var consent = {
          analytics_storage: 'granted',
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        };
        setConsent(consent);
        banner.classList.add('hidden');
        if (modal) modal.classList.add('hidden');
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        var consent = {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        };
        setConsent(consent);
        banner.classList.add('hidden');
        if (modal) modal.classList.add('hidden');
      });
    }

    if (manageBtn && modal) {
      manageBtn.addEventListener('click', function () {
        var storedConsent = getConsent();
        if (toggleAnalytics) {
          toggleAnalytics.checked = storedConsent ? storedConsent.analytics_storage === 'granted' : false;
        }
        if (toggleAdvertising) {
          toggleAdvertising.checked = storedConsent ? storedConsent.ad_storage === 'granted' : false;
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }

    if (saveBtn && modal) {
      saveBtn.addEventListener('click', function () {
        var consent = {
          analytics_storage: (toggleAnalytics && toggleAnalytics.checked) ? 'granted' : 'denied',
          ad_storage: (toggleAdvertising && toggleAdvertising.checked) ? 'granted' : 'denied',
          ad_user_data: (toggleAdvertising && toggleAdvertising.checked) ? 'granted' : 'denied',
          ad_personalization: (toggleAdvertising && toggleAdvertising.checked) ? 'granted' : 'denied'
        };
        setConsent(consent);
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }
  })();
})();
