/* Marcel expert consultation: lists the next open days with a few consultant slots. Each time opens the
   booking page with that day and slot already chosen (?day=YYYY-MM-DD&slot=10:00 AM). */
if (!customElements.get('mt-slot-card')) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const minutes = (slot) => {
    const m = String(slot).match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + Number(m[2] || 0);
  };
  const start = (slot) => {
    const m = String(slot).match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    return m ? `${Number(m[1])}:${m[2] || '00'} ${m[3].toUpperCase()}` : String(slot).trim();
  };
  const pad = (n) => String(n).padStart(2, '0');

  customElements.define(
    'mt-slot-card',
    class MtSlotCard extends HTMLElement {
      connectedCallback() {
        const d = this.dataset;
        const slots = String(d.slots || '').split(',').map((s) => s.trim()).filter((s) => minutes(s) !== null);
        const closed = String(d.closed || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
        const want = Number(d.days) || 2;
        const lead = Number(d.lead) || 0;
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const days = [];

        for (let i = 0; i < 21 && days.length < want; i += 1) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          if (closed.includes(DOW[day.getDay()].toLowerCase())) continue;
          const open = slots.filter((s) => i > 0 || minutes(s) > nowMin + lead);
          if (open.length) days.push({ i, day, open });
        }
        const box = this.querySelector('[data-mt-slot-days]');
        if (!box || !days.length || !slots.length) return;

        const base = d.url || '#';
        const join = base.includes('?') ? '&' : '?';
        box.replaceChildren(
          ...days.map(({ i, day, open }) => {
            const wrap = document.createElement('div');
            wrap.className = 'mt-slot-day';
            const label = document.createElement('p');
            label.textContent = i === 0 ? d.today : i === 1 ? d.tomorrow : `${DOW[day.getDay()]}, ${day.getDate()} ${MON[day.getMonth()]}`;
            const list = document.createElement('div');
            list.className = 'mt-slot-times';
            const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
            open.forEach((s) => {
              const a = document.createElement('a');
              a.href = `${base}${join}day=${iso}&slot=${encodeURIComponent(start(s))}`;
              a.textContent = start(s);
              a.setAttribute('aria-label', `${label.textContent}, ${start(s)}`);
              list.append(a);
            });
            wrap.append(label, list);
            return wrap;
          })
        );
      }
    }
  );
}
