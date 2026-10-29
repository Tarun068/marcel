/* Marcel stages: switches the stage panel when a tab is chosen; arrow keys move between tabs. */
if (!customElements.get('mt-stage-tabs')) {
  customElements.define(
    'mt-stage-tabs',
    class MtStageTabs extends HTMLElement {
      connectedCallback() {
        this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
        this.tabs.forEach((tab, i) => {
          tab.addEventListener('click', () => this.select(i));
          tab.addEventListener('keydown', (e) => {
            const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            let next = null;
            if (e.key in keys) next = (i + keys[e.key] + this.tabs.length) % this.tabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = this.tabs.length - 1;
            if (next === null) return;
            e.preventDefault();
            this.select(next);
            this.tabs[next].focus();
          });
        });

        // In the theme editor, selecting a Stage block opens its tab.
        this.onSelect = (e) => {
          const i = this.tabs.findIndex((t) => t === e.target || t.contains(e.target));
          if (i > -1) this.select(i);
        };
        document.addEventListener('shopify:block:select', this.onSelect);
      }

      disconnectedCallback() {
        document.removeEventListener('shopify:block:select', this.onSelect);
      }

      select(index) {
        this.tabs.forEach((tab, i) => {
          const on = i === index;
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(tab.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }
    }
  );
}
