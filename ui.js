// ui.js: the app shell: tabs, sidebar, info panel, tooltip, zoom buttons, scale bar,
// keyboard shortcuts and (later) Presentation Mode. Loaded last; starts the app.
'use strict';

const App = (() => {
  const D = window.DATA;
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const VIEW_ORDER = ['terra', 'civitas', 'historia', 'fabulae'];
  const TYPE_NAMES = {
    capital: 'Capital city', city: 'City', town: 'Town', palace: 'Royal residence', sacred: 'Sacred site', prison: 'Prison',
    military: 'Naval camp', mine: 'Mine', port: 'Port and trade hub', market: 'Hidden market', ruin: 'Ruins', oilfield: 'Abandoned oil field',
    farm: 'Farm town', forest: 'Forest town', wetland: 'Wetlands', fishing: 'Fishing village', summit: 'Summit', danger: 'Danger',
    quarter: 'Borough of Nova Cella', rehab: 'Rehabilitation town', camp: 'Outlaw camp', treasury: 'Treasury', carbon: 'Carbon plant',
    timber: 'Timber wharf', rig: 'Oil rig', station: 'Research station', facility: 'Research facility',
  };
  const SOC = D.society || { topics: {}, relevantTopics: {} };
  function topicsHTML(keys) {
    const ts = [...new Set(keys)].map(k => SOC.topics[k]).filter(Boolean);
    if (!ts.length) return '';
    return `<h4>Laws and customs</h4>${ts.map(t => `
      <details class="topic"><summary>${esc(t.title)}</summary>
        ${t.text ? `<p>${esc(t.text)}</p>` : ''}${t.list ? `<ul class="bullets">${t.list.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${t.note ? `<p class="muted">${esc(t.note)}</p>` : ''}
      </details>`).join('')}`;
  }

  const AC1 = D.meta.calendar.yearOneCE, PRESENT_CE = AC1 + D.meta.presentYearAC - 1;
  let map, current = null;

  // The year shown in the top bar (Common Era before Cilla, Anno Cillae after)
  function setYear(ce) {
    $('#yearDisplay').innerHTML = ce >= AC1
      ? `<span>Anno Cillae</span> <strong>${ce - AC1 + 1}</strong> <small>${ce} CE</small>`
      : `<span>Common Era</span> <strong>${ce}</strong> <small>${AC1 - ce} yrs before Cilla</small>`;
  }

  function start() {
    map = new MapView($('#map'));
    App.map = map;

    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));
    $('#infoClose').addEventListener('click', closeInfo);
    $('#zoomIn').addEventListener('click', () => map.zoomAt(map.width / 2, map.height / 2, 1.5));
    $('#zoomOut').addEventListener('click', () => map.zoomAt(map.width / 2, map.height / 2, 1 / 1.5));
    $('#zoomHome').addEventListener('click', () => map.flyHome(700));
    $('#sidebarToggle').addEventListener('click', () => { document.body.classList.toggle('sidebar-hidden'); setTimeout(() => { map.resize(); map.requestRender(); }, 260); });
    $('#presentBtn').addEventListener('click', () => Presentation.running ? Presentation.stop() : Presentation.start());
    setYear(PRESENT_CE);

    $('#settingsBtn').addEventListener('click', () => openSettings());
    loadSettings(); applySettings(); buildSettings();

    map.on('hover', onHover);
    map.on('click', (info) => { if (current && current.click) current.click(info); });
    map.on('camera', updateScale);
    document.addEventListener('keydown', onKey);

    switchView('terra');
    updateScale();
    if (document.fonts) document.fonts.ready.then(() => map.requestRender());
    requestAnimationFrame(() => { const s = $('#splash'); s.classList.add('done'); setTimeout(() => s.remove(), 500); });
  }

  // ------------------------------------------------------------------ views
  function switchView(id) {
    const v = Views[id];
    if (!v) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === id));
    document.body.dataset.view = id;
    const banner = $('#comingSoon');
    if (v.comingSoon) {
      banner.hidden = false;
      banner.innerHTML = `<div class="cs-kicker">${esc(v.name)}</div><h2>${esc(v.comingSoon.title)}</h2><p>${esc(v.comingSoon.text)}</p><p class="muted">Coming in Phase ${v.comingSoon.phase}. The Terra map is shown for now.</p>`;
      current = Views.terra;
    } else {
      banner.hidden = true;
      current = v;
    }
    setYear(PRESENT_CE); // views with their own clock (Historia, Civitas) override this in activate()
    const sb = $('#sidebarContent'); sb.innerHTML = '';
    if (current.buildSidebar) current.buildSidebar(sb);
    map.setView(current);
    hideTooltip();
  }

  // ------------------------------------------------------------------ hover tooltip
  let tipFrame = 0, lastHover = null;
  function onHover(info) {
    lastHover = info;
    if (tipFrame) return;
    tipFrame = requestAnimationFrame(() => {
      tipFrame = 0;
      const h = lastHover;
      if (!h || !current || !current.describe) { hideTooltip(); return; }
      if (!settings.tooltips) { hideTooltip(); const ll = Terrain.toLatLon(h.x, h.y); $('#coords').textContent = Terrain.formatLatLon(ll.lat, ll.lon); return; }
      const d = current.describe(h.x, h.y);
      const ll = Terrain.toLatLon(h.x, h.y);
      $('#coords').textContent = Terrain.formatLatLon(ll.lat, ll.lon);
      map.canvas.style.cursor = current.hitTest && current.hitTest(h.sx, h.sy) ? 'pointer' : '';
      if (!d) { hideTooltip(); return; }
      const tip = $('#tooltip');
      tip.innerHTML = `<div class="tt-title">${d.color ? `<span class="tt-dot" style="background:${d.color}"></span>` : ''}${esc(d.title)}</div>${d.lines.map(l => `<div class="tt-line">${esc(l)}</div>`).join('')}`;
      tip.hidden = false;
      const r = tip.getBoundingClientRect(), W = map.width, H = map.height;
      let x = h.sx + 18, y = h.sy + 18;
      if (x + r.width > W - 8) x = h.sx - r.width - 14;
      if (y + r.height > H - 8) y = h.sy - r.height - 14;
      tip.style.transform = `translate(${x}px, ${y}px)`;
    });
  }
  function hideTooltip() { $('#tooltip').hidden = true; }

  // ------------------------------------------------------------------ info panel
  function showInfo({ kicker = '', title, subtitle = '', color = null, body = '', icon = null }) {
    const c = $('#infoContent');
    c.innerHTML = `
      ${color ? `<div class="info-band" style="background:${color}"></div>` : ''}
      <div class="info-head">
        ${icon ? `<span class="info-icon" data-icon="${icon}"></span>` : ''}
        <div><div class="info-kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${subtitle ? `<div class="info-sub">${esc(subtitle)}</div>` : ''}</div>
      </div>
      <div class="info-body">${body}</div>`;
    const ic = c.querySelector('[data-icon]'); if (ic) ic.appendChild(Icons.toCanvas(ic.dataset.icon, 40));
    c.querySelectorAll('[data-place]').forEach(b => b.addEventListener('click', () => {
      const p = Settlements.byId[b.dataset.place]; map.flyTo(p.pos[0], p.pos[1], Math.max(map.zoom, 3), 900); showPlace(p);
    }));
    c.querySelectorAll('[data-district]').forEach(b => b.addEventListener('click', () => showDistrict(b.dataset.district, true)));
    $('#infoPanel').scrollTop = 0;
    document.body.classList.add('info-open');
  }
  function closeInfo() { document.body.classList.remove('info-open'); }

  function districtBody(d) {
    const places = Settlements.all.filter(p => p.district === d.id && (p.tier || p.population >= 50000 || p.type === 'mine'));
    const ruler = d.ruler
      ? `${esc(d.ruler.name)}<small>${esc(d.ruler.title)}${d.ruler.origin ? ` · ${esc(d.ruler.origin)}-origin name` : ''}</small>`
      : esc(d.rulerNote || 'None');
    return `
      <dl class="facts">
        ${d.location ? `<dt>Location</dt><dd class="plain">${esc(d.location)}</dd>` : ''}
        <dt>District Ruler</dt><dd>${ruler}${d.ruler && d.rulerNote ? `<small>${esc(d.rulerNote)}</small>` : ''}</dd>
        <dt>Population</dt><dd>${d.population ? fmt(d.population) : '-'}<small>${esc(d.populationNote ? d.populationNote + ' · ' : '')}Year ${D.meta.presentYearAC} AC</small></dd>
        ${d.royalZone ? '<dt>Status</dt><dd><span class="badge copper">Royal Zone</span><small>Entry only with government permission</small></dd>' : ''}
        <dt>Real geography</dt><dd class="plain">${esc(d.geography)}</dd>
      </dl>
      <h4>From the records</h4>
      <blockquote>${esc(d.description)}</blockquote>
      <h4>Key facts</h4>
      <ul class="bullets">${d.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      ${d.metals ? `<h4>Metals mined</h4><div class="chips">${d.metals.map(m => `<span class="chip">${esc(m)}</span>`).join('')}</div>` : ''}
      ${current && current.districtExtra ? current.districtExtra(d) : ''}
      ${places.length ? `<h4>Places</h4><div class="place-list">${places.map(p => `<button data-place="${p.id}"><span class="pl-icon" data-pl-icon="${p.type}"></span><span>${esc(p.name)}<small>${esc(TYPE_NAMES[p.type] || p.type)}${p.population ? ` · ${fmt(p.population)}` : ''}</small></span></button>`).join('')}</div>` : ''}
      ${topicsHTML(SOC.relevantTopics[d.id] || [])}`;
  }

  function showDistrict(id, fly = false) {
    const d = Land.byId[id]; if (!d) return;
    if (fly) map.flyTo(d.label[0], d.label[1], Math.max(map.zoom, 2.2), 900);
    showInfo({ kicker: d.kind, title: d.name, subtitle: d.summary, color: d.color, body: districtBody(d) });
    document.querySelectorAll('#infoContent [data-pl-icon]').forEach(s => s.appendChild(Icons.toCanvas(s.dataset.plIcon, 26)));
  }

  // a sentence for generated towns, which have no written description
  function townBlurb(p, d) {
    const n = d ? d.name : 'Oppressus';
    return ({
      quarter: `One of the crowded boroughs of Nova Cella, the capital, which together hold about 14 million people.`,
      farm: `A farming town on the strangely fertile plains of ${n}.`,
      forest: `A town built around the protected forest of ${n}.`,
      mine: `A mining town of ${n}.`,
      fishing: `A fishing village on the ${n}.`,
      military: `A naval training camp of the ${n}, closed to ordinary citizens except on tours.`,
      rehab: `A village of small homes where prisoners are rehabilitated, in the Swedish style.`,
      camp: `A hideout of the fugitives of ${n}.`,
      ruin: `An abandoned village on the coast of ${n}. Nobody lives here any more.`,
      town: `A town of ${n}.`,
    })[p.type] || `A settlement of ${n}.`;
  }

  function showPlace(p) {
    const d = Land.byId[p.district];
    const ruler = d && d.ruler && d.seat === p.id ? d.ruler : null;
    showInfo({
      kicker: TYPE_NAMES[p.type] || 'Place', title: p.name, icon: p.type, color: d && d.color,
      subtitle: d ? `${d.name} district` : '',
      body: `
        <p>${esc(p.description || townBlurb(p, d))}</p>
        <dl class="facts">
          ${p.population ? `<dt>Population</dt><dd>${fmt(current && current.livePop ? current.livePop(p) : p.population)}${p.estimated ? '<small>An estimate; nobody really knows</small>' : ''}</dd>` : ''}
          ${p.abandoned ? '<dt>Status</dt><dd>Abandoned</dd>' : ''}
          ${p.produces ? `<dt>Mines</dt><dd class="plain">${p.produces.map(esc).join(', ')}</dd>` : ''}
          ${ruler ? `<dt>Seat of</dt><dd>${esc(ruler.name)}<small>${esc(ruler.title)}</small></dd>` : ''}
          ${p.royalZone ? '<dt>Status</dt><dd><span class="badge copper">Royal Zone</span></dd>' : ''}
          <dt>Elevation</dt><dd>${fmt(Math.max(0, Terrain.elevationAt(...p.pos)))} m</dd>
          <dt>Location</dt><dd>${(() => { const ll = Terrain.toLatLon(...p.pos); return Terrain.formatLatLon(ll.lat, ll.lon); })()}</dd>
        </dl>
        ${current && current.placeExtra ? current.placeExtra(p) : ''}
        ${topicsHTML(SOC.relevantTopics[p.type] || [])}
        ${d ? `<button class="link-btn" data-district="${d.id}">About the ${esc(d.name)} district →</button>` : ''}`,
    });
  }

  // ------------------------------------------------------------------ scale bar
  function updateScale() {
    const kmPerScreenPx = Terrain.kmPerPx / map.cam.scale;
    const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
    let km = nice[0];
    for (const n of nice) { if (n / kmPerScreenPx <= 170) km = n; }
    $('#scaleBar').style.width = `${km / kmPerScreenPx}px`;
    $('#scaleLabel').textContent = `${km.toLocaleString()} km`;
  }

  // ------------------------------------------------------------------ settings and accessibility
  const DEFAULTS = { textScale: 1, theme: 'dark', vision: 'none', contrast: false, motion: false, plainFonts: false, tooltips: true };
  let settings = { ...DEFAULTS };
  const STORE = 'oppressus-settings';
  function loadSettings() {
    try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch (e) { settings = { ...DEFAULTS }; }
    try { if (!localStorage.getItem(STORE) && matchMedia('(prefers-reduced-motion: reduce)').matches) settings.motion = true; } catch (e) { /* ignore */ }
  }
  function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) { /* private window: settings just aren't remembered */ } }

  // Daltonization: shift the colours each kind of colour-vision difference can't tell apart into ones it can.
  // corrected = I + E (I - S), with S = Machado et al. (2009) simulation matrices (linear RGB).
  const CVD_SIM = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
  };
  const CVD_SHIFT = { protan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]], deutan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]], tritan: [[1, 0, 0.7], [0, 1, 0.7], [0, 0, 0]] };
  function setupFilters() {
    for (const k of Object.keys(CVD_SIM)) {
      const S = CVD_SIM[k], E = CVD_SHIFT[k], M = [];
      for (let r = 0; r < 3; r++) {
        M.push([0, 1, 2].map(c => (r === c ? 1 : 0) + [0, 1, 2].reduce((s, j) => s + E[r][j] * ((j === c ? 1 : 0) - S[j][c]), 0)));
      }
      const v = M.map(row => `${row.map(x => x.toFixed(4)).join(' ')} 0 0`).join('  ') + '  0 0 0 1 0';
      const fm = document.querySelector(`#cvd-${k} feColorMatrix`); if (fm) fm.setAttribute('values', v);
    }
  }

  function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', settings.textScale);
    root.dataset.theme = settings.theme;
    if (settings.contrast) root.dataset.contrast = 'high'; else delete root.dataset.contrast;
    if (settings.motion) root.dataset.motion = 'reduce'; else delete root.dataset.motion;
    if (settings.plainFonts) root.dataset.fonts = 'plain'; else delete root.dataset.fonts;
    const app = $('.app');
    app.classList.remove('cvd-protan', 'cvd-deutan', 'cvd-tritan', 'cvd-mono');
    if (settings.vision !== 'none') app.classList.add(`cvd-${settings.vision}`);
    Object.assign(Prefs, { textScale: settings.textScale, plainFonts: settings.plainFonts, highContrast: settings.contrast, reduceMotion: settings.motion });
    if (map) setTimeout(() => { map.resize(); map.requestRender(); updateScale(); }, 30);
    saveSettings();
  }

  function buildSettings() {
    setupFilters();
    const seg = (key, options) => `<div class="seg" role="radiogroup">${options.map(([v, label, extra]) => `<button type="button" role="radio" data-k="${key}" data-v="${v}" ${extra || ''}>${label}</button>`).join('')}</div>`;
    const tog = (key, label, help) => `<label class="toggle"><input type="checkbox" data-t="${key}"><span class="sw"></span><span><strong>${label}</strong><small>${help}</small></span></label>`;
    $('#settingsForm').innerHTML = `
      <header class="set-head"><h2 id="settingsTitle">Settings</h2><button class="info-close" value="close" aria-label="Close settings">×</button></header>
      <section><h3>Text size</h3>${seg('textScale', [[0.9, '<span style="font-size:0.85em">A</span> Small'], [1, 'A Normal'], [1.15, '<span style="font-size:1.1em">A</span> Large'], [1.3, '<span style="font-size:1.2em">A</span> Larger'], [1.5, '<span style="font-size:1.3em">A</span> Largest']])}
        <p class="set-help">Changes the text on the map and in every panel. Larger sizes are easier to read from the back of a classroom.</p></section>
      <section><h3>Theme</h3>${seg('theme', [['dark', 'Dark'], ['light', 'Light']])}
        <p class="set-help">Light panels are often clearer on projectors in bright rooms.</p></section>
      <section><h3>Color vision</h3>${seg('vision', [['none', 'Standard'], ['protan', 'Red-weak'], ['deutan', 'Green-weak'], ['tritan', 'Blue-weak'], ['mono', 'Grayscale']])}
        <p class="set-help">Filters for color-vision differences (protanopia, deuteranopia, tritanopia). They shift colors that are hard to tell apart into colors that are easier to tell apart. Every color on the map also has a name, label or pattern.</p></section>
      <section><h3>Comfort</h3>
        ${tog('contrast', 'High contrast', 'Brighter text, thicker lines and stronger outlines')}
        ${tog('motion', 'Reduce motion', 'No sliding, zooming or pulsing animations')}
        ${tog('plainFonts', 'Plain fonts', 'Use one simple font everywhere instead of the Roman capitals')}
        ${tog('tooltips', 'Hover information', 'Show details when the mouse is over the map')}
      </section>
      <section><h3>Keyboard shortcuts</h3>
        <table class="keys"><tbody>
          <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></td><td>Terra, Civitas, Historia, Fabulae</td></tr>
          <tr><td><kbd>+</kbd> <kbd>−</kbd></td><td>Zoom in and out</td></tr>
          <tr><td><kbd>0</kbd></td><td>Show the whole map</td></tr>
          <tr><td><kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd></td><td>Move the map</td></tr>
          <tr><td><kbd>Space</kbd></td><td>Play or pause (Historia and Civitas)</td></tr>
          <tr><td><kbd>[</kbd> <kbd>]</kbd></td><td>Previous or next chapter (Historia) · one more year (Civitas)</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close the information panel</td></tr>
          <tr><td><kbd>?</kbd></td><td>Open these settings</td></tr>
          <tr><td colspan="2"><strong>During Presentation Mode</strong></td></tr>
          <tr><td><kbd>Space</kbd></td><td>Pause or resume the tour</td></tr>
          <tr><td><kbd>→</kbd> <kbd>←</kbd></td><td>Next or previous slide (a clicker's buttons work too)</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Stop presenting</td></tr>
        </tbody></table>
        <p class="set-help">Every button can also be reached with <kbd>Tab</kbd> and pressed with <kbd>Enter</kbd>.</p>
      </section>
      <footer class="set-foot"><button type="button" class="civ-btn" id="settingsReset">Reset to defaults</button><button class="civ-btn primary" value="close">Done</button></footer>`;
    const form = $('#settingsForm');
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const v = b.dataset.v; settings[b.dataset.k] = isNaN(+v) ? v : +v;
      applySettings(); syncSettings();
    });
    form.querySelectorAll('[data-t]').forEach(inp => inp.addEventListener('change', () => { settings[inp.dataset.t] = inp.checked; applySettings(); }));
    $('#settingsReset').addEventListener('click', () => { settings = { ...DEFAULTS }; applySettings(); syncSettings(); });
    syncSettings();
  }
  function syncSettings() {
    document.querySelectorAll('#settingsForm [data-k]').forEach(b => b.setAttribute('aria-checked', String(String(settings[b.dataset.k]) === b.dataset.v)));
    document.querySelectorAll('#settingsForm [data-t]').forEach(inp => { inp.checked = !!settings[inp.dataset.t]; });
  }
  function openSettings(toKeys) {
    const d = $('#settings'); if (d.open) return;
    syncSettings(); d.showModal();
    if (toKeys) d.querySelector('.keys').scrollIntoView();
  }

  // ------------------------------------------------------------------ Presentation Mode
  // A hands-free tour: introduction, the Historia chapters, Civitas, the future, then the Fabulae stories.
  const Presentation = (() => {
    const P = D.presentation, SEC = P.seconds;
    let steps = [], idx = 0, elapsed = 0, paused = false, running = false, raf = 0, last = 0, el = null;
    const ensureView = (id) => { if (document.body.dataset.view !== id || (current && current.id !== id)) switchView(id); };
    const ease = (g) => g < 0.5 ? 2 * g * g : 1 - Math.pow(-2 * g + 2, 2) / 2;

    function build() {
      const s = [], C = Views.civitas, F = Views.fabulae, H = Views.historia, chapters = D.history.chapters;
      s.push({ section: 'Welcome', title: P.intro.title, text: P.intro.text, dur: SEC.intro, enter() { ensureView('terra'); closeInfo(); map.flyHome(1200); } });
      chapters.forEach((c, k) => {
        const from = k ? chapters[k - 1].year : c.year;
        s.push({
          section: 'Historia', kicker: `Chapter ${k + 1} of ${chapters.length} · ${c.range}`, title: c.title, text: c.caption, dur: SEC.chapter,
          enter() { ensureView('historia'); closeInfo(); map.flyHome(700); H.stop(); H.setYear(from); },
          update(t) { const g = Math.min(1, t / 4.5); H.setYear(Math.round(from + (c.year - from) * ease(g)), { settle: g >= 1 }); },
        });
      });
      P.civitas.forEach((c, k) => s.push({
        section: 'Civitas', title: c.title, text: c.text, dur: c.panel === 'family' ? SEC.family : SEC.civitas,
        enter() {
          ensureView('civitas'); closeInfo(); C.pause(); if (k === 0) C.reset();
          C.closeLineage(); C.setLayer('economy', !!c.economy);
          if (c.focus) showDistrict(c.focus, true); else map.flyHome(900);
          if (c.panel) C.openLineage(c.panel, c.family || 0);
        },
      }));
      s.push({
        section: 'Civitas', title: P.simulate.title, text: P.simulate.text, dur: SEC.simulate,
        enter() { ensureView('civitas'); closeInfo(); C.closeLineage(); C.setLayer('economy', false); C.reset(); map.flyHome(800); this.done = 0; this.live = ''; },
        update(t) {
          const target = Math.floor(Math.min(1, t / (SEC.simulate - 3)) * P.simulate.years);
          while (this.done < target) { C.step(); this.done++; }
          const ev = C.sim.log.filter(e => e.major).slice(-1)[0];
          this.live = `Year ${C.sim.ac} AC${ev ? ` · ${ev.title}` : ''}`;
        },
      });
      const tour = P.stories.map(id => F.stories.find(x => x.id === id)).filter(Boolean);
      tour.forEach((st, k) => s.push({
        section: 'Fabulae', kicker: `Story ${k + 1} of ${tour.length} · ${Land.byId[st.district].name}`, title: st.title, text: '', dur: SEC.story,
        enter() { ensureView('fabulae'); F.setFilter('all'); F.showStory(st.id); },
      }));
      s.push({ section: 'The end', title: P.end.title, text: P.end.text, dur: SEC.end, enter() { ensureView('fabulae'); closeInfo(); map.flyHome(1200); } });
      return s;
    }

    function ui() {
      if (el) return el;
      el = document.createElement('div');
      el.className = 'present-overlay';
      el.innerHTML = `
        <div class="pres-caption" aria-live="polite"><div class="pres-kicker"></div><h2></h2><p></p><div class="pres-live"></div></div>
        <div class="pres-bar" role="toolbar" aria-label="Presentation controls">
          <button class="tl-btn" data-p="prev" title="Previous (←)" aria-label="Previous"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor"/></svg></button>
          <button class="tl-btn tl-play" data-p="pause" title="Pause or resume (Space)" aria-label="Pause"><svg viewBox="0 0 24 24" width="20" height="20"><path class="ico-play" d="M7 5l12 7-12 7z" fill="currentColor"/><path class="ico-pause" d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg></button>
          <button class="tl-btn" data-p="next" title="Next (→)" aria-label="Next"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor"/></svg></button>
          <div class="pres-where"><span class="pres-section"></span><span class="pres-count"></span><div class="pres-progress"><span></span></div></div>
          <button class="civ-btn" data-p="exit" title="Stop the presentation (Esc)">Exit</button>
        </div>`;
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        ({ prev, next, pause: togglePause, exit: stop })[b.dataset.p]();
      });
      document.querySelector('.map-wrap').appendChild(el);
      return el;
    }

    function show(st) {
      const o = ui();
      o.querySelector('.pres-kicker').textContent = st.kicker || st.section;
      o.querySelector('h2').textContent = st.title;
      o.querySelector('p').textContent = st.text || '';
      o.querySelector('p').hidden = !st.text;
      o.querySelector('.pres-live').textContent = '';
      o.querySelector('.pres-section').textContent = st.section;
      o.querySelector('.pres-count').textContent = `${idx + 1} / ${steps.length}`;
      o.classList.toggle('story', st.section === 'Fabulae');
    }
    function enter() { elapsed = 0; const st = steps[idx]; show(st); st.enter(); }
    function loop(t) {
      if (!running) return;
      const dt = Math.min(0.25, (t - last) / 1000); last = t;
      const st = steps[idx];
      if (!paused) {
        elapsed += dt;
        if (st.update) st.update(elapsed);
        if (st.live !== undefined) el.querySelector('.pres-live').textContent = st.live;
        if (elapsed >= st.dur) { if (idx < steps.length - 1) { idx++; enter(); } else { stop(); return; } }
      }
      el.querySelector('.pres-progress span').style.width = `${Math.min(100, elapsed / steps[idx].dur * 100)}%`;
      raf = requestAnimationFrame(loop);
    }
    function start() {
      steps = build(); idx = 0; paused = false; running = true;
      document.body.classList.add('presenting');
      ui().hidden = false; ui().classList.remove('paused');
      $('#presentBtn .label').textContent = 'Stop presenting';
      setTimeout(() => { map.resize(); map.requestRender(); }, 300);
      enter(); last = performance.now(); raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false; cancelAnimationFrame(raf);
      document.body.classList.remove('presenting');
      if (el) el.hidden = true;
      $('#presentBtn .label').textContent = 'Presentation Mode';
      Views.civitas.closeLineage();
      setTimeout(() => { map.resize(); map.requestRender(); }, 300);
    }
    function next() { if (idx < steps.length - 1) { idx++; enter(); } }
    function prev() { if (idx > 0) { idx--; enter(); } }
    function togglePause() { paused = !paused; el.classList.toggle('paused', paused); }
    return { start, stop, next, prev, togglePause, get running() { return running; } };
  })();

  // ------------------------------------------------------------------ keyboard
  function onKey(e) {
    if (e.target.matches('input, textarea, select') || $('#settings').open) return;
    const k = e.key;
    if (Presentation.running) {
      const act = { ' ': Presentation.togglePause, ArrowRight: Presentation.next, PageDown: Presentation.next, ArrowLeft: Presentation.prev, PageUp: Presentation.prev, Escape: Presentation.stop }[k];
      if (act) { act(); e.preventDefault(); return; }
    }
    if (k === '?') { openSettings(true); e.preventDefault(); return; }
    if (k === ' ' && current && current.togglePlay) { current.togglePlay(); e.preventDefault(); return; }
    if ((k === '[' || k === ']') && current && current.stepKey) { current.stepKey(k === ']' ? 1 : -1); e.preventDefault(); return; }
    if (k >= '1' && k <= '4') switchView(VIEW_ORDER[+k - 1]);
    else if (k === '+' || k === '=') map.zoomAt(map.width / 2, map.height / 2, 1.4);
    else if (k === '-' || k === '_') map.zoomAt(map.width / 2, map.height / 2, 1 / 1.4);
    else if (k === '0' || k === 'Home') map.flyHome(700);
    else if (k === 'Escape') closeInfo();
    else if (k === 'ArrowLeft') map.panBy(120, 0);
    else if (k === 'ArrowRight') map.panBy(-120, 0);
    else if (k === 'ArrowUp') map.panBy(0, 120);
    else if (k === 'ArrowDown') map.panBy(0, -120);
    else return;
    e.preventDefault();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  return { start, switchView, setYear, showInfo, showDistrict, showPlace, closeInfo, toast, fmt, esc, openSettings, get settings() { return settings; }, get presentation() { return Presentation; }, map: null };
})();

window.addEventListener('DOMContentLoaded', App.start);
