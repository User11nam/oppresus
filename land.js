// land.js: View 1, TERRA. The land as a modern atlas: terrain colours, labels, legend,
// and the Defenses / Vulnerabilities overlays.
'use strict';

Views.terra = (() => {
  const D = window.DATA;
  const T = Terrain;
  const RES = 2; // offscreen pixels per terrain cell

  const state = { borders: true, places: true, graticule: true, road: true, defenses: false, vulnerabilities: false };
  let base = null, graticule = null, overlays = null;
  let hitTargets = []; // clickable things drawn this frame (screen space)

  // ------------------------------------------------------------------ colours
  const LAND_STOPS = [
    [0, [156, 168, 146]], [150, [168, 175, 150]], [450, [183, 178, 152]], [900, [170, 158, 135]],
    [1600, [146, 135, 118]], [2400, [127, 122, 119]], [3200, [170, 175, 182]], [3900, [233, 238, 243]],
  ];
  const SEA_STOPS = [
    [0, [92, 146, 182]], [-150, [68, 122, 164]], [-600, [46, 96, 142]], [-1500, [32, 72, 120]],
    [-3000, [21, 52, 94]], [-4500, [15, 39, 75]],
  ];
  const ZONE = {
    forest: [64, 110, 80], farmland: [151, 173, 99], oilmarsh: [152, 129, 82], wetland: [122, 156, 142],
    urban: [190, 181, 170], ruins: [146, 134, 128],
  };
  const LAKE = [86, 140, 176];

  function ramp(stops, v) {
    if (stops[0][0] > stops[1][0]) { // descending (sea)
      if (v >= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) if (v >= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const t = (v - a) / (b - a); return mix(ca, cb, t); }
      return stops[stops.length - 1][1];
    }
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const t = (v - a) / (b - a); return mix(ca, cb, t); }
    return stops[stops.length - 1][1];
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;
  const BG = rgb(ramp(SEA_STOPS, -3700));

  function landColor(i) {
    if (T.lake[i]) return LAKE;
    const e = T.elev[i], z = Land.zoneAt(i);
    let c = ramp(LAND_STOPS, e);
    if (z === 'shadow') c = mix(c, [70, 74, 92], 0.32);
    else if (z && ZONE[z]) c = mix(ZONE[z], c, Math.min(0.6, Math.max(0, (e - 900) / 1500)));
    return c;
  }
  function seaColor(i) {
    const c = ramp(SEA_STOPS, T.elev[i]), d = T.coastDist[i];
    return d < 14 ? mix(c, [128, 176, 208], (1 - d / 14) * 0.35) : c;
  }

  // Hillshade multiplier per cell (light from the upper left)
  function hillshade() {
    const W = T.W, H = T.H, m = T.CELL * T.kmPerPx * 1000, ex = 7;
    const out = new Float32Array(T.N);
    const L = [-0.5, -0.5, 0.7071], flat = L[2];
    const h = (x, y) => Math.max(0, T.elev[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) / (2 * m) * ex, dy = (h(x, y + 1) - h(x, y - 1)) / (2 * m) * ex;
      const len = Math.hypot(dx, dy, 1), s = (-dx * L[0] - dy * L[1] + L[2]) / len;
      out[y * W + x] = Math.min(1.3, Math.max(0.55, 1 + (s - flat) * 1.7));
    }
    return out;
  }

  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

  function buildBase() {
    const W = T.W, H = T.H, N = T.N;
    const landC = new Float32Array(N * 3), seaC = new Float32Array(N * 3), zones = new Array(N);
    for (let i = 0; i < N; i++) {
      if (T.elev[i] > 0) { const c = landColor(i); landC[i * 3] = c[0]; landC[i * 3 + 1] = c[1]; landC[i * 3 + 2] = c[2]; zones[i] = T.lake[i] ? 'lake' : Land.zoneAt(i); }
      else { const c = seaColor(i); seaC[i * 3] = c[0]; seaC[i * 3 + 1] = c[1]; seaC[i * 3 + 2] = c[2]; }
    }
    const shade = hillshade();
    for (let i = 0; i < N; i++) if (T.lake[i]) shade[i] = 1;

    const OW = W * RES, OH = H * RES;
    const cv = document.createElement('canvas'); cv.width = OW; cv.height = OH;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(OW, OH), px = img.data;
    const E = T.elev;
    for (let oy = 0; oy < OH; oy++) {
      let fy = (oy + 0.5) / RES - 0.5; fy = Math.min(H - 1.001, Math.max(0, fy));
      const y0 = fy | 0, ty = fy - y0;
      for (let ox = 0; ox < OW; ox++) {
        let fx = (ox + 0.5) / RES - 0.5; fx = Math.min(W - 1.001, Math.max(0, fx));
        const x0 = fx | 0, tx = fx - x0;
        const i00 = y0 * W + x0, i10 = i00 + 1, i01 = i00 + W, i11 = i01 + 1;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const e = E[i00] * w00 + E[i10] * w10 + E[i01] * w01 + E[i11] * w11;
        const land = e > 0;
        let r = 0, g = 0, b = 0, ws = 0, sh = 1;
        const acc = (i, w) => {
          if ((E[i] > 0) !== land || w === 0) return;
          const C = land ? landC : seaC;
          r += C[i * 3] * w; g += C[i * 3 + 1] * w; b += C[i * 3 + 2] * w; ws += w;
        };
        acc(i00, w00); acc(i10, w10); acc(i01, w01); acc(i11, w11);
        if (ws === 0) { const C = land ? landC : seaC, i = [i00, i10, i01, i11].find(k => (E[k] > 0) === land) ?? i00; r = C[i * 3]; g = C[i * 3 + 1]; b = C[i * 3 + 2]; ws = 1; }
        r /= ws; g /= ws; b /= ws;
        if (land) {
          sh = shade[i00] * w00 + shade[i10] * w10 + shade[i01] * w01 + shade[i11] * w11;
          const z = zones[ty < 0.5 ? (tx < 0.5 ? i00 : i10) : (tx < 0.5 ? i01 : i11)];
          const n = hash(ox, oy);
          if (z === 'forest') sh *= 0.86 + 0.22 * n;
          else if (z === 'farmland') sh *= 0.95 + 0.07 * Math.sin((ox * 0.8 + oy * 0.35)) * (Math.sin(oy * 0.21 + ox * 0.05) > 0 ? 1 : -1);
          else if (z === 'oilmarsh') sh *= n > 0.93 ? 0.7 : 0.95 + 0.08 * n;
          else if (z === 'wetland') sh *= n > 0.85 ? 0.82 : 1;
          else if (z === 'urban') sh *= (ox % 4 === 0 || oy % 4 === 0) ? 0.86 : 1.02;
          else if (z === 'ruins') sh *= ((ox % 5 === 0 || oy % 5 === 0) && n > 0.4) ? 0.82 : 1;
          else sh *= 0.985 + 0.03 * n;
        }
        const k = (oy * OW + ox) * 4;
        px[k] = Math.min(255, r * sh); px[k + 1] = Math.min(255, g * sh); px[k + 2] = Math.min(255, b * sh); px[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // ------------------------------------------------------------------ graticule (latitude / longitude lines)
  function buildGraticule() {
    const path = new Path2D(), labels = [];
    const Wi = T.imageWidth, Hi = T.imageHeight, inset = 26;
    for (let lat = -65; lat >= -85; lat -= 5) {
      for (let lon = 0; lon <= 360; lon += 2) { const [x, y] = T.fromLatLon(lat, lon); lon === 0 ? path.moveTo(x, y) : path.lineTo(x, y); }
      labels.push({ text: `${-lat}°S`, pos: T.fromLatLon(lat + 0.6, -150) });
    }
    for (let lon = -180; lon < 180; lon += 30) {
      let edge = null;
      for (let lat = -88; lat <= -60; lat += 0.5) {
        const [x, y] = T.fromLatLon(lat, lon);
        if (x < inset || y < inset || x > Wi - inset || y > Hi - inset) break;
        edge ? path.lineTo(x, y) : path.moveTo(x, y);
        edge = [x, y];
      }
      const name = lon === 0 ? '0°' : lon === -180 ? '180°' : `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`;
      if (edge) labels.push({ text: name, pos: edge, meridian: true });
    }
    return { path, labels };
  }

  // ------------------------------------------------------------------ overlays
  const TOWER_RANGE_KM = 80;   // a tower on high ground can see roughly 80 to 110 km to the horizon
  const FLAT_LIMIT_M = 110;    // a shore is "flat" if nothing within ~15 km rises above this
  const BEACH_MAX_KM = 200;    // long flat coasts are split into beaches of at most this length
  function buildOverlays() {
    const km = T.kmPerPx, W = T.W, H = T.H;
    const around = (x, y, r, fn) => {
      const c = T.cellIndex(x, y), cx = c % W, cy = (c / W) | 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) fn(yy * W + xx, xx, yy);
      }
    };
    const maxNear = (x, y, r) => { let m = 0; around(x, y, r, (i) => { m = Math.max(m, T.elev[i]); }); return m; };
    const highestNear = (x, y, r) => {
      let best = 0, at = null;
      around(x, y, r, (i, xx, yy) => { if (T.elev[i] > best && !T.lake[i]) { best = T.elev[i]; at = T.cellToImage(xx, yy); } });
      return at;
    };
    // points every `step` px along a closed polyline
    const resample = (l, step) => {
      const out = [[l[0], l[1]]], n = l.length / 2; let acc = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, x1 = l[j * 2], y1 = l[j * 2 + 1];
        let x0 = l[i * 2], y0 = l[i * 2 + 1], seg = Math.hypot(x1 - x0, y1 - y0);
        while (acc + seg >= step) {
          const f = (step - acc) / seg; x0 += (x1 - x0) * f; y0 += (y1 - y0) * f;
          out.push([x0, y0]); seg = Math.hypot(x1 - x0, y1 - y0); acc = 0;
        }
        acc += seg;
      }
      const last = out[out.length - 1];
      if (out.length > 1 && Math.hypot(last[0] - l[0], last[1] - l[1]) < step * 0.5) out.pop();
      return out;
    };
    // split an open polyline into pieces of at most maxPx
    const chunk = (p, maxPx) => {
      const parts = []; let cur = [p[0], p[1]], len = 0;
      for (let t = 2; t < p.length; t += 2) {
        len += Math.hypot(p[t] - p[t - 2], p[t + 1] - p[t - 1]); cur.push(p[t], p[t + 1]);
        if (len >= maxPx) { parts.push({ pts: cur, len }); cur = [p[t], p[t + 1]]; len = 0; }
      }
      if (len > 0) {
        if (parts.length && len < maxPx * 0.35) { const last = parts[parts.length - 1]; last.pts.push(...cur.slice(2)); last.len += len; }
        else parts.push({ pts: cur, len });
      }
      return parts;
    };

    // 1. Mountain coasts (natural walls) and flat beaches, from the detailed coastline
    const ramparts = new Path2D(), exposedPath = new Path2D(), beaches = [];
    let coastKm = 0, rampartKm = 0, exposedKm = 0;
    for (const line of Geom.coastline(0).lines) {
      const n = line.length / 2, lenKm = Geom.polylineLength(line) * km;
      if (lenKm < 25) continue;
      coastKm += lenKm;
      const high = new Uint8Array(n), flat = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const x = line[i * 2], y = line[i * 2 + 1];
        high[i] = maxNear(x, y, 3) >= 900 ? 1 : 0;
        flat[i] = maxNear(x, y, 2) < FLAT_LIMIT_M ? 1 : 0;
      }
      const runs = (flags, cb) => { // runs of flagged vertices around the closed line
        const start = flags.indexOf(0); if (start < 0) { cb(0, n, true); return; }
        for (let i = 0; i < n;) {
          if (!flags[(start + i) % n]) { i++; continue; }
          let j = i; while (j < n && flags[(start + j) % n]) j++;
          cb((start + i) % n, j - i, false); i = j;
        }
      };
      const runToPath = (path, s, len, closed) => {
        const pts = [];
        for (let t = 0; t <= len && t <= n; t++) { const k = (s + t) % n; pts.push(line[k * 2], line[k * 2 + 1]); }
        path.moveTo(pts[0], pts[1]); for (let t = 2; t < pts.length; t += 2) path.lineTo(pts[t], pts[t + 1]);
        if (closed) path.closePath();
        return pts;
      };
      runs(high, (s, len, closed) => { rampartKm += Geom.polylineLength(runToPath(ramparts, s, len, closed)) * km; });
      runs(flat, (s, len, closed) => {
        const p = runToPath(exposedPath, s, len, closed);
        exposedKm += Geom.polylineLength(p) * km;
        for (const part of chunk(p, BEACH_MAX_KM / km)) {
          const L = part.len * km; if (L < 40) continue;
          const mid = Math.floor(part.pts.length / 4) * 2;
          beaches.push({ pts: part.pts, lengthKm: L, mid: [part.pts[mid], part.pts[mid + 1]] });
        }
      });
    }

    // 2. Watchtowers: on high ground along a smoothed outline of the whole territory,
    //    spaced 1.5x their range apart so neighbouring views always overlap.
    const mask = new Float32Array(T.N);
    for (let i = 0; i < T.N; i++) mask[i] = T.elev[i] > 0 ? 1 : 0;
    const perim = Geom.contours(Geom.blur(Geom.blur(mask, 2), 2), 0.5)
      .filter(l => Geom.polylineLength(l) * km > 80).map(l => Geom.smooth(l, 2));
    const R = TOWER_RANGE_KM / km, towers = [];
    let perimeterKm = 0;
    for (const l of perim) {
      perimeterKm += Geom.polylineLength(l) * km;
      for (const [x, y] of resample(l, R * 1.5)) towers.push(highestNear(x, y, 2) || [x, y]);
    }
    const patrol = Geom.toPath(perim), coverage = new Path2D();
    for (const [x, y] of towers) { coverage.moveTo(x + R, y); coverage.arc(x, y, R, 0, Math.PI * 2); }

    // 3. Landing zones: the longest flat beaches, spread out around the coast, lettered A, B, C...
    beaches.sort((a, b) => b.lengthKm - a.lengthKm);
    const zones = [];
    for (const b of beaches) {
      if (zones.length >= 8) break;
      if (zones.some(z => Math.hypot(z.mid[0] - b.mid[0], z.mid[1] - b.mid[1]) < 170)) continue;
      zones.push(b);
    }
    zones.forEach((z, k) => {
      z.letter = String.fromCharCode(65 + k);
      const [mx, my] = z.mid; let best = null;
      for (let a = 0; a < 16; a++) { // approach arrow comes from the deepest nearby water
        const ang = a * Math.PI / 8, sx = mx + Math.cos(ang) * 34, sy = my + Math.sin(ang) * 34;
        const e = T.elevationAt(sx, sy);
        if (e < -50 && (!best || e < best.e)) best = { e, ang };
      }
      z.approach = best ? best.ang : null;
      let id = T.districtAt(mx, my);
      for (let r = 10; !id && r <= 60; r += 10) { // just outside a border? use the nearest district
        for (let a = 0; a < 12 && !id; a++) id = T.districtAt(mx + Math.cos(a * Math.PI / 6) * r, my + Math.sin(a * Math.PI / 6) * r);
      }
      z.district = id;
      z.where = id ? `${Land.byId[id].name} coast` : `${Land.seaNameAt(mx, my)} shore`;
      z.title = `Landing Zone ${z.letter}`;
    });
    return { ramparts, exposedPath, patrol, coverage, towers, zones, coastKm, perimeterKm, rampartKm, exposedKm, R };
  }

  // ------------------------------------------------------------------ drawing
  function drawWorld(ctx, map) {
    ctx.drawImage(base, -0.5, -0.5, T.W * T.CELL, T.H * T.CELL);
    const lw = (n) => map.px(n);

    if (state.graticule) {
      ctx.strokeStyle = 'rgba(214,230,244,0.22)'; ctx.lineWidth = lw(1); ctx.stroke(graticule.path);
    }
    // lakes and coast
    ctx.strokeStyle = 'rgba(30,62,92,0.55)'; ctx.lineWidth = lw(0.8); ctx.stroke(Geom.lakes().path);
    ctx.strokeStyle = 'rgba(16,34,54,0.9)'; ctx.lineWidth = lw(1.3); ctx.stroke(Geom.coastline(0).path);

    if (state.borders) {
      const outlines = Geom.districtOutlines();
      ctx.setLineDash([lw(7), lw(4)]);
      ctx.lineWidth = lw(3.2); ctx.strokeStyle = 'rgba(255,248,238,0.35)';
      for (const id in outlines) ctx.stroke(outlines[id].path);
      ctx.lineWidth = lw(1.6); ctx.strokeStyle = '#b8652f';
      for (const id in outlines) ctx.stroke(outlines[id].path);
      ctx.setLineDash([]);
      // the Royal Zone gets a solid copper double line
      const v = outlines.mount_veston;
      if (v) { ctx.lineWidth = lw(2.4); ctx.strokeStyle = 'rgba(201,122,69,0.9)'; ctx.stroke(v.path); }
    }

    if (state.road && D.tradeRoad) {
      const p = new Path2D(); D.tradeRoad.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
      ctx.lineCap = 'round';
      ctx.lineWidth = lw(4); ctx.strokeStyle = 'rgba(250,244,232,0.7)'; ctx.stroke(p);
      ctx.setLineDash([lw(6), lw(4)]); ctx.lineWidth = lw(2); ctx.strokeStyle = '#7a4a26'; ctx.stroke(p); ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }

    if (state.defenses || state.vulnerabilities) overlays = overlays || buildOverlays();
    if (state.defenses) {
      ctx.fillStyle = 'rgba(120,190,240,0.18)'; ctx.fill(overlays.coverage);
      ctx.strokeStyle = 'rgba(190,228,252,0.75)'; ctx.lineWidth = lw(1.4); ctx.setLineDash([lw(5), lw(4)]); ctx.stroke(overlays.patrol); ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(40,24,12,0.65)'; ctx.lineWidth = lw(6.5); ctx.stroke(overlays.ramparts);
      ctx.strokeStyle = '#d68b52'; ctx.lineWidth = lw(3.5); ctx.stroke(overlays.ramparts);
      ctx.lineCap = 'butt';
    }
    if (state.vulnerabilities) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,90,40,0.35)'; ctx.lineWidth = lw(11); ctx.stroke(overlays.exposedPath);
      ctx.strokeStyle = '#ff6a33'; ctx.lineWidth = lw(3.5); ctx.stroke(overlays.exposedPath);
      ctx.lineCap = 'butt';
    }
  }

  function drawScreen(ctx, map) {
    const labels = new Labels(ctx), z = map.zoom;
    hitTargets = [];
    const S = (x, y) => map.imageToScreen(x, y);
    const onWater = (x, y) => T.elevationAt(x, y) <= 0 || T.isLake(x, y);

    // defenses: tower icons when zoomed in
    if (state.defenses && overlays) {
      const showIcons = z >= 4;
      for (const [x, y] of overlays.towers) {
        const [sx, sy] = S(x, y);
        if (sx < -20 || sy < -20 || sx > map.width + 20 || sy > map.height + 20) continue;
        if (showIcons) Icons.drawIcon(ctx, 'tower', sx, sy, 16);
        else { ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#eaf4fc'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#16314d'; ctx.stroke(); }
      }
    }
    if (state.vulnerabilities && overlays) {
      for (const zn of overlays.zones) {
        const [sx, sy] = S(...zn.mid);
        if (zn.approach !== null) {
          const a = zn.approach, L = 38, bx = sx + Math.cos(a) * L, by = sy + Math.sin(a) * L;
          ctx.save(); ctx.strokeStyle = '#ffb08a'; ctx.fillStyle = '#ffb08a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14); ctx.stroke();
          const hx = sx + Math.cos(a) * 12, hy = sy + Math.sin(a) * 12, pa = a + Math.PI;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(pa - 0.5) * 10, hy - Math.sin(pa - 0.5) * 10); ctx.lineTo(hx - Math.cos(pa + 0.5) * 10, hy - Math.sin(pa + 0.5) * 10); ctx.fill();
          ctx.restore();
        }
        Icons.drawIcon(ctx, 'landing', sx, sy, 22);
        ctx.font = '700 12px "Source Sans 3", system-ui, sans-serif'; ctx.fillStyle = '#2a0e03'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(zn.letter, sx, sy + 0.5);
        labels.reserve(sx, sy, 24, 24);
        hitTargets.push({ kind: 'zone', item: zn, sx, sy, r: 14 });
      }
    }

    // places
    if (state.places) {
      Settlements.draw(ctx, map, labels, hitTargets, { onWater });
      // the South Pole
      const [px, py] = S(...T.pole);
      Icons.drawIcon(ctx, 'pole', px, py, 16); labels.reserve(px, py, 16, 16);
      if (z >= 1.25) labels.add({ text: 'South Pole', x: px, y: py, anchor: 'below', offset: 10, size: 12, font: 'italic 600 12px "Source Sans 3", system-ui, sans-serif', color: '#1b1712', halo: 'rgba(250,246,238,0.9)', priority: 40 });
      hitTargets.push({ kind: 'pole', sx: px, sy: py, r: 10 });
    }

    // district names
    for (const d of D.districts) {
      const [sx, sy] = S(...d.label), water = onWater(...d.label);
      const size = Math.min(19, 12 + z * 2.2);
      labels.add({
        text: d.name.toUpperCase(), x: sx, y: sy, size, spacing: '0.14em',
        font: `600 ${size}px Cinzel, Georgia, serif`,
        color: water ? '#f4e9dc' : '#3a2416', halo: water ? 'rgba(12,26,44,0.8)' : 'rgba(252,247,240,0.85)', haloWidth: 4,
        priority: 80, overIcons: true, alts: [[0, 1], [0, -1], [0.8, 1], [-0.8, -1], [0, 2], [0, -2]],
        sub: d.ruler && z >= 2.0 ? d.ruler.name : null, subSize: 13, subFont: 'italic 600 13px "Source Sans 3", system-ui, sans-serif',
        subColor: water ? '#d9e4ee' : '#5a3d2a',
      });
    }

    // real geography
    for (const f of D.features) {
      if (z < (f.minZoom || 1)) continue;
      const [sx, sy] = S(...f.pos);
      const style = {
        ocean: { font: `italic 500 ${16 + z}px Georgia, serif`, color: 'rgba(196,219,238,0.85)', halo: null, spacing: '0.3em', p: 20 },
        sea: { font: `italic 500 ${14 + z * 0.8}px Georgia, serif`, color: '#cfe2f2', halo: 'rgba(12,30,52,0.6)', spacing: '0.06em', p: 50 },
        region: { font: `600 ${18 + z * 2}px Cinzel, Georgia, serif`, color: 'rgba(214,230,244,0.55)', halo: null, spacing: '0.35em', p: 10 },
        land: { font: `italic 600 ${13 + z * 0.6}px Georgia, serif`, color: '#4a3a2c', halo: 'rgba(248,243,233,0.75)', spacing: '0.04em', p: 30 },
        mountains: { font: `italic 600 ${13 + z * 0.6}px Georgia, serif`, color: '#3d3128', halo: 'rgba(248,243,233,0.75)', spacing: '0.12em', p: 45 },
      }[f.kind];
      const water = onWater(...f.pos);
      const land = f.kind === 'land' || f.kind === 'mountains';
      labels.add({
        text: f.name, x: sx, y: sy, size: 15, angle: f.angle || 0, font: style.font, spacing: style.spacing,
        color: land && water ? '#e7eef5' : style.color, halo: land && water ? 'rgba(12,30,52,0.7)' : style.halo, priority: style.p,
      });
    }

    if (state.graticule) {
      for (const l of graticule.labels) {
        const [sx, sy] = S(...l.pos);
        labels.add({ text: l.text, x: sx, y: sy, size: 11, font: '600 11px "Source Sans 3", system-ui, sans-serif', color: 'rgba(220,234,246,0.85)', halo: 'rgba(10,26,46,0.7)', priority: 5 });
      }
    }
    labels.draw();
  }

  // ------------------------------------------------------------------ interaction
  function describe(x, y) {
    if (x < 0 || y < 0 || x > T.imageWidth || y > T.imageHeight) return null;
    const i = T.cellIndex(x, y), type = Land.typeAt(i), e = T.sample(T.elev, x, y);
    const id = T.districtAt(x, y), d = id && Land.byId[id];
    const region = d ? d.name : (e <= 0 ? Land.seaNameAt(x, y) : 'Unclaimed land');
    const elevText = T.lake[i] ? 'Lake surface' : e > 0 ? `${Math.round(e).toLocaleString()} m above sea level` : `${Math.round(-e).toLocaleString()} m deep`;
    return { title: Land.TYPES[type], lines: [elevText, region + (d && e <= 0 && d.kind !== 'Secluded sea' ? ' (waters)' : '')], color: d ? d.color : null };
  }

  function hit(sx, sy) {
    let best = null, bd = Infinity;
    for (const h of hitTargets) { const dd = Math.hypot(h.sx - sx, h.sy - sy); if (dd <= h.r + 4 && dd < bd) { bd = dd; best = h; } }
    return best;
  }

  function click({ sx, sy, x, y }) {
    const h = hit(sx, sy);
    if (h && h.kind === 'place') return App.showPlace(h.item);
    if (h && h.kind === 'zone') return showZone(h.item);
    if (h && h.kind === 'pole') return App.showInfo({ kicker: 'Geography', title: 'The South Pole', subtitle: '90°S', body: '<p>The geographic South Pole. Once buried under nearly 3 km of ice, it now sits on open land near the capital district.</p>' });
    const id = T.districtAt(x, y);
    if (id) return App.showDistrict(id);
    const e = T.elevationAt(x, y), ll = T.toLatLon(x, y);
    App.showInfo({ kicker: 'Geography', title: e <= 0 ? Land.seaNameAt(x, y) : 'Unclaimed land', subtitle: T.formatLatLon(ll.lat, ll.lon), body: `<p>${e <= 0 ? 'Open water outside the districts of Oppressus.' : 'Land outside any Oppressan district.'}</p>` });
  }

  function showZone(z) {
    const risk = z.lengthKm > 150 ? 'High' : z.lengthKm > 70 ? 'Moderate' : 'Low';
    App.showInfo({
      kicker: 'Vulnerability', title: z.title, subtitle: z.where, color: '#ff6a33',
      body: `<p>About <strong>${Math.round(z.lengthKm)} km</strong> of flat, low shoreline (under 170 m within 15 km of the beach). Ships could land troops here without climbing cliffs.</p>
             <dl class="facts"><dt>Landing risk</dt><dd>${risk}</dd><dt>Region</dt><dd>${z.where}</dd></dl>
             <p class="muted">The arrow shows the open-water approach.</p>`,
    });
  }

  // ------------------------------------------------------------------ sidebar
  function buildSidebar(el) {
    const legend = [
      ['peak', ramp(LAND_STOPS, 3800)], ['mountain', ramp(LAND_STOPS, 2200)], ['highland', ramp(LAND_STOPS, 1100)],
      ['plain', ramp(LAND_STOPS, 500)], ['tundra', ramp(LAND_STOPS, 150)], ['farmland', ZONE.farmland], ['forest', ZONE.forest],
      ['wetland', ZONE.wetland], ['oilmarsh', ZONE.oilmarsh], ['urban', ZONE.urban], ['ruins', ZONE.ruins],
      ['lake', LAKE], ['shelf', ramp(SEA_STOPS, -150)], ['ocean', ramp(SEA_STOPS, -2500)],
    ];
    el.innerHTML = `
      <section class="panel-section">
        <h3>Overlays</h3>
        <label class="toggle"><input type="checkbox" data-k="defenses"><span class="sw"></span><span><strong>Defenses</strong><small>Mountain coasts and the watchtower line</small></span></label>
        <label class="toggle"><input type="checkbox" data-k="vulnerabilities"><span class="sw"></span><span><strong>Vulnerabilities</strong><small>Flat shores where ships could land</small></span></label>
        <div class="overlay-stats" id="terraStats"></div>
      </section>
      <section class="panel-section">
        <h3>Layers</h3>
        <label class="toggle small"><input type="checkbox" data-k="borders" checked><span class="sw"></span><span>District borders</span></label>
        <label class="toggle small"><input type="checkbox" data-k="places" checked><span class="sw"></span><span>Places</span></label>
        <label class="toggle small"><input type="checkbox" data-k="road" checked><span class="sw"></span><span>Road of trade</span></label>
        <label class="toggle small"><input type="checkbox" data-k="graticule" checked><span class="sw"></span><span>Latitude and longitude</span></label>
      </section>
      <section class="panel-section">
        <h3>Legend</h3>
        <ul class="legend">${legend.map(([k, c]) => `<li><span class="swatch" style="background:${rgb(c)}"></span>${Land.TYPES[k]}</li>`).join('')}</ul>
        <ul class="legend lines">
          <li><span class="line dashed copper"></span>District border</li>
          <li><span class="line solid copper"></span>Royal Zone (Mount Veston)</li>
          <li><span class="line road"></span>Road of trade</li>
        </ul>
        <ul class="legend icons" id="terraIcons"></ul>
      </section>`;
    const icons = el.querySelector('#terraIcons');
    for (const [type, name] of [['capital', 'Capital city'], ['sacred', 'Sacred site of Cilla'], ['city', 'City'], ['quarter', 'Borough of Nova Cella'], ['town', 'Town'], ['farm', 'Farm town'], ['forest', 'Forest town'], ['fishing', 'Fishing village'], ['mine', 'Mining town'], ['military', 'Naval camp'], ['port', 'Port and trade hub'], ['market', 'Hidden market'], ['prison', 'Prison'], ['rehab', 'Rehabilitation town'], ['camp', 'Outlaw camp'], ['ruin', 'Ruins / abandoned'], ['oilfield', 'Abandoned oil field'], ['summit', 'Summit'], ['pole', 'South Pole']]) {
      const li = document.createElement('li'); li.appendChild(Icons.toCanvas(type, 22)); li.append(name); icons.appendChild(li);
    }
    el.querySelectorAll('input[data-k]').forEach(inp => {
      inp.checked = state[inp.dataset.k];
      inp.addEventListener('change', () => { state[inp.dataset.k] = inp.checked; updateStats(); App.map.requestRender(); });
    });
    updateStats();
  }

  function updateStats() {
    const el = document.getElementById('terraStats');
    if (!el) return;
    if (!state.defenses && !state.vulnerabilities) { el.innerHTML = ''; return; }
    overlays = overlays || buildOverlays();
    const o = overlays, parts = [];
    if (state.defenses) parts.push(`
      <div class="stat-row"><span class="key-swatch" style="background:#d68b52"></span><span><strong>${Math.round(o.rampartKm).toLocaleString()} km</strong> of mountain coastline, a natural wall</span></div>
      <div class="stat-row"><span class="key-swatch" style="background:rgba(120,190,240,0.5)"></span><span><strong>${o.towers.length}</strong> watchtowers on high ground, each seeing ${TOWER_RANGE_KM} km. Their views overlap all the way around the <strong>${Math.round(o.perimeterKm).toLocaleString()} km</strong> perimeter, so there are no blind spots.</span></div>`);
    if (state.vulnerabilities) parts.push(`
      <div class="stat-row"><span class="key-swatch" style="background:#ff6a33"></span><span><strong>${Math.round(o.exposedKm).toLocaleString()} km</strong> of flat, open shoreline</span></div>
      <ul class="zone-list">${o.zones.map((z, i) => `<li><button data-zone="${i}"><span class="zone-letter">${z.letter}</span>${z.where}<small>${Math.round(z.lengthKm)} km</small></button></li>`).join('')}</ul>`);
    el.innerHTML = parts.join('');
    el.querySelectorAll('[data-zone]').forEach(b => b.addEventListener('click', () => {
      const z = o.zones[+b.dataset.zone]; App.map.flyTo(z.mid[0], z.mid[1], 3.2, 900); showZone(z);
    }));
  }

  return {
    id: 'terra',
    get background() { return BG; },
    activate() {
      if (!base) { base = buildBase(); graticule = buildGraticule(); }
    },
    drawWorld, drawScreen, describe, click, buildSidebar,
    hitTest: (sx, sy) => !!hit(sx, sy),
    // shared with Civitas
    baseCanvas() { if (!base) { base = buildBase(); graticule = buildGraticule(); } return base; },
    defenses() { overlays = overlays || buildOverlays(); return overlays; },
    setOverlay(k, on) { state[k] = on; const inp = document.querySelector(`#sidebar input[data-k="${k}"]`); if (inp) inp.checked = on; updateStats(); App.map.requestRender(); },
  };
})();
