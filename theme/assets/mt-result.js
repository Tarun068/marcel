/* MARCEL OSMF Self-Check result: shows the outcome saved by the self-check and fills in the visitor's answers. */
if (!customElements.get('mt-result')) {
  customElements.define(
    'mt-result',
    class MtResult extends HTMLElement {
      connectedCallback() {
        this.outcomes = Array.from(this.querySelectorAll('[data-mt-outcome]'));
        this.shared = this.querySelector('[data-mt-shared]');
        this.empty = this.querySelector('[data-mt-empty]');
        this.result = (window.MarcelTheme && window.MarcelTheme.storage('mt-result')) || null;

        // ?r=<outcome> previews one outcome, but only on an unpublished theme, so the live store never shows a result
        // that did not come from the visitor's own answers.
        const forced = new URLSearchParams(window.location.search).get('r');
        const role = window.Shopify && window.Shopify.theme && window.Shopify.theme.role;
        if (forced && role && role !== 'main' && this.outcomes.some((o) => o.dataset.mtOutcome === forced)) {
          this.result = null;
          this.show(forced);
        } else if (this.result && this.result.key) this.show(this.result.key);
        else if (this.dataset.design === 'true' && this.outcomes.length) this.show(this.outcomes[0].dataset.mtOutcome);
        else if (this.empty) this.empty.hidden = false;

        // In the theme editor, selecting a Result block previews it.
        this.onSelect = (e) => {
          const el = e.target && e.target.closest && e.target.closest('[data-mt-outcome]');
          if (el && this.contains(el)) this.show(el.dataset.mtOutcome);
        };
        document.addEventListener('shopify:block:select', this.onSelect);

        this.querySelectorAll('[data-mt-retake]').forEach((a) =>
          a.addEventListener('click', () => {
            try {
              sessionStorage.removeItem('mt-result');
              sessionStorage.removeItem('mt-self-test');
            } catch (e) {}
          })
        );

        this.report = this.querySelector('[data-mt-report]');
        if (this.report) {
          const phone = this.report.querySelector('[name="contact[phone]"]');
          if (this.result && this.result.lead && this.result.lead.phone && phone) phone.value = this.result.lead.phone;
          phone.addEventListener('input', () => {
            phone.value = phone.value.replace(/\D/g, '');
            phone.classList.remove('is-invalid');
          });
          this.report.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendReport();
          });
        }
      }

      disconnectedCallback() {
        document.removeEventListener('shopify:block:select', this.onSelect);
      }

      esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      }

      show(key) {
        const target = this.outcomes.find((o) => o.dataset.mtOutcome === key) || this.outcomes[0];
        if (!target) return;
        this.current = target;
        this.outcomes.forEach((o) => (o.hidden = o !== target));
        if (this.empty) this.empty.hidden = true;
        if (this.shared) this.shared.hidden = false;
        const r = this.result || {};

        const chips = target.querySelector('[data-mt-chips]');
        if (chips) {
          const html = (r.summary || []).map((x) => `<span>${this.esc(x.short)}: <b>${this.esc(x.answer)}</b></span>`).join('');
          chips.innerHTML = html;
          chips.parentElement.hidden = !html;
        }

        // Gauge: the visitor's mouth-opening band, or the band that matches the result in the theme editor.
        const FINGERS = { gt35: 3, '26to35': 2, '15to25': 1, lt15: 0, lt5: 0 };
        const byKey = { healthy: 3, stage1: 3, stage2: 2, stage3: 1, stage4: 0, investigate: 0, stage5: 0 };
        const opening = r.answers && r.answers.opening;
        const fingers = FINGERS[opening] !== undefined ? FINGERS[opening] : byKey[key] !== undefined ? byKey[key] : 3;
        if (window.MarcelTheme) window.MarcelTheme.setGauge(target.querySelector('[data-mt-gauge]'), fingers);

        const severity = target.querySelector('[data-mt-severity]');
        if (severity) {
          severity.textContent = r.severity || '';
          severity.closest('[data-mt-severity-row]').hidden = !r.severity;
        }

        const title = (target.querySelector('.mt-result-title span') || {}).textContent || '';
        const text = (this.dataset.waText || '').replace('[result]', title);
        target.querySelectorAll('[data-mt-wa]').forEach((a) => {
          if (this.dataset.wa) a.href = `https://wa.me/${this.dataset.wa}?text=${encodeURIComponent(text)}`;
        });
      }

      async sendReport() {
        const phone = this.report.querySelector('[name="contact[phone]"]');
        const error = this.report.querySelector('[data-mt-error]');
        const done = this.report.querySelector('[data-mt-done]');
        const value = phone.value.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(value)) {
          error.hidden = false;
          phone.classList.add('is-invalid');
          return;
        }
        error.hidden = true;
        const title = this.current ? (this.current.querySelector('.mt-result-title span') || {}).textContent : '';
        this.report.querySelector('[data-mt-field="result"]').value = title || '';
        const sev = this.report.querySelector('[data-mt-field="severity"]');
        if (sev) sev.value = (this.result && this.result.severity) || '';
        this.report.querySelector('[data-mt-field="answers"]').value = ((this.result && this.result.summary) || []).map((x) => `${x.short}: ${x.answer}`).join('; ');
        const button = this.report.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        await fetch(this.report.action, { method: 'POST', body: new FormData(this.report), headers: { Accept: 'text/html' } }).catch(() => {});
        done.hidden = false;
        if (button) button.hidden = true;
      }
    }
  );
}
