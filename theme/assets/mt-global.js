/* Marcel OMR Therapy — helpers shared by Marcel sections. */
(() => {
  // Approximate mouth opening in millimetres for each finger count (3 fingers ≈ 45 mm).
  const MM = { 3: 45, 2: 30, 1: 20, 0: 11 };

  function setGauge(el, fingers, caption) {
    if (!el) return;
    const f = MM[fingers] === undefined ? 3 : Number(fingers);
    el.dataset.f = f;
    el.style.setProperty('--mm', MM[f]);
    el.setAttribute('aria-label', `Mouth opening about ${MM[f]} millimetres`);
    const mm = el.querySelector('[data-mt-mm]');
    if (mm) mm.textContent = `≈ ${MM[f]} mm`;
    if (caption) {
      const c = el.querySelector('[data-mt-caption]');
      if (c) c.textContent = caption;
    }
  }

  function storage(key, value) {
    try {
      if (value === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  /* Sends a Shopify contact form as a normal form post.
     Shopify's spam check (hCaptcha) only accepts contact forms that carry its token, and it adds the token only
     to a real form post, so these forms can't be sent with fetch. When the spam check is on, the form goes
     through it; otherwise the browser sends it straight away. Shopify then opens the form's return_to page,
     or the same page with ?contact_posted=true.
     The spam check also adds its own submit handler once the visitor types in a form, and that handler sends
     the form at once. Components therefore stop their submit event (preventDefault + stopImmediatePropagation)
     and call this after their own checks pass.
     onStuck runs if the page is still here after 15 seconds and no spam-check puzzle is open, for example when
     an ad blocker stops the spam check. By default the form is then posted without the token, and Shopify
     shows its own challenge page if it needs one. */
  function postForm(form, onStuck) {
    if (!form) return;
    let leaving = false;
    window.addEventListener('beforeunload', () => (leaving = true), { once: true });
    const send = () => form.submit();
    const captcha = window.Shopify && window.Shopify.captcha;
    if (!form.hasAttribute('data-hcaptcha-bound') && captcha && typeof captcha.protect === 'function') captcha.protect(form, send);
    else send();
    const puzzleOpen = () =>
      Array.from(document.querySelectorAll('iframe[src*="hcaptcha"]')).some(
        (f) => /frame=challenge/.test(f.src) && f.offsetHeight > 0 && getComputedStyle(f).visibility !== 'hidden'
      );
    const check = () => {
      if (leaving) return;
      if (puzzleOpen()) {
        setTimeout(check, 5000);
        return;
      }
      if (onStuck) onStuck();
      else HTMLFormElement.prototype.submit.call(form);
    };
    setTimeout(check, 15000);
  }

  window.MarcelTheme = { MM, setGauge, storage, postForm };
})();

/* Scroll reveal for Marcel sections: blocks below the fold ease up as they come into view, and the items of a
   card row or list follow one another. Blocks already on screen when the page loads are left alone, so
   nothing that has painted ever blinks out. */
(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Rows whose items reveal one by one.
  const GROUPS = [
    '.mt-cards', '.mt-steps', '.mt-paths', '.mt-sym-grid', '.mt-prog', '.mt-pgrid', '.mt-phases', '.mt-routes',
    '.mt-reviews-row', '.mt-ev-stats', '.mt-ev-groups', '.mt-support-grid', '.mt-acc', '.mt-reels-track', '.mt-stats',
    '.mt-videos-row', '.mt-stabs', '.mt-invite-opts', '.mt-car-track',
  ].join(',');
  // Two-column layouts whose columns reveal one after the other.
  const SPLITS = ['.mt-sym-layout', '.mt-faq-layout', '.mt-consult', '.mt-invite', '.mt-clinic-band', '.mt-sec-head-row', '.mt-mtext-grid'].join(',');
  const SKIP = '.mt-bs, .mt-reel-modal, mt-timeline';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add('is-in');
        const done = () => {
          el.classList.remove('mt-rv', 'mt-rv--item', 'is-in');
          el.style.removeProperty('--rv-i');
        };
        // Hand transitions back to the component once the reveal has finished.
        setTimeout(done, 1300 + (Number(el.style.getPropertyValue('--rv-i')) || 0) * 90);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );

  function mark(el, index, isItem) {
    if (el.closest(SKIP) || el.classList.contains('mt-rv') || el.hidden) return;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;
    // Already on screen, or off to the side in a scrolling row (reels): leave it visible.
    if (rect.top < window.innerHeight * 0.92 || rect.left >= window.innerWidth || rect.right <= 0) return;
    const row = el.parentElement;
    if (row && row.scrollWidth > row.clientWidth + 1) {
      const box = row.getBoundingClientRect();
      if (rect.right > box.right + 2 || rect.left < box.left - 2) return;
    }
    el.classList.add('mt-rv');
    if (isItem) el.classList.add('mt-rv--item');
    el.style.setProperty('--rv-i', Math.min(index, 8));
    observer.observe(el);
  }

  function scan(root) {
    root.querySelectorAll('.mt.mt-section .mt-wrap, .mt.mt-section .mt-wrap-narrow').forEach((wrap) => {
      Array.from(wrap.children).forEach((child, i) => {
        if (child.matches(GROUPS)) {
          Array.from(child.children).forEach((item, k) => mark(item, k, true));
        } else if (child.matches(SPLITS)) {
          Array.from(child.children).forEach((part, k) => {
            const group = part.matches(GROUPS) ? part : null;
            if (group) Array.from(group.children).forEach((item, n) => mark(item, n + k, true));
            else mark(part, k, false);
          });
        } else if (child.querySelector(GROUPS)) {
          child.querySelectorAll(GROUPS).forEach((group) => {
            if (group.parentElement.closest(GROUPS)) return;
            Array.from(group.children).forEach((item, k) => mark(item, k, true));
          });
        } else {
          mark(child, i ? 1 : 0, false);
        }
      });
    });
  }

  // Section headings: the marker under their key words draws in once the heading is in view.
  const seen = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('mt-seen');
      seen.unobserve(en.target);
    }),
    { threshold: 0.6 }
  );
  function watchHeadings(root) {
    root.querySelectorAll('.mt .mt-sec-head:not(.mt-seen)').forEach((head) => {
      if (head.getBoundingClientRect().top < window.innerHeight * 0.92) head.classList.add('mt-seen');
      else seen.observe(head);
    });
  }

  const start = () => {
    watchHeadings(document);
    document.documentElement.classList.add('mt-motion');
    scan(document);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  document.addEventListener('shopify:section:load', (e) => {
    watchHeadings(e.target);
    scan(e.target);
  });
})();
