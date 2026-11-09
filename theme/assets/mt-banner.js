/* Marcel banner slider: crossfading banners with autoplay, arrows, dots, swipe and arrow keys.
   Autoplay is driven by the active dot's CSS fill animation: when it ends, the next banner shows.
   Anything that should stop the clock (pointer over, focus inside, off screen, tab hidden, the theme
   editor) is a "hold"; the clock runs only while there are none. */
if (!customElements.get('mt-banner-slider')) {
  customElements.define(
    'mt-banner-slider',
    class MtBannerSlider extends HTMLElement {
      connectedCallback() {
        this.slides = Array.from(this.querySelectorAll('.mt-bs-slide'));
        this.dots = Array.from(this.querySelectorAll('.mt-bs-dot'));
        this.index = Math.max(0, this.slides.findIndex((s) => s.classList.contains('is-active')));
        this.dataset.tone = this.slides[this.index]?.dataset.tone || 'dark';
        if (this.slides.length < 2) return;

        this.holds = new Set();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (this.dataset.autoplay !== 'true' || reduced) {
          this.dataset.autoplay = 'false';
          this.classList.add('is-static');
        }

        this.querySelectorAll('.mt-bs-arrow').forEach((btn) =>
          btn.addEventListener('click', () => this.go(this.index + Number(btn.dataset.dir)))
        );
        this.dots.forEach((dot, i) => dot.addEventListener('click', () => this.go(i)));

        this.addEventListener('animationend', (e) => {
          if (e.animationName === 'mt-bs-progress' && this.dots[this.index]?.contains(e.target)) this.go(this.index + 1);
        });

        this.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.hold('hover', true));
        this.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.hold('hover', false));
        this.addEventListener('focusin', () => this.hold('focus', true));
        this.addEventListener('focusout', (e) => {
          if (!this.contains(e.relatedTarget)) this.hold('focus', false);
        });
        this.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.go(this.index + (e.key === 'ArrowRight' ? 1 : -1));
          }
        });

        // Horizontal swipe on touch screens (vertical moves still scroll the page: touch-action: pan-y).
        let start = null;
        this.addEventListener('pointerdown', (e) => {
          if (e.pointerType !== 'mouse') start = { x: e.clientX, y: e.clientY };
        });
        this.addEventListener('pointerup', (e) => {
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          start = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) this.go(this.index + (dx < 0 ? 1 : -1));
        });
        this.addEventListener('pointercancel', () => (start = null));

        this.observer = new IntersectionObserver(([entry]) => this.hold('offscreen', !entry.isIntersecting), { threshold: 0.25 });
        this.observer.observe(this);
        this.onVisibility = () => this.hold('hidden', document.hidden);
        document.addEventListener('visibilitychange', this.onVisibility);

        // Theme editor: show the banner being edited and keep it still.
        this.onBlockSelect = (e) => {
          const i = this.slides.findIndex((s) => s === e.target || s.contains(e.target));
          if (i < 0) return;
          this.go(i);
          this.hold('editor', true);
        };
        this.onBlockDeselect = () => this.hold('editor', false);
        document.addEventListener('shopify:block:select', this.onBlockSelect);
        document.addEventListener('shopify:block:deselect', this.onBlockDeselect);
      }

      disconnectedCallback() {
        this.observer?.disconnect();
        document.removeEventListener('visibilitychange', this.onVisibility);
        document.removeEventListener('shopify:block:select', this.onBlockSelect);
        document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
      }

      go(to) {
        const count = this.slides.length;
        const next = ((to % count) + count) % count;
        if (next === this.index) return;
        const prev = this.slides[this.index];
        const slide = this.slides[next];
        prev.classList.remove('is-active');
        prev.setAttribute('aria-hidden', 'true');
        prev.inert = true;
        slide.classList.add('is-active');
        slide.removeAttribute('aria-hidden');
        slide.inert = false;
        this.dots[this.index]?.removeAttribute('aria-current');
        this.dots[next]?.setAttribute('aria-current', 'true');
        this.dataset.tone = slide.dataset.tone || 'dark';
        this.classList.add('is-moved');
        // Keep focus inside the slider when it was on a link of the banner that just left.
        if (prev.contains(document.activeElement)) this.dots[next]?.focus({ preventScroll: true });
        this.index = next;
      }

      hold(reason, on) {
        if (on) this.holds.add(reason);
        else this.holds.delete(reason);
        this.classList.toggle('is-paused', this.holds.size > 0);
      }
    }
  );
}
