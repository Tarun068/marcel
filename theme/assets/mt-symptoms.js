/* Marcel symptoms: tap to select symptoms, the dark panel explains the last one tapped. */
if (!customElements.get('mt-symptoms')) {
  customElements.define(
    'mt-symptoms',
    class MtSymptoms extends HTMLElement {
      connectedCallback() {
        this.items = Array.from(this.querySelectorAll('.mt-sym'));
        this.bars = Array.from(this.querySelectorAll('.mt-sym-bars i'));
        this.titleEl = this.querySelector('[data-mt-title]');
        this.textEl = this.querySelector('[data-mt-text]');
        this.countEl = this.querySelector('[data-mt-count]');
        this.msgEl = this.querySelector('[data-mt-msg]');

        const saved = (window.MarcelTheme && window.MarcelTheme.storage('mt-symptoms')) || [];
        this.items.forEach((item) => {
          if (saved.includes(item.dataset.title)) item.setAttribute('aria-pressed', 'true');
          item.addEventListener('click', () => this.toggle(item));
        });
        this.update();
      }

      toggle(item) {
        item.setAttribute('aria-pressed', item.getAttribute('aria-pressed') !== 'true');
        this.items.forEach((i) => i.classList.toggle('is-viewing', i === item));
        this.setIcon(item);
        if (this.titleEl) this.titleEl.textContent = item.dataset.title;
        if (this.textEl) this.textEl.textContent = item.dataset.text;
        this.update();
        const selected = this.items.filter((i) => i.getAttribute('aria-pressed') === 'true').map((i) => i.dataset.title);
        if (window.MarcelTheme) window.MarcelTheme.storage('mt-symptoms', selected);
      }

      // Shows the symptom's photo in the panel when it has one; otherwise swaps the icon.
      // Illustrated icons and line icons use different sprites and sizes.
      setIcon(item) {
        const frame = this.querySelector('[data-mt-photo]');
        const box = this.querySelector('[data-mt-ico]');
        const photo = frame ? item.dataset.photo || '' : '';
        if (frame) {
          frame.hidden = !photo;
          const img = frame.querySelector('img');
          if (photo && img && img.getAttribute('src') !== photo) {
            img.src = photo;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && img.animate) {
              img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
            }
          }
        }
        if (!box) return;
        box.hidden = Boolean(photo);
        if (photo) return;
        const art = item.dataset.art === 'true';
        box.classList.toggle('is-art', art);
        box.innerHTML = art
          ? `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><use href="#mt-sx-${item.dataset.icon}"/></svg>`
          : `<svg class="mt-i" aria-hidden="true" focusable="false"><use href="#mt-i-${item.dataset.icon}"/></svg>`;
      }

      update() {
        const n = this.items.filter((i) => i.getAttribute('aria-pressed') === 'true').length;
        const d = this.dataset;
        let msg = d.msgNone;
        if (n === 1) msg = d.msgOne;
        else if (n > 1 && n < Number(d.manyFrom || 4)) msg = d.msgFew;
        else if (n > 1) msg = d.msgMany;
        this.bars.forEach((b, i) => b.classList.toggle('is-on', i < n));
        if (this.countEl) this.countEl.textContent = (d.countText || '').replace('[n]', n).replace('[total]', this.items.length);
        if (this.msgEl) this.msgEl.textContent = (msg || '').replace('[n]', n);
      }
    }
  );
}
