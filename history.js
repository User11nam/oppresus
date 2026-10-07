// history.js: View 3, HISTORIA. A height map of the land and a timeline from the ice age to the
// present. Each year is computed from a simple physical model:
//   ice     an ice-sheet dome covering the continent, thinning from the edges inward as it melts
//   sea     global sea level, rising as the ice volume shrinks (+58 m when it is all gone)
//   rebound the rock beneath the ice, pressed down by its weight, rising back once the ice is gone
// At the last year (the present) there is no ice, sea level is the map's 0 m and the rock is at its
// final height, so the map matches Terra and Civitas exactly.
'use strict';

Views.historia = (() => {
  const D = window.DATA, HD = D.history, T = Terrain;
  const AC1 = D.meta.calendar.yearOneCE;
  const START = HD.startYear, END = HD.endYear;
  const SEA_RISE = 58;              // meters of global sea-level rise when all the ice is gone
  const MELT = [2065, 2230];        // years the ice sheet takes to melt (sped up for the story)
  const REBOUND = [2075, 2290];     // years the land takes to rise back (also sped up)
  const REBOUND_RATIO = 0.2;        // rock pressed down by about a fifth of the ice thickness above it
  const CHAPTER_YEARS = HD.chapters.map(c => c.year);
  const acToCE = (ac) => AC1 + ac - 1;

  const state = { contours: true, places: true, borders: true };
  let year = END;
  let model = null, frame = null;
  let fields = null, fieldsYear = null;
  let lines = null, linesYear = null, settleTimer = 0;
  let hitTargets = [];
  let ui = null, playing = false, playRaf = 0;

  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function ramp(stops, v) {
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return lerp3(ca, cb, (v - a) / (b - a)); }
    return stops[stops.length - 1][1];
  }
  const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;

  // ------------------------------------------------------------------ palette (a classic height map, cold-tinted)
  const DEM = [[0, [71, 121, 99]], [200, [98, 145, 104]], [600, [160, 172, 112]], [1200, [201, 178, 121]], [2000, [176, 128, 86]], [2800, [141, 104, 86]], [3500, [190, 182, 180]], [4300, [246, 246, 246]]];
  const DEPTH = [[0, [121, 182, 214]], [100, [82, 150, 196]], [500, [52, 111, 168]], [1500, [34, 78, 135]], [3000, [22, 54, 102]], [5000, [14, 36, 72]]];
  const ICE = [[0, [196, 216, 232]], [1000, [214, 230, 242]], [2500, [232, 241, 248]], [4000, [250, 252, 254]]];
  const SHELF = [184, 208, 228];
  const BG = rgb(ramp(DEPTH, 3600));
  const COUNTRY = { 'United States': '#6f9fe0', China: '#e2574a', Russia: '#f1f1f1', 'United Kingdom': '#d6dce4' };

  // ------------------------------------------------------------------ physical model (built once)
  function buildModel() {
    const N = T.N, E = T.elev, km = T.CELL * T.kmPerPx;
    const mask = new Uint8Array(N);
    // ice extent = the land, with the gaps between islands closed up (morphological closing),
    // plus a fringe of floating ice shelf around the edge
    for (let i = 0; i < N; i++) mask[i] = E[i] > 0 ? 1 : 0;
    const r = 190 / km, d1 = Geom.edt(mask);
    for (let i = 0; i < N; i++) mask[i] = d1[i] > r ? 1 : 0;
    const d2 = Geom.edt(mask);
    for (let i = 0; i < N; i++) mask[i] = d2[i] > r ? 1 : 0;
    const d3 = Geom.edt(mask);
    const outside = new Uint8Array(N);
    for (let i = 0; i < N; i++) outside[i] = d3[i] > 40 / km ? 1 : 0;
    // fill any lake of open water completely enclosed by the ice: only water joined to the open ocean stays ice-free
    {
      const W = T.W, H = T.H, open = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
      const push = (i) => { if (outside[i] && !open[i]) { open[i] = 1; q[qt++] = i; } };
      for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
      while (qh < qt) {
        const i = q[qh++], x = i % W;
        if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (i >= W) push(i - W); if (i < N - W) push(i + W);
      }
      for (let i = 0; i < N; i++) outside[i] = open[i];
    }
    const inward = Geom.blur(Geom.edt(outside), 5); // softened so the dome has no sharp creases

    const H0 = new Float32Array(N), R = new Float32Array(N);
    let Hmax = 0;
    for (let i = 0; i < N; i++) {
      if (outside[i]) continue;
      const dKm = inward[i] * km;
      const surface = 4100 * Math.sqrt(Math.min(1, dKm / 900)); // dome-shaped ice surface
      const est = Math.max(0, surface - Math.max(E[i], 0));
      R[i] = REBOUND_RATIO * est;
      const bed0 = E[i] - R[i];
      let h = Math.max(0, surface - bed0);
      if (E[i] > 0) h = Math.max(h, bed0 > 3700 ? 0 : 350);   // only the very highest peaks poke through
      else h = Math.min(h, surface * 1.6 + 200);              // thin floating shelves near the edge
      H0[i] = h;
      if (h > Hmax) Hmax = h;
    }
    Hmax += 1;
    // ice volume left after melting `m` meters off the top, sampled for sea-level lookups
    const SAMPLES = 96, vol = new Float64Array(SAMPLES + 1);
    const grounded = []; // (floating shelves don't raise sea level when they melt)
    for (let i = 0; i < N; i++) if (E[i] > -600 && H0[i] > 0) grounded.push(H0[i]);
    for (let k = 0; k <= SAMPLES; k++) {
      const m = Hmax * k / SAMPLES; let v = 0;
      for (const h of grounded) if (h > m) v += h - m;
      vol[k] = v;
    }
    return { H0, R, Hmax, vol, SAMPLES };
  }

  function stateAt(y) {
    const t = clamp01((y - MELT[0]) / (MELT[1] - MELT[0]));
    const melt = model.Hmax * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // slow start, fast middle, slow end
    const f = melt / model.Hmax * model.SAMPLES, k = Math.min(model.SAMPLES - 1, Math.floor(f));
    const v = model.vol[k] + (model.vol[k + 1] - model.vol[k]) * (f - k);
    const iceLeft = v / model.vol[0];
    return { melt, sea: -SEA_RISE * iceLeft, iceLeft, rebound: smoothstep(REBOUND[0], REBOUND[1], y) };
  }

  // Per-cell fields for a year: rock height, ice thickness, surface, kind (0 water, 1 land, 2 ice, 3 floating ice)
  function computeFields(y) {
    if (fieldsYear === y) return fields;
    const N = T.N, E = T.elev, { H0, R } = model, s = stateAt(y);
    if (!fields) fields = { bed: new Float32Array(N), ice: new Float32Array(N), above: new Float32Array(N), surf: new Float32Array(N), kind: new Uint8Array(N) };
    const { bed, ice, above, surf, kind } = fields;
    const down = 1 - s.rebound;
    for (let i = 0; i < N; i++) {
      const b = E[i] - R[i] * down, h = Math.max(0, H0[i] - s.melt);
      bed[i] = b; ice[i] = h;
      if (h > 2) {
        const grounded = b > s.sea || h * 0.89 > s.sea - b;
        kind[i] = grounded ? 2 : 3;
        above[i] = grounded ? b + h - s.sea : h * 0.11;
      } else if (b > s.sea) { kind[i] = 1; above[i] = b - s.sea; }
      else { kind[i] = 0; above[i] = b - s.sea; }
      surf[i] = kind[i] === 0 ? 0 : above[i];
    }
    fields.state = s; fieldsYear = y;
    return fields;
  }

  // ------------------------------------------------------------------ raster
  // colour lookup tables (10 m steps) so each frame is fast enough to scrub smoothly
  function lut(stops, max) {
    const n = Math.ceil(max / 10) + 1, a = new Uint8ClampedArray(n * 3);
    for (let k = 0; k < n; k++) { const c = ramp(stops, k * 10); a[k * 3] = c[0]; a[k * 3 + 1] = c[1]; a[k * 3 + 2] = c[2]; }
    return a;
  }
  const DEM_L = lut(DEM, 5200), DEPTH_L = lut(DEPTH, 6500), ICE_L = lut(ICE, 5000);

  function renderFrame(y) {
    const { above, surf, kind } = computeFields(y), W = T.W, H = T.H;
    if (!frame) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      frame = { canvas: c, ctx: c.getContext('2d') }; frame.img = frame.ctx.createImageData(W, H);
    }
    const px = frame.img.data, lake = T.lake, lakesShown = y >= MELT[1];
    const kLand = 6 / (2 * T.CELL * T.kmPerPx * 1000), kIce = kLand * 2.5; // hillshade exaggeration
    const nD = DEPTH_L.length / 3 - 1, nE = DEM_L.length / 3 - 1, nI = ICE_L.length / 3 - 1;
    for (let yy = 0; yy < H; yy++) {
      const row = yy * W, up = (yy > 0 ? yy - 1 : 0) * W, dn = (yy < H - 1 ? yy + 1 : yy) * W;
      for (let x = 0; x < W; x++) {
        const i = row + x, k = kind[i], o = i * 4;
        let r, g, b, sh = 1;
        if (k === 0) {
          const j = Math.min(nD, (-above[i] / 10) | 0) * 3; r = DEPTH_L[j]; g = DEPTH_L[j + 1]; b = DEPTH_L[j + 2];
        } else {
          const f = k === 1 ? kLand : kIce;
          const dx = (surf[row + (x < W - 1 ? x + 1 : x)] - surf[row + (x > 0 ? x - 1 : 0)]) * f, dy = (surf[dn + x] - surf[up + x]) * f;
          const s = (0.5 * dx + 0.5 * dy + 0.7071) / Math.sqrt(dx * dx + dy * dy + 1);
          sh = 1 + (s - 0.7071) * (k === 1 ? 1.6 : 1.1); sh = sh < 0.6 ? 0.6 : sh > 1.25 ? 1.25 : sh;
          if (k === 1) {
            if (lakesShown && lake[i]) { r = 88; g = 146; b = 186; sh = 1; }
            else { const j = Math.min(nE, (above[i] / 10) | 0) * 3; r = DEM_L[j]; g = DEM_L[j + 1]; b = DEM_L[j + 2]; }
          } else if (k === 2) { const j = Math.min(nI, (above[i] / 10) | 0) * 3; r = ICE_L[j]; g = ICE_L[j + 1]; b = ICE_L[j + 2]; }
          else { r = SHELF[0]; g = SHELF[1]; b = SHELF[2]; }
        }
        px[o] = r * sh; px[o + 1] = g * sh; px[o + 2] = b * sh; px[o + 3] = 255;
      }
    }
    frame.ctx.putImageData(frame.img, 0, 0);
    frame.year = y;
  }

  // Coastline, ice edge and elevation contours for a year (computed once the slider stops moving)
  function buildLines(y) {
    if (linesYear === y) return lines;
    const { above, kind, ice } = computeFields(y), N = T.N;
    let coast;
    if (y >= END) coast = Geom.coastline(0).path; // identical to Terra
    else {
      const f = new Float32Array(N);
      for (let i = 0; i < N; i++) f[i] = kind[i] === 0 ? above[i] : Math.max(above[i], 1);
      coast = Geom.toPath(Geom.contours(f, 0).map(l => Geom.smooth(l, 1)));
    }
    let iceEdge = null;
    if (y < MELT[1]) iceEdge = Geom.toPath(Geom.contours(ice, 2).map(l => Geom.smooth(l, 1)));
    const contours = [];
    if (state.contours) {
      const f = new Float32Array(N);
      for (let i = 0; i < N; i++) f[i] = kind[i] === 0 ? -1 : above[i];
      for (let lv = 500; lv <= 4500; lv += 500) contours.push({ level: lv, path: Geom.toPath(Geom.contours(f, lv).filter(l => l.length > 10).map(l => Geom.smooth(l, 1))) });
    }
    lines = { coast, iceEdge, contours, withContours: state.contours };
    linesYear = y;
    return lines;
  }

  // ------------------------------------------------------------------ what exists in a given year
  const founded = (id) => acToCE(HD.districtFounded[id] || 1);
  function placeVisible(p, y) {
    if (p.id === 'cilla_cave') return y >= AC1;
    if (p.id === 'litus_desertum' || p.abandoned) return y >= founded('cura_aliud');
    return y >= founded(p.district);
  }

  // ------------------------------------------------------------------ drawing
  function drawWorld(ctx, map) {
    if (!frame || frame.year !== year) renderFrame(year);
    ctx.drawImage(frame.canvas, 1 - T.CELL / 2, 1 - T.CELL / 2, T.W * T.CELL, T.H * T.CELL);
    const lw = (n) => map.px(n);
    const settled = linesYear === year && (!state.contours || lines.withContours);
    if (settled) {
      for (const c of lines.contours) {
        ctx.strokeStyle = c.level % 1000 === 0 ? 'rgba(40,30,22,0.5)' : 'rgba(40,30,22,0.28)';
        ctx.lineWidth = lw(c.level % 1000 === 0 ? 1.2 : 0.7); ctx.stroke(c.path);
      }
      if (lines.iceEdge) { ctx.strokeStyle = 'rgba(70,120,165,0.85)'; ctx.lineWidth = lw(1.2); ctx.stroke(lines.iceEdge); }
      ctx.strokeStyle = 'rgba(14,30,48,0.9)'; ctx.lineWidth = lw(1.3); ctx.stroke(lines.coast);
    }
    if (state.borders && year >= AC1) {
      const outlines = Geom.districtOutlines();
      ctx.setLineDash([lw(7), lw(4)]); ctx.lineWidth = lw(1.6);
      for (const d of D.districts) {
        if (year < founded(d.id) || !outlines[d.id]) continue;
        ctx.strokeStyle = '#8a3f12'; ctx.stroke(outlines[d.id].path);
      }
      ctx.setLineDash([]);
    }
  }

  function drawScreen(ctx, map) {
    const labels = new Labels(ctx), z = map.zoom, S = (x, y) => map.imageToScreen(x, y);
    hitTargets = [];
    const { kind } = computeFields(year);
    const wet = (x, y) => kind[T.cellIndex(x, y)] === 0;
    const marker = (type, pos, name, item, opts = {}) => {
      const [sx, sy] = S(...pos);
      if (sx < -40 || sy < -40 || sx > map.width + 40 || sy > map.height + 40) return;
      const size = opts.size || 18;
      Icons.drawIcon(ctx, type, sx, sy, size, opts.icon);
      labels.reserve(sx, sy, size, size);
      hitTargets.push({ sx, sy, r: size * 0.7, item });
      if (name && (opts.always || z >= (opts.minZoom || 0))) {
        const w = wet(...pos);
        labels.add({ text: name, x: sx, y: sy, anchor: 'right-of', offset: size * 0.55 + 4, size: 13, font: `600 ${opts.bold ? 14.5 : 13}px "Source Sans 3", system-ui, sans-serif`, color: w ? '#f2f6fa' : '#1b1712', halo: w ? 'rgba(10,24,40,0.85)' : 'rgba(250,246,238,0.9)', priority: opts.priority || 50, alts: [[0, -0.9], [0, 0.9]] });
      }
    };

    // research stations (before the facility era)
    if (year < HD.facility.built) for (const st of HD.stations) {
      const pos = T.fromLatLon(st.lat, st.lon);
      marker('station', pos, st.name, { kind: 'station', data: st }, { size: 15, minZoom: 1.6, priority: 30 });
    }
    // oil fields
    for (const f of HD.oilFields) {
      if (year < f.built) continue;
      if (year < HD.oilEnd) marker('rig', f.pos, f.name, { kind: 'oil', data: f }, { size: 20, always: true, priority: 55, icon: { color: COUNTRY[f.country] } });
      else if (f.later && year < founded('nullus_sol')) marker('oilfield', f.pos, 'Abandoned oil field', { kind: 'oil', data: f }, { size: 18, minZoom: 1.4, priority: 40 });
    }
    // the facility
    const fac = HD.facility;
    if (year >= fac.built && year < fac.abandoned) marker('facility', fac.pos, fac.name, { kind: 'facility', data: fac }, { size: 22, always: true, bold: true, priority: 70 });

    // Oppressan places
    if (state.places) {
      const before = hitTargets.length;
      Settlements.draw(ctx, map, labels, hitTargets, { filter: (p) => placeVisible(p, year), onWater: wet });
      for (let k = before; k < hitTargets.length; k++) hitTargets[k].item = { kind: 'place', data: hitTargets[k].item };
    }
    // the South Pole
    { const [px, py] = S(...T.pole); Icons.drawIcon(ctx, 'pole', px, py, 16); labels.reserve(px, py, 16, 16); }

    // district names, once founded
    if (year >= AC1) for (const d of D.districts) {
      if (year < founded(d.id)) continue;
      const [sx, sy] = S(...d.label), w = wet(...d.label), size = Math.min(19, 12 + z * 2.2);
      labels.add({ text: d.name.toUpperCase(), x: sx, y: sy, size, spacing: '0.14em', font: `600 ${size}px Cinzel, Georgia, serif`, color: w ? '#f4e9dc' : '#3a2416', halo: w ? 'rgba(12,26,44,0.8)' : 'rgba(252,247,240,0.85)', haloWidth: 4, priority: 80, overIcons: true, alts: [[0, 1], [0, -1], [0, 2], [0, -2]] });
    }
    // real geography
    for (const f of D.features) {
      if (z < (f.minZoom || 1) || f.name.includes('flooded')) continue;
      const [sx, sy] = S(...f.pos), w = wet(...f.pos);
      const sea = f.kind === 'sea' || f.kind === 'ocean', region = f.kind === 'region';
      labels.add({
        text: f.name, x: sx, y: sy, size: 15, angle: f.angle || 0,
        font: region ? `600 ${18 + z * 2}px Cinzel, Georgia, serif` : `italic 600 ${13 + z * 0.7}px Georgia, serif`,
        spacing: region ? '0.35em' : f.kind === 'ocean' ? '0.3em' : '0.05em',
        color: region ? 'rgba(232,240,248,0.6)' : w ? '#d8e8f5' : '#3d3128', halo: region ? null : w ? 'rgba(12,30,52,0.6)' : 'rgba(248,243,233,0.75)',
        priority: sea ? 45 : region ? 10 : 30,
      });
    }
    labels.draw();
  }

  // ------------------------------------------------------------------ year control
  function setYear(y, { settle = true } = {}) {
    year = Math.round(Math.min(END, Math.max(START, y)));
    App.setYear(year);
    App.map.requestRender();
    updateUI();
    clearTimeout(settleTimer);
    if (settle) settleTimer = setTimeout(() => { buildLines(year); App.map.requestRender(); }, 140);
  }

  function chapterIndex(y) {
    let k = 0;
    for (let i = 0; i < CHAPTER_YEARS.length; i++) if (y >= CHAPTER_YEARS[i]) k = i;
    return k;
  }
  // The track gives each chapter the same width, so the busy early years aren't squashed.
  function yearToPos(y) {
    const n = CHAPTER_YEARS.length - 1;
    for (let k = 0; k < n; k++) if (y <= CHAPTER_YEARS[k + 1]) return (k + (y - CHAPTER_YEARS[k]) / (CHAPTER_YEARS[k + 1] - CHAPTER_YEARS[k])) / n;
    return 1;
  }
  function posToYear(p) {
    const n = CHAPTER_YEARS.length - 1, f = clamp01(p) * n, k = Math.min(n - 1, Math.floor(f));
    return CHAPTER_YEARS[k] + (CHAPTER_YEARS[k + 1] - CHAPTER_YEARS[k]) * (f - k);
  }

  // Play: glide through each chapter, pausing at each stop so the caption can be read
  function play() {
    if (playing) return stop();
    if (year >= END) setYear(START);
    playing = true; updateUI();
    const SEG_MS = 5200, n = CHAPTER_YEARS.length - 1; // time to cross one chapter
    let pos = yearToPos(year), last = performance.now(), pauseUntil = last + 1200;
    const step = (now) => {
      if (!playing) return;
      const dt = Math.min(100, now - last); last = now;
      if (now >= pauseUntil) {
        const nextStop = (Math.min(n - 1, Math.floor(pos * n + 1e-9)) + 1) / n;
        pos += dt / SEG_MS / n;
        let atStop = false;
        if (pos >= nextStop - 1e-9) { pos = nextStop; pauseUntil = now + 3400; atStop = true; }
        setYear(posToYear(pos), { settle: atStop });
        if (pos >= 1) { stop(); return; }
      }
      playRaf = requestAnimationFrame(step);
    };
    playRaf = requestAnimationFrame(step);
  }
  function stop() { playing = false; cancelAnimationFrame(playRaf); updateUI(); setYear(year); }
  function goChapter(k) { stop(); const c = HD.chapters[Math.max(0, Math.min(HD.chapters.length - 1, k))]; setYear(c.year); }

  // ------------------------------------------------------------------ timeline bar (bottom of the map)
  function buildTimeline() {
    const el = document.createElement('div');
    el.className = 'timeline';
    // each new vessel of Cilla is an event too
    const S = D.succession || [];
    const vessels = S.slice(1).map((v, k) => ({
      year: acToCE(v.from), kind: 'oppressus', title: `Cilla passes to ${v.name}`,
      text: `${S[k].name} chooses ${v.name}${v.advisor ? ', one of his Supreme Advisors,' : ', who was not one of his advisors,'} to be the next vessel of Cilla. (Year ${v.from} AC)${v.note ? ' ' + v.note : ''}`,
    }));
    // stories from Fabulae that have a time, so myth and history sit side by side
    const stories = (D.stories || []).filter(s => s.year).map(s => ({ year: s.year, kind: 'story', title: `Story: ${s.title}`, text: s.text, story: s.id }));
    const events = HD.events.concat(vessels, stories).sort((a, b) => a.year - b.year);
    el.innerHTML = `
      <div class="tl-controls">
        <button class="tl-btn" data-act="prev" title="Previous chapter" aria-label="Previous chapter"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor"/></svg></button>
        <button class="tl-btn tl-play" data-act="play" title="Play the history" aria-label="Play"><svg viewBox="0 0 24 24" width="20" height="20"><path class="ico-play" d="M7 5l12 7-12 7z" fill="currentColor"/><path class="ico-pause" d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg></button>
        <button class="tl-btn" data-act="next" title="Next chapter" aria-label="Next chapter"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor"/></svg></button>
      </div>
      <div class="tl-track" title="Scroll to zoom the timeline, Shift+scroll to move along it">
        <div class="tl-events">${events.map((e, i) => `<button class="tl-event ${e.kind}" data-ev="${i}" data-pos="${yearToPos(e.year)}" title="${App.esc(e.year + ': ' + e.title)}"></button>`).join('')}</div>
        <div class="tl-rail"><div class="tl-fill"></div></div>
        <input class="tl-range" type="range" min="0" max="1000" step="1" aria-label="Year">
        <div class="tl-chapters">${HD.chapters.map((c, k) => `<button class="tl-chapter" data-ch="${k}" data-pos="${yearToPos(c.year)}"><span class="tl-dot">${k + 1}</span><span class="tl-name">${App.esc(c.title)}</span></button>`).join('')}</div>
        <div class="tl-ticks"></div>
      </div>
      <div class="tl-zoom">
        <button class="tl-btn small" data-act="zin" title="Zoom in on the timeline" aria-label="Zoom in on the timeline"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <button class="tl-btn small" data-act="zout" title="Zoom out" aria-label="Zoom out on the timeline"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5M8 10.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <button class="tl-btn small" data-act="zfit" title="Show the whole timeline" aria-label="Show the whole timeline"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
        <span class="tl-window"></span>
      </div>`;
    el.querySelector('[data-act="zin"]').addEventListener('click', () => zoomTimeline(2, yearToPos(year)));
    el.querySelector('[data-act="zout"]').addEventListener('click', () => zoomTimeline(0.5, yearToPos(year)));
    el.querySelector('[data-act="zfit"]').addEventListener('click', () => { tlView = { a: 0, b: 1 }; layoutTrack(); });
    el.querySelector('.tl-track').addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      const at = tlView.a + f * (tlView.b - tlView.a);
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) panTimeline((e.deltaX || e.deltaY) / r.width * (tlView.b - tlView.a));
      else zoomTimeline(e.deltaY < 0 ? 1.3 : 1 / 1.3, at, f);
    }, { passive: false });
    el.querySelector('[data-act="play"]').addEventListener('click', play);
    el.querySelector('[data-act="prev"]').addEventListener('click', () => { const k = chapterIndex(year); goChapter(year > CHAPTER_YEARS[k] ? k : k - 1); });
    el.querySelector('[data-act="next"]').addEventListener('click', () => goChapter(chapterIndex(year) + 1));
    const range = el.querySelector('.tl-range');
    range.addEventListener('input', () => { if (playing) { playing = false; cancelAnimationFrame(playRaf); } setYear(posToYear(tlView.a + range.value / 1000 * (tlView.b - tlView.a))); });
    el.querySelectorAll('.tl-chapter').forEach(b => b.addEventListener('click', () => goChapter(+b.dataset.ch)));
    el.querySelectorAll('.tl-event').forEach(b => b.addEventListener('click', () => {
      const e = events[+b.dataset.ev]; stop(); setYear(e.year);
      if (e.story) return Views.fabulae.showStory(e.story, { fly: false });
      App.showInfo({ kicker: eventKicker(e), title: e.title, subtitle: formatYear(e.year), body: `<p>${App.esc(e.text)}</p>` });
    }));
    document.querySelector('.map-wrap').appendChild(el);
    // hide the other chapter names when there isn't room for all of them
    const track = el.querySelector('.tl-track');
    new ResizeObserver(() => { el.classList.toggle('compact', track.clientWidth / (HD.chapters.length - 1) < 128); layoutTrack(); }).observe(track);
    return el;
  }

  // ---- timeline zoom: the track shows the window [a, b] of the full timeline (0 to 1)
  let tlView = { a: 0, b: 1 };
  const MIN_WINDOW = 0.006;
  function zoomTimeline(factor, at, frac) {
    const w = Math.min(1, Math.max(MIN_WINDOW, (tlView.b - tlView.a) / factor));
    const f = frac ?? (at - tlView.a) / (tlView.b - tlView.a);
    let a = at - f * w;
    a = Math.min(1 - w, Math.max(0, a));
    tlView = { a, b: a + w };
    layoutTrack();
  }
  function panTimeline(d) {
    const w = tlView.b - tlView.a, a = Math.min(1 - w, Math.max(0, tlView.a + d));
    tlView = { a, b: a + w };
    layoutTrack();
  }
  const toX = (p) => (p - tlView.a) / (tlView.b - tlView.a);
  function layoutTrack() {
    if (!ui) return;
    const zoomed = tlView.b - tlView.a < 0.999;
    ui.classList.toggle('zoomed', zoomed);
    ui.querySelectorAll('[data-pos]').forEach(b => {
      const x = toX(+b.dataset.pos);
      b.style.left = `${(x * 100).toFixed(3)}%`;
      b.hidden = x < -0.005 || x > 1.005;
    });
    // year markings when zoomed in
    const ticks = ui.querySelector('.tl-ticks'), track = ui.querySelector('.tl-track');
    let html = '';
    if (zoomed) {
      const y0 = posToYear(tlView.a), y1 = posToYear(tlView.b), px = track.clientWidth;
      const step = [1, 2, 5, 10, 20, 25, 50, 100].find(s => (y1 - y0) / s <= 10) || 100;
      let lastX = -1e9;
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
        const x = toX(yearToPos(y));
        if ((x - lastX) * px < 46) continue;
        lastX = x;
        html += `<span class="tl-tick" style="left:${(x * 100).toFixed(3)}%">${y >= AC1 ? `${y - AC1 + 1} AC` : y}</span>`;
      }
      const z = 1 / (tlView.b - tlView.a);
      ui.querySelector('.tl-window').textContent = `${z >= 10 ? Math.round(z) : z.toFixed(1)}× · ${formatShort(Math.round(y0))}–${formatShort(Math.round(y1))}`;
    } else ui.querySelector('.tl-window').textContent = '';
    ticks.innerHTML = html;
    updateUI();
  }
  const formatShort = (y) => y >= AC1 ? `${y - AC1 + 1} AC` : `${y}`;
  const eventKicker = (e) => ({ world: 'World history', oppressus: 'Oppressan history', science: 'Science', story: 'Story' }[e.kind] || 'Event');
  function formatYear(y) { return y >= AC1 ? `Year ${y - AC1 + 1} AC (${y} CE)` : `${y} CE`; }

  function updateUI() {
    if (ui) {
      const p = yearToPos(year);
      // while playing, keep the current year inside the zoomed window
      if (playing && (p > tlView.b || p < tlView.a)) { const w = tlView.b - tlView.a; tlView.a = Math.min(1 - w, Math.max(0, p - w * 0.1)); tlView.b = tlView.a + w; layoutTrack(); return; }
      const x = toX(p);
      ui.querySelector('.tl-range').value = Math.round(Math.min(1, Math.max(0, x)) * 1000);
      ui.querySelector('.tl-fill').style.width = `${Math.min(1, Math.max(0, x)) * 100}%`;
      ui.classList.toggle('playing', playing);
      const k = chapterIndex(year);
      ui.querySelectorAll('.tl-chapter').forEach((b, i) => { b.classList.toggle('active', i === k); b.classList.toggle('past', i < k); });
    }
    const card = document.getElementById('histCard');
    if (!card || !model) return;
    const k = chapterIndex(year), c = HD.chapters[k], s = stateAt(year);
    if (card.dataset.k !== String(k)) {
      card.dataset.k = k;
      card.innerHTML = `
        <div class="hc-kicker">Chapter ${k + 1} of ${HD.chapters.length} · ${App.esc(c.range)}</div>
        <h2>${App.esc(c.title)}</h2>
        <p>${App.esc(c.caption)}</p>
        ${c.note ? `<div class="hc-note"><strong>Did you know?</strong> ${App.esc(c.note)}</div>` : ''}`;
    }
    const rise = s.sea - stateAt(START).sea;
    document.getElementById('histStats').innerHTML = `
      <div class="hs"><span>Year</span><strong>${year < AC1 ? `${year} CE` : `${year - AC1 + 1} AC`}</strong></div>
      <div class="hs"><span>Ice left</span><strong>${Math.round(s.iceLeft * 100)}%</strong></div>
      <div class="hs"><span>Sea level</span><strong>+${rise.toFixed(1)} m</strong></div>
      <div class="hs"><span>Land risen</span><strong>${Math.round(s.rebound * 100)}%</strong></div>`;
  }

  // ------------------------------------------------------------------ sidebar
  function buildSidebar(el) {
    const grad = (stops, max) => `linear-gradient(90deg, ${stops.map(([v, c]) => `${rgb(c)} ${(v / max * 100).toFixed(1)}%`).join(', ')})`;
    el.innerHTML = `
      <section class="panel-section hist-card-wrap"><div class="hist-card" id="histCard"></div></section>
      <section class="panel-section"><div class="hist-stats" id="histStats"></div></section>
      <section class="panel-section">
        <h3>Layers</h3>
        <label class="toggle small"><input type="checkbox" data-k="contours"><span class="sw"></span><span>Contour lines (every 500 m)</span></label>
        <label class="toggle small"><input type="checkbox" data-k="borders"><span class="sw"></span><span>District borders</span></label>
        <label class="toggle small"><input type="checkbox" data-k="places"><span class="sw"></span><span>Places</span></label>
      </section>
      <section class="panel-section">
        <h3>Legend</h3>
        <div class="grad-legend"><div class="grad-bar" style="background:${grad(DEM, 4300)}"></div><div class="grad-ticks"><span>0</span><span>1,000</span><span>2,000</span><span>3,000</span><span>4,000 m</span></div><div class="grad-cap">Height of the land above sea level</div></div>
        <div class="grad-legend"><div class="grad-bar" style="background:${grad(DEPTH, 5000)}"></div><div class="grad-ticks"><span>0</span><span>1,250</span><span>2,500</span><span>3,750</span><span>5,000 m</span></div><div class="grad-cap">Depth of the sea</div></div>
        <ul class="legend" style="margin-top:10px">
          <li><span class="swatch" style="background:${rgb(ICE[2][1])}"></span>Ice sheet</li>
          <li><span class="swatch" style="background:${rgb(SHELF)}"></span>Floating ice shelf</li>
          <li><span class="line" style="border-top:2px solid rgba(70,120,165,0.9)"></span>Edge of the ice</li>
          <li><span class="line" style="border-top:2px solid rgba(40,30,22,0.5)"></span>Contour line</li>
        </ul>
        <ul class="legend tl-key" style="margin-top:10px">
          <li><span class="tl-diamond world"></span>World history</li>
          <li><span class="tl-diamond science"></span>Science and real facts</li>
          <li><span class="tl-diamond oppressus"></span>Oppressan history</li>
          <li><span class="tl-diamond story"></span>Stories from Fabulae</li>
        </ul>
        <ul class="legend icons" id="histIcons"></ul>
      </section>`;
    const icons = el.querySelector('#histIcons');
    const items = [['station', 'Research station (2026)'], ['rig', 'U.S. oil field', { color: COUNTRY['United States'] }], ['rig', 'Chinese oil field', { color: COUNTRY.China }], ['rig', 'Russian oil field', { color: COUNTRY.Russia }], ['facility', 'The research facility'], ['sacred', 'Cilla\'s cave']];
    for (const [type, name, opts] of items) { const li = document.createElement('li'); li.appendChild(Icons.toCanvas(type, 22, opts)); li.append(name); icons.appendChild(li); }
    el.querySelectorAll('input[data-k]').forEach(inp => {
      inp.checked = state[inp.dataset.k];
      inp.addEventListener('change', () => { state[inp.dataset.k] = inp.checked; linesYear = null; setYear(year); });
    });
    updateUI();
  }

  // ------------------------------------------------------------------ hover and click
  function describe(x, y) {
    if (x < 0 || y < 0 || x > T.imageWidth || y > T.imageHeight) return null;
    const f = computeFields(year), i = T.cellIndex(x, y), k = f.kind[i], s = f.state;
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    const id = year >= AC1 ? T.districtAt(x, y) : null, d = id && year >= founded(id) ? Land.byId[id] : null;
    const where = d ? d.name : (T.elev[i] > 0 ? 'Antarctica' : Land.seaNameAt(x, y));
    const toRise = T.elev[i] > 0 ? model.R[i] * (1 - s.rebound) : 0;
    if (k === 2 || k === 3) {
      const rock = f.bed[i] - s.sea;
      return { title: k === 3 ? 'Floating ice shelf' : 'Ice sheet', lines: [`${fmt(f.ice[i])} m of ice`, `Rock ${fmt(Math.abs(rock))} m ${rock >= 0 ? 'above' : 'below'} sea level`, where] };
    }
    if (k === 1) return { title: 'Land', lines: [`${fmt(f.above[i])} m above sea level`, toRise > 15 ? `Still rising (${fmt(toRise)} m to go)` : 'At its natural height', where], color: d && d.color };
    return { title: T.elev[i] > 0 ? 'Flooded land' : 'Sea', lines: [`${fmt(-f.above[i])} m deep`, T.elev[i] > 0 ? 'Will rise above the sea as the land rebounds' : where] };
  }

  function hit(sx, sy) {
    let best = null, bd = Infinity;
    for (const h of hitTargets) { const dd = Math.hypot(h.sx - sx, h.sy - sy); if (dd <= h.r + 4 && dd < bd) { bd = dd; best = h; } }
    return best;
  }
  function click({ sx, sy, x, y }) {
    const h = hit(sx, sy);
    if (h) {
      const it = h.item;
      if (it.kind === 'place') return App.showPlace(it.data);
      if (it.kind === 'station') return App.showInfo({ kicker: 'Research station', title: it.data.name, subtitle: `${it.data.country} · in use in 2026`, icon: 'station', body: '<p>A real research station. In 2026 scientists here study the ice, the climate and the life of Antarctica.</p>' });
      if (it.kind === 'oil') {
        const f = it.data;
        return App.showInfo({ kicker: `${f.country} oil field`, title: f.name, subtitle: `Drilled from ${f.built} until ${HD.oilEnd} CE`, icon: 'rig', body: `<p>One of the oil fields of the Antarctic oil rush. Burning its oil added to the global warming that melted the ice. It was taken down by the researchers of the facility in ${HD.oilEnd}.</p>${f.later ? `<p>Its abandoned wells became <strong>${App.esc(f.later)}</strong>, the "ancient field where oil used to be mined."</p>` : ''}` });
      }
      if (it.kind === 'facility') return App.showInfo({ kicker: 'Research facility', title: it.data.name, subtitle: `Built ${it.data.built} CE`, icon: 'facility', body: `<p>${App.esc(it.data.description)}</p>` });
    }
    if (year >= AC1) { const id = T.districtAt(x, y); if (id && year >= founded(id)) return App.showDistrict(id); }
  }

  return {
    id: 'historia', name: 'Historia',
    get background() { return BG; },
    activate() {
      if (!model) model = buildModel();
      if (!ui) ui = buildTimeline();
      ui.hidden = false;
      setYear(year);
    },
    deactivate() { if (playing) stop(); if (ui) ui.hidden = true; },
    drawWorld, drawScreen, describe, click, buildSidebar,
    hitTest: (sx, sy) => !!hit(sx, sy),
    // used by Presentation Mode later
    play, stop, goChapter, setYear, get year() { return year; }, get playing() { return playing; },
    togglePlay: () => play(),
    stepKey: (d) => { const k = chapterIndex(year); goChapter(d > 0 ? k + 1 : (year > CHAPTER_YEARS[k] ? k : k - 1)); },
    fieldsAt: (y) => { if (!model) model = buildModel(); return computeFields(y); },
  };
})();
