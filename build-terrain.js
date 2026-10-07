// Builds js/terrain-data.js from assets/district_map.png.
//
//   1. powershell -ExecutionPolicy Bypass -File tools/dump-pixels.ps1   (PNG -> tools/map_pixels.bin)
//   2. node tools/build-terrain.js                                      (map_pixels.bin -> js/terrain-data.js)
//
// What it does:
//   - classifies every pixel of the hand-drawn map as sea / land / "covered" (red borders, labels)
//   - fills covered pixels from their nearest visible neighbour
//   - estimates elevation from the map's shading (snow and dark rock = mountains, green = lowland)
//   - flood-fills the red district outlines to get a district for every map cell
//   - fits a polar-stereographic transform so the map can show real latitude/longitude
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const CELL = 3; // map pixels per grid cell
const PREVIEW = process.argv[2] || null; // optional output path for a preview PNG

const raw = fs.readFileSync(path.join(__dirname, 'map_pixels.bin'));
const W = raw.readUInt32LE(0), H = raw.readUInt32LE(4), N = W * H;
const PX = raw.subarray(8);
const log = (...a) => console.log(...a);

// District seeds: a pixel inside each red outline (the label position on the map image).
const DISTRICTS = [
  ['veskan_sea', 675, 1123], ['cura_aliud', 1071, 604], ['mount_veston', 1451, 394],
  ['planities', 1275, 535], ['apricus', 1080, 773], ['capital', 1299, 834],
  ['malum_rec', 1603, 611], ['sovalus', 1772, 425], ['solum', 1507, 870],
  ['incarcer', 1749, 912], ['nullus_sol', 2002, 1042], ['corton_sea', 1755, 1423],
];

// Control points for the geographic fit: [imageX, imageY, latitude, longitude].
const CONTROL = [
  [158, 366, -63.4, -57.0],    // tip of the Antarctic Peninsula (Hope Bay)
  [1451, 1766, -71.3, 170.2],  // Cape Adare, end of the Transantarctic Mountains
  [2126, 990, -66.5, 92.0],    // Queen Mary Land coast
  [1271, 186, -70.0, 2.0],     // Dronning Maud Land coast
];

// ---------------------------------------------------------------- helpers
function bfsComponents(mask, minArea) {
  const seen = new Uint8Array(N), q = new Int32Array(N), out = [];
  for (let s = 0; s < N; s++) {
    if (!mask[s] || seen[s]) continue;
    let qh = 0, qt = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    q[qt++] = s; seen[s] = 1;
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; q[qt++] = i - 1; }
      if (x < W - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; q[qt++] = i + 1; }
      if (y > 0 && mask[i - W] && !seen[i - W]) { seen[i - W] = 1; q[qt++] = i - W; }
      if (y < H - 1 && mask[i + W] && !seen[i + W]) { seen[i + W] = 1; q[qt++] = i + W; }
    }
    if (qt >= minArea) out.push({ x0, y0, x1, y1, area: qt });
  }
  return out;
}

function dilate(mask, times) {
  let m = mask;
  for (let t = 0; t < times; t++) {
    const o = new Uint8Array(m);
    for (let i = 0; i < N; i++) {
      if (m[i]) continue;
      const x = i % W, y = (i / W) | 0;
      if ((x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W])) o[i] = 1;
    }
    m = o;
  }
  return m;
}

// Exact Euclidean distance transform (Felzenszwalb & Huttenlocher). Returns distance to nearest feature pixel.
function edt(feature, w, h) {
  const INF = 1e20, d = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = feature[i] ? 0 : INF;
  const n = Math.max(w, h), f = new Float64Array(n), out = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
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
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = d[y * w + x]; pass(h); for (let y = 0; y < h; y++) d[y * w + x] = out[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = d[y * w + x]; pass(w); for (let x = 0; x < w; x++) d[y * w + x] = Math.sqrt(out[x]); }
  return d;
}

function boxBlur(values, r) {
  const S = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) { row += values[y * W + x]; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row; }
  }
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    const ya = Math.max(0, y - r), yb = Math.min(H, y + r + 1);
    for (let x = 0; x < W; x++) {
      const xa = Math.max(0, x - r), xb = Math.min(W, x + r + 1);
      const sum = S[yb * (W + 1) + xb] - S[ya * (W + 1) + xb] - S[yb * (W + 1) + xa] + S[ya * (W + 1) + xa];
      out[y * W + x] = sum / ((yb - ya) * (xb - xa));
    }
  }
  return out;
}

function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, s, oct = 4) { let t = 0, amp = 0.5, f = 1; for (let o = 0; o < oct; o++) { t += amp * vnoise(x * f, y * f, s + o); amp *= 0.5; f *= 2; } return t; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- 1. classify pixels
const SEA = 0, LAND = 1, COVERED = 2;
const cls = new Uint8Array(N), wallRaw = new Uint8Array(N), yellow = new Uint8Array(N), maroon = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = PX[i * 3], g = PX[i * 3 + 1], b = PX[i * 3 + 2];
  if (r > 170 && g < 100 && b < 100 && r - g > 90) wallRaw[i] = 1;
  if (r > 150 && g > 130 && b < 90) yellow[i] = 1;
  if (r > 60 && r < 200 && g < 45 && b < 50 && r - g > 40) maroon[i] = 1;
  if ((r - g > 60 && r - b > 50) || r + g + b < 25 || yellow[i]) cls[i] = COVERED;
  else cls[i] = (b - Math.max(r, g) > 25) ? SEA : LAND;
}
// Label boxes (yellow, and the dark-red Cura Aliud box) are covered in full, text included.
const boxes = bfsComponents(yellow, 400).concat(
  bfsComponents(maroon, 1500).filter(c => c.area / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1)) > 0.35 && c.x1 - c.x0 < 260));
log(`label boxes: ${boxes.length}`);
for (const b of boxes) for (let y = Math.max(0, b.y0 - 5); y <= Math.min(H - 1, b.y1 + 5); y++) for (let x = Math.max(0, b.x0 - 5); x <= Math.min(W - 1, b.x1 + 5); x++) cls[y * W + x] = COVERED;
{ const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = cls[i] === COVERED ? 1 : 0; const d = dilate(m, 2); for (let i = 0; i < N; i++) if (d[i]) cls[i] = COVERED; }

// ---------------------------------------------------------------- 2. fill covered pixels from the nearest visible pixel
const src = new Int32Array(N).fill(-1);
{
  const q = new Int32Array(N); let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (cls[i] !== COVERED) { src[i] = i; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0, s = src[i];
    if (x > 0 && src[i - 1] < 0) { src[i - 1] = s; q[qt++] = i - 1; }
    if (x < W - 1 && src[i + 1] < 0) { src[i + 1] = s; q[qt++] = i + 1; }
    if (y > 0 && src[i - W] < 0) { src[i - W] = s; q[qt++] = i - W; }
    if (y < H - 1 && src[i + W] < 0) { src[i + W] = s; q[qt++] = i + W; }
  }
}
// Land/sea under covered pixels: blend the nearest visible pixel in each of the four directions
// (weighted by 1/distance^2), then soften, so coasts hidden under labels come out curved rather than boxy.
const isWater = new Uint8Array(N);
{
  const acc = new Float32Array(N), wsum = new Float32Array(N), wv = new Float32Array(N);
  const scan = (start, count, stride) => {
    let last = -1, lastVal = 0;
    for (let k = 0; k < count; k++) {
      const i = start + k * stride;
      if (cls[i] !== COVERED) { last = k; lastVal = cls[i] === SEA ? 1 : 0; }
      else if (last >= 0) { const d = k - last, w = 1 / (d * d); acc[i] += w * lastVal; wsum[i] += w; }
    }
  };
  for (let y = 0; y < H; y++) { scan(y * W, W, 1); scan(y * W + W - 1, W, -1); }
  for (let x = 0; x < W; x++) { scan(x, H, W); scan((H - 1) * W + x, H, -W); }
  for (let i = 0; i < N; i++) {
    if (cls[i] !== COVERED) wv[i] = cls[i] === SEA ? 1 : 0;
    else wv[i] = wsum[i] > 0 ? acc[i] / wsum[i] : (cls[src[i]] === SEA ? 1 : 0);
  }
  const soft = boxBlur(boxBlur(wv, 7), 7);
  for (let i = 0; i < N; i++) {
    if (cls[i] !== COVERED) { isWater[i] = wv[i]; continue; }
    const x = i % W, y = (i / W) | 0;
    isWater[i] = soft[i] > 0.5 + 0.15 * fbm(x / 18, y / 18, 21) ? 1 : 0;
  }
}

// ---------------------------------------------------------------- 3. ocean vs. lakes
const ocean = new Uint8Array(N);
{
  const q = new Int32Array(N); let qh = 0, qt = 0;
  const push = (i) => { if (isWater[i] && !ocean[i]) { ocean[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
}
const lake = new Uint8Array(N);
for (let i = 0; i < N; i++) lake[i] = isWater[i] && !ocean[i] ? 1 : 0;
{
  const lakes = bfsComponents(lake, 1).sort((a, b) => b.area - a.area);
  log(`lakes: ${lakes.length}, largest: ${lakes.slice(0, 5).map(l => `${l.area}px@(${l.x0},${l.y0})`).join(' ')}`);
}

// ---------------------------------------------------------------- 4. geographic fit (polar stereographic, km)
function polar(lat, lon) {
  const rho = 2 * 6371 * Math.tan((90 + lat) * Math.PI / 360); // south polar stereographic, true scale at pole
  const l = lon * Math.PI / 180;
  return [rho * Math.sin(l), -rho * Math.cos(l)]; // Greenwich up, 90 E right
}
// Least-squares similarity: img = [a -b; b a] * km + t
const GEO = (() => {
  let A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], rhs = [0, 0, 0, 0];
  const add = (row, val) => { for (let i = 0; i < 4; i++) { rhs[i] += row[i] * val; for (let j = 0; j < 4; j++) A[i][j] += row[i] * row[j]; } };
  for (const [ix, iy, lat, lon] of CONTROL) { const [x, y] = polar(lat, lon); add([x, -y, 1, 0], ix); add([y, x, 0, 1], iy); }
  // Gaussian elimination
  for (let c = 0; c < 4; c++) {
    let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [rhs[c], rhs[p]] = [rhs[p], rhs[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 4; k++) A[r][k] -= f * A[c][k]; rhs[r] -= f * rhs[c]; }
  }
  const [a, b, tx, ty] = rhs.map((v, i) => v / A[i][i]);
  return { a, b, tx, ty };
})();
const PX_PER_KM = Math.hypot(GEO.a, GEO.b), KM_PER_PX = 1 / PX_PER_KM;
log(`geo fit: ${KM_PER_PX.toFixed(3)} km/px, rotation ${(Math.atan2(GEO.b, GEO.a) * 180 / Math.PI).toFixed(1)} deg, pole at (${GEO.tx.toFixed(0)}, ${GEO.ty.toFixed(0)})`);
for (const [ix, iy, lat, lon] of CONTROL) {
  const [x, y] = polar(lat, lon);
  log(`  control (${ix},${iy}) -> fit (${(GEO.a * x - GEO.b * y + GEO.tx).toFixed(0)},${(GEO.b * x + GEO.a * y + GEO.ty).toFixed(0)})`);
}

// ---------------------------------------------------------------- 5. distances to the coast
const landish = new Uint8Array(N);
for (let i = 0; i < N; i++) landish[i] = ocean[i] ? 0 : 1;
const dOcean = edt(ocean, W, H), dLand = edt(landish, W, H);

// ---------------------------------------------------------------- 6. mountain indicator from map shading
const mtn = new Float32Array(N);
for (let i = 0; i < N; i++) {
  if (!landish[i] || lake[i]) continue;
  const s = src[i], r = PX[s * 3], g = PX[s * 3 + 1], b = PX[s * 3 + 2];
  const br = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
  let m;
  if (br > 165 && sat < 45) m = 1.0;            // snow on high peaks
  else if (g - r >= 10 && g >= b) m = 0;        // green lowland
  else if (br < 65 && r >= g) m = 0.85;         // dark rock / shadowed slopes
  else if (sat < 28) m = 0.65;                  // grey rock
  else if (r > g) m = 0.55;                     // brown rock
  else m = 0.1;
  mtn[i] = m;
}
const mLocal = boxBlur(mtn, 10), mRegional = boxBlur(mtn, 45);

// ---------------------------------------------------------------- 7. districts
const wall = dilate(wallRaw, 3);
const region = new Int8Array(N).fill(-1);
{
  const q = new Int32Array(N);
  const flood = (sx, sy, id) => {
    const s = sy * W + sx;
    if (region[s] >= 0) { log(`  !! seed for ${id ? DISTRICTS[id - 1][0] : 'outside'} already filled by ${region[s]} (leak)`); return 0; }
    if (wall[s]) { log(`  !! seed ${id} sits on a wall`); return 0; }
    let qh = 0, qt = 0; q[qt++] = s; region[s] = id;
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      if (x > 0 && region[i - 1] < 0 && !wall[i - 1]) { region[i - 1] = id; q[qt++] = i - 1; }
      if (x < W - 1 && region[i + 1] < 0 && !wall[i + 1]) { region[i + 1] = id; q[qt++] = i + 1; }
      if (y > 0 && region[i - W] < 0 && !wall[i - W]) { region[i - W] = id; q[qt++] = i - W; }
      if (y < H - 1 && region[i + W] < 0 && !wall[i + W]) { region[i + W] = id; q[qt++] = i + W; }
    }
    return qt;
  };
  log(`outside: ${flood(2, 2, 0)} px`);
  DISTRICTS.forEach(([name, x, y], k) => log(`${name}: ${flood(x, y, k + 1)} px`));
  // walls and unseeded pockets go to the nearest district
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (region[i] >= 0) q[qt++] = i;
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0, r = region[i];
    if (x > 0 && region[i - 1] < 0) { region[i - 1] = r; q[qt++] = i - 1; }
    if (x < W - 1 && region[i + 1] < 0) { region[i + 1] = r; q[qt++] = i + 1; }
    if (y > 0 && region[i - W] < 0) { region[i - W] = r; q[qt++] = i - W; }
    if (y < H - 1 && region[i + W] < 0) { region[i + W] = r; q[qt++] = i + W; }
  }
}

// ---------------------------------------------------------------- 8. grid: elevation + flags
const GW = Math.floor(W / CELL), GH = Math.floor(H / CELL), GN = GW * GH;
const elev = new Float32Array(GN), flags = new Uint8Array(GN);
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const cx = gx * CELL + 1, cy = gy * CELL + 1, c = cy * W + cx, g = gy * GW + gx;
  let lakeCount = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) lakeCount += lake[c + dy * W + dx];
  const sdf = (landish[c] ? dOcean[c] : -dLand[c]) * KM_PER_PX + 3 * fbm(cx / 14, cy / 14, 7); // km, coast gently roughened
  let e;
  if (sdf > 0) {
    const ramp = smooth(0, 9, sdf);
    const base = 4 + 420 * (1 - Math.exp(-sdf / 160));
    const relief = 2400 * Math.pow(mRegional[c], 1.6) + 1700 * Math.pow(mLocal[c], 1.5);
    const rough = fbm(cx / 9, cy / 9, 3, 5) * (25 + 450 * mLocal[c]);
    e = Math.max(1 + sdf * 0.5, base + ramp * (relief + rough));
  } else {
    const d = -sdf;
    e = Math.min(-1, -(600 * (1 - Math.exp(-d / 45)) + 3000 * (1 - Math.exp(-d / 320))) + 15 * fbm(cx / 20, cy / 20, 11) * Math.min(1, d / 10));
  }
  elev[g] = e;
  flags[g] = (region[c] & 15) | (lakeCount >= 5 && sdf > 0 ? 16 : 0);
}
{
  const land = Array.from(elev).filter(v => v > 0).sort((a, b) => a - b);
  const sea = Array.from(elev).filter(v => v <= 0).sort((a, b) => a - b);
  const pct = (a, p) => a[Math.floor(p * (a.length - 1))].toFixed(0);
  log(`grid ${GW}x${GH}; land cells ${land.length}: p10 ${pct(land, .1)} p50 ${pct(land, .5)} p90 ${pct(land, .9)} p99.9 ${pct(land, .999)} max ${pct(land, 1)}`);
  log(`sea cells ${sea.length}: min ${pct(sea, 0)} p50 ${pct(sea, .5)}`);
  // scale land so the highest peaks sit near 4,500 m (Vinson Massif is 4,892 m today)
  const k = 4500 / land[Math.floor(0.9995 * (land.length - 1))];
  for (let i = 0; i < GN; i++) if (elev[i] > 0) elev[i] = Math.max(1, Math.min(5000, elev[i] * k));
  log(`land scaled by ${k.toFixed(3)}`);
}

// Elevation is stored as one byte per cell with finer steps near sea level:
//   code 100..255 -> 0..5000 m ((c-100)/155)^2*5000,  code 0..100 -> -6000..0 m
const codes = new Uint8Array(GN);
for (let i = 0; i < GN; i++) {
  const e = elev[i];
  codes[i] = e > 0 ? Math.max(101, 100 + Math.round(Math.sqrt(Math.min(e, 5000) / 5000) * 155))
                   : Math.min(99, 100 - Math.round(Math.sqrt(Math.min(-e, 6000) / 6000) * 100));
}
// run-length encode flags as (value, count<=255) byte pairs
const rle = [];
for (let i = 0; i < GN;) { const v = flags[i]; let n = 1; while (i + n < GN && flags[i + n] === v && n < 255) n++; rle.push(v, n); i += n; }

const out = `// Generated by tools/build-terrain.js from assets/district_map.png. Do not edit by hand.
// Coordinates everywhere in this project are pixel positions on assets/district_map.png (${W} x ${H}).
window.TERRAIN = {
  imageWidth: ${W}, imageHeight: ${H}, cell: ${CELL}, width: ${GW}, height: ${GH},
  kmPerPx: ${KM_PER_PX.toFixed(5)},
  geo: { a: ${GEO.a.toFixed(6)}, b: ${GEO.b.toFixed(6)}, tx: ${GEO.tx.toFixed(2)}, ty: ${GEO.ty.toFixed(2)} },
  districtOrder: ${JSON.stringify(DISTRICTS.map(d => d[0]))},
  elevation: "${Buffer.from(codes).toString('base64')}",
  flags: "${Buffer.from(rle).toString('base64')}"
};
`;
fs.writeFileSync(path.join(ROOT, 'js', 'terrain-data.js'), out);
log(`wrote js/terrain-data.js (${(out.length / 1024).toFixed(0)} KB)`);

// ---------------------------------------------------------------- optional preview PNG
if (PREVIEW) {
  const rgb = Buffer.alloc(GN * 3);
  const pal = [[60, 60, 60], [230, 80, 80], [120, 40, 40], [240, 240, 240], [150, 210, 90], [40, 140, 70], [200, 200, 210], [90, 60, 120], [220, 170, 60], [170, 120, 80], [90, 160, 200], [230, 130, 40], [60, 200, 200]];
  for (let i = 0; i < GN; i++) {
    const e = elev[i], d = flags[i] & 15, x = i % GW, y = (i / GW) | 0;
    let c;
    if (flags[i] & 16) c = [70, 120, 200];
    else if (e <= 0) c = [10, 30 + Math.max(0, 60 + e / 40), 90 + Math.max(0, 80 + e / 30)];
    else { const t = Math.min(1, e / 4000); c = [90 + 160 * t, 120 + 120 * t, 80 + 170 * t]; }
    const border = x > 0 && y > 0 && ((flags[i - 1] & 15) !== d || (flags[i - GW] & 15) !== d);
    if (border) c = pal[d];
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
  }
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(GW, 0); ihdr.writeUInt32BE(GH, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = Buffer.alloc((GW * 3 + 1) * GH);
  for (let y = 0; y < GH; y++) { rows[y * (GW * 3 + 1)] = 0; rgb.copy(rows, y * (GW * 3 + 1) + 1, y * GW * 3, (y + 1) * GW * 3); }
  fs.writeFileSync(PREVIEW, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
  log(`preview: ${PREVIEW}`);
}
