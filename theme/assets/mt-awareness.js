/* MARCEL habit awareness check (Protection Kit page, client REF pack 2026-11-16).
   Works out an awareness message from the answers in the browser; nothing is sent or stored.
   Answer values: q1 yes, no; q2, q3, q4, q6 yes, no, unsure; q5 yes, no, tried; q7 ready, help, notready;
   "changes" is a list of ticked mouth changes, the last one being "None of these" (data-none). */
if (!customElements.get('mt-awareness')) {
  customElements.define(
    'mt-awareness',
    class MtAwareness extends HTMLElement {
      connectedCallback() {
        try {
          this.t = JSON.parse(this.querySelector('[data-mt-aware-copy]').textContent);
        } catch (e) {
          this.t = {};
        }
        this.form = this.querySelector('form');
        this.out = this.querySelector('[data-mt-aware-result]');
        this.error = this.querySelector('[data-mt-aware-error]');
        if (!this.form || !this.out) return;

        // "None of these" clears the other changes, and ticking a change clears "None of these".
        const boxes = [...this.form.querySelectorAll('input[name="changes"]')];
        const none = boxes.find((b) => b.hasAttribute('data-none'));
        boxes.forEach((b) =>
          b.addEventListener('change', () => {
            if (!b.checked || !none) return;
            if (b === none) boxes.forEach((x) => x !== none && (x.checked = false));
            else none.checked = false;
          })
        );
        this.form.addEventListener('change', () => (this.error.hidden = true));
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.show();
        });
        this.form.addEventListener('reset', () => {
          this.out.hidden = true;
          this.out.innerHTML = '';
          this.error.hidden = true;
        });
      }

      esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      }

      show() {
        const d = new FormData(this.form);
        const v = (k) => d.get(k);
        // Every single-choice question needs an answer, and the changes question needs at least one tick.
        const names = [...new Set([...this.form.querySelectorAll('input[type="radio"]')].map((r) => r.name))];
        const changesAsked = !!this.form.querySelector('input[name="changes"]');
        const changes = d.getAll('changes');
        const missing = names.filter((n) => !v(n));
        if (missing.length || (changesAsked && !changes.length)) {
          this.error.hidden = false;
          const first = missing.length ? this.form.querySelector(`[data-q="${missing[0]}"]`) : this.form.querySelector('[data-q="changes"]');
          if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const t = this.t;
        const paragraphs = [];
        const actions = [];
        const uses = v('q1') === 'yes';
        let title;
        if (!uses) {
          title = t.nonuser_title;
          paragraphs.push(t.nonuser_text);
          actions.push(t.nonuser_act_1, t.nonuser_act_2);
        } else {
          title = t.user_title;
          paragraphs.push(t.user_text);
          actions.push(t.user_act_1, t.user_act_2);
        }
        if (v('q2') === 'yes' || v('q3') === 'yes') paragraphs.push(t.belief_text);
        if (v('q4') !== 'yes' || v('q6') !== 'yes') paragraphs.push(t.aware_text);
        if (v('q5') === 'tried') paragraphs.push(t.tried_text);
        else if (v('q5') === 'no' && uses) paragraphs.push(t.not_tried_text);
        if (v('q7') === 'ready') actions.push(t.ready_act);
        else if (v('q7') === 'help') actions.push(t.help_act);
        else if (v('q7') === 'notready' && uses) actions.push(t.notready_act);

        const noneBox = this.form.querySelector('input[name="changes"][data-none]');
        const noneLabel = noneBox ? noneBox.value : '';
        const real = changes.filter((c) => c !== noneLabel);
        if (real.length) {
          title = t.concern_title;
          paragraphs.push((t.concern_text || '').replace('[list]', real.join('; ')));
          actions.unshift(t.concern_act);
        } else if (changes.includes(noneLabel)) {
          paragraphs.push(t.none_text);
        }

        const list = [...new Set(actions.filter(Boolean))].map((a) => `<li>${this.esc(a)}</li>`).join('');
        this.out.innerHTML =
          `<p class="mt-aware-title">${this.esc(title)}</p>` +
          `<p>${this.esc(paragraphs.filter(Boolean).join(' '))}</p>` +
          `<p class="mt-aware-next">${this.esc(t.next_heading)}</p><ul>${list}</ul>` +
          `<p class="mt-aware-remember">${this.esc(t.remember)}</p>`;
        this.out.hidden = false;
        this.out.focus({ preventScroll: true });
        this.out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  );
}
