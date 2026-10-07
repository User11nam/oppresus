// lore.js: View 4, FABULAE. The same map as an old storybook atlas, with a marker for every story,
// district panels full of lore and folklore, and a Story List for jumping to any story.
'use strict';

Views.fabulae = (() => {
  const D = window.DATA, T = Terrain;
  const RES = 2;
  const TYPES = {
    religious: 'Religious story', holiday: 'Holy day', custom: 'Custom', legend: 'Legend', ghost: 'Ghost story',
    mystery: 'Mystery', rumor: 'Rumor', saying: 'Folk saying', origin: 'Origin legend', cautionary: 'Cautionary tale',
    myth: 'Myth', creature: 'Creature tale', record: 'Historical record',
  };
  const AC1 = D.meta.calendar.yearOneCE;
  const posOf = (at) => Array.isArray(at) ? at : (Settlements.byId[at] || {}).pos;
  const STORIES = (D.stories || []).map(s => ({ ...s, pos: posOf(s.at) })).filter(s => s.pos);
  const byId = Object.fromEntries(STORIES.map(s => [s.id, s]));
  const districtsWithStories = D.districts.filter(d => STORIES.some(s => s.district === d.id));

  const state = { filter: 'all', places: true, titles: true };
  let base = null, hitTargets = [], selected = null;

  // ------------------------------------------------------------------ parchment colours
  const PAPER = [236, 222, 188];
  const LAND = [[0, [238, 225, 190]], [400, [228, 211, 170]], [1200, [214, 192, 148]], [2400, [190, 164, 122]], [3400, [176, 152, 118]], [4300, [214, 200, 176]]];
  const SEA_NEAR = [184, 202, 192], SEA_FAR = [158, 180, 176];
  const ZONE = { forest: [176, 190, 146], farmland: [234, 218, 160], oilmarsh: [212, 186, 136], wetland: [198, 208, 182], urban: [224, 204, 172], ruins: [210, 196, 176] };
  const INK = '#3b2614';
  function ramp(stops, v) {
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a); return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]; }
    return stops[stops.length - 1][1];
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const BG = `rgb(${SEA_FAR.map(v => Math.round(v * 0.92)).join(',')})`;
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // The storybook base map: paper grain, ink-shaded mountains, ripple lines around the coasts
  function buildBase() {
    const W = T.W, H = T.H, N = T.N, E = T.elev, km = T.CELL * T.kmPerPx;
    const landC = new Float32Array(N * 3), zones = new Array(N), shade = new Float32Array(N);
    const h = (x, y) => Math.max(0, E[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]);
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0;
      if (E[i] > 0) {
        const z = T.lake[i] ? 'lake' : Land.zoneAt(i);
        let c = z === 'lake' ? [176, 196, 188] : ramp(LAND, E[i]);
        if (z && ZONE[z]) c = mix(ZONE[z], c, Math.min(0.6, Math.max(0, (E[i] - 900) / 1500)));
        landC[i * 3] = c[0]; landC[i * 3 + 1] = c[1]; landC[i * 3 + 2] = c[2]; zones[i] = z;
        const dx = (h(x + 1, y) - h(x - 1, y)) / (2 * km * 1000) * 9, dy = (h(x, y + 1) - h(x, y - 1)) / (2 * km * 1000) * 9;
        const s = (0.5 * dx + 0.5 * dy + 0.7071) / Math.hypot(dx, dy, 1);
        shade[i] = z === 'lake' ? 1 : Math.min(1.12, Math.max(0.62, 1 + (s - 0.7071) * 1.5));
      }
    }
    const OW = W * RES, OH = H * RES, cv = document.createElement('canvas'); cv.width = OW; cv.height = OH;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(OW, OH), px = img.data, CD = T.coastDist;
    // paper grain: fine speckle plus larger blotches, from small repeating tiles (much faster than noise per pixel)
    const TILE = 256, fine = new Float32Array(TILE * TILE), blot = new Float32Array(TILE * TILE);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      fine[y * TILE + x] = 0.07 * hash(x, y) + 0.04 * (vnoise(x / 9, y / 9) - 0.5);
      blot[y * TILE + x] = 0.05 * (vnoise(x / 40, y / 40) - 0.5);
    }
    for (let oy = 0; oy < OH; oy++) {
      let fy = (oy + 0.5) / RES - 0.5; fy = Math.min(H - 1.001, Math.max(0, fy));
      const y0 = fy | 0, ty = fy - y0;
      for (let ox = 0; ox < OW; ox++) {
        let fx = (ox + 0.5) / RES - 0.5; fx = Math.min(W - 1.001, Math.max(0, fx));
        const x0 = fx | 0, tx = fx - x0, i00 = y0 * W + x0, i10 = i00 + 1, i01 = i00 + W, i11 = i01 + 1;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const e = E[i00] * w00 + E[i10] * w10 + E[i01] * w01 + E[i11] * w11;
        const grain = 0.95 + fine[(oy & 255) * TILE + (ox & 255)] + blot[((oy >> 2) & 255) * TILE + ((ox >> 2) & 255)];
        let r, g, b;
        if (e > 0) {
          let ws = 0; r = g = b = 0;
          if (E[i00] > 0) { r += landC[i00 * 3] * w00; g += landC[i00 * 3 + 1] * w00; b += landC[i00 * 3 + 2] * w00; ws += w00; }
          if (E[i10] > 0) { r += landC[i10 * 3] * w10; g += landC[i10 * 3 + 1] * w10; b += landC[i10 * 3 + 2] * w10; ws += w10; }
          if (E[i01] > 0) { r += landC[i01 * 3] * w01; g += landC[i01 * 3 + 1] * w01; b += landC[i01 * 3 + 2] * w01; ws += w01; }
          if (E[i11] > 0) { r += landC[i11 * 3] * w11; g += landC[i11 * 3 + 1] * w11; b += landC[i11 * 3 + 2] * w11; ws += w11; }
          if (ws > 0) { r /= ws; g /= ws; b /= ws; } else { r = PAPER[0]; g = PAPER[1]; b = PAPER[2]; }
          let sh = shade[i00] * w00 + shade[i10] * w10 + shade[i01] * w01 + shade[i11] * w11;
          const z = zones[ty < 0.5 ? (tx < 0.5 ? i00 : i10) : (tx < 0.5 ? i01 : i11)], n = hash(ox * 3 + 1, oy * 7 + 2);
          // hand-drawn textures: ink hatching on steep slopes, dots in the forest, rows on the farms
          if (sh < 0.9 && (ox + oy) % 4 === 0) sh *= 0.86;
          if (z === 'forest' && n > 0.82) sh *= 0.72;
          else if (z === 'farmland' && (oy % 5 === 0)) sh *= 0.93;
          else if (z === 'wetland' && n > 0.9) sh *= 0.8;
          else if (z === 'oilmarsh' && n > 0.94) sh *= 0.7;
          r *= sh; g *= sh; b *= sh;
        } else {
          const cd = CD[i00] * w00 + CD[i10] * w10 + CD[i01] * w01 + CD[i11] * w11, t = Math.min(1, cd / 160);
          r = SEA_NEAR[0] + (SEA_FAR[0] - SEA_NEAR[0]) * t; g = SEA_NEAR[1] + (SEA_FAR[1] - SEA_NEAR[1]) * t; b = SEA_NEAR[2] + (SEA_FAR[2] - SEA_NEAR[2]) * t;
          // ripple lines that follow the coast, like an old engraved map
          if (cd < 50) { const band = cd / 10 % 1; if (band > 0.8 && band < 0.92) { const k = 0.8 + cd / 50 * 0.15; r *= k; g *= k; b *= k; } }
        }
        const k = (oy * OW + ox) * 4;
        px[k] = r * grain; px[k + 1] = g * grain; px[k + 2] = b * grain; px[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // ------------------------------------------------------------------ drawing
  function drawWorld(ctx, map) {
    if (!base) base = buildBase();
    ctx.drawImage(base, -0.5, -0.5, T.W * T.CELL, T.H * T.CELL);
    const lw = (n) => map.px(n);
    // inked coast: a soft wide line and a crisp thin one
    const coast = Geom.coastline(0).path;
    ctx.strokeStyle = 'rgba(74,48,32,0.25)'; ctx.lineWidth = lw(4); ctx.stroke(coast);
    ctx.strokeStyle = INK; ctx.lineWidth = lw(1.3); ctx.stroke(coast);
    ctx.strokeStyle = 'rgba(74,58,40,0.5)'; ctx.lineWidth = lw(0.8); ctx.stroke(Geom.lakes().path);
    // dotted district borders; the chosen district is outlined in copper
    const outlines = Geom.districtOutlines();
    ctx.setLineDash([lw(1.5), lw(4)]); ctx.lineCap = 'round'; ctx.lineWidth = lw(2.2); ctx.strokeStyle = 'rgba(122,40,24,0.8)';
    for (const id in outlines) ctx.stroke(outlines[id].path);
    ctx.setLineDash([]); ctx.lineCap = 'butt';
    if (state.filter !== 'all' && outlines[state.filter]) { ctx.lineWidth = lw(4); ctx.strokeStyle = 'rgba(176,90,40,0.9)'; ctx.stroke(outlines[state.filter].path); }
    // the road of trade, as a dashed ink road
    const road = new Path2D(); D.tradeRoad.forEach(([x, y], i) => i ? road.lineTo(x, y) : road.moveTo(x, y));
    ctx.setLineDash([lw(5), lw(4)]); ctx.lineWidth = lw(1.6); ctx.strokeStyle = 'rgba(74,48,32,0.75)'; ctx.stroke(road); ctx.setLineDash([]);
    // a decorative frame around the map
    const W = T.imageWidth, H = T.imageHeight;
    ctx.strokeStyle = INK; ctx.lineWidth = lw(3); ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.lineWidth = lw(1); ctx.strokeRect(16, 16, W - 32, H - 32);
  }

  // stories that share a place are fanned out around it
  function storyScreenPositions(map) {
    const groups = new Map();
    for (const s of STORIES) { const k = s.pos.join(','); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    const out = [];
    for (const list of groups.values()) {
      const [sx, sy] = map.imageToScreen(...list[0].pos);
      list.forEach((s, i) => {
        if (list.length === 1) return out.push({ s, sx, sy });
        const a = -Math.PI / 2 + i * 2 * Math.PI / list.length, r = 22;
        out.push({ s, sx: sx + Math.cos(a) * r, sy: sy + Math.sin(a) * r, anchor: [sx, sy] });
      });
    }
    return out;
  }

  function drawScreen(ctx, map) {
    const labels = new Labels(ctx), z = map.zoom;
    hitTargets = [];
    // a soft darkening at the edges, like old paper
    const g = ctx.createRadialGradient(map.width / 2, map.height / 2, Math.min(map.width, map.height) * 0.35, map.width / 2, map.height / 2, Math.max(map.width, map.height) * 0.75);
    g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(1, 'rgba(90,60,30,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, map.width, map.height);

    // a few major places, inked lightly
    if (state.places) for (const p of Settlements.all) {
      if (!(p.tier === 1 || (p.population || 0) >= 600000)) continue;
      const [sx, sy] = map.imageToScreen(...p.pos);
      ctx.beginPath(); ctx.arc(sx, sy, p.type === 'capital' ? 5 : 3, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
      if (p.type === 'capital') { ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); }
      labels.reserve(sx, sy, 10, 10);
      labels.add({ text: p.name, x: sx, y: sy, anchor: 'right-of', offset: 8, size: 13, font: 'italic 13.5px "IM Fell English", Georgia, serif', color: INK, halo: 'rgba(240,228,198,0.85)', priority: 30, alts: [[0, -0.9], [0, 0.9]] });
    }

    // story markers
    const size = 30 * (1 + (Prefs.textScale - 1) * 0.5);
    for (const { s, sx, sy, anchor } of storyScreenPositions(map)) {
      if (sx < -40 || sy < -40 || sx > map.width + 40 || sy > map.height + 40) continue;
      const dim = state.filter !== 'all' && s.district !== state.filter;
      ctx.globalAlpha = dim ? 0.3 : 1;
      if (anchor) { ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(sx, sy); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(59,38,20,0.6)'; ctx.stroke(); }
      if (s.cilla && !dim) { // a copper glow sets the stories of Cilla apart
        ctx.beginPath(); ctx.arc(sx, sy, size * 0.66, 0, Math.PI * 2); ctx.fillStyle = 'rgba(214,130,60,0.28)'; ctx.fill();
      }
      Icons.drawIcon(ctx, 'story', sx, sy, size, { type: s.type, cilla: s.cilla, selected: selected === s.id });
      ctx.globalAlpha = 1;
      labels.reserve(sx, sy, size, size);
      hitTargets.push({ s, sx, sy, r: size * 0.55 });
      if (state.titles && !dim && (z >= 1.5 || selected === s.id || state.filter === s.district)) {
        labels.add({ text: s.title, x: sx, y: sy, anchor: 'below', offset: size * 0.5 + 2, size: 13, font: 'italic 14px "IM Fell English", Georgia, serif', color: s.cilla ? '#7a2e0c' : INK, halo: 'rgba(242,230,200,0.92)', haloWidth: 4, priority: selected === s.id ? 90 : 50, alts: [[0, -2.6], [1.2, 0], [-1.2, 0]] });
      }
    }

    // district names in old-style capitals
    for (const d of D.districts) {
      const [sx, sy] = map.imageToScreen(...d.label), sz = Math.min(22, 14 + z * 2.4);
      labels.add({ text: d.name, x: sx, y: sy, size: sz, spacing: '0.12em', font: `${sz}px "IM Fell English SC", Georgia, serif`, color: '#4a2410', halo: 'rgba(240,228,198,0.8)', haloWidth: 4, priority: 80, alts: [[0, 1.2], [0, -1.2], [0, 2.2], [0, -2.2], [1.5, 0], [-1.5, 0]] });
    }
    // seas and lands, in italic
    for (const f of D.features) {
      if (z < (f.minZoom || 1) || f.kind === 'region') continue;
      const [sx, sy] = map.imageToScreen(...f.pos), sea = f.kind === 'sea' || f.kind === 'ocean';
      labels.add({ text: f.name.replace(' (flooded)', ''), x: sx, y: sy, size: 15, angle: f.angle || 0, font: `italic ${sea ? 15 + z : 14}px "IM Fell English", Georgia, serif`, color: sea ? '#2f4a52' : '#5a3b22', halo: null, spacing: f.kind === 'ocean' ? '0.25em' : '0.04em', priority: 20 });
    }
    // the dark sea gets an old map-maker's warning, after its folklore
    { const [sx, sy] = map.imageToScreen(1062, 700); labels.add({ text: 'Hic sunt voces', x: sx, y: sy, size: 14, angle: -8, font: 'italic 15px "IM Fell English", Georgia, serif', color: '#5a1a12', halo: null, priority: 15 }); }
    labels.draw();
  }

  // ------------------------------------------------------------------ story panel
  const yearText = (y) => y >= AC1 ? `Year ${y - AC1 + 1} AC (${y} CE)` : `${y} CE`;
  function placeName(s) { return Array.isArray(s.at) ? (Land.byId[s.district] || {}).name : (Settlements.byId[s.at] || {}).name; }
  function showStory(id, { fly = true } = {}) {
    const s = typeof id === 'string' ? byId[id] : id; if (!s) return;
    selected = s.id;
    const d = Land.byId[s.district];
    App.showInfo({
      kicker: `${TYPES[s.type]} · ${d.name}`, title: s.title, color: s.cilla ? '#b8652f' : d.color,
      subtitle: s.cilla ? 'A story of Cilla' : '',
      body: `
        <div class="story-text">${App.esc(s.text)}</div>
        <dl class="facts">
          <dt>Where</dt><dd>${App.esc(placeName(s) || d.name)}<small>${App.esc(d.name)} district</small></dd>
          <dt>When</dt><dd>${s.year ? App.esc(yearText(s.year)) : 'No one knows; it is told as timeless'}</dd>
          <dt>Kind</dt><dd>${App.esc(TYPES[s.type])}</dd>
        </dl>
        ${s.source ? `<h4>From the records</h4>
        <blockquote>${App.esc(s.source)}</blockquote>
        <p class="muted">From ${App.esc(s.sourceFile)}</p>` : ''}
        ${s.inspiredBy ? `<h4>Inspired by</h4><p class="muted">${App.esc(s.inspiredBy)}</p>` : ''}
        <div class="story-actions">
          ${App.map.view !== Views.fabulae ? '<button class="civ-btn" data-act="fabulae">Open in Fabulae</button>' : '<button class="civ-btn" data-act="map">Show on the map</button>'}
          ${s.year ? '<button class="civ-btn" data-act="timeline">See it on the Historia timeline</button>' : ''}
          <button class="link-btn" data-district="${s.district}">All about ${App.esc(d.name)} →</button>
        </div>`,
    });
    const panel = document.getElementById('infoContent');
    panel.querySelector('[data-act="map"]')?.addEventListener('click', () => flyToStory(s));
    panel.querySelector('[data-act="fabulae"]')?.addEventListener('click', () => { App.switchView('fabulae'); showStory(s.id); });
    panel.querySelector('[data-act="timeline"]')?.addEventListener('click', () => { App.switchView('historia'); Views.historia.setYear(s.year); });
    if (fly && App.map.view === Views.fabulae) flyToStory(s);
    App.map.requestRender();
    syncList();
  }
  function flyToStory(s) { App.map.flyTo(s.pos[0], s.pos[1], Math.max(App.map.zoom, 2.4), 900); }

  // all the lore and folklore of a district, shown after its facts
  function districtExtra(d) {
    const list = STORIES.filter(s => s.district === d.id);
    if (!list.length) return '';
    return `<h4>Lore and folklore</h4>${list.map(s => `
      <article class="lore-item">
        <button class="lore-title" data-story="${s.id}"><span class="lore-icon" data-story-icon="${s.id}"></span><span>${App.esc(s.title)}<small>${App.esc(TYPES[s.type])}${s.year ? ' · ' + App.esc(yearText(s.year)) : ''}</small></span></button>
        <p>${App.esc(s.text)}</p>
      </article>`).join('')}`;
  }

  // ------------------------------------------------------------------ sidebar: the Story List
  function buildSidebar(el) {
    el.innerHTML = `
      <section class="panel-section">
        <h3>Story list</h3>
        <label class="sl-filter">Show <select id="storyFilter"><option value="all">Every district</option>${districtsWithStories.map(d => `<option value="${d.id}">${App.esc(d.name)}</option>`).join('')}</select></label>
        <div class="story-list" id="storyList"></div>
      </section>
      <section class="panel-section">
        <h3>Kinds of story</h3>
        <ul class="legend icons" id="storyLegend"></ul>
      </section>
      <section class="panel-section">
        <h3>Layers</h3>
        <label class="toggle small"><input type="checkbox" data-k="titles"><span class="sw"></span><span>Story titles on the map</span></label>
        <label class="toggle small"><input type="checkbox" data-k="places"><span class="sw"></span><span>Major places</span></label>
      </section>`;
    const sel = el.querySelector('#storyFilter');
    sel.value = state.filter;
    sel.addEventListener('change', () => setFilter(sel.value));
    el.querySelectorAll('input[data-k]').forEach(inp => {
      inp.checked = state[inp.dataset.k];
      inp.addEventListener('change', () => { state[inp.dataset.k] = inp.checked; App.map.requestRender(); });
    });
    el.querySelector('#storyList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-story],[data-district]'); if (!b) return;
      if (b.dataset.story) showStory(b.dataset.story); else App.showDistrict(b.dataset.district, true);
    });
    const legend = el.querySelector('#storyLegend');
    const items = [['Story of Cilla (flame and cell)', { cilla: 'both' }], ['Cilla\'s fire', { cilla: 'flame' }], ['Cilla, the cell', { cilla: 'cell' }],
      ...['legend', 'myth', 'origin', 'ghost', 'creature', 'mystery', 'rumor', 'saying', 'cautionary', 'custom', 'record'].map(t => [TYPES[t], { type: t }])];
    for (const [name, o] of items) { const li = document.createElement('li'); li.appendChild(Icons.toCanvas('story', 26, o)); li.append(name); legend.appendChild(li); }
    renderList();
  }
  function renderList() {
    const el = document.getElementById('storyList'); if (!el) return;
    const ds = state.filter === 'all' ? districtsWithStories : districtsWithStories.filter(d => d.id === state.filter);
    el.innerHTML = ds.map(d => {
      const list = STORIES.filter(s => s.district === d.id);
      return `<div class="sl-group">
        <button class="sl-district" data-district="${d.id}"><span class="cd-sw" style="background:${d.color}"></span>${App.esc(d.name)}<small>${list.length} ${list.length === 1 ? 'story' : 'stories'}</small></button>
        <ul>${list.map(s => `<li><button class="sl-story" data-story="${s.id}" aria-current="${selected === s.id}"><span class="sl-icon" data-story-icon="${s.id}"></span><span>${App.esc(s.title)}<small>${App.esc(TYPES[s.type])}${s.year ? ' · ' + (s.year >= AC1 ? `${s.year - AC1 + 1} AC` : s.year) : ''}</small></span></button></li>`).join('')}</ul>
      </div>`;
    }).join('');
    fillIcons(el);
  }
  function fillIcons(root) {
    root.querySelectorAll('[data-story-icon]').forEach(sp => { const s = byId[sp.dataset.storyIcon]; if (s && !sp.firstChild) sp.appendChild(Icons.toCanvas('story', 26, { type: s.type, cilla: s.cilla })); });
  }
  function syncList() { document.querySelectorAll('.sl-story').forEach(b => b.setAttribute('aria-current', String(b.dataset.story === selected))); }
  function setFilter(id) {
    state.filter = id;
    const sel = document.getElementById('storyFilter'); if (sel) sel.value = id;
    renderList();
    if (id !== 'all') { const d = Land.byId[id]; App.map.flyTo(d.label[0], d.label[1], Math.max(1.6, Math.min(2.6, App.map.zoom)), 900); }
    App.map.requestRender();
  }

  // ------------------------------------------------------------------ hover and click
  function describe(x, y) {
    if (x < 0 || y < 0 || x > T.imageWidth || y > T.imageHeight) return null;
    const id = T.districtAt(x, y), d = id && Land.byId[id];
    if (!d) return { title: T.elevationAt(x, y) <= 0 ? Land.seaNameAt(x, y) : 'Unclaimed land', lines: ['No stories are told here'] };
    const n = STORIES.filter(s => s.district === id).length;
    return { title: d.name, color: d.color, lines: [`${n} ${n === 1 ? 'story' : 'stories'} told here`, 'Click to read them'] };
  }
  function hit(sx, sy) {
    let best = null, bd = Infinity;
    for (const h of hitTargets) { const dd = Math.hypot(h.sx - sx, h.sy - sy); if (dd <= h.r + 4 && dd < bd) { bd = dd; best = h; } }
    return best;
  }
  function click({ sx, sy, x, y }) {
    const h = hit(sx, sy);
    if (h) return showStory(h.s.id, { fly: false });
    const id = T.districtAt(x, y);
    if (id) App.showDistrict(id);
  }

  // story icons and links inside the info panel (district panels list their stories)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#infoContent [data-story]'); if (b) showStory(b.dataset.story);
  });
  new MutationObserver(() => fillIcons(document.getElementById('infoContent'))).observe(document.getElementById('infoContent'), { childList: true });

  return {
    id: 'fabulae', name: 'Fabulae', background: BG,
    activate() { if (!base) base = buildBase(); },
    deactivate() { selected = null; },
    drawWorld, drawScreen, describe, click, buildSidebar, districtExtra,
    hitTest: (sx, sy) => !!hit(sx, sy),
    // shared with Historia and (later) Presentation Mode
    stories: STORIES, showStory, setFilter, flyToStory,
  };
})();
