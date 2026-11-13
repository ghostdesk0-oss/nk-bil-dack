/* NK Verkstaden — Workshop OS & Guided Tour */
(function () {
  const OS_KEY = 'nk-verkstad-os-v1';
  const TOUR_KEY = 'nk-verkstad-tour-v1';
  const DEMO_KEY = 'nk-demo-v5';

  function swedishNow() {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
  }

  const DEFAULT_JOBS = [
    {
      id: 'NK-1041', reg: 'YTR 418', customer: 'Anders Lindqvist', phone: '070-341 88 12',
      service: 'Säsongsskifte + Däckhotell', note: 'Hämta från Hylla B-14 (Nokian Hakkapeliitta 10, 225/50 R17)',
      time: '09:30', lift: 'Lyft 1 – Däck', status: 'klar', treadMm: 6.5,
      checks: { balanced: true, torqued: true, pressure: true }, mechNote: 'Momentdragna 120 Nm. Fint skick.',
      source: 'Telefon', smsSentAt: '10:05',
    },
    {
      id: 'NK-1042', reg: 'PXC 902', customer: 'Sofia Bergström', phone: '073-612 49 00',
      service: 'Däckskifte & Balansering', note: '205/55 R16 • Kontrollera vänster fram (tappar luft)',
      time: '11:00', lift: 'Lyft 1 – Däck', status: 'pa-lyft', treadMm: 3.4,
      checks: { balanced: true, torqued: false, pressure: false }, mechNote: '3,4 mm kvar – tipsa kunden inför nästa säsong.',
      source: 'Webb', smsSentAt: '',
    },
    {
      id: 'NK-1043', reg: 'KLM 774', customer: 'Mikael Söderlund', phone: '076-229 10 55',
      service: 'Akut Punktering (Drop-in)', note: 'Spik i höger bakdäck, står utanför porten',
      time: '11:45', lift: 'Drop-in', status: 'vantar', treadMm: 5.0,
      checks: { balanced: false, torqued: false, pressure: false }, mechNote: '',
      source: 'Drop-in', smsSentAt: '',
    },
    {
      id: 'NK-1044', reg: 'BGN 310', customer: 'Johan Ekström', phone: '070-884 19 33',
      service: 'Hjulinställning + Nya Vinterdäck', note: '235/45 R18 • 4x Continental VikingContact 8',
      time: '13:30', lift: 'Lyft 2 – Verkstad', status: 'vantar', treadMm: 8.0,
      checks: { balanced: false, torqued: false, pressure: false }, mechNote: '',
      source: 'Webb', smsSentAt: '',
    },
  ];

  const DEFAULT_HOTEL = [
    { id: 'H-01', shelf: 'Hylla A-04', reg: 'PXC 902', customer: 'Sofia Bergström', phone: '073-612 49 00', season: 'Sommar', dim: '205/55 R16', treadMm: 4.8 },
    { id: 'H-02', shelf: 'Hylla B-14', reg: 'YTR 418', customer: 'Anders Lindqvist', phone: '070-341 88 12', season: 'Sommar', dim: '225/50 R17', treadMm: 5.5 },
    { id: 'H-03', shelf: 'Hylla C-08', reg: 'RFT 621', customer: 'Karin Nyström', phone: '072-510 33 78', season: 'Vinter (Dubb)', dim: '215/60 R16', treadMm: 2.8 },
    { id: 'H-04', shelf: 'Hylla D-19', reg: 'ZWA 509', customer: 'Henrik Åkesson', phone: '070-991 44 20', season: 'Vinter (Friktion)', dim: '245/40 R19', treadMm: 6.2 },
  ];

  const TOUR_STEPS = [
    { title: '1/5 • Välkommen till NK Verkstaden', body: 'Här samlas dagens bokningar, lyftar och däckhotell på ett ställe – helt utan papperslappar eller dubbelbokningar.', target: '#nkos-kpis' },
    { title: '2/5 • Dagens körschema & Lyftar', body: 'Flytta bilar mellan Väntar, Lyft 1, Lyft 2 och Klar med ett enda tryck. Alla ser direkt vad som står på lyften.', target: '#nkos-jobs' },
    { title: '3/5 • Snabb loggning direkt på bilen', body: 'Steppa mönsterdjup (mm) med automatisk varning vid slitna däck, bocka av momentdragning (120 Nm) och spara en anteckning.', target: '#nkos-jobs' },
    { title: '4/5 • Lägg in telefonbokning eller drop-in', body: 'Ringer en kund in eller rullar förbi med punktering? Klicka på "+ Ny bokning" så hamnar bilen i schemat på 10 sekunder.', target: '#nkos-btn-new' },
    { title: '5/5 • Klar & skicka SMS med ett klick', body: 'När bilen är färdig trycker du på "Markera klar & skicka SMS" – kunden får direkt besked att bilen är klar på Brynäsgatan 67.', target: '#nkos-jobs' },
  ];

  function loadState() {
    const today = swedishNow().date;
    try {
      const raw = localStorage.getItem(OS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today && Array.isArray(parsed.jobs)) return parsed;
      }
    } catch (_) {}
    return { date: today, jobs: JSON.parse(JSON.stringify(DEFAULT_JOBS)), hotel: JSON.parse(JSON.stringify(DEFAULT_HOTEL)), tab: 'jobs', filter: 'all', query: '' };
  }

  let state = loadState();
  let tourIndex = -1;
  let activeModal = null;

  function saveState() {
    try { localStorage.setItem(OS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function syncFromCustomerDemo() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (!raw) return false;
      const demo = JSON.parse(raw);
      const list = demo.bookings || demo.orders || demo.items || [];
      if (!Array.isArray(list)) return false;
      let changed = false;
      list.forEach((b, idx) => {
        const reg = String(b.reg || b.plate || '').toUpperCase().trim();
        const extId = String(b.id || `WEB-${reg}-${idx}`);
        if (!reg) return;
        const exists = state.jobs.some((j) => j.extId === extId || (j.isNewWeb && j.reg === reg && j.time === (b.time || '14:00')));
        if (!exists && (b.customer || b.name || b.phone || b.note)) {
          state.jobs.unshift({
            id: extId, extId, reg,
            customer: b.customer || b.name || 'Webbkund',
            phone: b.phone || b.tel || '070-000 00 00',
            service: b.service || b.title || 'Onlinebokning (3D / Webb)',
            note: b.note || b.detail || 'Bokad via hemsidan',
            time: b.time || swedishNow().time,
            lift: 'Lyft 1 – Däck', status: 'vantar', treadMm: 6.0,
            checks: { balanced: false, torqued: false, pressure: false },
            mechNote: '', source: 'NY WEBBOKNING', isNewWeb: true, smsSentAt: '',
          });
          changed = true;
        }
      });
      if (changed) saveState();
      return changed;
    } catch (_) { return false; }
  }

  function injectStyles() {
    if (document.getElementById('nkos-styles')) return;
    const style = document.createElement('style');
    style.id = 'nkos-styles';
    style.textContent = `
      a[href*="github.com/ghostdesk0-oss"] { display: none !important; }
      .caps .cap.on, .caps .cap.on * { pointer-events: auto !important; }
      @media (max-width: 430px) {
        .cbar { left: 8px !important; right: 8px !important; width: auto !important; max-width: calc(100vw - 16px) !important; box-sizing: border-box !important; }
        #ccats, #copts { max-width: 100% !important; overflow-x: auto !important; }
      }
      #nkos-root {
        margin: 18px auto 36px; padding: 18px; border-radius: 18px;
        background: linear-gradient(180deg, rgba(22,24,29,0.96), rgba(14,15,19,0.98));
        border: 1px solid rgba(255,255,255,0.10); color: #f4f4f6;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      }
      #nkos-root * { box-sizing: border-box; }
      .nkos-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .nkos-title-wrap h2 { margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; color: #fff; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .nkos-badge-live { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px; background: rgba(34,197,94,0.16); color: #4ade80; border: 1px solid rgba(34,197,94,0.35); }
      .nkos-sub { margin: 4px 0 0; font-size: 0.86rem; color: #a1a1aa; }
      .nkos-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .nkos-btn { min-height: 44px; padding: 0 14px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #f4f4f6; font-size: 0.88rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all .15s ease; }
      .nkos-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.26); }
      .nkos-btn-primary { background: #e4102a; border-color: #ff2e47; color: #fff; box-shadow: 0 6px 20px rgba(228,16,42,0.35); }
      .nkos-btn-primary:hover { background: #c80d24; }
      .nkos-btn-sms { background: rgba(34,197,94,0.16); border-color: rgba(34,197,94,0.45); color: #4ade80; }
      .nkos-btn-sms:hover { background: rgba(34,197,94,0.26); }
      .nkos-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; margin: 16px 0; }
      .nkos-kpi { padding: 13px 14px; border-radius: 13px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
      .nkos-kpi span { display: block; font-size: 0.76rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.04em; }
      .nkos-kpi strong { display: block; margin-top: 4px; font-size: 1.35rem; color: #fff; }
      .nkos-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
      .nkos-tabs, .nkos-filters { display: flex; flex-wrap: wrap; gap: 6px; }
      .nkos-pill { min-height: 38px; padding: 0 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #d4d4d8; font-size: 0.83rem; font-weight: 600; cursor: pointer; }
      .nkos-pill.active { background: #fff; color: #111318; border-color: #fff; }
      .nkos-search { min-height: 42px; min-width: 220px; flex: 1; max-width: 340px; padding: 0 13px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.35); color: #fff; font-size: 0.9rem; }
      .nkos-grid { display: grid; gap: 12px; }
      .nkos-card { padding: 15px; border-radius: 15px; background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.09); }
      .nkos-card.is-new { border-color: rgba(228,16,42,0.65); box-shadow: 0 0 0 1px rgba(228,16,42,0.25); }
      .nkos-card-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
      .nkos-plate-row { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
      .nkos-plate { display: inline-flex; align-items: stretch; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.3); font-weight: 800; font-size: 0.92rem; letter-spacing: 0.06em; }
      .nkos-plate-s { background: #00529b; color: #fff; padding: 3px 6px; font-size: 0.72rem; display: inline-flex; align-items: center; }
      .nkos-plate-num { background: #f4f4f6; color: #111; padding: 3px 9px; }
      .nkos-tag { font-size: 0.75rem; font-weight: 700; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,0.08); color: #e4e4e7; }
      .nkos-tag-new { background: #e4102a; color: #fff; }
      .nkos-tag-done { background: rgba(34,197,94,0.18); color: #4ade80; }
      .nkos-tag-lift { background: rgba(59,130,246,0.2); color: #93c5fd; }
      .nkos-meta { margin: 8px 0 12px; font-size: 0.88rem; color: #d4d4d8; line-height: 1.45; }
      .nkos-meta a { color: #93c5fd; text-decoration: none; font-weight: 600; }
      .nkos-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
      .nkos-box { padding: 10px; border-radius: 11px; background: rgba(0,0,0,0.26); border: 1px solid rgba(255,255,255,0.06); }
      .nkos-box label { display: block; font-size: 0.74rem; color: #a1a1aa; margin-bottom: 6px; font-weight: 600; }
      .nkos-seg { display: flex; flex-wrap: wrap; gap: 5px; }
      .nkos-seg button { min-height: 34px; padding: 0 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #d4d4d8; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
      .nkos-seg button.on { background: #2563eb; border-color: #60a5fa; color: #fff; }
      .nkos-seg button.chk-on { background: rgba(34,197,94,0.22); border-color: #4ade80; color: #86efac; }
      .nkos-stepper { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .nkos-stepper button { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
      .nkos-tread-badge { font-size: 0.76rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
      .nkos-note-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
      .nkos-note-input { flex: 1; min-width: 210px; min-height: 40px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.35); color: #fff; font-size: 0.85rem; }
      .nkos-tour { margin: 14px 0; padding: 15px 16px; border-radius: 14px; background: linear-gradient(135deg, rgba(37,99,235,0.22), rgba(228,16,42,0.16)); border: 1px solid rgba(147,197,253,0.45); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
      .nkos-tour h3 { margin: 0 0 4px; font-size: 1rem; color: #fff; }
      .nkos-tour p { margin: 0; font-size: 0.88rem; color: #e4e4e7; max-width: 620px; }
      .nkos-highlight { outline: 2px solid #60a5fa !important; outline-offset: 4px; border-radius: 14px; }
      .nkos-modal-bg { position: fixed; inset: 0; z-index: 120; background: rgba(0,0,0,0.72); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 16px; }
      .nkos-modal { width: 100%; max-width: 460px; padding: 20px; border-radius: 18px; background: #16181f; border: 1px solid rgba(255,255,255,0.16); color: #fff; }
      .nkos-modal h3 { margin: 0 0 12px; font-size: 1.15rem; }
      .nkos-field { margin-bottom: 10px; }
      .nkos-field label { display: block; font-size: 0.78rem; color: #a1a1aa; margin-bottom: 4px; }
      .nkos-field input, .nkos-field select { width: 100%; min-height: 42px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.16); background: #0d0e12; color: #fff; font-size: 0.92rem; }
      .nkos-toast { position: fixed; bottom: 22px; right: 20px; left: 20px; max-width: 460px; margin: 0 auto; z-index: 140; padding: 14px 16px; border-radius: 14px; background: #111827; border: 1px solid #4ade80; color: #f4f4f6; font-size: 0.88rem; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
    `;
    document.head.appendChild(style);
  }

  function showToast(msg) {
    let el = document.getElementById('nkos-toast');
    if (!el) { el = document.createElement('div'); el.id = 'nkos-toast'; el.className = 'nkos-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 5200);
  }

  function treadBadge(mm) {
    if (mm < 3.0) return `<span class="nkos-tread-badge" style="background:rgba(239,68,68,0.22);color:#fca5a5;">${mm.toFixed(1)} mm • Under lagkrav (3 mm)</span>`;
    if (mm < 4.0) return `<span class="nkos-tread-badge" style="background:rgba(245,158,11,0.22);color:#fcd34d;">${mm.toFixed(1)} mm • Tipsa om nya däck</span>`;
    return `<span class="nkos-tread-badge" style="background:rgba(34,197,94,0.2);color:#86efac;">${mm.toFixed(1)} mm • Bra mönster</span>`;
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function findAdminHost() {
    const tablists = Array.from(document.querySelectorAll('[role="tablist"]'));
    for (const tl of tablists) { if (!tl.closest('#site')) return tl.parentElement; }
    const divs = Array.from(document.querySelectorAll('body > div'));
    return divs.find((d) => d.id !== 'site' && d.textContent && d.textContent.includes('Verkstaden')) || null;
  }

  function render() {
    const host = findAdminHost();
    if (!host) return;
    injectStyles();
    syncFromCustomerDemo();

    let root = document.getElementById('nkos-root');
    if (!root) {
      root = document.createElement('section');
      root.id = 'nkos-root';
      const tablist = host.querySelector('[role="tablist"]');
      if (tablist) host.insertBefore(root, tablist);
      else host.prepend(root);
    }

    if (!localStorage.getItem(TOUR_KEY) && tourIndex === -1 && !host.hidden) tourIndex = 0;

    const activeLiftCount = state.jobs.filter((j) => j.status === 'pa-lyft').length;
    const doneCount = state.jobs.filter((j) => j.status === 'klar').length;
    const hotelUsed = 308 + state.hotel.length;

    const q = state.query.trim().toLowerCase();
    const filteredJobs = state.jobs.filter((j) => {
      if (state.filter !== 'all' && j.status !== state.filter) return false;
      if (!q) return true;
      return [j.reg, j.customer, j.phone, j.service, j.note, j.lift].some((v) => String(v || '').toLowerCase().includes(q));
    });

    const filteredHotel = state.hotel.filter((h) => {
      if (!q) return true;
      return [h.shelf, h.reg, h.customer, h.phone, h.dim, h.season].some((v) => String(v || '').toLowerCase().includes(q));
    });

    const tourHtml = tourIndex >= 0 && TOUR_STEPS[tourIndex] ? `
      <div class="nkos-tour" role="region" aria-label="Snabbguide för verkstaden">
        <div><h3>${esc(TOUR_STEPS[tourIndex].title)}</h3><p>${esc(TOUR_STEPS[tourIndex].body)}</p></div>
        <div class="nkos-actions">
          ${tourIndex > 0 ? `<button type="button" class="nkos-btn" data-nkos-tour="prev">← Tillbaka</button>` : ''}
          <button type="button" class="nkos-btn nkos-btn-primary" data-nkos-tour="next">${tourIndex < TOUR_STEPS.length - 1 ? 'Nästa steg →' : 'Klar, börja jobba ✓'}</button>
          <button type="button" class="nkos-btn" data-nkos-tour="close">Stäng</button>
        </div>
      </div>` : '';

    const jobsHtml = filteredJobs.length ? filteredJobs.map((j) => {
      const statusBadge = j.status === 'klar'
        ? `<span class="nkos-tag nkos-tag-done">Klar${j.smsSentAt ? ` • SMS ${esc(j.smsSentAt)}` : ''}</span>`
        : j.status === 'pa-lyft' ? `<span class="nkos-tag nkos-tag-lift">${esc(j.lift)}</span>` : `<span class="nkos-tag">Väntar • ${esc(j.lift)}</span>`;
      return `
        <article class="nkos-card ${j.isNewWeb ? 'is-new' : ''}">
          <div class="nkos-card-top">
            <div class="nkos-plate-row">
              <span class="nkos-plate"><span class="nkos-plate-s">S</span><span class="nkos-plate-num">${esc(j.reg)}</span></span>
              <strong>${esc(j.customer)}</strong>
              <span class="nkos-tag">Kl ${esc(j.time)}</span>
              ${j.isNewWeb ? `<span class="nkos-tag nkos-tag-new">NY WEBBOKNING</span>` : ''}
              ${statusBadge}
            </div>
            <button type="button" class="nkos-btn nkos-btn-sms" data-nkos-sms="${esc(j.id)}">${j.status === 'klar' ? 'Skicka påminnelse-SMS igen' : 'Markera klar & skicka SMS'}</button>
          </div>
          <div class="nkos-meta"><strong>${esc(j.service)}</strong> — ${esc(j.note)} • Tel: <a href="tel:${esc(j.phone.replace(/[^+\d]/g, ''))}">${esc(j.phone)}</a></div>
          <div class="nkos-controls">
            <div class="nkos-box"><label>Status & Lyftplacering</label>
              <div class="nkos-seg">
                <button type="button" class="${j.status === 'vantar' ? 'on' : ''}" data-nkos-status="${esc(j.id)}:vantar">Väntar</button>
                <button type="button" class="${j.status === 'pa-lyft' && j.lift.includes('Lyft 1') ? 'on' : ''}" data-nkos-lift="${esc(j.id)}:Lyft 1 – Däck">Lyft 1</button>
                <button type="button" class="${j.status === 'pa-lyft' && j.lift.includes('Lyft 2') ? 'on' : ''}" data-nkos-lift="${esc(j.id)}:Lyft 2 – Verkstad">Lyft 2</button>
                <button type="button" class="${j.status === 'klar' ? 'on' : ''}" data-nkos-status="${esc(j.id)}:klar">Klar</button>
              </div>
            </div>
            <div class="nkos-box"><label>Mönsterdjup (mm)</label>
              <div class="nkos-stepper">
                <button type="button" aria-label="Minska mönsterdjup" data-nkos-tread="${esc(j.id)}:-0.5">−</button>
                ${treadBadge(j.treadMm)}
                <button type="button" aria-label="Öka mönsterdjup" data-nkos-tread="${esc(j.id)}:0.5">+</button>
              </div>
            </div>
            <div class="nkos-box"><label>Verkstadscheck (1-tryck)</label>
              <div class="nkos-seg">
                <button type="button" class="${j.checks.balanced ? 'chk-on' : ''}" data-nkos-chk="${esc(j.id)}:balanced">Balanserade ${j.checks.balanced ? '✓' : ''}</button>
                <button type="button" class="${j.checks.torqued ? 'chk-on' : ''}" data-nkos-chk="${esc(j.id)}:torqued">Moment 120 Nm ${j.checks.torqued ? '✓' : ''}</button>
                <button type="button" class="${j.checks.pressure ? 'chk-on' : ''}" data-nkos-chk="${esc(j.id)}:pressure">Lufttryck ${j.checks.pressure ? '✓' : ''}</button>
              </div>
            </div>
          </div>
          <div class="nkos-note-row"><input class="nkos-note-input" type="text" placeholder="Skriv verkstadsanteckning (sparas automatiskt)..." value="${esc(j.mechNote)}" data-nkos-note="${esc(j.id)}" /></div>
        </article>`;
    }).join('') : `<div class="nkos-card">Inga bokningar matchar filtret just nu. Klicka på <strong>+ Ny bokning / Drop-in</strong> för att lägga in en bil.</div>`;

    const hotelHtml = filteredHotel.map((h) => `
      <article class="nkos-card">
        <div class="nkos-card-top">
          <div class="nkos-plate-row">
            <span class="nkos-tag nkos-tag-lift">${esc(h.shelf)}</span>
            <span class="nkos-plate"><span class="nkos-plate-s">S</span><span class="nkos-plate-num">${esc(h.reg)}</span></span>
            <strong>${esc(h.customer)}</strong>
            <span class="nkos-tag">${esc(h.season)} • ${esc(h.dim)}</span>
            ${treadBadge(h.treadMm)}
          </div>
          <button type="button" class="nkos-btn nkos-btn-primary" data-nkos-bookhotel="${esc(h.id)}">Boka säsongsskifte →</button>
        </div>
      </article>`).join('');

    const modalHtml = activeModal === 'new-job' ? `
      <div class="nkos-modal-bg" data-nkos-closemodal="1">
        <form class="nkos-modal" id="nkos-form-job">
          <h3>+ Ny telefonbokning / Drop-in</h3>
          <div class="nkos-field"><label>Registreringsnummer *</label><input name="reg" placeholder="ABC 123" required maxlength="8" /></div>
          <div class="nkos-field"><label>Kundnamn *</label><input name="customer" placeholder="För- och efternamn" required /></div>
          <div class="nkos-field"><label>Mobilnummer (för SMS när bilen är klar) *</label><input name="phone" placeholder="070-123 45 67" required /></div>
          <div class="nkos-field"><label>Tjänst</label><select name="service"><option>Däckskifte (4 hjul)</option><option>Akut Punktering (Drop-in)</option><option>Säsongsskifte + Däckhotell</option><option>Nya däck & balansering</option><option>Hjulinställning</option><option>Service / Bromsar</option></select></div>
          <div class="nkos-field"><label>Lyft / Spår</label><select name="lift"><option>Lyft 1 – Däck</option><option>Lyft 2 – Verkstad</option><option>Drop-in</option></select></div>
          <div class="nkos-field"><label>Tid idag (Gävle)</label><input name="time" value="${esc(swedishNow().time)}" /></div>
          <div class="nkos-field"><label>Anteckning</label><input name="note" placeholder="T.ex. däckdimension eller hyllplats" /></div>
          <div class="nkos-actions" style="margin-top:14px;justify-content:flex-end;">
            <button type="button" class="nkos-btn" data-nkos-closemodal="1">Avbryt</button>
            <button type="submit" class="nkos-btn nkos-btn-primary">Spara i körschemat</button>
          </div>
        </form>
      </div>` : activeModal === 'new-hotel' ? `
      <div class="nkos-modal-bg" data-nkos-closemodal="1">
        <form class="nkos-modal" id="nkos-form-hotel">
          <h3>+ Lägg in däck i Däckhotell</h3>
          <div class="nkos-field"><label>Hyllplats *</label><input name="shelf" placeholder="Hylla B-22" required /></div>
          <div class="nkos-field"><label>Registreringsnummer *</label><input name="reg" placeholder="ABC 123" required maxlength="8" /></div>
          <div class="nkos-field"><label>Kundnamn *</label><input name="customer" placeholder="Kundens namn" required /></div>
          <div class="nkos-field"><label>Mobilnummer</label><input name="phone" placeholder="070-123 45 67" /></div>
          <div class="nkos-field"><label>Säsong</label><select name="season"><option>Sommar</option><option>Vinter (Dubb)</option><option>Vinter (Friktion)</option></select></div>
          <div class="nkos-field"><label>Dimension</label><input name="dim" placeholder="225/45 R17" /></div>
          <div class="nkos-field"><label>Mönsterdjup (mm)</label><input name="treadMm" type="number" step="0.5" value="6.0" /></div>
          <div class="nkos-actions" style="margin-top:14px;justify-content:flex-end;">
            <button type="button" class="nkos-btn" data-nkos-closemodal="1">Avbryt</button>
            <button type="submit" class="nkos-btn nkos-btn-primary">Spara hyllplats</button>
          </div>
        </form>
      </div>` : '';

    root.innerHTML = `
      <div class="nkos-head">
        <div class="nkos-title-wrap">
          <h2>NK Verkstaden • Brynäsgatan 67 <span class="nkos-badge-live">Driftläge Gävle</span></h2>
          <p class="nkos-sub">Enkel översikt för lyftar, däckhotell och automatiska SMS till kund.</p>
        </div>
        <div class="nkos-actions">
          <button type="button" class="nkos-btn" id="nkos-btn-tour">Visa guide</button>
          <button type="button" class="nkos-btn" id="nkos-btn-hotel">+ Däckhotell</button>
          <button type="button" class="nkos-btn nkos-btn-primary" id="nkos-btn-new">+ Ny bokning / Drop-in</button>
        </div>
      </div>
      ${tourHtml}
      <div class="nkos-kpis" id="nkos-kpis">
        <div class="nkos-kpi"><span>Dagens jobb</span><strong>${state.jobs.length} st</strong></div>
        <div class="nkos-kpi"><span>På lyft just nu</span><strong>${activeLiftCount} / 2 lyftar</strong></div>
        <div class="nkos-kpi"><span>Däckhotell</span><strong>${hotelUsed} / 360</strong></div>
        <div class="nkos-kpi"><span>Klara idag</span><strong>${doneCount} st</strong></div>
      </div>
      <div class="nkos-toolbar">
        <div class="nkos-tabs">
          <button type="button" class="nkos-pill ${state.tab === 'jobs' ? 'active' : ''}" data-nkos-tab="jobs">Körschema & Lyftar (${state.jobs.length})</button>
          <button type="button" class="nkos-pill ${state.tab === 'hotel' ? 'active' : ''}" data-nkos-tab="hotel">Däckhotell (${state.hotel.length})</button>
        </div>
        ${state.tab === 'jobs' ? `
          <div class="nkos-filters">
            <button type="button" class="nkos-pill ${state.filter === 'all' ? 'active' : ''}" data-nkos-filter="all">Alla</button>
            <button type="button" class="nkos-pill ${state.filter === 'vantar' ? 'active' : ''}" data-nkos-filter="vantar">Väntar</button>
            <button type="button" class="nkos-pill ${state.filter === 'pa-lyft' ? 'active' : ''}" data-nkos-filter="pa-lyft">På lyft</button>
            <button type="button" class="nkos-pill ${state.filter === 'klar' ? 'active' : ''}" data-nkos-filter="klar">Klara</button>
          </div>` : ''}
        <input class="nkos-search" id="nkos-search" type="search" placeholder="Sök reg.nr, kund, mobil eller hylla..." value="${esc(state.query)}" />
      </div>
      <div class="nkos-grid" id="nkos-jobs">${state.tab === 'jobs' ? jobsHtml : hotelHtml}</div>
      ${modalHtml}`;

    root.querySelectorAll('.nkos-highlight').forEach((el) => el.classList.remove('nkos-highlight'));
    if (tourIndex >= 0 && TOUR_STEPS[tourIndex]) {
      const target = root.querySelector(TOUR_STEPS[tourIndex].target);
      if (target) target.classList.add('nkos-highlight');
    }
  }

  function toggleAdminShortcut() {
    const viewGroup = document.querySelector('[aria-label="Välj vy"]');
    if (!viewGroup) return;
    const btns = Array.from(viewGroup.querySelectorAll('button'));
    if (btns.length < 2) return;
    const adminHost = findAdminHost();
    const isAdminOpen = adminHost && !adminHost.hidden;
    (isAdminOpen ? btns[0] : btns[1]).click();
  }

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'V' || e.key === 'v')) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      toggleAdminShortcut();
    }
  });

  document.addEventListener('click', (e) => {
    const footer = e.target.closest('footer');
    if (footer && !e.target.closest('a, button')) { toggleAdminShortcut(); return; }
    const root = document.getElementById('nkos-root');
    if (!root || !root.contains(e.target)) return;
    if (e.target.closest('#nkos-btn-tour')) { tourIndex = 0; render(); return; }
    if (e.target.closest('#nkos-btn-new')) { activeModal = 'new-job'; render(); return; }
    if (e.target.closest('#nkos-btn-hotel')) { activeModal = 'new-hotel'; render(); return; }
    if (e.target.dataset && e.target.dataset.nkosClosemodal) { activeModal = null; render(); return; }

    const tourAct = e.target.dataset && e.target.dataset.nkosTour;
    if (tourAct) {
      if (tourAct === 'prev') tourIndex = Math.max(0, tourIndex - 1);
      else if (tourAct === 'next') { if (tourIndex < TOUR_STEPS.length - 1) tourIndex += 1; else { tourIndex = -1; localStorage.setItem(TOUR_KEY, '1'); } }
      else if (tourAct === 'close') { tourIndex = -1; localStorage.setItem(TOUR_KEY, '1'); }
      render(); return;
    }

    const tab = e.target.dataset && e.target.dataset.nkosTab;
    if (tab) { state.tab = tab; saveState(); render(); return; }
    const flt = e.target.dataset && e.target.dataset.nkosFilter;
    if (flt) { state.filter = flt; saveState(); render(); return; }

    const st = e.target.dataset && e.target.dataset.nkosStatus;
    if (st) { const [id, val] = st.split(':'); const job = state.jobs.find((j) => j.id === id); if (job) { job.status = val; saveState(); render(); } return; }
    const lf = e.target.dataset && e.target.dataset.nkosLift;
    if (lf) { const [id, liftName] = lf.split(':'); const job = state.jobs.find((j) => j.id === id); if (job) { job.lift = liftName; job.status = 'pa-lyft'; saveState(); render(); } return; }
    const tr = e.target.dataset && e.target.dataset.nkosTread;
    if (tr) {
      const [id, delta] = tr.split(':');
      const job = state.jobs.find((j) => j.id === id);
      if (job) { job.treadMm = Math.max(1.0, Math.min(10.0, Math.round((job.treadMm + parseFloat(delta)) * 10) / 10)); saveState(); render(); }
      return;
    }
    const chk = e.target.dataset && e.target.dataset.nkosChk;
    if (chk) { const [id, key] = chk.split(':'); const job = state.jobs.find((j) => j.id === id); if (job) { job.checks[key] = !job.checks[key]; saveState(); render(); } return; }
    const smsId = e.target.dataset && e.target.dataset.nkosSms;
    if (smsId) {
      const job = state.jobs.find((j) => j.id === smsId);
      if (job) {
        job.status = 'klar'; job.smsSentAt = swedishNow().time; saveState(); render();
        showToast(`SMS skickat till ${job.customer} (${job.phone}): "Hej! Din bil (${job.reg}) är nu klar för hämtning hos NK Bil & Däck på Brynäsgatan 67."`);
      }
      return;
    }
    const hotelId = e.target.dataset && e.target.dataset.nkosBookhotel;
    if (hotelId) {
      const h = state.hotel.find((x) => x.id === hotelId);
      if (h) {
        state.jobs.unshift({
          id: 'NK-' + Math.floor(1050 + Math.random() * 890), reg: h.reg, customer: h.customer, phone: h.phone,
          service: 'Säsongsskifte + Däckhotell', note: `Hämta från ${h.shelf} (${h.season}, ${h.dim})`,
          time: swedishNow().time, lift: 'Lyft 1 – Däck', status: 'vantar', treadMm: h.treadMm,
          checks: { balanced: false, torqued: false, pressure: false }, mechNote: '', source: 'Däckhotell', isNewWeb: true, smsSentAt: '',
        });
        state.tab = 'jobs'; saveState(); render();
        showToast(`Bokning skapad för ${h.reg} (${h.shelf}) i körschemat.`);
      }
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'nkos-search') {
      state.query = e.target.value; saveState(); render();
      const inp = document.getElementById('nkos-search');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      return;
    }
    const noteId = e.target && e.target.dataset && e.target.dataset.nkosNote;
    if (noteId) { const job = state.jobs.find((j) => j.id === noteId); if (job) { job.mechNote = e.target.value; saveState(); } }
  });

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'nkos-form-job') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const reg = String(fd.get('reg') || '').toUpperCase().trim();
      state.jobs.unshift({
        id: 'NK-' + Math.floor(1050 + Math.random() * 890), reg,
        customer: String(fd.get('customer') || '').trim(), phone: String(fd.get('phone') || '').trim(),
        service: String(fd.get('service') || 'Däckskifte'), note: String(fd.get('note') || 'Inlagd i verkstaden').trim(),
        time: String(fd.get('time') || swedishNow().time).trim(), lift: String(fd.get('lift') || 'Lyft 1 – Däck'),
        status: 'vantar', treadMm: 6.0, checks: { balanced: false, torqued: false, pressure: false }, mechNote: '',
        source: 'Verkstad', isNewWeb: true, smsSentAt: '',
      });
      activeModal = null; state.tab = 'jobs'; saveState(); render();
      showToast(`${reg} tillagd i dagens körschema.`);
    }
    if (e.target && e.target.id === 'nkos-form-hotel') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const reg = String(fd.get('reg') || '').toUpperCase().trim();
      const shelf = String(fd.get('shelf') || '').trim();
      state.hotel.unshift({
        id: 'H-' + Math.floor(10 + Math.random() * 89), shelf, reg,
        customer: String(fd.get('customer') || '').trim(), phone: String(fd.get('phone') || '').trim(),
        season: String(fd.get('season') || 'Sommar'), dim: String(fd.get('dim') || '205/55 R16').trim(),
        treadMm: parseFloat(fd.get('treadMm') || '6.0') || 6.0,
      });
      activeModal = null; state.tab = 'hotel'; saveState(); render();
      showToast(`${reg} sparad på ${shelf} i Däckhotellet.`);
    }
  });

  window.addEventListener('storage', (e) => { if (e.key === DEMO_KEY || e.key === OS_KEY) { state = loadState(); render(); } });
  const mo = new MutationObserver(() => {
    const host = findAdminHost();
    if (host && !host.hidden && !document.getElementById('nkos-root')) render();
  });
  function boot() { render(); mo.observe(document.body, { attributes: true, childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();