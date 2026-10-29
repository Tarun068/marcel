/* Marcel product page: gallery slides, quantity stepper, variant picker and related products. */
if (!customElements.get('mt-gallery')) {
  customElements.define(
    'mt-gallery',
    class MtGallery extends HTMLElement {
      connectedCallback() {
        this.slides = Array.from(this.querySelectorAll('[data-slide]'));
        this.thumbs = Array.from(this.querySelectorAll('[data-mt-slide]'));
        this.thumbs.forEach((thumb) => thumb.addEventListener('click', () => this.show(thumb.dataset.mtSlide)));
      }

      show(key) {
        if (!this.slides.some((s) => s.dataset.slide === key)) return;
        this.slides.forEach((s) => {
          const on = s.dataset.slide === key;
          s.classList.toggle('is-on', on);
          s.toggleAttribute('inert', !on);
        });
        this.thumbs.forEach((t) => t.setAttribute('aria-current', t.dataset.mtSlide === key));
      }

      showMedia(mediaId) {
        const slide = this.slides.find((s) => s.dataset.mediaId === String(mediaId));
        if (slide) this.show(slide.dataset.slide);
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
