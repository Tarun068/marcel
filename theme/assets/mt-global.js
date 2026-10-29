/* Marcel OMR Therapy — helpers shared by Marcel sections. */
(() => {
  // Approximate mouth opening in millimetres for each finger count (3 fingers ≈ 45 mm).
  const MM = { 3: 45, 2: 30, 1: 20, 0: 11 };

  function setGauge(el, fingers, caption) {
    if (!el) return;
    const f = MM[fingers] === undefined ? 3 : Number(fingers);
    el.dataset.f = f;
    el.style.setProperty('--mm', MM[f]);
    el.setAttribute('aria-label', `Mouth opening about ${MM[f]} millimetres`);
    const mm = el.querySelector('[data-mt-mm]');
    if (mm) mm.textContent = `≈ ${MM[f]} mm`;
    if (caption) {
      const c = el.querySelector('[data-mt-caption]');
      if (c) c.textContent = caption;
    }
  }

  function storage(key, value) {
    try {
      if (value === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  window.MarcelTheme = { MM, setGauge, storage };
})();
