/* Marcel header: sticky shadow, mobile menu drawer, search panel with predictive results, cart count. */
if (!customElements.get('mt-header')) {
  customElements.define(
    'mt-header',
    class MtHeader extends HTMLElement {
      connectedCallback() {
        this.bar = this.querySelector('[data-mt-header]');
        this.backdrop = this.querySelector('.mt-backdrop');
        this.panels = {};
        this.querySelectorAll('[data-mt-panel]').forEach((p) => (this.panels[p.dataset.mtPanel] = p));
        this.input = this.querySelector('[data-mt-search-input]');
        this.cartLink = this.querySelector('[data-mt-cart]');

        this.onClick = this.onClick.bind(this);
        this.onKey = (e) => e.key === 'Escape' && this.close();
        this.onScroll = () => this.bar.classList.toggle('is-scrolled', window.scrollY > 8);
        this.addEventListener('click', this.onClick);
        document.addEventListener('keydown', this.onKey);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.onScroll();

        if (this.input) {
          let t;
          this.input.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(() => this.search(), 220);
          });
        }

        if (this.cartLink) {
          this.cartLink.addEventListener('click', (e) => {
            const drawer = document.querySelector('cart-drawer');
            if (!drawer || typeof drawer.open !== 'function') return;
            e.preventDefault();
            this.close(false);
            drawer.open(this.cartLink);
          });
        }
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => this.refreshCount(event && event.cartData));
        }
      }

      disconnectedCallback() {
        document.removeEventListener('keydown', this.onKey);
        window.removeEventListener('scroll', this.onScroll);
        if (this.unsubscribe) this.unsubscribe();
        document.body.classList.remove('mt-lock');
        document.body.style.overflow = '';
      }

      onClick(e) {
        const opener = e.target.closest('[data-mt-open]');
        if (opener) {
          const panel = this.panels[opener.dataset.mtOpen];
          if (panel && panel.classList.contains('is-open')) this.close();
          else this.open(opener.dataset.mtOpen, opener);
          return;
        }
        if (e.target.closest('[data-mt-close]')) this.close();
      }

      open(name, trigger) {
        const panel = this.panels[name];
        if (!panel) return;
        this.close(false);
        panel.classList.add('is-open');
        panel.removeAttribute('inert');
        this.backdrop.classList.add('is-open');
        document.body.classList.add('mt-lock');
        if (name === 'menu') document.body.style.overflow = 'hidden';
        this.trigger = trigger;
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        if (name === 'search' && this.input) setTimeout(() => this.input.focus(), 60);
        else {
          const first = panel.querySelector('a, button');
          if (first) setTimeout(() => first.focus(), 60);
        }
      }

      close(restoreFocus = true) {
        Object.values(this.panels).forEach((p) => {
          if (!p.classList.contains('is-open')) return;
          p.classList.remove('is-open');
          p.setAttribute('inert', '');
        });
        if (this.backdrop) this.backdrop.classList.remove('is-open');
        document.body.classList.remove('mt-lock');
        document.body.style.overflow = '';
        if (this.trigger) {
          this.trigger.setAttribute('aria-expanded', 'false');
          if (restoreFocus) this.trigger.focus();
          this.trigger = null;
        }
      }

      refreshCount(cartData) {
        const apply = (n) => {
          const el = this.querySelector('[data-mt-cart-count]');
          if (!el) return;
          el.textContent = n;
          el.dataset.n = n;
          el.classList.remove('is-bump');
          void el.offsetWidth;
          el.classList.add('is-bump');
          if (this.cartLink) this.cartLink.setAttribute('aria-label', `Cart (${n})`);
        };
        if (cartData && typeof cartData.item_count === 'number') return apply(cartData.item_count);
        const url = (window.routes && window.routes.cart_url) || '/cart';
        fetch(`${url}.js`, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((cart) => apply(cart.item_count))
          .catch(() => {});
      }

      async search() {
        const q = this.input.value.trim();
        const live = this.querySelector('[data-mt-search-live]');
        const fallback = this.querySelector('[data-mt-search-default]');
        if (!q) {
          live.hidden = true;
          fallback.hidden = false;
          return;
        }
        if (this.controller) this.controller.abort();
        this.controller = new AbortController();
        const params = new URLSearchParams({
          q,
          'resources[type]': 'product,collection,page,article',
          'resources[limit]': '4',
          'resources[limit_scope]': 'each',
          'resources[options][unavailable_products]': 'last',
        });
        const base = (window.routes && window.routes.predictive_search_url) || '/search/suggest';
        try {
          const res = await fetch(`${base}.json?${params}`, { signal: this.controller.signal });
          const data = await res.json();
          const r = (data.resources && data.resources.results) || {};
          const img = (x) => (x && (x.featured_image && x.featured_image.url)) || (typeof x.image === 'string' ? x.image : null);
          const rows = [
            ...(r.products || []).map((p) => ({ t: p.title, s: p.product_type || '', href: p.url, img: img(p), icon: 'bag', type: 'Product' })),
            ...(r.collections || []).map((c) => ({ t: c.title, s: '', href: c.url, icon: 'grid', type: 'Shop' })),
            ...(r.pages || []).map((p) => ({ t: p.title, s: '', href: p.url, icon: 'book', type: 'Page' })),
            ...(r.articles || []).map((a) => ({ t: a.title, s: a.blog && a.blog.title ? a.blog.title : '', href: a.url, img: img(a), icon: 'book', type: 'Guide' })),
          ].slice(0, 8);
          const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
          const thumb = (u) => `${u}${u.includes('?') ? '&' : '?'}width=96`;
          live.innerHTML = rows.length
            ? rows
                .map(
                  (x) => `<a class="mt-sr-item" href="${esc(x.href)}"><span class="mt-sr-ico">${
                    x.img ? `<img src="${esc(thumb(x.img))}" alt="" loading="lazy" width="40" height="40">` : `<svg class="mt-i" aria-hidden="true"><use href="#mt-i-${x.icon}"/></svg>`
                  }</span><span><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</span><span class="mt-sr-type">${x.type}</span></a>`
                )
                .join('')
            : `<p class="mt-search-empty">${esc((this.dataset.emptyText || 'No results for “[q]”.')).replace('[q]', esc(q))}</p>`;
          live.hidden = false;
          fallback.hidden = true;
        } catch (e) {
          if (e.name !== 'AbortError') live.hidden = true;
        }
      }
    }
  );
}
