/* Marcel video reels: snap-scrolling row with arrows and dots, silent previews for videos uploaded to
   Shopify, and a full-screen player (Shopify video, YouTube or Vimeo) with previous/next. */
if (!customElements.get('mt-reels')) {
  customElements.define(
    'mt-reels',
    class MtReels extends HTMLElement {
      connectedCallback() {
        this.track = this.querySelector('.mt-reels-track');
        if (!this.track) return;
        this.items = Array.from(this.track.children);
        this.cards = this.items.map((li) => li.querySelector('.mt-reel-card'));
        this.nav = this.querySelector('.mt-reels-nav');
        this.arrows = Array.from(this.querySelectorAll('.mt-reels-arrow'));
        this.dotsBox = this.querySelector('.mt-reels-dots');
        this.modal = this.querySelector('.mt-reel-modal');
        this.stage = this.querySelector('.mt-reel-stage');
        this.current = 0;

        this.arrows.forEach((btn) => btn.addEventListener('click', () => this.scrollToIndex(this.position() + Number(btn.dataset.dir))));
        this.track.addEventListener('scroll', () => this.queueUpdate(), { passive: true });
        this.resizeObserver = new ResizeObserver(() => this.layout());
        this.resizeObserver.observe(this.track);

        this.cards.forEach((card, i) => {
          card.addEventListener('click', () => this.open(i));
          if (!card.querySelector('.mt-reel-preview')) return;
          if (this.dataset.preview === 'hover') {
            card.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.preview(card, true));
            card.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.preview(card, false));
          }
        });
        if (this.dataset.preview === 'view') {
          this.viewObserver = new IntersectionObserver(
            (entries) => entries.forEach((en) => this.preview(en.target, en.isIntersecting && !this.modal.open)),
            { threshold: 0.6 }
          );
          this.cards.filter((c) => c.querySelector('.mt-reel-preview')).forEach((c) => this.viewObserver.observe(c));
        }

        if (this.modal) {
          this.modal.querySelector('.mt-reel-close').addEventListener('click', () => this.modal.close());
          this.modal.querySelectorAll('.mt-reel-step').forEach((btn) => btn.addEventListener('click', () => this.show(this.current + Number(btn.dataset.dir))));
          // A click on the dimmed area around the player closes it.
          this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.modal.close();
          });
          this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.show(this.current + (e.key === 'ArrowRight' ? 1 : -1));
          });
          this.modal.addEventListener('close', () => {
            this.stage.replaceChildren();
            this.cards[this.current]?.focus({ preventScroll: true });
          });
        }
      }

      disconnectedCallback() {
        this.resizeObserver?.disconnect();
        this.viewObserver?.disconnect();
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
        return Math.max(1, this.items.length - this.perView() + 1);
      }

      scrollToIndex(i) {
        const max = this.positions() - 1;
        this.track.scrollTo({ left: Math.min(Math.max(i, 0), max) * this.step(), behavior: 'smooth' });
      }

      layout() {
        const count = this.positions();
        if (this.dotsBox && this.dotsBox.childElementCount !== count) {
          this.dotsBox.replaceChildren(
            ...Array.from({ length: count }, (_, i) => {
              const dot = document.createElement('button');
              dot.type = 'button';
              dot.className = 'mt-reels-dot';
              dot.setAttribute('aria-label', `${i + 1} / ${count}`);
              dot.addEventListener('click', () => this.scrollToIndex(i));
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
        const pos = this.position();
        const max = this.positions() - 1;
        this.dotsBox?.querySelectorAll('.mt-reels-dot').forEach((d, i) => d.toggleAttribute('aria-current', i === Math.min(pos, max)));
        if (this.arrows.length === 2) {
          this.arrows[0].disabled = this.track.scrollLeft < 4;
          this.arrows[1].disabled = this.track.scrollLeft > this.track.scrollWidth - this.track.clientWidth - 4;
        }
      }

      preview(card, on) {
        const video = card.querySelector('.mt-reel-preview');
        if (!video) return;
        if (on) {
          if (!video.src) video.src = video.dataset.src;
          video.play().then(() => card.classList.add('is-previewing')).catch(() => {});
        } else {
          card.classList.remove('is-previewing');
          video.pause();
        }
      }

      open(i) {
        if (!this.modal) return;
        this.cards.forEach((c) => this.preview(c, false));
        if (!this.modal.open) this.modal.showModal();
        this.show(i);
      }

      show(to) {
        const count = this.items.length;
        this.current = ((to % count) + count) % count;
        const src = this.items[this.current].querySelector('.mt-reel-src');
        const { kind, id, title, sub } = src.dataset;
        let player;
        if (kind === 'hosted') {
          player = src.content.querySelector('video')?.cloneNode(true);
          if (player) player.autoplay = true;
        } else if (kind === 'youtube' || kind === 'vimeo') {
          player = document.createElement('iframe');
          player.src =
            kind === 'vimeo'
              ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&playsinline=1`
              : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0`;
          player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          player.allowFullscreen = true;
          player.title = title || '';
        } else {
          // No video yet: show the cover with the coming-soon note.
          const cover = this.items[this.current].querySelector('.mt-reel-media img');
          player = cover ? cover.cloneNode(true) : null;
          if (player) {
            player.loading = 'eager';
            player.sizes = '(min-width: 750px) 480px, 100vw';
          }
        }
        this.stage.replaceChildren(...(player ? [player] : []));
        this.modal.querySelector('.mt-reel-soon').hidden = kind !== 'none';
        this.modal.querySelector('.mt-reel-mcap b').textContent = title || '';
        this.modal.querySelector('.mt-reel-mcap small').textContent = sub || '';
        this.modal.querySelectorAll('.mt-reel-step').forEach((b) => (b.hidden = count < 2));
        if (player && player.tagName === 'VIDEO') player.play().catch(() => {});
      }
    }
  );
}
