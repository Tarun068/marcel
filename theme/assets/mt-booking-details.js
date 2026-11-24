/*
  Booking details before the Appointo calendar (consultation product page).
  Appointo reads every [name*="properties"] field on the page when it adds the slot to the cart,
  so the details travel with the booking. This file checks the details and keeps the Appointo
  button locked until they are complete.
*/
(() => {
  if (customElements.get('mt-booking-details')) return;

  const STORE_KEY = 'mt-booking-details';
  const isAppointoBtn = (el) => el && el.closest && el.closest('[id^="appointo-btn"]');

  class MtBookingDetails extends HTMLElement {
    connectedCallback() {
      this.fields = {};
      this.querySelectorAll('[data-mt-bkd]').forEach((el) => { this.fields[el.dataset.mtBkd] = el; });
      this.errorEl = this.querySelector('[data-mt-bkd-error]');

      this.restore();

      // Digits only in the number fields.
      ['age', 'phone', 'pincode'].forEach((key) => {
        const el = this.fields[key];
        if (el) el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, ''); });
      });

      // An empty optional email would show as a blank "Email:" line on the order, so it only carries a
      // properties[...] name while it has a value.
      const email = this.fields.email;
      if (email) {
        email.dataset.propName = email.name;
        this.syncEmailName = () => {
          if (email.value.trim()) email.name = email.dataset.propName;
          else email.removeAttribute('name');
        };
        this.syncEmailName();
      }

      const onEdit = (e) => {
        this.clearMark(e.target);
        if (this.syncEmailName) this.syncEmailName();
        this.save();
      };
      this.addEventListener('input', onEdit);
      this.addEventListener('change', onEdit);

      const go = this.querySelector('[data-mt-bkd-go]');
      if (go) go.addEventListener('click', () => this.openCalendar());

      // Lock Appointo's button (in the hero) until the details are complete. Capture phase runs before
      // Appointo's own click handler on the button.
      this.onDocClick = (event) => {
        if (!isAppointoBtn(event.target)) return;
        if (this.check()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      document.addEventListener('click', this.onDocClick, true);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocClick, true);
    }

    openCalendar() {
      if (!this.check()) return;
      const btn = document.querySelector('[id^="appointo-btn"]');
      if (!btn) {
        this.showError(this.dataset.errCalendar);
        return;
      }
      btn.click();
    }

    check() {
      const f = this.fields;
      const val = (k) => (f[k] ? f[k].value.trim() : '');
      const problems = [];
      const bad = (k, msg) => { if (f[k]) f[k].classList.add('is-invalid'); if (msg && !problems.includes(msg)) problems.push(msg); };

      this.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

      if (val('name').length < 2) bad('name', this.dataset.errName);
      const age = parseInt(val('age'), 10);
      if (!(age > 0 && age < 120)) bad('age', this.dataset.errAge);
      if (!/^[6-9]\d{9}$/.test(val('phone'))) bad('phone', this.dataset.errPhone);
      if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) bad('email', this.dataset.errEmail);
      if (!val('city')) bad('city', this.dataset.errAddress);
      if (!val('taluk')) bad('taluk', this.dataset.errAddress);
      if (!val('state')) bad('state', this.dataset.errAddress);
      if (!/^\d{6}$/.test(val('pincode'))) bad('pincode', this.dataset.errPincode);
      if (f.consent && !f.consent.checked) problems.push(this.dataset.errConsent);

      if (problems.length) {
        this.showError(problems.join(' '));
        const first = this.querySelector('.is-invalid') || f.consent;
        if (first) first.focus({ preventScroll: true });
        return false;
      }
      this.showError('');
      return true;
    }

    showError(text) {
      if (this.errorEl) this.errorEl.textContent = text || '';
    }

    clearMark(el) {
      if (el && el.classList) el.classList.remove('is-invalid');
    }

    save() {
      try {
        const data = {};
        Object.entries(this.fields).forEach(([k, el]) => { if (k !== 'consent') data[k] = el.value; });
        sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
      } catch (e) { /* storage unavailable */ }
    }

    restore() {
      try {
        const data = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}');
        Object.entries(data).forEach(([k, v]) => { if (this.fields[k] && k !== 'consent' && !this.fields[k].value) this.fields[k].value = v; });
      } catch (e) { /* storage unavailable */ }
    }
  }

  customElements.define('mt-booking-details', MtBookingDetails);
})();
