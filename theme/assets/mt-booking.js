/* MARCEL OSMF Consultant booking: details, day and slot, consent, then the booking-fee checkout.
   With a fee product, the details travel as line-item properties and the visitor goes to checkout.
   Without one, the page's Shopify contact form sends a booking request instead. */
if (!customElements.get('mt-booking')) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const PENDING = 'mt-booking-pending';

  const store = (key, value) => (window.MarcelTheme ? window.MarcelTheme.storage(key, value) : null);
  const minutes = (slot) => {
    // Uses the start of a slot such as "10:15 AM – 10:30 AM".
    const m = String(slot).match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + Number(m[2] || 0);
  };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  customElements.define(
    'mt-booking',
    class MtBooking extends HTMLElement {
      connectedCallback() {
        try {
          this.t = JSON.parse(this.querySelector('[data-mt-text]').textContent);
        } catch (e) {
          this.t = {};
        }
        this.form = this.querySelector('[data-mt-book-form]');
        this.result = store('mt-result');
        this.closedDays = String(this.dataset.closed || '')
          .toLowerCase()
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        this.state = { day: null, slot: null };

        const posted = this.querySelector('[data-mt-posted]') || new URLSearchParams(window.location.search).get('contact_posted') === 'true';
        const pending = store(PENDING);
        if (posted && pending && pending.id) {
          this.done(pending);
          return;
        }

        this.prefill();
        this.bind();
        this.state.day = this.openDay();
        this.fromLink();
        this.render();
      }

      // A link such as ?day=2026-10-30&slot=10:00 AM (from the home-page booking card) picks that day and slot.
      fromLink() {
        const params = new URLSearchParams(window.location.search);
        const want = params.get('day');
        if (!want) return;
        const day = this.days().find((d) => `${d.year}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.num).padStart(2, '0')}` === want);
        if (!day || this.closed(day)) return;
        this.state.day = day.i;
        const m = minutes(params.get('slot'));
        if (m === null) return;
        const slots = (this.t.groups || []).flatMap((g) => g.slots);
        const match = slots.find((s) => minutes(s) === m && !this.taken(day, s));
        if (match) this.state.slot = match;
      }

      days() {
        const out = [];
        const now = new Date();
        const n = Number(this.dataset.days) || 7;
        for (let i = 0; i < n; i += 1) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          out.push({ i, date: d, dow: DOW[d.getDay()], num: d.getDate(), mon: MON[d.getMonth()], year: d.getFullYear() });
        }
        return out;
      }

      closed(day) {
        return this.closedDays.includes(day.dow.toLowerCase());
      }

      taken(day, slot) {
        if (!day || day.i !== 0) return false;
        const m = minutes(slot);
        const now = new Date();
        return m !== null && m <= now.getHours() * 60 + now.getMinutes() + (Number(this.dataset.lead) || 0);
      }

      openDay() {
        const groups = this.t.groups || [];
        const found = this.days().find((d) => !this.closed(d) && groups.some((g) => g.slots.some((s) => !this.taken(d, s))));
        return found ? found.i : 1;
      }

      stage() {
        const key = this.result && this.result.key;
        return key && this.t.stages ? this.t.stages[key] || null : null;
      }

      prefill() {
        const lead = (this.result && this.result.lead) || {};
        const name = this.form.querySelector('[name="contact[name]"]');
        const phone = this.form.querySelector('[name="contact[phone]"]');
        if (name && lead.name && !name.value) name.value = lead.name;
        if (phone && lead.phone && !phone.value) phone.value = lead.phone;
      }

      bind() {
        this.addEventListener('click', (e) => {
          const day = e.target.closest('[data-mt-day]');
          const slot = e.target.closest('[data-mt-slot]');
          if (day && !day.disabled) {
            this.state.day = Number(day.dataset.mtDay);
            this.state.slot = null;
            this.render();
          } else if (slot && !slot.disabled) {
            this.state.slot = slot.dataset.mtSlot;
            this.render();
          } else if (e.target.closest('[data-mt-new]')) {
            store(PENDING, {});
            window.location.href = window.location.pathname;
          }
        });
        const phone = this.form.querySelector('[name="contact[phone]"]');
        phone.addEventListener('input', () => {
          phone.value = phone.value.replace(/\D/g, '');
        });
        this.form.addEventListener('submit', (e) => this.submit(e));
      }

      when() {
        if (!this.state.slot) return '';
        const d = this.days()[this.state.day];
        if (!d) return this.state.slot;
        const name = d.i === 0 ? this.t.today : d.i === 1 ? this.t.tomorrow : d.dow;
        return `${name}, ${d.num} ${d.mon}, ${this.state.slot}`;
      }

      render() {
        const days = this.days();
        if (this.state.day === null || this.closed(days[this.state.day] || days[0])) this.state.day = this.openDay();
        this.querySelector('[data-mt-days]').replaceChildren(
          ...days.map((d) => {
            const off = this.closed(d);
            const b = el('button', 'mt-day');
            b.type = 'button';
            b.dataset.mtDay = d.i;
            b.disabled = off;
            b.setAttribute('aria-pressed', d.i === this.state.day);
            b.append(el('small', '', d.i === 0 ? this.t.today : d.dow), el('b', '', d.num), el('span', '', off ? this.t.closed : d.mon));
            return b;
          })
        );
        const day = days[this.state.day];
        this.querySelector('[data-mt-slots]').replaceChildren(
          ...(this.t.groups || []).map((g) => {
            const wrap = el('div', 'mt-slot-group');
            const list = el('div', 'mt-slots mt-slots--range');
            list.append(
              ...g.slots.map((x) => {
                const taken = this.taken(day, x);
                const b = el('button', 'mt-slot', x);
                b.type = 'button';
                b.dataset.mtSlot = x;
                b.disabled = taken;
                if (taken) b.setAttribute('aria-label', `${x}, ${this.t.unavailable}`);
                b.setAttribute('aria-pressed', this.state.slot === x);
                return b;
              })
            );
            wrap.append(el('span', '', g.label), list);
            return wrap;
          })
        );
        this.renderSummary();
      }

      renderSummary() {
        const set = (key, value) => {
          const node = this.querySelector(`[data-mt-sum="${key}"]`);
          if (node) node.textContent = value;
        };
        set('when', this.when() || this.t.notChosen);
        const stage = this.stage();
        set('result', stage ? stage.title : this.t.notTaken);
        const link = this.querySelector('[data-mt-sum-test]');
        if (link) link.hidden = !!stage;
      }

      validate() {
        const f = this.form;
        const get = (name) => f.querySelector(`[name="contact[${name}]"]`);
        const checks = [
          [get('name'), get('name').value.trim().length >= 2, this.t.errName],
          [get('age'), /^\d{1,3}$/.test(get('age').value.trim()) && Number(get('age').value) > 0, this.t.errAge],
          [get('phone'), /^[6-9]\d{9}$/.test(get('phone').value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')), this.t.errPhone],
          [get('patient_email'), !get('patient_email').value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('patient_email').value.trim()), this.t.errEmail],
          [get('address'), get('address').value.trim().length >= 5, this.t.errAddress],
        ];
        const errs = [];
        let firstBad = null;
        checks.forEach(([input, ok, msg]) => {
          input.classList.toggle('is-invalid', !ok);
          if (!ok) {
            errs.push(msg);
            firstBad = firstBad || input;
          }
        });
        if (!this.state.slot) errs.push(this.t.errSlot);
        const consent = f.querySelector('[data-mt-consent]');
        if (!consent.checked) {
          errs.push(this.t.errConsent);
          firstBad = firstBad || consent;
        }
        return { errs, firstBad };
      }

      details() {
        const f = this.form;
        const v = (name) => (f.querySelector(`[name="contact[${name}]"]`) || {}).value || '';
        const d = this.days()[this.state.day];
        const stage = this.stage();
        return {
          id: `MOC-${Math.floor(10000 + Math.random() * 89999)}`,
          name: v('name').trim(),
          age: v('age').trim(),
          phone: v('phone').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
          email: v('patient_email').trim(),
          address: v('address').trim(),
          date: d ? `${d.dow}, ${d.num} ${d.mon} ${d.year}` : '',
          slot: this.state.slot,
          when: this.when(),
          result: stage ? stage.title : this.t.notTaken,
        };
      }

      async submit(e) {
        // Shopify's spam check adds its own submit handler once the visitor types in the form, and it would send
        // the form at once and reload this page, cutting off the checkout. This handler runs first and stops it.
        e.preventDefault();
        e.stopImmediatePropagation();
        const error = this.querySelector('[data-mt-error]');
        const { errs, firstBad } = this.validate();
        if (errs.length) {
          error.textContent = errs.join(' ');
          error.hidden = false;
          if (firstBad) firstBad.focus();
          return;
        }
        error.hidden = true;
        const b = this.details();
        const button = this.querySelector('[data-mt-submit]');
        button.classList.add('loading');
        button.querySelector('.loading__spinner')?.classList.remove('hidden');
        try {
          if (this.dataset.variant) await this.checkout(b);
          else await this.request(b);
        } catch (err) {
          error.textContent = this.t.errSend;
          error.hidden = false;
          button.classList.remove('loading');
          button.querySelector('.loading__spinner')?.classList.add('hidden');
        }
      }

      /* Adds the booking-fee product with the booking details and opens checkout. */
      async checkout(b) {
        const p = this.t.props || {};
        const variant = Number(this.dataset.variant);
        const json = { 'Content-Type': 'application/json', Accept: 'application/json' };
        // Remove an earlier, unpaid booking line so the cart holds one booking at a time.
        const cart = await fetch(`${this.dataset.cart}.js`, { headers: json }).then((r) => r.json());
        for (const item of cart.items || []) {
          if (item.variant_id === variant) {
            await fetch(`${this.dataset.cartChange}.js`, { method: 'POST', headers: json, body: JSON.stringify({ id: item.key, quantity: 0 }) });
          }
        }
        const properties = {};
        const add = (label, value) => {
          if (label && value) properties[label] = value;
        };
        add(p.id, b.id);
        add(p.name, b.name);
        add(p.age, b.age);
        add(p.phone, `+91 ${b.phone}`);
        add(p.email, b.email);
        add(p.address, b.address);
        add(p.date, b.date);
        add(p.slot, b.slot);
        add(p.result, b.result);
        const res = await fetch(`${this.dataset.cartAdd}.js`, {
          method: 'POST',
          headers: json,
          body: JSON.stringify({ items: [{ id: variant, quantity: 1, properties }] }),
        });
        if (!res.ok) throw new Error('cart');
        window.location.href = '/checkout';
      }

      /* No fee product yet: send the request through the Shopify contact form, as a normal form post so Shopify's
         spam check can add its token. Shopify reloads this page with ?contact_posted=true and the saved booking
         shows as done (see connectedCallback). */
      async request(b) {
        const f = this.form;
        const field = (key, value) => {
          const node = f.querySelector(`[data-mt-field="${key}"]`);
          if (node) node.value = value || '';
        };
        field('id', b.id);
        field('when', b.when);
        field('result', b.result);
        store(PENDING, b);
        if (window.MarcelTheme && window.MarcelTheme.postForm) window.MarcelTheme.postForm(f);
        else HTMLFormElement.prototype.submit.call(f);
      }

      done(b) {
        this.form.hidden = true;
        const box = this.querySelector('[data-step="done"]');
        box.hidden = false;
        const first = (b.name || '').split(' ')[0];
        this.querySelector('[data-mt-done-title]').textContent = `${this.t.booked}${first ? ', ' + first : ''}.`;
        this.querySelector('[data-mt-done-when]').textContent = b.when || '';
        this.querySelector('[data-mt-done-id]').textContent = b.id;
        const lines = (this.t.next || []).map((x) => x.trim()).filter(Boolean);
        this.querySelector('[data-mt-done-next]').replaceChildren(...lines.map((x) => el('li', '', x)));
        const set = (key, value) => {
          const node = this.querySelector(`[data-mt-sum="${key}"]`);
          if (node) node.textContent = value;
        };
        set('when', b.when || '');
        set('result', b.result || '');
        if (this.getBoundingClientRect().top < 0) this.scrollIntoView({ block: 'start' });
      }
    }
  );
}
