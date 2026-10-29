/* Marcel related products: loads Shopify's product recommendations when the row comes into view. */
if (!customElements.get('mt-related')) {
  customElements.define(
    'mt-related',
    class MtRelated extends HTMLElement {
      connectedCallback() {
        if (!this.dataset.url) return;
        const observer = new IntersectionObserver(
          (entries, obs) => {
            if (!entries[0].isIntersecting) return;
            obs.unobserve(this);
            this.load();
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        observer.observe(this);
      }

      load() {
        fetch(this.dataset.url)
          .then((response) => response.text())
          .then((text) => {
            const html = new DOMParser().parseFromString(text, 'text/html');
            const fresh = html.querySelector('mt-related');
            const section = this.closest('.shopify-section');
            if (fresh && fresh.querySelector('.mt-pcard')) {
              this.innerHTML = fresh.innerHTML;
            } else if (section) {
              section.hidden = true;
            }
          })
          .catch(() => {});
      }
    }
  );
}
