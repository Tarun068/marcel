/* MARCEL OSMF Care Specialist finder: search by state, city or PIN code, or sort by distance from the visitor.
   A PIN code search shows specialists in that PIN area first, then nearby PIN codes in the same region. */
if (!customElements.get('mt-specialists')) {
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = (name) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'mt-i');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#mt-i-${name}`);
    svg.append(use);
    return svg;
  };
  const km = (a, b) => {
    const r = (x) => (x * Math.PI) / 180;
    const dLat = r(b.lat - a.lat);
    const dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  };
  const initials = (name) =>
    String(name || '')
      .replace(/^dr\.?\s*/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

  customElements.define(
    'mt-specialists',
    class MtSpecialists extends HTMLElement {
      connectedCallback() {
        try {
          this.t = JSON.parse(this.querySelector('[data-mt-text]').textContent);
          const data = JSON.parse(this.querySelector('[data-mt-specialists]').textContent);
          this.people = (data.list || []).map((p) => Object.assign({}, p, { lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
          this.sample = !!data.sample;
        } catch (e) {
          this.t = {};
          this.people = [];
        }
        this.states = [...new Set(this.people.map((p) => p.state).filter(Boolean))].sort();
        const p = new URLSearchParams(window.location.search);
        const match = (list, v) => list.find((x) => x.toLowerCase() === String(v || '').toLowerCase()) || '';
        this.state = match(this.states, p.get('state'));
        this.city = match(this.cities(), p.get('city'));
        this.q = this.city ? '' : (p.get('q') || '').trim();
        this.origin = null;

        this.form = document.querySelector('[data-mt-search-form]');
        this.input = this.form && this.form.querySelector('input');
        if (this.input) this.input.value = this.q;
        if (this.form) {
          this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.q = this.input.value.trim();
            this.city = '';
            this.origin = null;
            this.update();
            this.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }

        this.stateSelect = this.querySelector('[data-mt-state]');
        this.stateSelect.append(new Option(this.t.allStates || 'All states', ''), ...this.states.map((s) => new Option(s, s)));
        this.stateSelect.value = this.state;
        this.stateSelect.closest('.mt-field').hidden = this.states.length < 2;
        this.stateSelect.addEventListener('change', () => {
          this.state = this.stateSelect.value;
          this.city = '';
          this.update();
        });

        this.addEventListener('click', (e) => {
          const chip = e.target.closest('[data-mt-city]');
          if (chip) {
            this.city = chip.dataset.mtCity;
            this.q = '';
            this.origin = null;
            if (chip.hasAttribute('data-mt-reset')) {
              this.state = '';
              this.stateSelect.value = '';
            }
            if (this.input) this.input.value = '';
            this.update();
          } else if (e.target.closest('[data-mt-locate]')) {
            this.locate();
          }
        });

        const tag = this.querySelector('[data-mt-sample]');
        if (tag) tag.hidden = !this.sample;
        this.querySelector('[data-mt-locate]').hidden = !('geolocation' in navigator) || !this.people.some((x) => !Number.isNaN(x.lat));
        this.update();
      }

      cities() {
        const list = this.state ? this.people.filter((p) => p.state === this.state) : this.people;
        return [...new Set(list.map((p) => p.city).filter(Boolean))].sort();
      }

      locate() {
        const msg = this.querySelector('[data-mt-locate-msg]');
        msg.hidden = false;
        msg.classList.remove('mt-err');
        msg.textContent = this.t.locating;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            msg.hidden = true;
            this.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            this.q = '';
            this.city = '';
            this.state = '';
            this.stateSelect.value = '';
            if (this.input) this.input.value = '';
            this.update();
          },
          () => {
            msg.classList.add('mt-err');
            msg.textContent = this.t.noLocation;
          },
          { timeout: 10000, maximumAge: 600000 }
        );
      }

      results() {
        let list = this.people.slice();
        if (this.state) list = list.filter((p) => p.state === this.state);
        if (this.origin) {
          return list
            .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng))
            .map((p) => Object.assign({ dist: km(this.origin, p) }, p))
            .sort((a, b) => a.dist - b.dist);
        }
        if (this.city) return list.filter((p) => p.city === this.city);
        const q = this.q.toLowerCase();
        if (!q) return list;
        const digits = q.replace(/\D/g, '');
        if (digits.length >= 3) {
          // PIN code: the same PIN first, then the same postal district (first 3 digits), closest numbers first.
          const near = list.filter((p) => String(p.pin || '').startsWith(digits.slice(0, 3)));
          const n = Number(digits.padEnd(6, '0'));
          return near.sort((a, b) => Math.abs(Number(a.pin) - n) - Math.abs(Number(b.pin) - n));
        }
        return list.filter((p) => [p.city, p.area, p.state, p.name, p.clinic].some((v) => String(v || '').toLowerCase().includes(q)));
      }

      update() {
        const chips = this.querySelector('[data-mt-chips]');
        const cities = this.cities();
        const all = [['', this.t.allCities]].concat(cities.map((c) => [c, c]));
        chips.replaceChildren(
          ...all.map(([value, label]) => {
            const b = el('button', 'mt-fchip', label);
            b.type = 'button';
            b.dataset.mtCity = value;
            b.setAttribute('aria-pressed', value === this.city && (value !== '' || (!this.q && !this.origin)));
            return b;
          })
        );
        chips.hidden = cities.length < 2;

        const list = this.results();
        const where = this.origin ? this.t.nearYou : this.city || (this.q ? this.t.whereSearch : this.state || this.t.whereAll);
        const count = (list.length === 1 ? this.t.countOne : this.t.countMany) || '[n]';
        this.querySelector('[data-mt-count]').textContent = count.replace('[n]', list.length).replace('[where]', where);

        const grid = this.querySelector('[data-mt-list]');
        grid.replaceChildren(...list.map((p) => this.card(p)));
        grid.hidden = list.length === 0;
        this.querySelector('[data-mt-empty]').hidden = list.length > 0;
        const title = this.querySelector('[data-mt-empty-title]');
        if (title) title.textContent = (this.t.emptyTitle || '').replace('[where]', this.city || (this.q ? `“${this.q}”` : this.state || this.t.whereAll));

        const url = new URL(window.location.href);
        ['q', 'city', 'state'].forEach((k) => url.searchParams.delete(k));
        if (this.state) url.searchParams.set('state', this.state);
        if (this.city) url.searchParams.set('city', this.city);
        else if (this.q) url.searchParams.set('q', this.q);
        window.history.replaceState({}, '', url.toString());
      }

      card(p) {
        const card = el('article', 'mt-clinic');
        const top = el('div', 'mt-clinic-top');
        const avatar = el('span', 'mt-initials mt-spec-avatar');
        if (p.photo) {
          const img = el('img');
          img.src = p.photo;
          img.alt = '';
          img.loading = 'lazy';
          avatar.append(img);
        } else {
          avatar.textContent = initials(p.name);
        }
        const head = el('div');
        head.append(el('h3', '', p.name), el('p', 'mt-clinic-where', [p.qualification, this.t.role].filter(Boolean).join(', ')));
        top.append(avatar, head);

        const meta = el('div', 'mt-clinic-meta');
        const line = (name, text) => {
          if (!text) return;
          const span = el('span');
          span.append(icon(name), document.createTextNode(text));
          meta.append(span);
        };
        line('clinic', p.clinic);
        line('pin', [p.address, p.area, p.city, p.state].filter(Boolean).join(', ') + (p.pin ? ` ${p.pin}` : ''));
        line('clock', p.hours);
        line('phone', p.phone);
        if (p.registration) line('patent', `${this.t.reg} ${p.registration}`);
        if (p.dist !== undefined) line('target', (this.t.km || '[n] km').replace('[n]', p.dist < 10 ? p.dist.toFixed(1) : Math.round(p.dist)));

        const actions = el('div', 'mt-clinic-actions');
        if (p.phone) {
          const call = el('a', 'mt-btn mt-btn-primary mt-btn-sm');
          call.href = `tel:${p.phone.replace(/\s/g, '')}`;
          call.append(icon('phone'), document.createTextNode(this.t.call));
          actions.append(call);
        }
        const dir = el('a', 'mt-btn mt-btn-secondary mt-btn-sm');
        const query = !Number.isNaN(p.lat) && !Number.isNaN(p.lng) ? `${p.lat},${p.lng}` : [p.clinic, p.address, p.area, p.city, p.pin].filter(Boolean).join(', ');
        dir.href = p.map || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
        dir.target = '_blank';
        dir.rel = 'noopener';
        dir.append(icon('pin'), document.createTextNode(this.t.directions));
        actions.append(dir);

        card.append(top, meta, actions);
        return card;
      }
    }
  );
}
