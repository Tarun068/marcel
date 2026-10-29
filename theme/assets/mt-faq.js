/* Marcel FAQ accordion with smooth open and close. */
if (!customElements.get('mt-accordion')) {
  customElements.define(
    'mt-accordion',
    class MtAccordion extends HTMLElement {
      connectedCallback() {
        this.buttons = Array.from(this.querySelectorAll('.mt-acc-q'));
        this.buttons.forEach((btn) => {
          this.sync(btn);
          btn.addEventListener('click', () => {
            const open = btn.getAttribute('aria-expanded') !== 'true';
            if (open && this.dataset.single === 'true') {
              this.buttons.forEach((b) => {
                if (b !== btn) this.set(b, false);
              });
            }
            this.set(btn, open);
          });
        });
      }

      set(btn, open) {
        btn.setAttribute('aria-expanded', open);
        this.sync(btn);
      }

      sync(btn) {
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        const open = btn.getAttribute('aria-expanded') === 'true';
        panel.classList.toggle('is-open', open);
        const inner = panel.firstElementChild;
        if (inner) inner.toggleAttribute('inert', !open);
      }
    }
  );
}
