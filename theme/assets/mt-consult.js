/* Marcel consultation booking card: fills the date list with the next open days and shows that day's consultant
   times. Each time opens the booking page with the day and time already chosen (?day=YYYY-MM-DD&slot=10:00 AM).
   Closed weekdays and today's times that start too soon are left out. */
if (!customElements.get('mt-slot-card')) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parse = (slot) => String(slot).match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  const minutes = (slot) => {
    const m = parse(slot);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + Number(m[2] || 0);
  };
  const start = (slot) => {
    const m = parse(slot);
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
        const want = Number(d.days) || 7;
        const lead = Number(d.lead) || 0;
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const days = [];
        for (let i = 0; i < 60 && days.length < want; i += 1) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          if (closed.includes(DOW[day.getDay()].toLowerCase())) continue;
          const open = slots.filter((s) => i > 0 || minutes(s) > nowMin + lead);
          if (open.length) days.push({ i, day, open });
        }

        const select = this.querySelector('[data-mt-slot-date]');
        const times = this.querySelector('[data-mt-slot-times]');
        if (!select || !times || !days.length) return;

        const base = d.url || '#';
        const join = base.includes('?') ? '&' : '?';
        const label = ({ i, day }) => {
          const name = i === 0 && d.today ? d.today : i === 1 && d.tomorrow ? d.tomorrow : DOW[day.getDay()];
          return `${name}, ${day.getDate()} ${MON[day.getMonth()]} ${day.getFullYear()}`;
        };
        select.replaceChildren(...days.map((x, n) => new Option(label(x), String(n))));
        select.disabled = false;

        const draw = () => {
          const x = days[Number(select.value) || 0];
          const iso = `${x.day.getFullYear()}-${pad(x.day.getMonth() + 1)}-${pad(x.day.getDate())}`;
          times.replaceChildren(
            ...x.open.map((s) => {
              const a = document.createElement('a');
              a.href = `${base}${join}day=${iso}&slot=${encodeURIComponent(start(s))}`;
              a.textContent = start(s);
              a.setAttribute('aria-label', `${label(x)}, ${start(s)}`);
              return a;
            })
          );
        };
        select.addEventListener('change', draw);
        draw();
      }
    }
  );
}
