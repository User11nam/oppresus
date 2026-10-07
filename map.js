// map.js: the one shared map used by every view.
//   Terrain   decoded elevation / district grids, coordinates and latitude/longitude
//   Geom      contour tracing (coastlines, borders) and small geometry helpers
//   MapView   the canvas: camera, zoom and pan, hover and click, render loop
//   Icons     small vector map symbols
//   Labels    collision-free text labels
// Every position in the project is a pixel coordinate on assets/district_map.png.
'use strict';

const Views = {}; // each view file registers itself here: Views.terra = {...}

// Accessibility preferences that affect drawing on the map (set from the Settings panel in ui.js)
const Prefs = { textScale: 1, plainFonts: false, highContrast: false, reduceMotion: false };

// ====================================================================== Terrain
const Terrain = (() => {
  const T = window.TERRAIN;
  const W = T.width, H = T.height, CELL = T.cell, N = W * H;

  const elev = new Float32Array(N);
  const bin = atob(T.elevation);
  for (let i = 0; i < N; i++) {
    const c = bin.charCodeAt(i);
    elev[i] = c >= 100 ? ((c - 100) / 155) ** 2 * 5000 : -(((100 - c) / 100) ** 2) * 6000;
  }
  const districtIdx = new Uint8Array(N), lake = new Uint8Array(N);
  const fb = atob(T.flags);
  for (let i = 0, k = 0; i < fb.length; i += 2) {
    const v = fb.charCodeAt(i), n = fb.charCodeAt(i + 1);
    for (let j = 0; j < n; j++, k++) { districtIdx[k] = v & 15; lake[k] = (v >> 4) & 1; }
  }
  const districtIds = [null, ...T.districtOrder];

  // Distance (km) from every cell to the nearest coast, via a two-pass chamfer transform.
  const coastDist = (() => {
    const d = new Float32Array(N), INF = 1e9, S = Math.SQRT2;
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0, land = elev[i] > 0;
      let edge = false;
      if (x > 0 && (elev[i - 1] > 0) !== land) edge = true;
      else if (x < W - 1 && (elev[i + 1] > 0) !== land) edge = true;
      else if (y > 0 && (elev[i - W] > 0) !== land) edge = true;
      else if (y < H - 1 && (elev[i + W] > 0) !== land) edge = true;
      d[i] = edge ? 0.5 : INF;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + S); if (x < W - 1) v = Math.min(v, d[i - W + 1] + S); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + S); if (x > 0) v = Math.min(v, d[i + W - 1] + S); }
      d[i] = v;
    }
    const km = CELL * T.kmPerPx;
    for (let i = 0; i < N; i++) d[i] *= km;
    return d;
  })();

  const gx = (x) => (x - 1) / CELL, gy = (y) => (y - 1) / CELL;
  const cellIndex = (x, y) => {
    const cx = Math.min(W - 1, Math.max(0, Math.round(gx(x)))), cy = Math.min(H - 1, Math.max(0, Math.round(gy(y))));
    return cy * W + cx;
  };
  function sample(field, x, y) {
    let fx = gx(x), fy = gy(y);
    fx = Math.min(W - 1.001, Math.max(0, fx)); fy = Math.min(H - 1.001, Math.max(0, fy));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = y0 * W + x0;
    return (field[i] * (1 - tx) + field[i + 1] * tx) * (1 - ty) + (field[i + W] * (1 - tx) + field[i + W + 1] * tx) * ty;
  }

  // slope in metres of rise per km, at a cell
  function slopeAt(i) {
    const x = i % W, y = (i / W) | 0, km = CELL * T.kmPerPx;
    const l = elev[y * W + Math.max(0, x - 1)], r = elev[y * W + Math.min(W - 1, x + 1)];
    const u = elev[Math.max(0, y - 1) * W + x], d = elev[Math.min(H - 1, y + 1) * W + x];
    return Math.hypot((r - l) / (2 * km), (d - u) / (2 * km));
  }

  // ---- latitude / longitude (south polar stereographic fitted to the map image)
  const { a, b, tx, ty } = T.geo, det = a * a + b * b, R = 6371;
  function toLatLon(x, y) {
    const dx = x - tx, dy = y - ty;
    const kx = (a * dx + b * dy) / det, ky = (-b * dx + a * dy) / det;
    const rho = Math.hypot(kx, ky);
    return { lat: 2 * Math.atan(rho / (2 * R)) * 180 / Math.PI - 90, lon: Math.atan2(kx, -ky) * 180 / Math.PI };
  }
  function fromLatLon(lat, lon) {
    const rho = 2 * R * Math.tan((90 + lat) * Math.PI / 360), l = lon * Math.PI / 180;
    const kx = rho * Math.sin(l), ky = -rho * Math.cos(l);
    return [a * kx - b * ky + tx, b * kx + a * ky + ty];
  }
  function formatLatLon(lat, lon) {
    const ns = `${Math.abs(lat).toFixed(1)}°S`;
    const ew = Math.abs(lon) < 0.05 || Math.abs(Math.abs(lon) - 180) < 0.05 ? `${Math.abs(lon).toFixed(1)}°` : `${Math.abs(lon).toFixed(1)}°${lon > 0 ? 'E' : 'W'}`;
    return `${ns}, ${ew}`;
  }

  return {
    W, H, CELL, N, elev, lake, districtIdx, districtIds, coastDist,
    imageWidth: T.imageWidth, imageHeight: T.imageHeight, kmPerPx: T.kmPerPx,
    pole: [tx, ty],
    cellIndex, sample, slopeAt, toLatLon, fromLatLon, formatLatLon,
    cellToImage: (cx, cy) => [cx * CELL + 1, cy * CELL + 1],
    elevationAt: (x, y) => sample(elev, x, y),
    districtAt: (x, y) => districtIds[districtIdx[cellIndex(x, y)]],
    isLake: (x, y) => lake[cellIndex(x, y)] === 1,
  };
})();

// ====================================================================== Geom
const Geom = (() => {
  // Marching squares. `field` is a W*H grid (Terrain grid size); returns closed polylines
  // as flat arrays [x0,y0,x1,y1,...] in image pixels. Outside the grid counts as "below".
  function contours(field, threshold, W = Terrain.W, H = Terrain.H) {
    const PW = W + 2, PH = H + 2, E = PW * PH * 2;
    const px = new Float32Array(E), py = new Float32Array(E);
    const l1 = new Int32Array(E).fill(-1), l2 = new Int32Array(E).fill(-1);
    const used = [];
    const v = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -Infinity : field[y * W + x];
    const hEdge = (x, y) => ((y + 1) * PW + (x + 1)) * 2;     // (x,y)-(x+1,y)
    const vEdge = (x, y) => ((y + 1) * PW + (x + 1)) * 2 + 1; // (x,y)-(x,y+1)
    const t = threshold;
    const setH = (e, x, y, a, b) => { const f = a === -Infinity ? 1 : b === -Infinity ? 0 : (t - a) / (b - a); px[e] = x + f; py[e] = y; };
    const setV = (e, x, y, a, b) => { const f = a === -Infinity ? 1 : b === -Infinity ? 0 : (t - a) / (b - a); px[e] = x; py[e] = y + f; };
    const link = (e1, e2) => {
      if (l1[e1] < 0) { l1[e1] = e2; used.push(e1); } else l2[e1] = e2;
      if (l1[e2] < 0) { l1[e2] = e1; used.push(e2); } else l2[e2] = e1;
    };
    for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
      const tl = v(x, y), tr = v(x + 1, y), br = v(x + 1, y + 1), bl = v(x, y + 1);
      const c = (tl > t ? 8 : 0) | (tr > t ? 4 : 0) | (br > t ? 2 : 0) | (bl > t ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const top = hEdge(x, y), bottom = hEdge(x, y + 1), left = vEdge(x, y), right = vEdge(x + 1, y);
      const hTL = (c & 8) !== 0, hTR = (c & 4) !== 0, hBR = (c & 2) !== 0, hBL = (c & 1) !== 0;
      if (hTL !== hTR) setH(top, x, y, tl, tr);
      if (hBL !== hBR) setH(bottom, x, y + 1, bl, br);
      if (hTL !== hBL) setV(left, x, y, tl, bl);
      if (hTR !== hBR) setV(right, x + 1, y, tr, br);
      switch (c) {
        case 1: case 14: link(left, bottom); break;
        case 2: case 13: link(bottom, right); break;
        case 3: case 12: link(left, right); break;
        case 4: case 11: link(top, right); break;
        case 6: case 9: link(top, bottom); break;
        case 7: case 8: link(left, top); break;
        case 5: { const m = (tl + tr + br + bl) / 4 > t; if (m) { link(left, top); link(bottom, right); } else { link(left, bottom); link(top, right); } break; }
        case 10: { const m = (tl + tr + br + bl) / 4 > t; if (m) { link(top, right); link(left, bottom); } else { link(left, top); link(bottom, right); } break; }
      }
    }
    const seen = new Uint8Array(E), lines = [], C = Terrain.CELL;
    for (const s of used) {
      if (seen[s]) continue;
      const pts = []; let prev = -1, cur = s;
      while (cur >= 0 && !seen[cur]) {
        seen[cur] = 1; pts.push(px[cur] * C + 1, py[cur] * C + 1);
        const n = l1[cur] !== prev ? l1[cur] : l2[cur];
        prev = cur; cur = n;
      }
      if (pts.length >= 6) lines.push(pts);
    }
    return lines;
  }

  // Separable box blur on a grid (used to soften masks before tracing)
  function blur(field, r, W = Terrain.W, H = Terrain.H) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      let s = 0; const row = y * W;
      for (let x = -r; x <= r; x++) s += field[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = s / (2 * r + 1);
        s += field[row + Math.min(W - 1, x + r + 1)] - field[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        out[y * W + x] = s / (2 * r + 1);
        s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
    return out;
  }

  // Exact Euclidean distance (in cells) from every cell to the nearest cell where feature[i] is truthy.
  function edt(feature, W = Terrain.W, H = Terrain.H) {
    const INF = 1e20, d = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = feature[i] ? 0 : INF;
    const n = Math.max(W, H), f = new Float64Array(n), out = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const pass = (len) => {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s;
        do { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); } while (s <= z[k] && --k >= 0);
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; const p = v[k]; out[q] = (q - p) * (q - p) + f[p]; }
    };
    for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = d[y * W + x]; pass(H); for (let y = 0; y < H; y++) d[y * W + x] = out[y]; }
    const res = new Float32Array(W * H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = d[y * W + x]; pass(W); for (let x = 0; x < W; x++) res[y * W + x] = Math.sqrt(out[x]); }
    return res;
  }

  // Chaikin corner cutting on a closed polyline
  function smooth(pts, iterations = 1) {
    let p = pts;
    for (let k = 0; k < iterations; k++) {
      const o = [], n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const x0 = p[i * 2], y0 = p[i * 2 + 1], j = (i + 1) % n, x1 = p[j * 2], y1 = p[j * 2 + 1];
        o.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
      }
      p = o;
    }
    return p;
  }

  function toPath(lines, closed = true) {
    const path = new Path2D();
    for (const l of lines) {
      path.moveTo(l[0], l[1]);
      for (let i = 2; i < l.length; i += 2) path.lineTo(l[i], l[i + 1]);
      if (closed) path.closePath();
    }
    return path;
  }

  function polylineLength(l) {
    let s = 0;
    for (let i = 2; i < l.length; i += 2) s += Math.hypot(l[i] - l[i - 2], l[i + 1] - l[i - 1]);
    return s;
  }

  // Region outlines for each district, traced from the district grid. Cached.
  let districtCache = null;
  function districtOutlines() {
    if (districtCache) return districtCache;
    districtCache = {};
    const N = Terrain.N, mask = new Float32Array(N);
    Terrain.districtIds.forEach((id, k) => {
      if (!id) return;
      for (let i = 0; i < N; i++) mask[i] = Terrain.districtIdx[i] === k ? 1 : 0;
      const lines = contours(blur(mask, 1), 0.5).filter(l => l.length > 12).map(l => smooth(l, 1));
      districtCache[id] = { lines, path: toPath(lines) };
    });
    return districtCache;
  }

  // Coastline at a given sea level. Cached by level.
  const coastCache = new Map();
  function coastline(seaLevel = 0, field = Terrain.elev) {
    const key = field === Terrain.elev ? seaLevel : null;
    if (key !== null && coastCache.has(key)) return coastCache.get(key);
    const lines = contours(field, seaLevel).map(l => smooth(l, 1));
    const result = { lines, path: toPath(lines) };
    if (key !== null) coastCache.set(key, result);
    return result;
  }

  let lakeCache = null;
  function lakes() {
    if (lakeCache) return lakeCache;
    const f = new Float32Array(Terrain.N);
    for (let i = 0; i < Terrain.N; i++) f[i] = Terrain.lake[i];
    const lines = contours(blur(f, 1), 0.45).map(l => smooth(l, 1));
    lakeCache = { lines, path: toPath(lines) };
    return lakeCache;
  }

  return { contours, blur, edt, smooth, toPath, polylineLength, districtOutlines, coastline, lakes };
})();

// ====================================================================== Icons
// Small vector symbols drawn in screen space. `s` is the icon size in pixels.
const Icons = (() => {
  const COPPER = '#c97a45', INK = '#16212e';

  function flame(ctx, x, y, s, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.55);
    ctx.bezierCurveTo(x + s * 0.42, y - s * 0.15, x + s * 0.38, y + s * 0.42, x, y + s * 0.45);
    ctx.bezierCurveTo(x - s * 0.38, y + s * 0.42, x - s * 0.42, y - s * 0.05, x - s * 0.12, y - s * 0.2);
    ctx.bezierCurveTo(x - s * 0.1, y - s * 0.02, x - s * 0.02, y + s * 0.02, x + s * 0.02, y - s * 0.1);
    ctx.bezierCurveTo(x + s * 0.06, y - s * 0.26, x - s * 0.02, y - s * 0.42, x, y - s * 0.55);
    ctx.fillStyle = fill; ctx.fill();
  }

  // A "cell": membrane ring with a nucleus, the symbol of Cilla
  function cell(ctx, x, y, s, stroke) {
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.5, s * 0.44, -0.3, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.strokeStyle = stroke; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * 0.12, y - s * 0.06, s * 0.14, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill();
  }

  const draw = {
    capital(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.62, '#f3ead8', INK);
      star(ctx, x, y, s * 0.42, s * 0.18, COPPER);
    },
    city(ctx, x, y, s) { disc(ctx, x, y, s * 0.42, '#f3ead8', INK); dot(ctx, x, y, s * 0.18, INK); },
    town(ctx, x, y, s) { disc(ctx, x, y, s * 0.3, '#f3ead8', INK); },
    palace(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#f3ead8', COPPER);
      ctx.fillStyle = COPPER; ctx.fillRect(x - s * 0.28, y - s * 0.05, s * 0.56, s * 0.28);
      ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.05); ctx.lineTo(x, y - s * 0.32); ctx.lineTo(x + s * 0.32, y - s * 0.05); ctx.fill();
    },
    sacred(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.62, '#1b1410', COPPER);
      cell(ctx, x, y, s * 1.0, 'rgba(201,122,69,0.55)');
      flame(ctx, x, y + s * 0.02, s * 0.7, '#e8a062');
    },
    prison(ctx, x, y, s) {
      box(ctx, x, y, s * 0.5, '#e9e6e1', INK);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, s * 0.08);
      for (const dx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y - s * 0.32); ctx.lineTo(x + dx * s, y + s * 0.32); ctx.stroke(); }
    },
    military(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.45, y - s * 0.25); ctx.lineTo(x + s * 0.35, y + s * 0.25);
      ctx.lineTo(x, y + s * 0.52); ctx.lineTo(x - s * 0.35, y + s * 0.25); ctx.lineTo(x - s * 0.45, y - s * 0.25); ctx.closePath();
      ctx.fillStyle = '#2f4e6e'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#e6eef5'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - s * 0.2, y - s * 0.02); ctx.lineTo(x, y + s * 0.18); ctx.lineTo(x + s * 0.2, y - s * 0.02);
      ctx.strokeStyle = '#e6eef5'; ctx.lineWidth = Math.max(1.4, s * 0.1); ctx.stroke();
    },
    mine(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#f3ead8', INK);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.28); ctx.lineTo(x + s * 0.22, y - s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.12, y - s * 0.1, s * 0.3, -2.6, -0.3); ctx.stroke(); ctx.lineCap = 'butt';
    },
    port(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.58, '#f3ead8', INK);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, s * 0.09);
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.32); ctx.lineTo(x, y + s * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - s * 0.18, y - s * 0.16); ctx.lineTo(x + s * 0.18, y - s * 0.16); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + s * 0.02, s * 0.28, 0.35, Math.PI - 0.35); ctx.stroke();
    },
    market(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.45, y); ctx.lineTo(x, y + s * 0.5); ctx.lineTo(x - s * 0.45, y); ctx.closePath();
      ctx.fillStyle = '#3b2c48'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#d9c9ea'; ctx.stroke();
      dot(ctx, x, y, s * 0.12, '#d9c9ea');
    },
    ruin(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#d8d2ca', INK);
      ctx.fillStyle = INK;
      ctx.fillRect(x - s * 0.26, y - s * 0.05, s * 0.12, s * 0.33);
      ctx.fillRect(x - s * 0.04, y - s * 0.3, s * 0.12, s * 0.58);
      ctx.save(); ctx.translate(x + s * 0.2, y + s * 0.1); ctx.rotate(0.6); ctx.fillRect(-s * 0.05, -s * 0.18, s * 0.11, s * 0.34); ctx.restore();
    },
    oilfield(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#e8dcc0', INK);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, s * 0.08);
      ctx.beginPath(); ctx.moveTo(x - s * 0.22, y + s * 0.3); ctx.lineTo(x, y - s * 0.32); ctx.lineTo(x + s * 0.22, y + s * 0.3);
      ctx.moveTo(x - s * 0.14, y + s * 0.06); ctx.lineTo(x + s * 0.14, y + s * 0.06); ctx.stroke();
      ctx.strokeStyle = '#b3402f'; ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.beginPath(); ctx.moveTo(x - s * 0.36, y - s * 0.36); ctx.lineTo(x + s * 0.36, y + s * 0.36); ctx.stroke();
    },
    farm(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#f1ecd2', INK);
      ctx.strokeStyle = '#6f7c2c'; ctx.lineWidth = Math.max(1.3, s * 0.08);
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.34); ctx.lineTo(x, y - s * 0.32); ctx.stroke();
      ctx.fillStyle = '#8a9a35';
      for (const k of [-0.2, 0, 0.2]) { leaf(ctx, x - s * 0.1, y + k * s, s * 0.16, -0.6); leaf(ctx, x + s * 0.1, y + k * s, s * 0.16, 0.6); }
    },
    forest(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#e3efe2', INK);
      ctx.fillStyle = '#2f6e45';
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.38); ctx.lineTo(x + s * 0.28, y + s * 0.18); ctx.lineTo(x - s * 0.28, y + s * 0.18); ctx.fill();
      ctx.fillRect(x - s * 0.05, y + s * 0.18, s * 0.1, s * 0.16);
    },
    wetland(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#e2eef0', INK);
      ctx.strokeStyle = '#3d6b72'; ctx.lineWidth = Math.max(1.2, s * 0.08);
      for (const k of [-0.18, 0.06, 0.28]) { ctx.beginPath(); ctx.moveTo(x - s * 0.3, y + k * s); ctx.quadraticCurveTo(x - s * 0.15, y + k * s - s * 0.1, x, y + k * s); ctx.quadraticCurveTo(x + s * 0.15, y + k * s + s * 0.1, x + s * 0.3, y + k * s); ctx.stroke(); }
    },
    fishing(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#e2eef0', INK);
      ctx.fillStyle = '#2c5d7a';
      ctx.beginPath(); ctx.ellipse(x - s * 0.04, y, s * 0.24, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + s * 0.16, y); ctx.lineTo(x + s * 0.34, y - s * 0.14); ctx.lineTo(x + s * 0.34, y + s * 0.14); ctx.fill();
    },
    summit(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.42); ctx.lineTo(x + s * 0.42, y + s * 0.32); ctx.lineTo(x - s * 0.42, y + s * 0.32); ctx.closePath();
      ctx.fillStyle = '#3d3a37'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2efe9'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.42); ctx.lineTo(x + s * 0.15, y - s * 0.16); ctx.lineTo(x - s * 0.15, y - s * 0.16); ctx.closePath(); ctx.fillStyle = '#f2efe9'; ctx.fill();
    },
    danger(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.48); ctx.lineTo(x + s * 0.48, y + s * 0.38); ctx.lineTo(x - s * 0.48, y + s * 0.38); ctx.closePath();
      ctx.fillStyle = '#e0a03a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(x - s * 0.04, y - s * 0.18, s * 0.08, s * 0.3); ctx.fillRect(x - s * 0.04, y + s * 0.18, s * 0.08, s * 0.08);
    },
    tower(ctx, x, y, s) {
      ctx.fillStyle = '#e6eef5'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - s * 0.22, y + s * 0.4); ctx.lineTo(x - s * 0.14, y - s * 0.2); ctx.lineTo(x + s * 0.14, y - s * 0.2); ctx.lineTo(x + s * 0.22, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x - s * 0.26, y - s * 0.42, s * 0.52, s * 0.22); ctx.fill(); ctx.stroke();
    },
    pole(ctx, x, y, s) {
      ctx.strokeStyle = '#f5f7fa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x + s * 0.45, y); ctx.moveTo(x, y - s * 0.45); ctx.lineTo(x, y + s * 0.45); ctx.stroke();
      disc(ctx, x, y, s * 0.18, '#f5f7fa', INK);
    },
    landing(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.55, '#ff7a45', '#3a1406');
    },
    // story markers for Fabulae: a wax-seal disc with an ink glyph; stories of Cilla are copper
    story(ctx, x, y, s, o = {}) {
      const cilla = o.cilla, sel = o.selected;
      ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = cilla ? '#a9541f' : '#f4e8cc'; ctx.fill();
      ctx.lineWidth = Math.max(1.6, s * 0.08); ctx.strokeStyle = cilla ? '#f3c79a' : '#4a3020'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, s * 0.4, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = cilla ? 'rgba(243,199,154,0.55)' : 'rgba(74,48,32,0.35)'; ctx.stroke();
      if (sel) { ctx.beginPath(); ctx.arc(x, y, s * 0.68, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#d0782f'; ctx.stroke(); }
      const ink = cilla ? '#fbe6cc' : '#3b2614', g = s * 0.62;
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.3, s * 0.06); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (cilla) {
        if (cilla === 'cell' || cilla === 'both') cell(ctx, x, y, g * (cilla === 'both' ? 1.15 : 0.95), cilla === 'both' ? 'rgba(251,230,204,0.6)' : ink);
        if (cilla === 'flame' || cilla === 'both') flame(ctx, x, y + s * 0.02, g * (cilla === 'both' ? 0.75 : 1), ink);
      } else (GLYPH[o.type] || GLYPH.legend)(ctx, x, y, g);
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    },
    quarter(ctx, x, y, s) {
      ctx.beginPath(); ctx.roundRect(x - s * 0.36, y - s * 0.36, s * 0.72, s * 0.72, s * 0.12);
      ctx.fillStyle = '#efe4d2'; ctx.fill(); ctx.lineWidth = Math.max(1.3, s * 0.12); ctx.strokeStyle = INK; ctx.stroke();
      dot(ctx, x, y, s * 0.12, COPPER);
    },
    rehab(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x - s * 0.36, y - s * 0.02); ctx.lineTo(x, y - s * 0.4); ctx.lineTo(x + s * 0.36, y - s * 0.02);
      ctx.lineTo(x + s * 0.28, y - s * 0.02); ctx.lineTo(x + s * 0.28, y + s * 0.34); ctx.lineTo(x - s * 0.28, y + s * 0.34); ctx.lineTo(x - s * 0.28, y - s * 0.02); ctx.closePath();
      ctx.fillStyle = '#e9e6e1'; ctx.fill(); ctx.lineWidth = Math.max(1.3, s * 0.09); ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(x - s * 0.07, y + s * 0.1, s * 0.14, s * 0.24);
    },
    camp(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x + s * 0.42, y + s * 0.32); ctx.lineTo(x - s * 0.42, y + s * 0.32); ctx.closePath();
      ctx.fillStyle = '#8a6a3a'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#2a1d0e'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x + s * 0.12, y + s * 0.32); ctx.lineTo(x - s * 0.12, y + s * 0.32); ctx.closePath(); ctx.fillStyle = '#2a1d0e'; ctx.fill();
    },
    treasury(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.5, '#e8b04f', '#5a3a0c');
      ctx.beginPath(); ctx.arc(x, y, s * 0.27, 0, Math.PI * 2); ctx.lineWidth = Math.max(1.2, s * 0.07); ctx.strokeStyle = '#8a4b1c'; ctx.stroke();
      ctx.font = `700 ${Math.round(s * 0.42)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a3a0c'; ctx.fillText('C', x, y + s * 0.02);
    },
    carbon(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.58, '#dfe9ee', INK);
      ctx.fillStyle = '#2f4b5c';
      ctx.fillRect(x - s * 0.32, y - s * 0.02, s * 0.64, s * 0.3);
      ctx.fillRect(x + s * 0.12, y - s * 0.34, s * 0.12, s * 0.34);
      ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.02); ctx.lineTo(x - s * 0.14, y - s * 0.16); ctx.lineTo(x - s * 0.14, y - s * 0.02); ctx.lineTo(x + s * 0.04, y - s * 0.16); ctx.lineTo(x + s * 0.04, y - s * 0.02); ctx.fill();
    },
    timber(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.56, '#efe2cc', INK);
      ctx.fillStyle = '#8a5a2b'; ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 1;
      for (const [dx, dy] of [[-0.14, 0.12], [0.14, 0.12], [0, -0.12]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, s * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    },
    // an oil derrick; colour comes from opts.color (the country)
    rig(ctx, x, y, s, o = {}) {
      disc(ctx, x, y, s * 0.6, o.color || '#e8dcc0', INK);
      ctx.strokeStyle = o.ink || INK; ctx.lineWidth = Math.max(1.3, s * 0.08);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.24, y + s * 0.32); ctx.lineTo(x, y - s * 0.36); ctx.lineTo(x + s * 0.24, y + s * 0.32);
      ctx.moveTo(x - s * 0.16, y + s * 0.08); ctx.lineTo(x + s * 0.16, y + s * 0.08);
      ctx.moveTo(x - s * 0.1, y - s * 0.1); ctx.lineTo(x + s * 0.1, y - s * 0.1);
      ctx.stroke();
    },
    station(ctx, x, y, s) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42); }
      ctx.closePath(); ctx.fillStyle = '#f2f6fa'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f4f7a'; ctx.stroke();
      dot(ctx, x, y, s * 0.12, '#1f4f7a');
    },
    facility(ctx, x, y, s) {
      disc(ctx, x, y, s * 0.6, '#e9f3f8', '#1f4f7a');
      ctx.fillStyle = '#1f4f7a';
      ctx.beginPath(); ctx.arc(x, y + s * 0.16, s * 0.3, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - s * 0.04, y - s * 0.34, s * 0.08, s * 0.24);
    },
  };

  // ink glyphs for the kinds of story (drawn inside the story seal; g = glyph size)
  const GLYPH = {
    legend(ctx, x, y, g) { // an open book
      ctx.beginPath(); ctx.moveTo(x, y - g * 0.28); ctx.quadraticCurveTo(x - g * 0.25, y - g * 0.4, x - g * 0.5, y - g * 0.3); ctx.lineTo(x - g * 0.5, y + g * 0.3); ctx.quadraticCurveTo(x - g * 0.25, y + g * 0.2, x, y + g * 0.32);
      ctx.quadraticCurveTo(x + g * 0.25, y + g * 0.2, x + g * 0.5, y + g * 0.3); ctx.lineTo(x + g * 0.5, y - g * 0.3); ctx.quadraticCurveTo(x + g * 0.25, y - g * 0.4, x, y - g * 0.28); ctx.lineTo(x, y + g * 0.32); ctx.stroke();
    },
    ghost(ctx, x, y, g) {
      ctx.beginPath(); ctx.moveTo(x - g * 0.34, y + g * 0.38); ctx.lineTo(x - g * 0.34, y - g * 0.05); ctx.arc(x, y - g * 0.05, g * 0.34, Math.PI, 0); ctx.lineTo(x + g * 0.34, y + g * 0.38);
      for (let k = 0; k < 3; k++) { const x1 = x + g * 0.34 - (k + 0.5) * g * 0.227, x2 = x + g * 0.34 - (k + 1) * g * 0.227; ctx.quadraticCurveTo(x1, y + g * 0.2, x2, y + g * 0.38); }
      ctx.stroke(); ctx.beginPath(); ctx.arc(x - g * 0.12, y - g * 0.06, g * 0.05, 0, Math.PI * 2); ctx.arc(x + g * 0.12, y - g * 0.06, g * 0.05, 0, Math.PI * 2); ctx.fill();
    },
    mystery(ctx, x, y, g) { // an eye
      ctx.beginPath(); ctx.moveTo(x - g * 0.48, y); ctx.quadraticCurveTo(x, y - g * 0.42, x + g * 0.48, y); ctx.quadraticCurveTo(x, y + g * 0.42, x - g * 0.48, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, g * 0.13, 0, Math.PI * 2); ctx.fill();
    },
    saying(ctx, x, y, g) { // a speech bubble with quote marks
      bubble(ctx, x, y, g);
      ctx.font = `700 ${Math.round(g * 0.62)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('“”', x, y + g * 0.08);
    },
    rumor(ctx, x, y, g) { // a speech bubble with a question mark
      bubble(ctx, x, y, g);
      ctx.font = `700 ${Math.round(g * 0.5)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y - g * 0.04);
    },
    origin(ctx, x, y, g) { // a sprouting tree
      ctx.beginPath(); ctx.moveTo(x, y + g * 0.42); ctx.lineTo(x, y - g * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x - g * 0.17, y - g * 0.12, g * 0.12, g * 0.24, -0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + g * 0.17, y - g * 0.2, g * 0.12, g * 0.24, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - g * 0.3, y + g * 0.42); ctx.lineTo(x + g * 0.3, y + g * 0.42); ctx.stroke();
    },
    cautionary(ctx, x, y, g) { // a lantern
      ctx.beginPath(); ctx.rect(x - g * 0.2, y - g * 0.18, g * 0.4, g * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - g * 0.28, y - g * 0.18); ctx.lineTo(x + g * 0.28, y - g * 0.18); ctx.moveTo(x - g * 0.28, y + g * 0.3); ctx.lineTo(x + g * 0.28, y + g * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - g * 0.3, g * 0.12, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - g * 0.06); ctx.quadraticCurveTo(x + g * 0.11, y + g * 0.08, x, y + g * 0.18); ctx.quadraticCurveTo(x - g * 0.11, y + g * 0.08, x, y - g * 0.06); ctx.fill();
    },
    custom(ctx, x, y, g) { // a rolled scroll
      ctx.beginPath(); ctx.rect(x - g * 0.3, y - g * 0.3, g * 0.6, g * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - g * 0.3, y - g * 0.3, g * 0.08, 0, Math.PI * 2); ctx.arc(x + g * 0.3, y + g * 0.3, g * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); for (const dy of [-0.12, 0.02, 0.16]) { ctx.moveTo(x - g * 0.18, y + dy * g); ctx.lineTo(x + g * 0.18, y + dy * g); } ctx.stroke();
    },
  };
  GLYPH.myth = (ctx, x, y, g) => { // a sun with rays
    ctx.beginPath(); ctx.arc(x, y, g * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * g * 0.28, y + Math.sin(a) * g * 0.28); ctx.lineTo(x + Math.cos(a) * g * 0.46, y + Math.sin(a) * g * 0.46); } ctx.stroke();
  };
  GLYPH.creature = (ctx, x, y, g) => { // a big footprint
    ctx.beginPath(); ctx.ellipse(x, y + g * 0.1, g * 0.2, g * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, dy, r] of [[-0.22, -0.28, 0.08], [-0.07, -0.36, 0.08], [0.09, -0.36, 0.08], [0.23, -0.27, 0.07]]) { ctx.beginPath(); ctx.arc(x + dx * g, y + dy * g, r * g, 0, Math.PI * 2); ctx.fill(); }
  };
  GLYPH.record = (ctx, x, y, g) => { // a quill pen
    ctx.beginPath(); ctx.moveTo(x - g * 0.32, y + g * 0.42); ctx.quadraticCurveTo(x - g * 0.05, y - g * 0.05, x + g * 0.36, y - g * 0.42);
    ctx.quadraticCurveTo(x + g * 0.1, y - g * 0.3, x - g * 0.12, y + g * 0.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - g * 0.42, y + g * 0.44); ctx.lineTo(x + g * 0.1, y + g * 0.44); ctx.stroke();
  };
  GLYPH.religious = GLYPH.legend; GLYPH.holiday = GLYPH.custom;
  function bubble(ctx, x, y, g) {
    ctx.beginPath(); ctx.roundRect(x - g * 0.45, y - g * 0.34, g * 0.9, g * 0.56, g * 0.16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - g * 0.15, y + g * 0.22); ctx.lineTo(x - g * 0.26, y + g * 0.44); ctx.lineTo(x + g * 0.02, y + g * 0.22); ctx.stroke();
  }

  function disc(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = Math.max(1.4, r * 0.18); ctx.strokeStyle = stroke; ctx.stroke();
  }
  function box(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.rect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.strokeStyle = stroke; ctx.stroke();
  }
  function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function leaf(ctx, x, y, r, rot) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.45, r, rot, 0, Math.PI * 2); ctx.fill(); }
  function star(ctx, x, y, R, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  function drawIcon(ctx, type, x, y, size, opts) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 3;
    (draw[type] || draw.town)(ctx, x, y, size, opts);
    ctx.restore();
  }

  // Draws an icon onto a standalone canvas (for legends and panels)
  function toCanvas(type, size = 22, opts) {
    const c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
    c.width = c.height = Math.ceil(size * dpr); c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    drawIcon(ctx, type, size / 2, size / 2, size * 0.78, opts);
    return c;
  }

  return { drawIcon, toCanvas, flame, cell, COPPER };
})();

// ====================================================================== Labels
// Collects labels during a frame, then draws the highest-priority ones that don't overlap.
// Icons reserve their space too; labels with `overIcons: true` (district names) may sit on top of icons.
class Labels {
  constructor(ctx) { this.ctx = ctx; this.items = []; this.placed = []; this.icons = []; }
  add(o) { this.items.push(o); }
  reserve(x, y, w, h) { this.icons.push([x - w / 2, y - h / 2, x + w / 2, y + h / 2]); }
  // apply the text-size and plain-font preferences to a canvas font string
  static font(font) {
    let f = Prefs.textScale === 1 ? font : font.replace(/(\d+(?:\.\d+)?)px/, (m, n) => `${(+n * Prefs.textScale).toFixed(1)}px`);
    if (Prefs.plainFonts) f = f.replace(/(?:"IM Fell English SC", |"IM Fell English", |Cinzel, )?Georgia, serif/g, '"Source Sans 3", system-ui, sans-serif');
    return f;
  }
  draw() {
    const ctx = this.ctx, k = Prefs.textScale;
    this.items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    for (const o of this.items) {
      o.font = Labels.font(o.font); o.size *= k;
      if (o.sub) { o.subFont = Labels.font(o.subFont); o.subSize *= k; }
      if (o.offset) o.offset *= 1 + (k - 1) * 0.5;
      if (Prefs.highContrast && o.halo) { o.haloWidth = (o.haloWidth || 3.5) * 1.6; o.halo = o.halo.replace(/[\d.]+\)$/, '1)'); }
      ctx.font = o.font;
      ctx.letterSpacing = o.spacing || '0px';
      const mainW = ctx.measureText(o.text).width, mainH = o.size * 1.2;
      // optional smaller second line (e.g. a district's ruler)
      let subW = 0, subH = 0;
      if (o.sub) { ctx.font = o.subFont; ctx.letterSpacing = '0px'; subW = ctx.measureText(o.sub).width; subH = o.subSize * 1.25; }
      const w = Math.max(mainW, subW), h = mainH + subH;
      let x0 = o.x, y0 = o.y;
      if (o.anchor === 'right-of') x0 += o.offset + w / 2;
      else if (o.anchor === 'below') y0 += o.offset + h / 2;
      const ang = (o.angle || 0) * Math.PI / 180;
      const bw = Math.abs(w * Math.cos(ang)) + Math.abs(h * Math.sin(ang)), bh = Math.abs(w * Math.sin(ang)) + Math.abs(h * Math.cos(ang));
      // try the preferred spot, then any fallback offsets (in multiples of the label height)
      let x, y, box = null;
      for (const [dx, dy] of [[0, 0], ...(o.alts || [])]) {
        x = x0 + dx * h; y = y0 + dy * h;
        const b = [x - bw / 2 - 2, y - bh / 2 - 1, x + bw / 2 + 2, y + bh / 2 + 1];
        const hits = (p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1];
        if (o.force || !(this.placed.some(hits) || (!o.overIcons && this.icons.some(hits)))) { box = b; break; }
      }
      if (!box) continue;
      this.placed.push(box);
      ctx.save();
      ctx.translate(x, y); if (ang) ctx.rotate(ang);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const my = -subH / 2;
      ctx.font = o.font; ctx.letterSpacing = o.spacing || '0px';
      if (o.halo) { ctx.lineWidth = o.haloWidth || 3.5; ctx.strokeStyle = o.halo; ctx.strokeText(o.text, 0, my); }
      ctx.fillStyle = o.color; ctx.fillText(o.text, 0, my);
      if (o.sub) {
        const sy = mainH / 2;
        ctx.font = o.subFont; ctx.letterSpacing = '0px';
        if (o.halo) { ctx.lineWidth = Prefs.highContrast ? 4.8 : 3; ctx.strokeStyle = o.halo; ctx.strokeText(o.sub, 0, sy); }
        ctx.fillStyle = o.subColor || o.color; ctx.fillText(o.sub, 0, sy);
      }
      ctx.restore();
    }
    ctx.letterSpacing = '0px';
  }
}

// ====================================================================== Settlements
// Every place and town, with the rules for when each one is shown and how big it is drawn.
const Settlements = (() => {
  const D = window.DATA;
  const all = [...D.places, ...(D.towns || [])];
  const byId = Object.fromEntries(all.map(p => [p.id, p]));
  const BIG = new Set(['capital', 'sacred']);
  // zoom (1 = whole map) at which a settlement's name appears
  function labelZoom(p, pop = p.population) {
    if (p.tier) return [0, 0, 1.6, 2.6][p.tier];
    if (p.type === 'quarter') return 2.1; // the boroughs sit close around Nova Cella
    if (pop >= 500000) return 1.35;
    if (pop >= 100000) return 1.9;
    if (pop >= 10000) return 2.5;
    return 3.2;
  }
  function iconSize(p, pop = p.population) {
    if (BIG.has(p.type)) return 24;
    if (p.tier) return 18;
    if (!pop) return 13;
    return Math.max(11, Math.min(18, 9 + 2.2 * Math.log10(Math.max(10, pop) / 100)));
  }
  // Draw settlements. opts: filter(p) → bool, pop(p) → number (live population), onWater(x, y), dotsBelow (zoom)
  function draw(ctx, map, labels, hits, opts = {}) {
    const z = map.zoom;
    for (const p of all) {
      if (opts.filter && !opts.filter(p)) continue;
      const pop = opts.pop ? opts.pop(p) : p.population;
      const lz = labelZoom(p, pop);
      const [sx, sy] = map.imageToScreen(...p.pos);
      if (sx < -40 || sy < -40 || sx > map.width + 40 || sy > map.height + 40) continue;
      const showIcon = p.tier === 1 || z >= lz - (p.tier ? 0.3 : 0.75);
      if (!showIcon) { // a small dot so every town is still visible; sites with no people stay hidden
        if (!pop && !p.abandoned) continue;
        ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(250,246,238,0.95)'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(22,33,46,0.9)'; ctx.stroke();
        hits.push({ kind: 'place', item: p, sx, sy, r: 5 });
        continue;
      }
      const size = iconSize(p, pop) * (1 + (Prefs.textScale - 1) * 0.5);
      Icons.drawIcon(ctx, p.type, sx, sy, size);
      labels.reserve(sx, sy, size, size);
      hits.push({ kind: 'place', item: p, sx, sy, r: size * 0.7 });
      if (z < lz) continue;
      const water = opts.onWater ? opts.onWater(...p.pos) : false;
      const major = p.tier === 1 || pop >= 500000;
      labels.add({
        text: p.name, x: sx, y: sy, anchor: 'right-of', offset: size * 0.55 + 4, size: 14,
        font: `${major ? 700 : 600} ${major ? 15 : p.tier ? 13.5 : 12.5}px "Source Sans 3", system-ui, sans-serif`,
        color: p.abandoned ? '#5d5249' : water ? '#f2f6fa' : '#1b1712', halo: water ? 'rgba(10,24,40,0.85)' : 'rgba(250,246,238,0.9)',
        priority: p.tier ? 60 - p.tier * 5 : 40 + Math.min(15, Math.log10(Math.max(1, pop))), alts: [[0, -0.9], [0, 0.9]],
      });
    }
  }
  return { all, byId, draw, labelZoom, iconSize };
})();

// ====================================================================== MapView
class MapView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: Terrain.imageWidth / 2, y: Terrain.imageHeight / 2, scale: 0.4 };
    this.view = null;
    this.dirty = true;
    this.anim = null;
    this.listeners = { hover: [], click: [], camera: [] };
    this.resize();
    this.fit();
    this._bindEvents();
    window.addEventListener('resize', () => { this.resize(); this.requestRender(); });
    const loop = (t) => { this._tick(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  on(evt, fn) { this.listeners[evt].push(fn); }
  emit(evt, data) { for (const fn of this.listeners[evt]) fn(data); }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = r.width; this.height = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px';
    if (this.fitScale) { const old = this.fitScale; this.fitScale = this._computeFit(); this.cam.scale *= this.fitScale / old; }
  }
  _computeFit() { return Math.min(this.width / Terrain.imageWidth, this.height / Terrain.imageHeight) * 0.96; }
  fit() {
    this.fitScale = this._computeFit();
    this.cam = { x: Terrain.imageWidth / 2, y: Terrain.imageHeight / 2, scale: this.fitScale };
    this.requestRender(); this.emit('camera', this.cam);
  }
  get zoom() { return this.cam.scale / this.fitScale; } // 1 = whole map

  screenToImage(sx, sy) { return [this.cam.x + (sx - this.width / 2) / this.cam.scale, this.cam.y + (sy - this.height / 2) / this.cam.scale]; }
  imageToScreen(x, y) { return [(x - this.cam.x) * this.cam.scale + this.width / 2, (y - this.cam.y) * this.cam.scale + this.height / 2]; }

  _clamp() {
    const minS = this.fitScale * 0.8, maxS = this.fitScale * 14;
    this.cam.scale = Math.min(maxS, Math.max(minS, this.cam.scale));
    const mx = Terrain.imageWidth * 0.1, my = Terrain.imageHeight * 0.1;
    this.cam.x = Math.min(Terrain.imageWidth + mx, Math.max(-mx, this.cam.x));
    this.cam.y = Math.min(Terrain.imageHeight + my, Math.max(-my, this.cam.y));
  }
  zoomAt(sx, sy, factor) {
    const [ix, iy] = this.screenToImage(sx, sy);
    this.cam.scale *= factor; this._clamp();
    const [nx, ny] = this.screenToImage(sx, sy);
    this.cam.x += ix - nx; this.cam.y += iy - ny; this._clamp();
    this.anim = null; this.requestRender(); this.emit('camera', this.cam);
  }
  panBy(dx, dy) { this.cam.x -= dx / this.cam.scale; this.cam.y -= dy / this.cam.scale; this._clamp(); this.anim = null; this.requestRender(); this.emit('camera', this.cam); }

  // Smoothly move the camera. zoom is relative to the whole-map view (1 = fit).
  flyTo(x, y, zoom, ms = 1200) {
    const from = { ...this.cam }, to = { x, y, scale: this.fitScale * zoom };
    if (Prefs.reduceMotion || ms <= 0) { // jump straight there
      this.anim = null; this.cam = to; this._clamp(); this.requestRender(); this.emit('camera', this.cam);
      return Promise.resolve();
    }
    this.anim = { from, to, start: performance.now(), ms };
    return new Promise(res => { this.anim.done = res; });
  }
  flyHome(ms = 1000) { return this.flyTo(Terrain.imageWidth / 2, Terrain.imageHeight / 2, 1, ms); }

  setView(view) {
    if (this.view && this.view.deactivate) this.view.deactivate();
    this.view = view;
    if (view.activate) view.activate(this);
    this.requestRender();
  }
  requestRender() { this.dirty = true; }

  _tick(t) {
    if (this.anim) {
      const a = this.anim, k = Math.min(1, (t - a.start) / a.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // zoom in log space so it feels even
      const ls = Math.log(a.from.scale) + (Math.log(a.to.scale) - Math.log(a.from.scale)) * e;
      this.cam = { x: a.from.x + (a.to.x - a.from.x) * e, y: a.from.y + (a.to.y - a.from.y) * e, scale: Math.exp(ls) };
      this.dirty = true; this.emit('camera', this.cam);
      if (k >= 1) { const done = a.done; this.anim = null; if (done) done(); }
    }
    if (this.view && this.view.animating && this.view.animating()) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    this.render();
  }

  render() {
    const ctx = this.ctx, c = this.cam;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = (this.view && this.view.background) || '#0e2440';
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.view) return;
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2); ctx.scale(c.scale, c.scale); ctx.translate(-c.x, -c.y);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    this.view.drawWorld(ctx, this);
    ctx.restore();
    if (this.view.drawScreen) this.view.drawScreen(ctx, this);
  }

  // stroke width that stays the same on screen at any zoom (thicker in high contrast)
  px(n) { return n * (Prefs.highContrast ? 1.5 : 1) / this.cam.scale; }

  _bindEvents() {
    const cv = this.canvas;
    let drag = null, moved = false;
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const f = Math.exp(-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) / 120 * 0.18);
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, f);
    }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY }; moved = false; cv.setPointerCapture(e.pointerId);
      cv.classList.add('dragging');
    });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        if (moved) { this.panBy(dx, dy); drag = { x: e.clientX, y: e.clientY }; }
        return;
      }
      this._hover(sx, sy);
    });
    cv.addEventListener('pointerup', (e) => {
      cv.classList.remove('dragging');
      if (drag && !moved) {
        const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
        const [x, y] = this.screenToImage(sx, sy);
        this.emit('click', { sx, sy, x, y });
      }
      drag = null;
    });
    cv.addEventListener('pointerleave', () => { if (!drag) this.emit('hover', null); });
    cv.addEventListener('dblclick', (e) => {
      const r = cv.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, e.shiftKey ? 1 / 1.8 : 1.8);
    });
  }
  _hover(sx, sy) {
    const [x, y] = this.screenToImage(sx, sy);
    this.emit('hover', { sx, sy, x, y });
  }
}

// ====================================================================== shared terrain knowledge
// Terrain classes used by the hover tooltip and the legends. Each view picks its own colours.
const Land = (() => {
  const D = window.DATA;
  const byId = Object.fromEntries(D.districts.map(d => [d.id, d]));
  const capital = D.places.find(p => p.type === 'capital');
  const ruins = D.places.find(p => p.id === 'litus_desertum');
  const km = Terrain.kmPerPx;

  // special land zones from the source files
  function zoneAt(i) {
    const e = Terrain.elev[i];
    if (e <= 0 || Terrain.lake[i]) return null;
    const id = Terrain.districtIds[Terrain.districtIdx[i]];
    const [x, y] = Terrain.cellToImage(i % Terrain.W, (i / Terrain.W) | 0);
    if (capital && Math.hypot(x - capital.pos[0], y - capital.pos[1]) * km < 55 && id === 'capital') return 'urban';
    if (ruins && Math.hypot(x - ruins.pos[0], y - ruins.pos[1]) * km < 45) return 'ruins';
    if (id === 'apricus' && e < 2000) return 'forest';
    if (id === 'planities' && e < 1300) return 'farmland';
    if (id === 'nullus_sol' && e < 1500) return 'oilmarsh';
    if (id === 'solum' && e < 260) return 'wetland';
    if (id === 'malum_rec') return 'shadow';
    return null;
  }

  const TYPES = {
    ocean: 'Open ocean', shelf: 'Coastal waters', lake: 'Lake',
    urban: 'City (Nova Cella)', ruins: 'Abandoned city ruins', forest: 'Forest',
    farmland: 'Fertile farmland', oilmarsh: 'Hot, humid marsh (old oil field)', wetland: 'Wetlands',
    flats: 'Coastal flats', tundra: 'Tundra plain', plain: 'Cold stony plain', highland: 'Rocky highlands',
    mountain: 'Mountains', peak: 'High peaks (snow-capped)', shadow: 'Shadowed valley',
  };

  function typeAt(i) {
    const e = Terrain.elev[i];
    if (Terrain.lake[i]) return 'lake';
    if (e <= 0) return e > -400 ? 'shelf' : 'ocean';
    const z = zoneAt(i);
    if (z && z !== 'shadow') return z;
    const s = Terrain.slopeAt(i);
    if (e > 3300) return 'peak';
    if (e > 1700 || s > 55) return 'mountain';
    if (z === 'shadow') return 'shadow';
    if (e > 750) return 'highland';
    if (Terrain.coastDist[i] < 25 && e < 120 && s < 12) return 'flats';
    if (e < 320) return 'tundra';
    return 'plain';
  }

  // nearest named sea (for hovering over water outside a district)
  const seas = D.features.filter(f => f.kind === 'sea' || f.kind === 'ocean');
  function seaNameAt(x, y) {
    let best = null, bd = Infinity;
    for (const s of seas) { const d = Math.hypot(s.pos[0] - x, s.pos[1] - y); if (d < bd) { bd = d; best = s; } }
    return best ? best.name.replace(' (flooded)', '') : 'Southern Ocean';
  }

  return { byId, zoneAt, typeAt, TYPES, seaNameAt };
})();
