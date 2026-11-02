/* Marcel journey timeline: the line fills as the visitor scrolls, the milestone crossing the reading line
   lights up (earlier ones stay marked as passed), and cards glide in the first time they come into view. */
if (!customElements.get('mt-timeline')) {
  customElements.define(
    'mt-timeline',
    class MtTimeline extends HTMLElement {
      connectedCallback() {
        this.items = Array.from(this.querySelectorAll('.mt-tl-item'));
        this.spine = this.querySelector('.mt-tl-spine');
        if (!this.items.length) return;
        this.queue = this.queue.bind(this);

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduced && 'IntersectionObserver' in window) {
          // Milestones already on screen show at once; the rest arrive as they scroll in.
          const fold = window.innerHeight * 0.9;
          this.items.forEach((item) => item.getBoundingClientRect().top < fold && item.classList.add('is-in'));
          this.classList.add('is-ready');
          this.observer = new IntersectionObserver(
            (entries) => entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-in');
              this.observer.unobserve(entry.target);
            }),
            { rootMargin: '0px 0px -12% 0px' }
          );
          this.items.filter((item) => !item.classList.contains('is-in')).forEach((item) => this.observer.observe(item));
        } else {
          this.items.forEach((item) => item.classList.add('is-in'));
        }

        window.addEventListener('scroll', this.queue, { passive: true });
        window.addEventListener('resize', this.queue);
        this.update();
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this.queue);
        window.removeEventListener('resize', this.queue);
        this.observer?.disconnect();
      }

      queue() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      }

      update() {
        const box = this.getBoundingClientRect();
        if (box.bottom < -300 || box.top > window.innerHeight + 300) return;
        const reading = window.innerHeight * 0.55;
        const centres = this.items.map((item) => {
          const n = item.querySelector('.mt-tl-node').getBoundingClientRect();
          return n.top + n.height / 2;
        });
        const first = centres[0];
        const last = centres[centres.length - 1];
        // The line runs from the first node to the last, and fills up to the reading line.
        if (this.spine) {
          this.spine.style.top = `${first - box.top}px`;
          this.spine.style.bottom = 'auto';
          this.spine.style.height = `${Math.max(0, last - first)}px`;
        }
        const progress = Math.min(1, Math.max(0, (reading - first) / Math.max(1, last - first)));
        this.style.setProperty('--tl-progress', progress.toFixed(4));
        let active = -1;
        centres.forEach((y, i) => {
          if (y <= reading) active = i;
        });
        this.items.forEach((item, i) => {
          item.classList.toggle('is-past', i < active);
          item.classList.toggle('is-active', i === active);
        });
      }
    }
  );
}
