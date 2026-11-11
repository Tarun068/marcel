/* Marcel product cards with sizes (snippets/mt-product-card.liquid): choosing a size updates that card's
   price, picture, links and Add to cart. Loaded once per card that has sizes, so it guards against running twice. */
if (!window.mtCardSizes) {
  window.mtCardSizes = true;
  document.addEventListener('change', (event) => {
    const input = event.target.closest('.mt-psizes input[type="radio"]');
    if (!input) return;
    const card = input.closest('.mt-pcard');
    if (!card) return;
    const d = input.dataset;

    const id = card.querySelector('form input[name="id"]');
    if (id) id.value = input.value;

    const price = card.querySelector('[data-mt-price]');
    if (price && d.price) {
      const now = price.querySelector('b');
      if (now) now.textContent = d.price;
      let was = price.querySelector('s');
      if (d.compare) {
        if (!was) {
          was = document.createElement('s');
          price.appendChild(was);
        }
        was.textContent = d.compare;
      } else if (was) {
        was.remove();
      }
    }

    const button = card.querySelector('form [type="submit"]');
    if (button) {
      const available = d.available === 'true';
      button.disabled = !available;
      const text = button.querySelector('.mt-btn-text');
      if (text) text.textContent = available ? button.dataset.addLabel : button.dataset.soldLabel;
    }

    const img = card.querySelector('.mt-pmedia img');
    if (img && d.image) {
      img.removeAttribute('srcset');
      img.src = d.image;
    }

    if (d.url) card.querySelectorAll('a.mt-pmedia, .mt-pbody h3 a').forEach((a) => (a.href = d.url));
  });
}
