/* Marcel filter chips: show only the items whose data-type matches the pressed chip. */
if (!customElements.get('mt-filter')) {
  customElements.define(
    'mt-filter',
    class MtFilter extends HTMLElement {
      connectedCallback() {
        this.chips = Array.from(this.querySelectorAll('[data-mt-filter]'));
        this.items = Array.from(this.querySelectorAll('[data-type]'));
        this.promo = this.querySelector('[data-mt-promo]');
        this.count = this.querySelector('[data-mt-count]');
        this.chips.forEach((chip) => chip.addEventListener('click', () => this.apply(chip.dataset.mtFilter)));
        const param = new URLSearchParams(window.location.search).get('type');
        if (param && this.chips.some((c) => c.dataset.mtFilter === param)) this.apply(param);
      }

      apply(type) {
        let shown = 0;
        this.chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.mtFilter === type));
        this.items.forEach((item) => {
          const on = type === 'all' || item.dataset.type === type;
          item.hidden = !on;
          if (on) shown += 1;
        });
        if (this.promo) this.promo.hidden = type !== 'all';
        if (this.count) {
          const text = shown === 1 ? this.dataset.countOne : this.dataset.countMany;
          if (text) this.count.textContent = text.replace('[n]', shown);
        }
      }
    }
  );
}
