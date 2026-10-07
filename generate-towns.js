// Scatters smaller towns across every district and writes them into js/data.js
// (between the <towns:generated> markers). Run once: node tools/generate-towns.js
//
// Each district's population (from data.js) minus the people already living in its named places
// is shared out among the new towns, biggest town first. Town names come from the lists below.
// Running it again REPLACES the towns, so make name edits in data.js only once you're happy.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'js', 'terrain-data.js'));
require(path.join(ROOT, 'js', 'data.js'));
const T = window.TERRAIN, D = window.DATA;
const W = T.width, H = T.height, N = W * H, KM = T.kmPerPx;

// ---- terrain
const elev = new Float32Array(N), dist = new Uint8Array(N), lake = new Uint8Array(N);
{
  const bin = Buffer.from(T.elevation, 'base64');
  for (let i = 0; i < N; i++) { const c = bin[i]; elev[i] = c >= 100 ? ((c - 100) / 155) ** 2 * 5000 : -(((100 - c) / 100) ** 2) * 6000; }
  const fb = Buffer.from(T.flags, 'base64');
  for (let i = 0, k = 0; i < fb.length; i += 2) for (let j = 0; j < fb[i + 1]; j++, k++) { dist[k] = fb[i] & 15; lake[k] = fb[i] >> 4 & 1; }
}
const districtIdx = Object.fromEntries(T.districtOrder.map((id, k) => [id, k + 1]));
const toImg = (i) => [(i % W) * 3 + 1, ((i / W) | 0) * 3 + 1];
const coastal = (i) => { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (y + dy) * W + x + dx; if (j >= 0 && j < N && elev[j] <= 0 && !lake[j]) return true; } return false; };
const slope = (i) => { const x = i % W, y = (i / W) | 0; const l = elev[y * W + Math.max(0, x - 1)], r = elev[y * W + Math.min(W - 1, x + 1)], u = elev[Math.max(0, y - 1) * W + x], d = elev[Math.min(H - 1, y + 1) * W + x]; return Math.hypot(r - l, d - u) / (6 * KM); };
const distToRoad = (x, y) => {
  let best = Infinity; const R = D.tradeRoad;
  for (let k = 1; k < R.length; k++) {
    const [ax, ay] = R[k - 1], [bx, by] = R[k], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best * KM;
};

// ---- deterministic random numbers
let seed = 20518;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// ---- what to build in each district
// count: towns to add · type: map icon · spacingKm: minimum gap · maxElev / minElev: allowed height (m)
// prefer: 'coast' | 'road' | 'flat' | 'high' | 'near' (close to `near` place) · names: in rough order of size
const SPEC = {
  capital: { count: 8, type: 'quarter', spacingKm: 80, maxElev: 900, prefer: 'near', near: 'nova_cella', radiusKm: 300, minKm: 90,
    names: ['Forum Mercatorum', 'Turres Aureae', 'Nova Volga', 'Brooklyna', 'Xinhua Vicus', 'Collis Advocatorum', 'Porta Corton', 'Vicus Candelarum'] },
  planities: { count: 10, type: 'farm', spacingKm: 58, maxElev: 1000, prefer: 'flat',
    names: ['Messis', 'Ager Aureus', 'Fertilia', 'Novoselye', 'Seges', 'Granum', 'Kornveld', 'Pratum Magnum', 'Hordeum', 'Arvum'] },
  apricus: { count: 7, type: 'forest', spacingKm: 36, maxElev: 900, prefer: 'flat',
    names: ['Lux Silvae', 'Quercetum', 'Sunhaven', 'Bosque Claro', 'Nemus', 'Morigaoka', 'Ramus'] },
  malum_rec: { count: 6, type: 'town', spacingKm: 28, maxElev: 1800, prefer: 'flat',
    names: ['Crepusculum', 'Latebra', 'Sumrak', 'Refugium', 'Nox Media', 'Fossa'] },
  sovalus: { count: 7, type: 'mine', spacingKm: 45, minElev: 200, maxElev: 2600, prefer: 'high',
    names: ['Cuprum', 'Aurifodina', 'Argentaria', 'Ferraria', 'Nikelgrad', 'Kupferberg', 'Plumbum'],
    produces: [['Copper'], ['Gold', 'Silver'], ['Silver', 'Lead', 'Zinc'], ['Iron', 'Chromium'], ['Nickel', 'Cobalt'], ['Copper', 'Platinum-group metals'], ['Lead', 'Zinc', 'Coal']] },
  solum: { count: 6, type: 'town', spacingKm: 22, maxElev: 600, prefer: 'road',
    names: ['Mansio Prima', 'Pons Paludis', 'Taberna', 'Vadum', 'Mansio Secunda', 'Specula'] },
  corton_sea: { count: 8, type: 'fishing', spacingKm: 32, maxElev: 400, prefer: 'coast',
    names: ['Rybachy', 'Retia', 'Fiskevik', 'Ostrea', 'Concha', 'Sal', 'Halcyon', 'Port Kelp'] },
  veskan_sea: { count: 10, type: 'military', spacingKm: 85, maxElev: 2400, prefer: 'coast',
    names: ['Navale Magnum', 'Castra Glacialis', 'Castra Petrova', 'Fort Erebus', 'Castra Ventosa', 'Castra Insularum', 'Castra Tridentis', 'Castra Amundseni', 'Castra Byrdi', 'Castra Ellsworth'] },
  incarcer: { count: 4, type: 'rehab', spacingKm: 30, maxElev: 1200, prefer: 'flat',
    names: ['Nova Spes', 'Secunda Vita', 'Lindhem', 'Hortus'] },
  nullus_sol: { count: 3, type: 'camp', spacingKm: 40, maxElev: 1400, prefer: 'flat',
    names: ['Fumaria', 'Sudor', 'Latebrae'] },
  cura_aliud: { count: 4, type: 'ruin', spacingKm: 40, maxElev: 600, prefer: 'coast', abandoned: true,
    names: ['Silentium', 'Ultimus Portus', 'Vacua', 'Echo'] },
};
// Special case: the 30 people of Mount Solum. Radix (in data.js) has 24; the hamlet Specula gets the rest,
// high on the mountain rather than on the road.
const MOUNTAIN_HAMLET = { name: 'Specula', population: 6, minElev: 1200, maxElev: 3200 };

// ---- generate
const placed = D.places.map(p => p.pos.slice());
const towns = [];
const minGap = (x, y) => placed.reduce((m, [px, py]) => Math.min(m, Math.hypot(px - x, py - y)), Infinity) * KM;

for (const [id, spec] of Object.entries(SPEC)) {
  const d = D.districts.find(q => q.id === id), di = districtIdx[id];
  const fixed = D.places.filter(p => p.district === id).reduce((s, p) => s + (p.population || 0), 0);
  let remaining = spec.abandoned ? 0 : d.population - fixed;
  const names = spec.names.slice();
  let count = spec.count;
  if (id === 'solum') { remaining -= MOUNTAIN_HAMLET.population; names.splice(names.indexOf('Specula'), 1); count -= 1; }
  const near = spec.near && D.places.find(p => p.id === spec.near);

  // score every possible cell
  const cands = [];
  for (let i = 0; i < N; i++) {
    if (dist[i] !== di || lake[i] || elev[i] <= 8 || elev[i] > spec.maxElev || elev[i] < (spec.minElev || 0)) continue;
    const [x, y] = toImg(i), s = slope(i);
    let score = rand() * 0.6;
    if (spec.prefer === 'flat') score += Math.max(0, 1 - s / 25) * 0.8;
    if (spec.prefer === 'coast') { if (!coastal(i)) continue; score += 0.6; }
    if (spec.prefer === 'high') score += Math.min(1, elev[i] / 2000) * 0.7;
    if (spec.prefer === 'road') { const r = distToRoad(x, y); if (r > 30) continue; score += 1 - r / 30; }
    if (spec.prefer === 'near') { const r = Math.hypot(x - near.pos[0], y - near.pos[1]) * KM; if (r > spec.radiusKm || r < (spec.minKm || 35)) continue; score += 1 - r / spec.radiusKm; }
    cands.push([score, x, y]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  const picks = [];
  for (const [, x, y] of cands) {
    if (picks.length >= count) break;
    if (minGap(x, y) < spec.spacingKm) continue;
    picks.push([x, y]); placed.push([x, y]);
  }
  if (picks.length < count) console.warn(`  ! ${id}: only found room for ${picks.length} of ${count} towns`);

  // share the population out, largest first
  const weights = picks.map((_, k) => (0.75 + 0.5 * rand()) / Math.pow(k + 1, 0.8));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const step = remaining > 2e6 ? 1000 : remaining > 2e5 ? 100 : remaining > 2000 ? 10 : 1;
  const pops = weights.map(w => Math.round(remaining * w / wsum / step) * step);
  if (pops.length) pops[0] += remaining - pops.reduce((a, b) => a + b, 0);

  picks.forEach(([x, y], k) => {
    const t = { id: `${id}_${k + 1}`, name: names[k], type: spec.type, district: id, pos: [x, y], population: spec.abandoned ? 0 : pops[k] };
    if (spec.produces) t.produces = spec.produces[k % spec.produces.length];
    if (spec.abandoned) t.abandoned = true;
    if (id === 'veskan_sea') t.royalZone = true;
    towns.push(t);
  });
  console.log(`${id.padEnd(13)} ${String(picks.length).padStart(2)} towns, ${remaining.toLocaleString()} people (district total ${d.population.toLocaleString()})`);
}

// Specula, the mountain hamlet on Mount Solum
{
  const di = districtIdx.solum, summit = D.places.find(p => p.id === 'mount_solum');
  let best = null;
  for (let i = 0; i < N; i++) {
    if (dist[i] !== di || elev[i] < MOUNTAIN_HAMLET.minElev || elev[i] > MOUNTAIN_HAMLET.maxElev) continue;
    const [x, y] = toImg(i); const r = Math.hypot(x - summit.pos[0], y - summit.pos[1]) * KM;
    if (minGap(x, y) < 20) continue;
    if (!best || r < best[0]) best = [r, x, y];
  }
  towns.push({ id: 'solum_hamlet', name: MOUNTAIN_HAMLET.name, type: 'town', district: 'solum', pos: [best[1], best[2]], population: MOUNTAIN_HAMLET.population });
}

// ---- write into data.js
const fmt = (t) => {
  const extra = [t.produces ? `produces: ${JSON.stringify(t.produces).replace(/"/g, "'")}` : '', t.abandoned ? 'abandoned: true' : '', t.royalZone ? 'royalZone: true' : ''].filter(Boolean).join(', ');
  return `    { id: '${t.id}', name: '${t.name.replace(/'/g, "\\'")}', type: '${t.type}', district: '${t.district}', pos: [${t.pos.join(', ')}], population: ${t.population}${extra ? ', ' + extra : ''} },`;
};
const file = path.join(ROOT, 'js', 'data.js');
let src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// <towns:generated>'), b = src.indexOf('// </towns:generated>');
if (a < 0 || b < 0) throw new Error('town markers not found in data.js');
src = src.slice(0, a) + `// <towns:generated>\n  towns: [\n${towns.map(fmt).join('\n')}\n  ],\n  ` + src.slice(b);
fs.writeFileSync(file, src);

// check the totals
for (const d of D.districts) {
  const total = D.places.filter(p => p.district === d.id).reduce((s, p) => s + (p.population || 0), 0) + towns.filter(t => t.district === d.id).reduce((s, t) => s + t.population, 0);
  if (total !== d.population) console.warn(`  ! ${d.id}: settlements add up to ${total.toLocaleString()}, district says ${d.population.toLocaleString()}`);
}
console.log(`wrote ${towns.length} towns into js/data.js`);
