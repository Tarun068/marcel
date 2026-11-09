/* Marcel carousel: a snap-scrolling row of cards with previous/next arrows and dots.
   Markup: <mt-carousel> holding .mt-car-track (the row), .mt-car-arrow buttons with data-dir="-1|1" and .mt-car-dots.
   Cards in view come from the CSS custom property --per on the element. */
if (!customElements.get('mt-carousel')) {
  customElements.define(
    'mt-carousel',
    class MtCarousel extends HTMLElement {
      connectedCallback() {
        this.track = this.querySelector('.mt-car-track');
        if (!this.track) return;
        this.items = Array.from(this.track.children);
        this.nav = this.querySelector('.mt-car-nav');
        this.arrows = Array.from(this.querySelectorAll('.mt-car-arrow'));
        this.dotsBox = this.querySelector('.mt-car-dots');
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

        this.arrows.forEach((btn) => btn.addEventListener('click', () => this.go(this.position() + Number(btn.dataset.dir))));
        this.track.addEventListener('scroll', () => this.queueUpdate(), { passive: true });
        this.track.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          if (e.target.closest('input, select, textarea')) return;
          e.preventDefault();
          this.go(this.position() + (e.key === 'ArrowRight' ? 1 : -1));
        });
        this.resizeObserver = new ResizeObserver(() => this.layout());
        this.resizeObserver.observe(this.track);
        this.layout();
      }

      disconnectedCallback() {
        this.resizeObserver?.disconnect();
      }

      perView() {
        return Math.max(1, Math.round(parseFloat(getComputedStyle(this).getPropertyValue('--per')) || 1));
      }

      step() {
        const second = this.items[1];
        return second ? second.offsetLeft - this.items[0].offsetLeft : this.track.clientWidth;
      }

      position() {
        return Math.round(this.track.scrollLeft / this.step());
      }

      positions() {
        if (this.track.scrollWidth <= this.track.clientWidth + 4) return 1;
        return Math.max(1, this.items.length - this.perView() + 1);
      }

      go(i) {
        const max = this.positions() - 1;
        const to = Math.min(Math.max(i, 0), max);
        this.track.scrollTo({ left: to * this.step(), behavior: this.reduce.matches ? 'auto' : 'smooth' });
      }

      layout() {
        const count = this.positions();
        if (this.dotsBox && this.dotsBox.childElementCount !== count) {
          this.dotsBox.replaceChildren(
            ...Array.from({ length: count }, (_, i) => {
              const dot = document.createElement('button');
              dot.type = 'button';
              dot.className = 'mt-car-dot';
              dot.setAttribute('aria-label', `${i + 1} / ${count}`);
              dot.addEventListener('click', () => this.go(i));
              return dot;
            })
          );
        }
        if (this.dotsBox) this.dotsBox.hidden = count < 2;
        if (this.nav) this.nav.hidden = count < 2;
        this.update();
      }

      queueUpdate() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      }

      update() {
        const max = this.positions() - 1;
        const pos = Math.min(this.position(), max);
        this.dotsBox?.querySelectorAll('.mt-car-dot').forEach((d, i) => d.toggleAttribute('aria-current', i === pos));
        if (this.arrows.length === 2) {
          this.arrows[0].disabled = this.track.scrollLeft < 4;
          this.arrows[1].disabled = this.track.scrollLeft > this.track.scrollWidth - this.track.clientWidth - 4;
        }
      }
    }
  );
}
