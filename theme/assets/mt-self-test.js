/* MARCEL OSMF Self-Check: one question at a time, optional lead step, then the result page.
   Scoring follows the Self-Check Master Matrix v1.0:
   - mouth opening sets the base stage,
   - difficulty moving the tongue (Yes / Often) raises it by one, up to Stage 4,
   - the other four symptoms only feed the symptom summary,
   - under 5 mm plus a persistent ulcer or confirmed carcinoma is Stage 5. */
if (!customElements.get('mt-self-test')) {
  const BASE = { gt35: 1, '26to35': 2, '15to25': 3, lt15: 4, lt5: 4 };
  const FINGERS = { gt35: 3, '26to35': 2, '15to25': 1, lt15: 0, lt5: 0 };
  const SYMPTOMS = ['burning', 'cheek', 'chewing', 'open_difficulty', 'tongue'];
  const LEVEL = { no: 0, occasional: 1, often: 2 };

  customElements.define(
    'mt-self-test',
    class MtSelfTest extends HTMLElement {
      connectedCallback() {
        const json = (sel, fallback) => {
          try {
            return JSON.parse(this.querySelector(sel).textContent);
          } catch (e) {
            return fallback;
          }
        };
        this.questions = json('[data-mt-questions]', []);
        this.copy = json('[data-mt-text]', {});
        this.box = this.querySelector('[data-mt-question]');
        this.leadCard = this.querySelector('[data-mt-lead]');
        this.loading = this.querySelector('[data-mt-analysing]');
        this.bar = this.querySelector('[data-mt-bar]');
        this.counter = this.querySelector('[data-mt-count]');
        this.form = this.querySelector('[data-mt-lead-form]');
        this.answers = {};
        this.step = 0;

        // A link such as ?opening=26to35 (from a home-page shortcut) answers the first question.
        const param = new URLSearchParams(window.location.search).get('opening');
        if (param && BASE[param] !== undefined) {
          this.answers.opening = param;
          this.step = Math.max(0, this.active().findIndex((q) => q.id === 'opening') + 1);
        }

        this.querySelector('[data-mt-back]').addEventListener('click', () => this.back());
        this.box.addEventListener('click', (e) => {
          const opt = e.target.closest('.mt-opt');
          if (opt) this.choose(opt);
        });
        // Pointing at a mouth-opening answer previews its picture; leaving the answers shows the chosen one again.
        this.box.addEventListener('pointerover', (e) => {
          const opt = e.target.closest('.mt-opt[data-q="opening"]');
          if (opt) this.showOpening(opt.dataset.v);
        });
        this.box.addEventListener('pointerout', (e) => {
          const from = e.target.closest('.mt-opt[data-q="opening"]');
          const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.mt-opt[data-q="opening"]') : null;
          if (from && !to && !this.locked) this.showOpening(this.answers.opening);
        });
        if (this.form) {
          this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitLead();
          });
          const phone = this.form.querySelector('[name="contact[phone]"]');
          if (phone) {
            phone.addEventListener('input', () => {
              phone.value = phone.value.replace(/\D/g, '');
              phone.classList.remove('is-invalid');
            });
          }
        }
        const skip = this.querySelector('[data-mt-skip]');
        if (skip) skip.addEventListener('click', () => this.finish());
        this.render();
      }

      /* The ulcer and carcinoma questions only apply when the mouth opens less than 5 mm. */
      active() {
        return this.questions.filter((q) => (q.id !== 'ulcer' && q.id !== 'carcinoma') || this.answers.opening === 'lt5');
      }

      fill(text, n, total) {
        return (text || '').replace('[n]', n).replace('[total]', total);
      }

      esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      }

      render() {
        const qs = this.active();
        const total = qs.length;
        if (this.step > total) this.step = total;
        this.counter.textContent = this.fill(this.copy.of || '[n]/[total]', Math.min(this.step + 1, total), total);
        this.bar.style.width = `${Math.round((this.step / total) * 100)}%`;

        const done = this.step === total;
        this.box.hidden = done;
        this.leadCard.hidden = !done;
        if (done) return;

        const q = qs[this.step];
        const sel = this.answers[q.id];
        const opts = q.options
          .map(
            (o) => `<button type="button" class="mt-opt" data-q="${this.esc(q.id)}" data-v="${this.esc(o.v)}" aria-pressed="${sel === o.v}">
              <span class="mt-opt-radio"><svg class="mt-i" aria-hidden="true"><use href="#mt-i-check"/></svg></span>
              <span><b>${this.esc(o.l)}</b>${o.h ? `<small>${this.esc(o.h)}</small>` : ''}</span></button>`
          )
          .join('');
        const head = `<div class="mt-stack-sm"><span class="mt-eyebrow">${this.esc(this.fill(this.copy.question, this.step + 1, total))}</span>
          <h1 class="mt-test-title">${this.esc(q.q)}</h1>${q.help ? `<p class="mt-test-help">${this.esc(q.help)}</p>` : ''}</div>`;

        if (q.id === 'opening') {
          this.box.innerHTML = `${head}<div class="mt-finger-layout"><div data-mt-gauge-slot></div><div class="mt-test-opts">${opts}</div></div>`;
          const tpl = this.querySelector('[data-mt-photo-template]') || this.querySelector('[data-mt-gauge-template]');
          if (tpl) {
            this.box.querySelector('[data-mt-gauge-slot]').appendChild(tpl.content.cloneNode(true));
            this.showOpening(sel);
          }
        } else {
          this.box.innerHTML = `${head}<div class="mt-test-opts${q.options.length === 4 ? ' mt-test-opts--2' : ''}">${opts}</div>`;
        }
      }

      /* First question: show the photo for an answer (photo mode) or set the finger gauge. No answer yet: the widest opening. */
      showOpening(value) {
        const photos = this.box.querySelector('[data-mt-photos]');
        if (!photos) {
          if (window.MarcelTheme) window.MarcelTheme.setGauge(this.box.querySelector('[data-mt-gauge]'), value === undefined ? 3 : FINGERS[value]);
          return;
        }
        const v = value === undefined ? 'gt35' : value;
        photos.querySelectorAll('.mt-open-photo').forEach((img) => img.classList.toggle('is-on', img.dataset.v === v));
        const q = this.questions.find((x) => x.id === 'opening');
        const o = q && q.options.find((x) => x.v === v);
        const badge = photos.querySelector('[data-mt-photo-badge]');
        if (badge) badge.textContent = o ? o.s || o.l : '';
      }

      choose(opt) {
        if (this.locked) return;
        const id = opt.dataset.q;
        const value = opt.dataset.v;
        this.answers[id] = value;
        if (id === 'opening' && value !== 'lt5') {
          delete this.answers.ulcer;
          delete this.answers.carcinoma;
        }
        this.box.querySelectorAll('.mt-opt').forEach((o) => o.setAttribute('aria-pressed', o === opt));
        if (id === 'opening') this.showOpening(value);
        this.locked = true;
        setTimeout(() => {
          this.locked = false;
          this.step += 1;
          this.render();
          const top = this.getBoundingClientRect().top + window.scrollY - 100;
          if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
        }, id === 'opening' ? 650 : 320);
      }

      back() {
        if (this.step > 0) {
          this.step -= 1;
          this.render();
        } else if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      }

      /* Returns { key, stage, severity } where key is healthy, stage1–stage4, investigate or stage5. */
      compute() {
        const a = this.answers;
        const opening = a.opening || 'gt35';
        const symptoms = SYMPTOMS.map((id) => a[id] || 'no');

        if (opening === 'lt5') {
          const key = a.ulcer === 'yes' || a.carcinoma === 'yes' ? 'stage5' : 'investigate';
          return { key, severity: this.severity(symptoms) };
        }
        let stage = BASE[opening];
        if (a.tongue === 'often') stage = Math.min(4, stage + 1);
        const key = opening === 'gt35' && symptoms.every((s) => s === 'no') ? 'healthy' : `stage${stage}`;
        return { key, severity: this.severity(symptoms) };
      }

      /* Symptom summary: No = mild, Occasional = moderate, Yes / Often = extreme. Never changes the stage. */
      severity(symptoms) {
        const t = this.copy.severity || {};
        if (symptoms.every((s) => s === 'no')) return t.none || 'No symptoms reported';
        const names = [t.mild || 'Mild', t.moderate || 'Moderate', t.extreme || 'Extreme'];
        const levels = symptoms.map((s) => LEVEL[s] || 0);
        const low = Math.min(...levels);
        const high = Math.max(...levels);
        if (low === high) return (t.single || '[level] Symptoms').replace('[level]', names[low]);
        return (t.range || '[from] to [to] Symptoms').replace('[from]', names[low]).replace('[to]', names[high]);
      }

      summary() {
        return this.active()
          .filter((q) => this.answers[q.id] !== undefined)
          .map((q) => {
            const o = q.options.find((x) => x.v === this.answers[q.id]) || {};
            return { id: q.id, short: q.short, answer: o.s || o.l || '' };
          });
      }

      async submitLead() {
        const name = (this.form.querySelector('[name="contact[name]"]') || {}).value || '';
        const phoneInput = this.form.querySelector('[name="contact[phone]"]');
        const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        const error = this.form.querySelector('[data-mt-error]');
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
          if (error) error.hidden = false;
          if (phoneInput) phoneInput.classList.add('is-invalid');
          return;
        }
        if (error) error.hidden = true;
        this.lead = { name: name.trim(), phone };
        if (this.dataset.send === 'true' && (this.lead.name || phone)) {
          const result = this.compute();
          this.form.querySelector('[data-mt-field="result"]').value = result.key;
          this.form.querySelector('[data-mt-field="severity"]').value = result.severity;
          this.form.querySelector('[data-mt-field="answers"]').value = this.summary().map((x) => `${x.short}: ${x.answer}`).join('; ');
          const send = fetch(this.form.action, { method: 'POST', body: new FormData(this.form), headers: { Accept: 'text/html' } }).catch(() => {});
          await Promise.race([send, new Promise((r) => setTimeout(r, 2500))]);
        }
        this.finish();
      }

      finish() {
        const result = this.compute();
        if (window.MarcelTheme) {
          window.MarcelTheme.storage('mt-result', {
            key: result.key,
            severity: result.severity,
            answers: this.answers,
            summary: this.summary(),
            lead: this.lead || {},
            at: Date.now(),
          });
        }
        this.leadCard.hidden = true;
        this.box.hidden = true;
        this.loading.hidden = false;
        this.bar.style.width = '100%';
        setTimeout(() => {
          window.location.href = this.dataset.resultUrl || '/';
        }, 1100);
      }
    }
  );
}
