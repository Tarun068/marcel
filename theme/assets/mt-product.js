/* Marcel product page: gallery carousel, quantity stepper and variant picker. */

/* Gallery: .mt-gtrack is a row of slides that swipes and snaps. Arrows (data-dir="-1|1"), thumbnails
   (data-mt-slide = a slide's data-slide) and the arrow keys move it; the counter, arrows and thumbnails
   follow the scroll position, and the current thumbnail is scrolled into view inside its own row. */
if (!customElements.get('mt-gallery')) {
  customElements.define(
    'mt-gallery',
    class MtGallery extends HTMLElement {
      connectedCallback() {
        this.track = this.querySelector('.mt-gtrack');
        if (!this.track) return;
        this.slides = Array.from(this.track.querySelectorAll('[data-slide]'));
        this.thumbs = Array.from(this.querySelectorAll('[data-mt-slide]'));
        this.strip = this.querySelector('.mt-gthumbs');
        this.arrows = Array.from(this.querySelectorAll('.mt-garrow'));
        this.counter = this.querySelector('.mt-gcount b');
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.index = -1;

        this.thumbArrows = Array.from(this.querySelectorAll('[data-thumbs-dir]'));

        this.thumbs.forEach((thumb) => thumb.addEventListener('click', () => this.show(thumb.dataset.mtSlide)));
        this.arrows.forEach((btn) => btn.addEventListener('click', () => this.go(this.position() + Number(btn.dataset.dir))));
        this.thumbArrows.forEach((btn) => btn.addEventListener('click', () => this.pageThumbs(Number(btn.dataset.thumbsDir))));
        this.strip?.addEventListener('scroll', () => this.queueThumbs(), { passive: true });
        this.track.addEventListener('scroll', () => this.queueUpdate(), { passive: true });
        this.track.addEventListener('keydown', (event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          this.go(this.position() + (event.key === 'ArrowRight' ? 1 : -1));
        });

        const start = this.slides.findIndex((s) => s.dataset.slide === this.dataset.start);
        if (start > 0) this.go(start, true);

        // Keep the current slide in place when the gallery changes width (rotating a phone, resizing), and
        // show the thumbnail arrows only while the thumbnail row overflows.
        this.width = this.track.clientWidth;
        this.resizeObserver = new ResizeObserver(() => {
          this.updateThumbs();
          if (this.track.clientWidth === this.width) return;
          this.width = this.track.clientWidth;
          if (this.index > 0) this.go(this.index, true);
        });
        this.resizeObserver.observe(this.track);
        if (this.strip) this.resizeObserver.observe(this.strip);
        this.update();
        this.updateThumbs();
      }

      /* Thumbnail arrows: scroll the row by a page of thumbnails, landing on a thumbnail edge. */
      pageThumbs(dir) {
        if (!this.strip || !this.thumbs.length) return;
        const step = this.thumbs[1] ? this.thumbs[1].offsetLeft - this.thumbs[0].offsetLeft : this.thumbs[0].offsetWidth;
        const perPage = Math.max(1, Math.floor((this.strip.clientWidth + 2) / step));
        const from = Math.round(this.strip.scrollLeft / step);
        this.strip.scrollTo({ left: (from + dir * Math.max(1, perPage - 1)) * step, behavior: this.reduce.matches ? 'auto' : 'smooth' });
      }

      queueThumbs() {
        if (this.thumbFrame) return;
        this.thumbFrame = requestAnimationFrame(() => {
          this.thumbFrame = null;
          this.updateThumbs();
        });
      }

      updateThumbs() {
        if (!this.strip || this.thumbArrows.length !== 2) return;
        const overflow = this.strip.scrollWidth > this.strip.clientWidth + 2;
        this.thumbArrows.forEach((btn) => (btn.hidden = !overflow));
        if (!overflow) return;
        this.thumbArrows[0].disabled = this.strip.scrollLeft < 4;
        this.thumbArrows[1].disabled = this.strip.scrollLeft > this.strip.scrollWidth - this.strip.clientWidth - 4;
      }

      disconnectedCallback() {
        this.resizeObserver?.disconnect();
      }

      position() {
        return Math.round(this.track.scrollLeft / (this.track.clientWidth || 1));
      }

      go(i, instant) {
        const slide = this.slides[Math.min(Math.max(i, 0), this.slides.length - 1)];
        if (!slide) return;
        this.track.scrollTo({ left: slide.offsetLeft, behavior: instant || this.reduce.matches ? 'auto' : 'smooth' });
      }

      show(key) {
        const i = this.slides.findIndex((s) => s.dataset.slide === key);
        if (i >= 0) this.go(i);
      }

      showMedia(mediaId) {
        const i = this.slides.findIndex((s) => s.dataset.mediaId === String(mediaId));
        if (i >= 0) this.go(i);
      }

      queueUpdate() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      }

      update() {
        const i = Math.min(this.position(), this.slides.length - 1);
        if (i === this.index) return;
        this.index = i;
        const key = this.slides[i].dataset.slide;

        let active = null;
        this.thumbs.forEach((thumb) => {
          const on = thumb.dataset.mtSlide === key;
          thumb.setAttribute('aria-current', on ? 'true' : 'false');
          if (on) active = thumb;
        });
        if (active && this.strip && this.strip.scrollWidth > this.strip.clientWidth) {
          const left = active.offsetLeft - (this.strip.clientWidth - active.offsetWidth) / 2;
          this.strip.scrollTo({ left: Math.max(0, left), behavior: this.reduce.matches ? 'auto' : 'smooth' });
        }

        if (this.counter) this.counter.textContent = i + 1;
        if (this.arrows.length === 2) {
          this.arrows[0].disabled = i === 0;
          this.arrows[1].disabled = i === this.slides.length - 1;
        }

        // Fetch the pictures either side now, so the next slide is ready before it scrolls in.
        [i - 1, i + 1].forEach((n) => {
          this.slides[n]?.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
        });
      }
    }
  );
}

if (!customElements.get('mt-variant-select')) {
  customElements.define(
    'mt-variant-select',
    class MtVariantSelect extends HTMLElement {
      connectedCallback() {
        this.select = this.querySelector('select');
        this.form = document.getElementById(this.dataset.form);
        try {
          this.variants = JSON.parse(this.querySelector('script[type="application/json"]').textContent);
        } catch (e) {
          this.variants = [];
        }
        this.radios = Array.from(this.querySelectorAll('input[type="radio"]'));
        if (this.select) this.select.addEventListener('change', () => this.update());
        this.radios.forEach((r) => r.addEventListener('change', () => this.update()));
      }

      update() {
        const checked = this.radios.find((r) => r.checked);
        const value = this.select ? this.select.value : checked && checked.value;
        const v = this.variants.find((x) => String(x.id) === value);
        if (!v || !this.form) return;
        const input = this.form.querySelector('input[name="id"]');
        input.value = v.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const button = this.form.querySelector('[name="add"]');
        const label = button && button.querySelector('.mt-btn-label');
        if (button) button.disabled = !v.available;
        if (label) {
          const icon = label.querySelector('svg');
          label.textContent = v.available ? (this.dataset.addLabel || '').replace('[price]', v.short || v.price) : this.dataset.soldLabel;
          if (icon) label.prepend(icon);
        }

        const box = this.closest('.mt-buy-box');
        const price = box && box.querySelector('[data-mt-price]');
        if (price && !this.hasAttribute('data-hide-price')) {
          price.innerHTML = '';
          const b = document.createElement('b');
          b.textContent = v.price;
          price.append(b);
          if (v.compare) {
            const s = document.createElement('s');
            s.textContent = v.compare;
            price.append(s);
          }
        }

        const gallery = this.closest('.mt-pdp')?.querySelector('mt-gallery');
        if (gallery && v.media) gallery.showMedia(v.media);

        const url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  );
}

/* Quantity steppers: buttons with data-mt-qty="-1" / "1" next to a number input. */
if (!window.mtQtyBound) {
  window.mtQtyBound = true;
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.mt-qty [data-mt-qty]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input');
    const min = Number(input.min) || 1;
    const max = Number(input.max) || 99;
    const next = Math.min(max, Math.max(min, (Number(input.value) || min) + Number(btn.dataset.mtQty)));
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
