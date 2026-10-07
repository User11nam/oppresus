// civilization.js: View 2, CIVITAS. The civilization: districts and their rulers, places and towns,
// Royal Zones, and a year-by-year simulation of the population from the present (Year 312 AC) onward.
//
// Each simulated year:
//   - Dies Creationis is celebrated (a flame pulses at Cilla's cave and in the capital)
//   - scripted future events from data.js happen (the Austral War, the Great Collapse, ...)
//   - harvests, the copper price, advisors and the Supreme Leader change (seeded random, so every run is the same)
//   - each district grows or shrinks with its food supply, trade, war and the economy
'use strict';

Views.civitas = (() => {
  const D = window.DATA, T = Terrain, SOC = D.society;
  const AC1 = D.meta.calendar.yearOneCE, PRESENT = D.meta.presentYearAC, LAST = 430;
  const DRAFT_SHARE = 0.032; // share of people aged 20 to 21
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const short = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M` : n >= 1e4 ? `${Math.round(n / 1000)}k` : fmt(n);
  const esc = (s) => App.esc(s);
  const people = Settlements.all.filter(p => typeof p.population === 'number');
  const inDistrict = Object.fromEntries(D.districts.map(d => [d.id, people.filter(p => p.district === d.id)]));
  const place = (id) => Settlements.byId[id];
  const CAVE = place('cilla_cave'), CAPITAL = place('nova_cella');

  const state = { fills: true, royal: true, towers: false, economy: false };
  let S = null, hitTargets = [], pulses = [], playing = false, speed = 1.5, raf = 0, lastT = 0, acc = 0;

  // ------------------------------------------------------------------ names for new advisors and vessels
  const FIRST = ['Aurelius', 'Lucan', 'Octavian', 'Quintus', 'Tiberius', 'Valerius', 'Gaius', 'Marcus', 'Severin', 'Titus', 'Decimus', 'Florian', 'Cassius', 'Matthias', 'Anton', 'Kenji', 'Emeka', 'Rustam', 'Ilya', 'Mateo', 'Flavia', 'Livia', 'Cornelia', 'Julia', 'Petra', 'Marina', 'Silvia', 'Nerea', 'Ingrid', 'Amara', 'Mei', 'Zofia'];
  const MALE = FIRST.slice(0, 20);
  const LAST_NAMES = ['Volkov', 'Ferrante', 'Haddad', 'Okafor', 'Lindqvist', 'Nakamura', 'Castellanos', 'Brennan', 'Mwangi', 'Novak', 'Kowalski', 'Delacroix', 'Sokolov', 'Adeyemi', 'Achterberg', 'Varga', 'Petrov', 'Moreau', 'Ibarra', 'Tanaka', 'Zhou', 'Sato', 'Kaur', 'Ivanov', 'Fontaine', 'Cellarius', 'Cuprius', 'Aurelianus', 'Marinus', 'Glacius', 'Ventura', 'Rasku'];
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // seeded random numbers: the same year always rolls the same dice
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ------------------------------------------------------------------ simulation
  function reset() {
    const last = D.succession[D.succession.length - 1];
    S = {
      ac: PRESENT,
      pop: Object.fromEntries(people.map(p => [p.id, p.population])),
      copper: 1, foodMod: 1, harvest: 1, food: 1, trade: 1,
      war: false, blockade: false, collapse: false, wars: 0,
      draftFrom: {}, drafted: 0, warDead: 0, promoted: 0,
      leader: { name: last.name, since: last.from, advisor: last.advisor },
      vessels: [], // vessels chosen during the simulation (shown by the Phase 5 succession view)
      advisors: SOC.advisors.map(a => ({ ...a })),
      log: [{ ac: PRESENT, kind: 'present', title: 'The present day', text: `Year ${PRESENT} AC. ${last.name} is the vessel of Cilla. Press Play to watch the years go by.` }],
      history: [],
    };
    S.families = makeFamilies();
    record();
  }

  const total = (id) => inDistrict[id].reduce((s, p) => s + S.pop[p.id], 0);
  const grandTotal = () => people.reduce((s, p) => s + S.pop[p.id], 0);
  const BASE = Object.fromEntries(D.districts.map(d => [d.id, d.population]));
  const BASE_ALL = Object.values(BASE).reduce((a, b) => a + b, 0);
  function record() { S.history.push({ ac: S.ac, total: grandTotal(), war: S.war, collapse: S.collapse }); }

  function log(e) { S.log.push({ ac: S.ac, ...e }); if (e.pos) pulse(e.pos, e.kind); }
  function pulse(pos, kind) { if (!Prefs.reduceMotion) pulses.push({ pos, kind, start: performance.now() }); }

  function startWar() {
    S.war = true; S.wars++;
    for (const p of people) {
      if (['veskan_sea', 'mount_veston', 'nullus_sol', 'cura_aliud'].includes(p.district)) continue;
      const n = S.pop[p.id] * DRAFT_SHARE; S.pop[p.id] -= n; S.draftFrom[p.id] = (S.draftFrom[p.id] || 0) + n; S.drafted += n;
    }
    addToCamps(S.drafted);
  }
  function addToCamps(n) {
    const camps = people.filter(p => p.type === 'military'), sum = camps.reduce((s, p) => s + S.pop[p.id], 0);
    for (const c of camps) S.pop[c.id] += n * S.pop[c.id] / sum;
  }
  function endWar() {
    const lossShare = S.drafted > 0 ? Math.min(0.5, S.warDead / (S.drafted + S.warDead)) : 0;
    addToCamps(-S.drafted);
    for (const id in S.draftFrom) S.pop[id] += S.draftFrom[id];
    log({ kind: 'war', title: 'The draftees come home', text: `${fmt(S.drafted)} drafted soldiers return to their towns. ${fmt(S.warDead)} did not come back (${Math.round(lossShare * 100)}%).`, pos: place('castra_1').pos });
    S.war = false; S.draftFrom = {}; S.drafted = 0;
  }

  function applyEffects(fx = {}) {
    if (fx.copper) S.copper = Math.max(0.3, S.copper * (1 + fx.copper));
    if (fx.food) S.foodMod = Math.max(0.6, S.foodMod * (1 + fx.food));
    if (fx.blockade !== undefined) S.blockade = fx.blockade;
    if (fx.collapse === 'start') S.collapse = true;
    if (fx.collapse === 'end') S.collapse = false;
    if (fx.war === 'start' && !S.war) startWar();
    if (fx.war === 'end' && S.war) endWar();
  }

  const FUTURE_POS = { war: () => place('castra_1').pos, economy: () => CAPITAL.pos, politics: () => place('vesca').pos };
  const SPOT = { 'The Corton Sea is blockaded': 'portus_corton', 'The landing on the Nullus Sol coast': 'campus_olei', 'A copper boom': 'sovalus_city', 'The copper price crashes': 'sovalus_city', 'A bumper harvest': 'horrea', 'The Great Collapse': 'nova_cella' };

  function step() {
    if (S.ac >= LAST) return false;
    S.ac += 1;
    const ac = S.ac, r = rng(ac * 7919 + 1213);

    // Dies Creationis, every year
    log({ kind: 'holiday', title: `Dies Creationis: the ${ordinal(ac)} Day of Creation`, text: `Oppressans celebrate the day Cilla entered the first vessel, ${ac} years ago. A candle burns in every home.`, pos: CAVE.pos });
    pulse(CAPITAL.pos, 'holiday');

    // scripted events
    for (const f of D.future) if (f.ac === ac) {
      applyEffects(f.effects);
      const pos = SPOT[f.title] ? place(SPOT[f.title]).pos : (FUTURE_POS[f.kind] || FUTURE_POS.economy)();
      log({ kind: f.kind, title: f.title, text: f.text + (f.effects && f.effects.war === 'start' ? ` ${fmt(S.drafted)} people are drafted.` : ''), pos, major: true });
    }

    // the harvest and the copper market
    S.harvest = 0.93 + r() * 0.14;
    const h = r();
    if (h < 0.07) { S.harvest *= 0.82; log({ kind: 'nature', title: 'A poor harvest in Planities', text: 'Early frosts cut the harvest. Food prices rise across Oppressus.', pos: place('horrea').pos }); }
    else if (h > 0.94) { S.harvest *= 1.12; log({ kind: 'nature', title: 'A great harvest in Planities', text: 'The strange soil of Planities gives more than ever. Some say Cura Aliud is stirring again.', pos: place('horrea').pos }); }
    const copperTarget = S.collapse ? 0.6 : 1;
    S.copper = Math.max(0.3, S.copper + (copperTarget - S.copper) * 0.07 + (r() - 0.5) * 0.06);
    S.foodMod += (1 - S.foodMod) * 0.15;

    // a war drags on: a new cohort turns 20 and is drafted, and soldiers die
    if (S.war) {
      const dead = S.drafted * (0.03 + r() * 0.03); S.warDead += dead; S.drafted -= dead; addToCamps(-dead);
      for (const id in S.draftFrom) S.draftFrom[id] *= 1 - dead / (S.drafted + dead);
      for (const p of people) {
        if (!S.draftFrom[p.id] && S.draftFrom[p.id] !== 0) continue;
        const n = S.pop[p.id] * DRAFT_SHARE / 2; S.pop[p.id] -= n; S.draftFrom[p.id] += n; S.drafted += n; addToCamps(n);
      }
    }

    people_change(r);
    advisorsAndLeader(r);
    flavor(r);
    for (const fam of S.families) familyYear(fam, ac, S);

    // Advisors make some Classmen into Dual Classmen every year
    S.promoted += 0.0004;

    record();
    return true;
  }

  // how each district's population changes this year
  function people_change(r) {
    const all = grandTotal();
    const food = S.harvest * S.foodMod * (0.9 * total('planities') / BASE.planities + 0.1 * total('corton_sea') / BASE.corton_sea) / (all / BASE_ALL);
    const trade = (S.blockade ? 0.3 : 1) * (0.55 * S.copper * total('sovalus') / BASE.sovalus + 0.45) * (S.collapse ? 0.7 : 1);
    S.food = food; S.trade = trade;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    for (const d of D.districts) {
      if (d.id === 'mount_veston' || d.id === 'cura_aliud') continue; // five guards; nobody
      let g = 0.005 + 0.03 * clamp(food - 1, -0.4, 0.2) + 0.012 * clamp(trade - 1, -0.7, 0.4);
      if (d.id === 'sovalus') g += 0.02 * (S.copper - 1);
      if (d.id === 'capital' || d.id === 'corton_sea') g += 0.006 * clamp(trade - 1, -0.7, 0.4);
      if (S.collapse) g += { capital: -0.01, malum_rec: 0.024, sovalus: -0.018, nullus_sol: 0.05, corton_sea: -0.006, incarcer: 0.03 }[d.id] || -0.004;
      if (S.war && d.id === 'nullus_sol') g -= 0.03;
      for (const p of inDistrict[d.id]) {
        if (!S.pop[p.id]) continue;
        S.pop[p.id] = Math.max(0, S.pop[p.id] * (1 + g + (r() - 0.5) * 0.004));
      }
    }
  }

  function advisorsAndLeader(r) {
    // a Supreme Advisor retires or dies now and then; the Supreme Leader appoints a new one
    for (const a of S.advisors) {
      if (S.ac - a.since > 6 && r() < 0.025) {
        const name = `${pick(r, FIRST)} ${pick(r, LAST_NAMES)}`, old = a.name;
        a.name = name; a.since = S.ac; a.origin = null;
        log({ kind: 'politics', title: 'A new Supreme Advisor', text: `${old} retires. ${S.leader.name}, the vessel of Cilla, appoints ${name} as a Supreme Advisor${a.seat === 'nova_cella' ? ' in Nova Cella' : a.seat === 'vesca' ? ', to serve in the Veskan Sea' : ', to serve in Incarcer'}.`, pos: place(a.seat).pos });
      }
    }
    // the Supreme Leader's time ends; he chooses the next vessel, usually one of his advisors
    const tenure = S.ac - S.leader.since;
    const p = tenure < 18 ? 0.01 : 0.02 + (tenure - 18) * 0.012;
    if (r() < p) {
      const old = S.leader.name, fromAdvisors = r() < 0.88;
      let name;
      if (fromAdvisors) {
        const k = Math.floor(r() * S.advisors.length), chosen = S.advisors[k];
        name = chosen.name;
        const replacement = `${pick(r, FIRST)} ${pick(r, LAST_NAMES)}`;
        S.advisors[k] = { ...chosen, name: replacement, since: S.ac, origin: null };
      } else name = `${pick(r, MALE)} ${pick(r, LAST_NAMES)}`;
      S.vessels.push({ name, from: S.ac, chosenBy: old, advisor: fromAdvisors });
      S.leader = { name, since: S.ac, advisor: fromAdvisors };
      log({ kind: 'religion', title: `Cilla passes to ${name}`, text: `${old} chooses ${name}${fromAdvisors ? ', one of his Supreme Advisors,' : ', a classman and not an advisor,'} to be the next vessel of Cilla.`, pos: place('domus_cillae').pos, major: true });
      pulse(CAVE.pos, 'religion');
    }
  }

  const FLAVOR = [
    { kind: 'nature', title: 'The forest of Apricus spreads', text: 'Because no one may harm its wildlife, the forest of Apricus grows a little further every year.', at: 'silvanum' },
    { kind: 'economy', title: 'A new copper vein', text: 'Miners in Sovalus strike a rich new vein of copper ore.', at: 'sovalus_city', fx: { copper: 0.06 } },
    { kind: 'economy', title: 'Timber ships arrive late', text: 'Storms delay the timber ships, and builders across Oppressus run short of wood.', at: 'navale_lignarium' },
    { kind: 'nature', title: 'A storm on the Corton Sea', text: 'A winter storm closes the port of Portus Corton for two weeks.', at: 'portus_corton' },
    { kind: 'mystery', title: 'Voices from the sea', text: 'Fishermen near Cura Aliud say they heard voices coming from the water at night.', at: 'litus_desertum' },
    { kind: 'justice', title: 'Release day in Incarcer', text: 'A group of prisoners finishes rehabilitation and returns home to their districts.', at: 'incarcer_town' },
    { kind: 'justice', title: 'A fugitive vanishes', text: 'A wanted man slips past the watchtowers into the heat of Nullus Sol.', at: 'campus_olei' },
    { kind: 'economy', title: 'Carbon plants expand', text: 'A new hall at the Officina Carbonis turns even more CO2 into carbon products and synthetic fuel.', at: 'officina_cellae' },
    { kind: 'politics', title: 'Rumors from Malum Rec', text: 'Traders say a new weapons market has opened deep in Malum Rec. The government does not go to look.', at: 'forum_umbrae' },
    { kind: 'people', title: 'Promotions to Dual Classman', text: 'The Supreme Advisors raise hundreds of skilled classmen to Dual Classmen.', at: 'nova_cella' },
    { kind: 'people', title: 'Tours of the naval camps', text: 'Ordinary citizens visit the Veskan Sea on one of its rare guided tours.', at: 'vesca' },
    { kind: 'nature', title: 'The aurora australis', text: 'A spectacular southern aurora lights up the winter sky over the whole country.', at: 'mount_solum' },
  ];
  function flavor(r) {
    if (r() > 0.45) return;
    const f = FLAVOR[Math.floor(r() * FLAVOR.length)];
    if (f.kind === 'economy' && S.collapse && f.fx) return;
    if (f.fx) applyEffects(f.fx);
    log({ kind: f.kind, title: f.title, text: f.text, pos: place(f.at).pos });
  }

  function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  // ------------------------------------------------------------------ citizen families
  // Each family starts with a founding couple and grows year by year: people marry, have children,
  // learn trades, are promoted to Dual Classman, are drafted when there is a war, and die.
  // Children keep the family name of the parent from the family line.
  const FAM = D.families;
  const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const KIDS = [[0, 0.04], [1, 0.22], [2, 0.4], [3, 0.26], [4, 0.08]];
  const kidsTarget = (r) => { let x = r(); for (const [n, w] of KIDS) { if ((x -= w) < 0) return n; } return 2; };

  function newPerson(fam, o) {
    const p = { id: `${fam.idx}-${fam.next++}`, died: null, spouse: null, children: [], parents: [], trades: [], dualSince: null, dualBy: null, sailsman: false, soldier: false, drafted: null, diedInWar: false, member: true, ...o };
    fam.people[p.id] = p;
    return p;
  }
  function marry(fam, a, b, ac, target) { a.spouse = b.id; b.spouse = a.id; a.married = b.married = ac; a.kidsTarget = target; }

  function makeFamilies() {
    return FAM.list.map((cfg, idx) => {
      const fam = { ...cfg, idx, people: {}, next: 1, founder: null, log: [] };
      const r = rng(hashStr(cfg.surname));
      const femaleLine = r() < 0.4;
      const founder = newPerson(fam, { first: pick(r, femaleLine ? FAM.female : FAM.male), surname: cfg.surname, sex: femaleLine ? 'f' : 'm', born: cfg.founded - 23 - Math.floor(r() * 5), trades: [cfg.trade] });
      const spouse = newPerson(fam, { first: pick(r, femaleLine ? FAM.male : FAM.female), surname: pick(r, FAM.inLaws), sex: femaleLine ? 'm' : 'f', born: founder.born + Math.floor(r() * 5) - 2, member: false, trades: [pick(r, FAM.trades)] });
      marry(fam, founder, spouse, cfg.founded, 2 + Math.floor(r() * 3));
      fam.founder = founder.id;
      for (let ac = cfg.founded; ac <= PRESENT; ac++) familyYear(fam, ac, null);
      return fam;
    });
  }

  // one year in the life of a family. `sim` is the Civitas state after the present, or null for the past.
  function familyYear(fam, ac, sim) {
    const r = rng(hashStr(fam.surname) + ac * 131), P = fam.people;
    const alive = Object.values(P).filter(p => p.died === null && p.born <= ac);
    const living = alive.filter(p => p.member).length;
    const prof = SOC.classProfiles[fam.district] || { sailsman: 0.03 };
    for (const p of alive) {
      const age = ac - p.born;
      // death
      let h = age < 50 ? 0.0015 : 0.0015 * Math.exp((age - 50) / 9);
      if (p.drafted && sim && sim.war) h += 0.045;
      if (r() < h) {
        p.died = ac;
        if (p.drafted && sim && sim.war) { p.diedInWar = true; fam.log.push({ ac, kind: 'war', text: `${p.first} ${p.surname} was killed in the Austral War.` }); }
        continue;
      }
      // a trade at 18
      if (age === 18 && p.member && !p.trades.length) {
        if (fam.sailsmen && r() < 0.6) { p.trades = ['Merchant']; p.sailsman = true; }
        else if (fam.soldiers && r() < 0.65) { p.trades = ['Naval sailor']; p.soldier = true; }
        else if (r() < prof.sailsman) { p.trades = ['Trader']; p.sailsman = true; }
        else if (r() < 0.05) { p.trades = ['Soldier (3-year enlistment)']; p.soldier = true; }
        else p.trades = [r() < 0.65 ? fam.trade : pick(r, FAM.trades)];
      }
      // marriage
      if (p.member && !p.spouse && age >= 21 && age <= 36 && r() < 0.16) {
        const sp = newPerson(fam, { first: pick(r, p.sex === 'm' ? FAM.female : FAM.male), surname: pick(r, FAM.inLaws), sex: p.sex === 'm' ? 'f' : 'm', born: p.born + Math.floor(r() * 7) - 3, member: false, trades: [pick(r, FAM.trades)] });
        // small families have more children; big ones fewer, so every family stays a readable size
        const t = kidsTarget(r);
        marry(fam, p, sp, ac, living > 18 ? Math.min(1, t) : living < 6 ? Math.max(2, t) : t);
      }
      // children
      if (p.member && p.spouse && P[p.spouse].died === null && p.children.length < (p.kidsTarget || 0)) {
        const mother = p.sex === 'f' ? p : P[p.spouse], mAge = ac - mother.born;
        if (mAge >= 20 && mAge <= 41 && r() < 0.3) {
          const c = newPerson(fam, { first: '', surname: fam.surname, sex: r() < 0.5 ? 'm' : 'f', born: ac, parents: [p.id, p.spouse] });
          c.first = pick(r, c.sex === 'm' ? FAM.male : FAM.female);
          p.children.push(c.id); P[p.spouse].children.push(c.id);
        }
      }
      // promotion to Dual Classman (advisors raise skilled classmen)
      if (age >= 25 && age <= 62 && !p.dualSince && p.trades.length && !p.sailsman && r() < 0.007) {
        let second = pick(r, FAM.trades); if (second === p.trades[0]) second = pick(r, FAM.trades);
        p.dualSince = ac; p.trades = [p.trades[0], second];
        p.dualBy = sim ? pick(r, sim.advisors).name : null;
        const t = `${p.first} ${p.surname} is promoted to Dual Classman${p.dualBy ? ` by ${p.dualBy}` : ''}, as a ${p.trades[0].toLowerCase()} and a ${second.toLowerCase()}.`;
        fam.log.push({ ac, kind: 'people', text: t });
      }
      // the draft: 20- and 21-year-olds during a war
      if (sim && sim.war && (age === 20 || age === 21) && !p.drafted && p.member) {
        p.drafted = ac; fam.log.push({ ac, kind: 'war', text: `${p.first} ${p.surname}, aged ${age}, is drafted into the Austral War.` });
      }
    }
  }
  const familyStats = (fam) => { const ps = Object.values(fam.people), living = ps.filter(p => p.died === null && p.member); return { living: living.length, dual: living.filter(p => p.dualSince).length, total: ps.filter(p => p.member).length, generations: generationCount(fam) }; };
  function generationCount(fam) { const depth = (p) => 1 + Math.max(0, ...p.children.map(id => depth(fam.people[id]))); return depth(fam.people[fam.founder]); }

  // ------------------------------------------------------------------ classes
  function classesOf(p) {
    const pop = S.pop[p.id] || 0, prof = SOC.classProfiles[p.district] || { dual: 0.05, sailsman: 0.03 };
    const rows = [];
    if (prof.outlaw) return [{ id: 'outlaw', name: 'Outlaws (unregistered)', n: pop }];
    const leader = p.id === 'nova_cella' ? 1 : 0;
    const advisors = S.advisors.filter(a => a.seat === p.id).length;
    const d = Land.byId[p.district], ruler = d && d.ruler && d.seat === p.id ? 1 : 0;
    const rest = Math.max(0, pop - leader - advisors - ruler);
    const dualShare = prof.dual ? Math.min(prof.dual + S.promoted, prof.dual * 1.6) : 0;
    const sailShare = prof.sailsman * Math.min(1.4, Math.max(0.3, 0.4 + 0.6 * S.trade));
    const dual = Math.round(rest * dualShare), sails = Math.round(rest * sailShare);
    if (leader) rows.push({ id: 'leader', n: 1 });
    if (advisors) rows.push({ id: 'advisor', n: advisors });
    if (ruler) rows.push({ id: 'ruler', n: 1 });
    rows.push({ id: 'dual', n: dual }, { id: 'sailsman', n: sails }, { id: 'classman', n: Math.max(0, Math.round(rest) - dual - sails) });
    return rows.filter(x => x.n > 0 || ['dual', 'sailsman', 'classman'].includes(x.id)).map(x => ({ ...x, name: SOC.classes.find(c => c.id === x.id).name }));
  }
  function classTable(rows, total) {
    return `<table class="class-table"><thead><tr><th>Class</th><th>People</th><th>Share</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${fmt(r.n)}</td><td>${total ? (r.n / total * 100).toFixed(r.n / total < 0.01 ? 2 : 1) : 0}%</td></tr>`).join('')}</tbody></table>`;
  }
  function districtClasses(id) {
    const sum = {};
    for (const p of inDistrict[id]) for (const r of classesOf(p)) { sum[r.id] = sum[r.id] || { ...r, n: 0 }; sum[r.id].n += r.n; }
    const order = ['leader', 'advisor', 'ruler', 'dual', 'sailsman', 'classman', 'outlaw'];
    return order.filter(k => sum[k]).map(k => sum[k]);
  }

  // ------------------------------------------------------------------ map drawing
  let hatchTile = null;
  function hatchPattern(ctx) {
    if (!hatchTile) {
      hatchTile = document.createElement('canvas'); hatchTile.width = hatchTile.height = 10;
      const g = hatchTile.getContext('2d'); g.strokeStyle = 'rgba(201,122,69,0.7)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.moveTo(-2, 2); g.lineTo(2, -2); g.stroke();
    }
    return ctx.createPattern(hatchTile, 'repeat');
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const SEA_DISTRICTS = new Set(['veskan_sea', 'cura_aliud', 'corton_sea']);

  // The district colours and the hatching of the Veskan training grounds never change, so they are
  // painted once into image layers (2/3 of the map's resolution) instead of every frame.
  const LAYER_SCALE = 1 / 1.5;
  let fillLayer = null, veskanLayer = null;
  function layerCanvas() {
    const c = document.createElement('canvas');
    c.width = Math.ceil(T.imageWidth * LAYER_SCALE); c.height = Math.ceil(T.imageHeight * LAYER_SCALE);
    const g = c.getContext('2d'); g.scale(LAYER_SCALE, LAYER_SCALE);
    return [c, g];
  }
  function buildLayers() {
    const outlines = Geom.districtOutlines(), coast = Geom.coastline(0).path;
    let [c, g] = layerCanvas();
    for (const d of D.districts) { // stronger on land than on water
      const o = outlines[d.id]; if (!o) continue;
      g.save(); g.clip(o.path, 'evenodd');
      g.fillStyle = rgba(d.color, SEA_DISTRICTS.has(d.id) ? 0.14 : 0.22); g.fillRect(0, 0, T.imageWidth, T.imageHeight);
      g.fillStyle = rgba(d.color, 0.4); g.fill(coast);
      g.restore();
    }
    fillLayer = c;
    [c, g] = layerCanvas();
    const pat = hatchPattern(g); pat.setTransform(new DOMMatrix().scale(1 / LAYER_SCALE));
    g.save(); g.clip(outlines.veskan_sea.path, 'evenodd'); g.fillStyle = pat; g.fill(coast); g.restore();
    veskanLayer = c;
  }

  function drawWorld(ctx, map) {
    const base = Views.terra.baseCanvas(), lw = (n) => map.px(n);
    ctx.drawImage(base, -0.5, -0.5, T.W * T.CELL, T.H * T.CELL);
    if (!fillLayer) buildLayers();
    const outlines = Geom.districtOutlines(), coast = Geom.coastline(0).path;
    if (state.fills) ctx.drawImage(fillLayer, 0, 0, fillLayer.width / LAYER_SCALE, fillLayer.height / LAYER_SCALE);
    ctx.strokeStyle = 'rgba(16,34,54,0.85)'; ctx.lineWidth = lw(1.1); ctx.stroke(coast);
    // borders
    for (const id in outlines) { ctx.lineWidth = lw(3.6); ctx.strokeStyle = 'rgba(255,252,246,0.6)'; ctx.stroke(outlines[id].path); }
    for (const id in outlines) { ctx.lineWidth = lw(1.3); ctx.strokeStyle = 'rgba(58,36,22,0.85)'; ctx.stroke(outlines[id].path); }
    // Royal Zones: copper hatching and a double copper border
    if (state.royal) {
      const pat = hatchPattern(ctx); pat.setTransform(new DOMMatrix().scale(1 / map.cam.scale));
      const zone = (fill, stroke) => {
        ctx.fillStyle = pat; fill();
        ctx.lineWidth = lw(5); ctx.strokeStyle = 'rgba(201,122,69,0.85)'; stroke();
        ctx.lineWidth = lw(1.6); ctx.strokeStyle = '#2a160a'; stroke();
      };
      const v = outlines.mount_veston.path;
      zone(() => ctx.fill(v, 'evenodd'), () => ctx.stroke(v));
      const k = outlines.veskan_sea.path; // the naval training grounds: the Veskan islands
      ctx.drawImage(veskanLayer, 0, 0, veskanLayer.width / LAYER_SCALE, veskanLayer.height / LAYER_SCALE);
      ctx.setLineDash([lw(10), lw(5)]); ctx.lineWidth = lw(3); ctx.strokeStyle = 'rgba(201,122,69,0.8)'; ctx.stroke(k); ctx.setLineDash([]);
      const dc = place('domus_cillae').pos, ring = new Path2D(); ring.arc(dc[0], dc[1], 7, 0, Math.PI * 2);
      zone(() => ctx.fill(ring), () => ctx.stroke(ring));
    }
    // the road of trade
    const road = new Path2D(); D.tradeRoad.forEach(([x, y], i) => i ? road.lineTo(x, y) : road.moveTo(x, y));
    ctx.lineCap = 'round'; ctx.lineWidth = lw(3.5); ctx.strokeStyle = 'rgba(250,244,232,0.75)'; ctx.stroke(road);
    ctx.setLineDash([lw(6), lw(4)]); ctx.lineWidth = lw(1.8); ctx.strokeStyle = '#7a4a26'; ctx.stroke(road); ctx.setLineDash([]); ctx.lineCap = 'butt';
  }

  // ------------------------------------------------------------------ economy overlay: trade routes
  function expandPath(path) {
    const pts = [];
    for (const p of path) {
      if (p === 'road') pts.push(...D.tradeRoad);
      else if (p === 'road-back') pts.push(...D.tradeRoad.slice().reverse());
      else if (Array.isArray(p)) pts.push(p);
      else if (place(p)) pts.push(place(p).pos);
    }
    return pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 4);
  }
  function smoothLine(pts) { // a Catmull-Rom curve through the points
    if (pts.length < 3) return pts;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let t = 0; t < 1; t += 0.125) {
        const t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const ROUTES = (D.trade || []).map(r => ({ ...r, lines: r.paths.map(p => smoothLine(expandPath(p))) }));
  // how busy each route is this year (1 = normal)
  function tradeVolume(kind) {
    const blocked = S.blockade ? 0.25 : 1, slump = S.collapse ? 0.65 : 1, sov = total('sovalus') / BASE.sovalus;
    return { copper: S.copper * sov * blocked * slump, minerals: sov * slump * (S.blockade ? 0.6 : 1), food: S.food, fuel: (S.war ? 1.35 : 1) * slump, timber: blocked * slump * Math.min(1.3, S.trade) }[kind] ?? 1;
  }
  function offsetLine(pts, d) {
    if (!d) return pts;
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [p[0] - (b[1] - a[1]) / len * d, p[1] + (b[0] - a[0]) / len * d];
    });
  }
  function drawEconomy(ctx, map) {
    const now = performance.now();
    const trace = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const r of ROUTES) {
      const v = tradeVolume(r.volume), w = 2.5 + 4 * Math.min(1.6, v);
      for (const line of r.lines) {
        const pts = offsetLine(line.map(p => map.imageToScreen(...p)), r.offset);
        trace(pts); ctx.lineWidth = w + 3; ctx.strokeStyle = 'rgba(16,24,32,0.55)'; ctx.stroke();
        trace(pts); ctx.lineWidth = w; ctx.strokeStyle = r.color; ctx.stroke();
        if (!Prefs.reduceMotion) { // little dashes flowing in the direction of trade
          ctx.setLineDash([2, 14]); ctx.lineDashOffset = -(now / 30) % 16; ctx.lineWidth = Math.max(1.5, w * 0.45); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke(); ctx.setLineDash([]);
        }
        // arrowheads every 190 px and at the end
        let run = 0;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
          run += seg;
          if (run >= 190 || i === pts.length - 1) {
            run = 0;
            const a = Math.atan2(y1 - y0, x1 - x0), s = 6 + w * 1.2;
            ctx.beginPath(); ctx.moveTo(x1 + Math.cos(a) * s * 0.6, y1 + Math.sin(a) * s * 0.6);
            ctx.lineTo(x1 + Math.cos(a + 2.5) * s, y1 + Math.sin(a + 2.5) * s); ctx.lineTo(x1 + Math.cos(a - 2.5) * s, y1 + Math.sin(a - 2.5) * s); ctx.closePath();
            ctx.fillStyle = r.color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(16,24,32,0.7)'; ctx.stroke();
          }
        }
      }
    }
    if (S.blockade) { // the blockade cuts the sea routes
      const [x, y] = map.imageToScreen(1760, 1600);
      ctx.lineWidth = 6; ctx.strokeStyle = '#ff4d3d';
      ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y - 14); ctx.lineTo(x - 14, y + 14); ctx.stroke();
    }
    ctx.restore();
  }
  function econLegendHTML() {
    return ROUTES.map(r => {
      const v = tradeVolume(r.volume);
      return `<button class="econ-row" data-route="${r.id}"><span class="econ-line" style="background:${r.color}"></span><span>${esc(r.name)}</span><span class="econ-val">${Math.round(v * 100)}%</span></button>`;
    }).join('') + `<p class="muted" style="margin:6px 0 0">Thicker lines carry more goods. 100% is a normal year.${S.blockade ? ' <strong>The Corton Sea is blockaded.</strong>' : ''}</p>`;
  }

  const PULSE = { holiday: '#f0a35e', religion: '#f0a35e', war: '#ff5a4a', economy: '#f2c94c', politics: '#8fc3ea', nature: '#8fd0a0', mystery: '#c9a8ff', justice: '#cfd6de', people: '#e8e1d6' };
  function drawScreen(ctx, map) {
    const labels = new Labels(ctx), z = map.zoom;
    hitTargets = [];
    const onWater = (x, y) => T.elevationAt(x, y) <= 0 || T.isLake(x, y);

    if (state.towers) {
      for (const [x, y] of Views.terra.defenses().towers) {
        const [sx, sy] = map.imageToScreen(x, y);
        if (sx < -10 || sy < -10 || sx > map.width + 10 || sy > map.height + 10) continue;
        if (z >= 4) Icons.drawIcon(ctx, 'tower', sx, sy, 15);
        else { ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fillStyle = '#eaf4fc'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#16314d'; ctx.stroke(); }
      }
    }
    // event pulses
    const now = performance.now();
    pulses = pulses.filter(p => now - p.start < 1800);
    for (const p of pulses) {
      const t = (now - p.start) / 1800, [sx, sy] = map.imageToScreen(...p.pos);
      ctx.beginPath(); ctx.arc(sx, sy, 10 + t * 46, 0, Math.PI * 2);
      ctx.lineWidth = 3 * (1 - t) + 1; ctx.strokeStyle = PULSE[p.kind] || '#fff'; ctx.globalAlpha = 1 - t; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (S.war) { // the war front: the naval camps glow red
      const [sx, sy] = map.imageToScreen(...place('castra_1').pos);
      ctx.beginPath(); ctx.arc(sx, sy, 22 + (Prefs.reduceMotion ? 0 : 4 * Math.sin(now / 300)), 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,90,74,0.8)'; ctx.stroke();
    }
    if (S.blockade) {
      const [sx, sy] = map.imageToScreen(...place('portus_corton').pos);
      ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(sx, sy, 40, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,90,74,0.9)'; ctx.stroke(); ctx.setLineDash([]);
    }

    if (state.economy) drawEconomy(ctx, map);
    Settlements.draw(ctx, map, labels, hitTargets, { pop: (p) => S.pop[p.id] ?? p.population, onWater });

    // district names, rulers and live populations
    for (const d of D.districts) {
      const [sx, sy] = map.imageToScreen(...d.label), water = onWater(...d.label), size = Math.min(19, 12 + z * 2.2);
      const who = d.ruler ? d.ruler.name : d.id === 'mount_veston' ? 'Ruled by Cilla' : 'No ruler';
      const pop = total(d.id);
      labels.add({
        text: d.name.toUpperCase(), x: sx, y: sy, size, spacing: '0.14em', font: `700 ${size}px Cinzel, Georgia, serif`,
        color: water ? '#f4e9dc' : '#2c1a0e', halo: water ? 'rgba(12,26,44,0.85)' : 'rgba(252,247,240,0.9)', haloWidth: 4,
        priority: 80, overIcons: true, alts: [[0, 1], [0, -1], [0.8, 1], [-0.8, -1], [0, 2], [0, -2]],
        sub: `${who} · ${pop ? short(pop) : 'abandoned'}`, subSize: 12.5, subFont: 'italic 600 12.5px "Source Sans 3", system-ui, sans-serif', subColor: water ? '#d9e4ee' : '#4a3020',
      });
    }
    labels.draw();
  }

  // ------------------------------------------------------------------ sidebar
  const KIND_LABEL = { holiday: 'Holiday', religion: 'Religion', war: 'War', economy: 'Economy', politics: 'Politics', nature: 'Nature', mystery: 'Mystery', justice: 'Justice', people: 'People', present: 'Today' };
  function buildSidebar(el) {
    el.innerHTML = `
      <section class="panel-section civ-time">
        <div class="civ-year"><span class="cy-ac" id="civYear"></span><span class="cy-ce" id="civCE"></span></div>
        <div class="civ-buttons">
          <button class="civ-btn primary" id="civPlay"><svg viewBox="0 0 24 24" width="16" height="16"><path class="ico-play" d="M7 5l12 7-12 7z" fill="currentColor"/><path class="ico-pause" d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg><span>Play</span></button>
          <button class="civ-btn" id="civStep" title="Advance one year">+1 year</button>
          <button class="civ-btn" id="civReset" title="Back to Year ${PRESENT} AC">Reset</button>
        </div>
        <label class="civ-speed">Speed <input type="range" id="civSpeed" min="0.5" max="10" step="0.5" value="${speed}"><span id="civSpeedVal"></span></label>
        <div class="civ-flags" id="civFlags"></div>
      </section>
      <nav class="side-tabs" role="tablist" aria-label="Civitas panels">
        <button role="tab" data-tab="overview">Overview</button><button role="tab" data-tab="society">Society</button><button role="tab" data-tab="lineages">Lineages</button>
      </nav>
      <div class="tab-panel" data-panel="society">
        <section class="panel-section">
          <h3>The social pyramid</h3>
          <div id="civPyramid"></div>
          <p class="muted" style="margin:6px 0 10px">Live counts for Year <span id="pyrYear"></span> AC. Click a level to learn about it.</p>
          <div id="civClassTable"></div>
          <div id="civClassNotes"></div>
        </section>
        <section class="panel-section">
          <h3>Changing class</h3>
          <p class="side-text">${esc(SOC.topics.mobility.text)}</p>
          <div class="hs"><span>Dual Classman share</span><strong id="civDualShare"></strong></div>
        </section>
      </div>
      <div class="tab-panel" data-panel="lineages">
        <section class="panel-section">
          <h3>The Succession of Cilla</h3>
          <div class="lin-current" id="linCurrent"></div>
          <button class="civ-btn wide" id="openSuccession">Open the succession chain</button>
        </section>
        <section class="panel-section">
          <h3>Citizen families</h3>
          <div class="fam-list" id="famList"></div>
        </section>
        <section class="panel-section">
          <h3>Family news</h3>
          <ol class="civ-log" id="famNews"></ol>
        </section>
      </div>
      <div class="tab-panel" data-panel="overview">
      <section class="panel-section">
        <h3>Population</h3>
        <div class="civ-hero"><strong id="civTotal"></strong><span id="civDelta"></span></div>
        <div class="spark-wrap"><canvas id="civSpark" height="74"></canvas><div class="spark-tip" id="civSparkTip" hidden></div></div>
        <div class="civ-districts" id="civDistricts"></div>
      </section>
      <section class="panel-section">
        <h3>Economy</h3>
        <div class="civ-econ" id="civEcon"></div>
      </section>
      <section class="panel-section">
        <h3>Events</h3>
        <label class="toggle small"><input type="checkbox" id="civShowHoliday"><span class="sw"></span><span>Show the yearly Dies Creationis</span></label>
        <ol class="civ-log" id="civLog"></ol>
      </section>
      <section class="panel-section">
        <h3>Layers</h3>
        <label class="toggle"><input type="checkbox" data-k="economy"><span class="sw"></span><span><strong>Economy</strong><small>Trade routes for copper, metals, food, oil and timber</small></span></label>
        <div class="econ-legend" id="econLegend" hidden></div>
        <label class="toggle small"><input type="checkbox" data-k="fills"><span class="sw"></span><span>District colors</span></label>
        <label class="toggle small"><input type="checkbox" data-k="royal"><span class="sw"></span><span>Royal Zones</span></label>
        <label class="toggle small"><input type="checkbox" data-k="towers"><span class="sw"></span><span>Watchtowers</span></label>
        <ul class="legend lines" style="margin-top:10px">
          <li><span class="swatch hatch"></span>Royal Zone (entry by permission only)</li>
          <li><span class="line road"></span>Road of trade</li>
        </ul>
      </section>
      </div>`;
    const showTab = (t) => {
      sideTab = t;
      el.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
      el.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== t; });
      refresh();
    };
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    el.querySelector('#civPyramid').addEventListener('click', (e) => { const g = e.target.closest('[data-class]'); if (g) showClass(g.dataset.class); });
    el.querySelector('#civPyramid').addEventListener('keydown', (e) => { const g = e.target.closest('[data-class]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); showClass(g.dataset.class); } });
    el.querySelector('#openSuccession').addEventListener('click', () => openLineage('succession'));
    el.querySelector('#famList').addEventListener('click', (e) => { const b = e.target.closest('[data-fam]'); if (b) openLineage('family', +b.dataset.fam); });
    el.querySelector('#civPlay').addEventListener('click', togglePlay);
    el.querySelector('#civStep').addEventListener('click', () => { pause(); step(); refresh(); });
    el.querySelector('#civReset').addEventListener('click', () => { pause(); reset(); pulses = []; refresh(); });
    const sp = el.querySelector('#civSpeed');
    sp.addEventListener('input', () => { speed = +sp.value; refresh(); });
    el.querySelector('#civShowHoliday').addEventListener('change', refresh);
    el.querySelectorAll('input[data-k]').forEach(inp => {
      inp.checked = state[inp.dataset.k];
      inp.addEventListener('change', () => { state[inp.dataset.k] = inp.checked; refresh(); });
    });
    el.querySelector('#econLegend').addEventListener('click', (e) => {
      const b = e.target.closest('[data-route]'); if (!b) return;
      const r = ROUTES.find(q => q.id === b.dataset.route);
      App.showInfo({ kicker: 'Trade route', title: r.name, color: r.color, subtitle: `${Math.round(tradeVolume(r.volume) * 100)}% of a normal year, Year ${S.ac} AC`, body: `<p>${esc(r.note)}</p>` });
    });
    el.querySelector('#civLog').addEventListener('click', (e) => {
      const li = e.target.closest('[data-i]'); if (!li) return;
      const ev = S.log[+li.dataset.i];
      App.showInfo({ kicker: KIND_LABEL[ev.kind] || 'Event', title: ev.title, subtitle: `Year ${ev.ac} AC (${AC1 + ev.ac - 1} CE)`, body: `<p>${esc(ev.text)}</p>` });
      if (ev.pos) App.map.flyTo(ev.pos[0], ev.pos[1], Math.max(App.map.zoom, 2.2), 800);
    });
    el.querySelector('#civDistricts').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) App.showDistrict(b.dataset.d, true); });
    bindSpark(el.querySelector('#civSpark'), el.querySelector('#civSparkTip'));
    showTab(sideTab);
  }
  let sideTab = 'overview';

  function econStatus() {
    if (S.collapse) return ['critical', 'Collapsed'];
    if (S.war) return ['serious', 'At war'];
    if (S.trade > 1.1) return ['good', 'Booming'];
    if (S.trade < 0.85 || S.food < 0.9) return ['warning', 'Struggling'];
    return ['neutral', 'Stable'];
  }

  function refresh() {
    App.setYear(AC1 + S.ac - 1);
    const $ = (id) => document.getElementById(id);
    if (!$('civYear')) { App.map.requestRender(); return; }
    $('civYear').textContent = `Year ${S.ac} AC`;
    $('civCE').textContent = `${AC1 + S.ac - 1} CE`;
    $('civSpeedVal').textContent = `${speed} ${speed === 1 ? 'year' : 'years'} / sec`;
    $('civPlay').querySelector('span').textContent = playing ? 'Pause' : 'Play';
    $('civPlay').classList.toggle('playing', playing);
    const [st, label] = econStatus();
    $('civFlags').innerHTML = `
      <span class="flag ${st}"><span class="flag-dot"></span>${label}</span>
      ${S.blockade ? '<span class="flag serious"><span class="flag-dot"></span>Corton Sea blockaded</span>' : ''}
      ${S.war ? `<span class="flag serious"><span class="flag-dot"></span>${fmt(S.drafted)} drafted</span>` : ''}`;
    const all = grandTotal(), d0 = all / BASE_ALL - 1;
    $('civTotal').textContent = fmt(all);
    $('civDelta').textContent = S.ac === PRESENT ? `people in Year ${PRESENT} AC` : `people · ${d0 >= 0 ? '+' : ''}${(d0 * 100).toFixed(1)}% since Year ${PRESENT}`;
    const rows = D.districts.map(d => ({ d, n: total(d.id) })).sort((a, b) => b.n - a.n), max = rows[0].n;
    $('civDistricts').innerHTML = rows.map(({ d, n }) => `
      <button class="cd-row" data-d="${d.id}"><span class="cd-sw" style="background:${d.color}"></span><span class="cd-name">${esc(d.name)}</span><span class="cd-num">${n ? short(n) : '0'}</span>
      <span class="cd-bar"><span style="width:${Math.max(n ? 1.5 : 0, n / max * 100)}%"></span></span></button>`).join('');
    $('civEcon').innerHTML = `
      <div class="hs"><span>Food supply</span><strong>${Math.round(S.food * 100)}%</strong></div>
      <div class="hs"><span>Copper price</span><strong>${S.copper.toFixed(2)}×</strong></div>
      <div class="hs"><span>Trade</span><strong>${Math.round(S.trade * 100)}%</strong></div>
      <div class="hs"><span>Vessel of Cilla</span><strong class="small">${esc(S.leader.name)}</strong></div>`;
    const showHoliday = $('civShowHoliday').checked;
    const items = S.log.map((e, i) => ({ e, i })).filter(({ e }) => showHoliday || e.kind !== 'holiday').slice(-60).reverse();
    $('civLog').innerHTML = items.map(({ e, i }) => `<li data-i="${i}" class="k-${e.kind}${e.major ? ' major' : ''}"><span class="lg-year">${e.ac}</span><span class="lg-kind">${KIND_LABEL[e.kind] || ''}</span><span class="lg-title">${esc(e.title)}</span></li>`).join('');
    drawSpark();
    const el = $('econLegend');
    if (el) { el.hidden = !state.economy; if (state.economy) el.innerHTML = econLegendHTML(); }
    if (sideTab === 'society') refreshSociety();
    if (sideTab === 'lineages') refreshLineages();
    if (lineageOpen) renderLineage();
    App.map.requestRender();
  }

  // ------------------------------------------------------------------ the social pyramid
  const TIERS = [['leader'], ['advisor', 'ruler'], ['dual'], ['sailsman'], ['classman']];
  const SHORT = { leader: 'Supreme Leader', advisor: 'Advisors', ruler: 'District Rulers', dual: 'Dual Classmen', sailsman: 'Sailsmen', classman: 'Classmen' };
  const TIER_FILL = ['#ecaa6c', '#d58a52', '#b26c3c', '#86563a', '#5c4a3f'];
  const TIER_INK = ['#1a0f07', '#1a0f07', '#ffffff', '#ffffff', '#ffffff'];
  function classTotals() {
    const t = { leader: 1, advisor: S.advisors.length, ruler: D.districts.filter(d => d.ruler).length, dual: 0, sailsman: 0, classman: 0, outlaw: 0 };
    for (const p of people) for (const r of classesOf(p)) if (r.id === 'dual' || r.id === 'sailsman' || r.id === 'classman' || r.id === 'outlaw') t[r.id] += r.n;
    return t;
  }
  function refreshSociety() {
    const el = document.getElementById('civPyramid'); if (!el) return;
    const t = classTotals(), W = 300, rowH = 44, widths = [0.42, 0.64, 0.78, 0.9, 1];
    let svg = `<svg viewBox="0 0 ${W} ${rowH * 5 + 4}" class="pyramid" role="img" aria-label="The social pyramid of Oppressus">`;
    TIERS.forEach((ids, k) => {
      const w = W * widths[k], x0 = (W - w) / 2, y = k * rowH + 2, part = w / ids.length;
      ids.forEach((id, j) => {
        const x = x0 + part * j;
        svg += `<g data-class="${id}" class="pyr-tier" tabindex="0"><rect x="${x + (j ? 2 : 0)}" y="${y}" width="${part - (ids.length > 1 ? 2 : 0)}" height="${rowH - 3}" rx="4" fill="${TIER_FILL[k]}"/>
          <text x="${x + part / 2}" y="${y + 17}" text-anchor="middle" fill="${TIER_INK[k]}" class="pyr-name">${SHORT[id]}</text>
          <text x="${x + part / 2}" y="${y + 34}" text-anchor="middle" fill="${TIER_INK[k]}" class="pyr-num">${fmt(t[id])}</text></g>`;
      });
    });
    el.innerHTML = svg + '</svg>';
    document.getElementById('pyrYear').textContent = S.ac;
    const all = t.leader + t.advisor + t.ruler + t.dual + t.sailsman + t.classman;
    const rows = ['leader', 'advisor', 'ruler', 'dual', 'sailsman', 'classman'].map(id => ({ name: SOC.classes.find(c => c.id === id).name, n: t[id] }));
    document.getElementById('civClassTable').innerHTML = classTable(rows, all);
    document.getElementById('civClassNotes').innerHTML = `
      <p class="muted">Outside the pyramid: about ${fmt(t.outlaw)} outlaws hiding in Nullus Sol.${S.war ? ` ${fmt(S.drafted)} people are away in the military, drafted at 20 and 21.` : ''}</p>`;
    document.getElementById('civDualShare').textContent = `${(t.dual / all * 100).toFixed(2)}%`;
  }
  function showClass(id) {
    const c = SOC.classes.find(x => x.id === id), t = classTotals();
    let who = '';
    if (id === 'leader') who = `<dl class="facts"><dt>Vessel of Cilla</dt><dd>${esc(S.leader.name)}<small>Since Year ${S.leader.since} AC</small></dd></dl>`;
    if (id === 'advisor') who = `<h4>The 8 Supreme Advisors</h4><ul class="bullets">${S.advisors.map(a => `<li>${esc(a.name)} <span class="muted">· ${esc(place(a.seat).name)}, since ${a.since} AC</span></li>`).join('')}</ul>`;
    if (id === 'ruler') who = `<h4>The District Rulers</h4><ul class="bullets">${D.districts.filter(d => d.ruler).map(d => `<li>${esc(d.ruler.name)} <span class="muted">· ${esc(d.name)}</span></li>`).join('')}</ul>`;
    App.showInfo({ kicker: 'Social class', title: c.name, subtitle: `${fmt(t[id])} ${t[id] === 1 ? 'person' : 'people'} in Year ${S.ac} AC`, body: `<p>${esc(c.description)}</p>${who}<details class="topic"><summary>Changing class</summary><p>${esc(SOC.topics.mobility.text)}</p></details>` });
  }

  // ------------------------------------------------------------------ lineages: side panel
  const ROMAN = (n) => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
  function vessels() {
    const list = D.succession.map(v => ({ ...v })).concat(S.vessels.map(v => ({ ...v, sim: true })));
    list.forEach((v, i) => { v.n = i + 1; if (i < list.length - 1) v.to = list[i + 1].from; else v.to = null; if (i > 0 && !v.chosenBy) v.chosenBy = list[i - 1].name; });
    return list;
  }
  function refreshLineages() {
    const el = document.getElementById('linCurrent'); if (!el) return;
    const vs = vessels(), cur = vs[vs.length - 1];
    el.innerHTML = `<div class="lin-now"><span class="lin-num">${ROMAN(cur.n)}</span><div><strong>${esc(cur.name)}</strong><small>The ${ordinal(cur.n)} vessel of Cilla, since Year ${cur.from} AC</small></div></div>`;
    document.getElementById('famList').innerHTML = S.families.map((f, i) => {
      const st = familyStats(f), d = Land.byId[f.district];
      return `<button class="fam-row" data-fam="${i}"><span class="cd-sw" style="background:${d.color}"></span><span class="fam-name">${esc(f.surname)}<small>${esc(f.trade)} · ${esc(d.name)}</small></span><span class="fam-num">${st.living} living<small>${st.dual} Dual Classm${st.dual === 1 ? 'an' : 'en'}</small></span></button>`;
    }).join('');
    const news = S.families.flatMap(f => f.log.map(e => ({ ...e, fam: f.surname }))).sort((a, b) => b.ac - a.ac).slice(0, 14);
    document.getElementById('famNews').innerHTML = news.map(e => `<li class="k-${e.kind}"><span class="lg-year">${e.ac}</span><span class="lg-kind">${esc(e.fam)}</span><span class="lg-title">${esc(e.text)}</span></li>`).join('');
  }

  // ------------------------------------------------------------------ lineages: the big panel over the map
  let lineageOpen = null, lineageEl = null, treeScale = 1;
  function openLineage(kind, famIdx = 0) {
    if (!lineageEl) {
      lineageEl = document.createElement('div');
      lineageEl.className = 'lineage-view';
      lineageEl.setAttribute('role', 'dialog'); lineageEl.setAttribute('aria-label', 'Lineages');
      document.querySelector('.map-wrap').appendChild(lineageEl);
      lineageEl.addEventListener('click', onLineageClick);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lineageOpen) closeLineage(); });
    }
    lineageOpen = { kind, fam: famIdx, fitNext: true };
    lineageEl.hidden = false;
    renderLineage();
  }
  function closeLineage() { lineageOpen = null; if (lineageEl) lineageEl.hidden = true; }

  function renderLineage() {
    if (!lineageOpen || !lineageEl) return;
    const tabs = `
      <header class="lv-head">
        <div class="lv-tabs" role="tablist">
          <button role="tab" data-lv="succession" aria-selected="${lineageOpen.kind === 'succession'}">The Succession of Cilla</button>
          <button role="tab" data-lv="family" aria-selected="${lineageOpen.kind === 'family'}">Citizen families</button>
        </div>
        <span class="lv-year">Year ${S.ac} AC</span>
        <button class="info-close" data-lv="close" aria-label="Close and return to the map">×</button>
      </header>`;
    const scroll = lineageEl.querySelector('.lv-body');
    const keep = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
    lineageEl.innerHTML = tabs + (lineageOpen.kind === 'succession' ? successionHTML() : familyHTML(S.families[lineageOpen.fam]));
    const body = lineageEl.querySelector('.lv-body'); if (body) { body.scrollLeft = keep[0]; body.scrollTop = keep[1]; }
    // a newly opened family tree is scaled to fit the panel (but never so small it can't be read)
    if (lineageOpen.kind === 'family' && lineageOpen.fitNext) {
      lineageOpen.fitNext = false;
      const tree = lineageEl.querySelector('.tree');
      const fit = Math.max(0.6, Math.min(1, (body.clientWidth - 30) / tree.offsetWidth));
      if (Math.abs(fit - treeScale) > 0.01) { treeScale = fit; renderLineage(); }
    }
  }

  function successionHTML() {
    const vs = vessels(), last = Math.max(S.ac, PRESENT), span = last - 1 + 1;
    const X = (ac) => ((ac - 1) / span * 100).toFixed(3);
    const ticks = []; for (let y = 50; y < last - 25; y += 50) ticks.push(y);
    return `<div class="lv-body succession">
      <p class="lv-intro">Supreme Leaders may not have children, because the leader is god and everyone is a child of god. Each leader <strong>chooses</strong> the next one, usually one of his Supreme Advisors, and Cilla passes from vessel to vessel. This is a chain of chosen successors, not a family tree.</p>
      <div class="sc-axis"><span class="sc-label"></span><div class="sc-track">${ticks.map(y => `<span class="sc-tick" style="left:${X(y)}%">${y} AC</span>`).join('')}<span class="sc-tick end" style="left:100%">${last} AC</span></div></div>
      <ol class="sc-list">
        <li class="sc-origin"><span class="sc-label"><span class="sc-cell" aria-hidden="true"></span><span><strong>The cave on Mount Veston</strong><small>Year 1 AC: Cilla enters the first vessel</small></span></span><div class="sc-track"></div></li>
        ${vs.map((v, i) => {
          const to = v.to ?? S.ac, years = to - v.from;
          return `<li class="sc-row${v.to === null ? ' current' : ''}${v.sim ? ' sim' : ''}" data-vessel="${i}">
            <span class="sc-label"><span class="sc-num">${ROMAN(v.n)}</span><span><strong>${esc(v.name)}</strong><small>${i === 0 ? 'Chosen by Cilla in the cave' : `Chosen by ${esc(v.chosenBy)}`}${v.advisor === false && i > 0 ? ' · <em>a classman, not an advisor</em>' : v.advisor ? ' · was a Supreme Advisor' : ''}</small></span></span>
            <div class="sc-track"><span class="sc-bar" style="left:${X(v.from)}%;width:${Math.max(0.6, years / span * 100).toFixed(3)}%"></span><span class="sc-years" style="left:calc(${X(v.from)}% + ${Math.max(0.6, years / span * 100).toFixed(3)}% + 6px)">${v.from}–${v.to ?? 'today'} AC · ${years} yrs</span></div>
          </li>`;
        }).join('')}
      </ol>
      <p class="muted lv-foot">Copper bars show each vessel's years of rule. ${S.vessels.length ? 'Lighter rows were chosen during this simulation.' : 'Press Play in the side panel: new vessels are added here as the years pass.'}</p>
    </div>`;
  }

  // family tree layout: each person (with their spouse beside them) sits centred above their children
  const CARD_W = 172, CARD_H = 88, GAP_X = 16, COUPLE_GAP = 10, GAP_Y = 44;
  function familyHTML(fam) {
    const P = fam.people, root = P[fam.founder];
    const unitW = (p) => p.spouse ? CARD_W * 2 + COUPLE_GAP : CARD_W;
    const widths = new Map();
    const measure = (p) => { const kids = p.children.map(id => P[id]); let w = kids.reduce((s, k) => s + measure(k), 0) + GAP_X * Math.max(0, kids.length - 1); w = Math.max(w, unitW(p)); widths.set(p.id, w); return w; };
    const totalW = measure(root);
    const nodes = [], links = []; let maxDepth = 0;
    const place = (p, x0, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      const w = widths.get(p.id), uw = unitW(p), ux = x0 + (w - uw) / 2, y = depth * (CARD_H + GAP_Y);
      nodes.push({ p, x: ux, y });
      if (p.spouse) nodes.push({ p: P[p.spouse], x: ux + CARD_W + COUPLE_GAP, y, inLaw: true });
      const kids = p.children.map(id => P[id]); if (!kids.length) return;
      const tw = kids.reduce((s, k) => s + widths.get(k.id), 0) + GAP_X * (kids.length - 1);
      let cx = x0 + (w - tw) / 2;
      const px = ux + uw / 2, py = y + CARD_H, cy = (depth + 1) * (CARD_H + GAP_Y);
      for (const k of kids) {
        const kw = widths.get(k.id), kx = cx + (kw - unitW(k)) / 2 + CARD_W / 2;
        links.push(`M${px},${py} V${py + GAP_Y / 2} H${kx} V${cy}`);
        place(k, cx, depth + 1); cx += kw + GAP_X;
      }
    };
    place(root, 0, 0);
    const H = (maxDepth + 1) * (CARD_H + GAP_Y);
    const st = familyStats(fam), d = Land.byId[fam.district], home = Settlements.byId[fam.home];
    const card = ({ p, x, y, inLaw }) => {
      const age = (p.died ?? S.ac) - p.born;
      const life = p.died !== null ? `${p.born}–${p.died} AC · died at ${age}` : `born ${p.born} AC · age ${age}`;
      const badges = [p.dualSince ? `<span class="pb dual" title="Promoted in Year ${p.dualSince} AC">Dual Classman</span>` : '', p.sailsman ? '<span class="pb sails">Sailsman</span>' : '', p.soldier ? '<span class="pb soldier">Navy</span>' : '', p.drafted ? `<span class="pb drafted">${p.diedInWar ? 'Died in the war' : 'Drafted'}</span>` : ''].join('');
      return `<button class="pcard${p.died !== null ? ' dead' : ''}${inLaw ? ' inlaw' : ''}${p.dualSince ? ' isdual' : ''}" style="left:${x}px;top:${y}px;width:${CARD_W}px;height:${CARD_H}px" data-person="${p.id}">
        <span class="pc-name">${esc(p.first)} ${esc(p.surname)}</span>
        <span class="pc-life">${life}</span>
        <span class="pc-trade">${p.trades.length ? esc(p.trades.join(' + ')) : (age < 18 ? 'Child' : '')}${inLaw ? ' · married in' : ''}</span>
        <span class="pc-badges">${badges}</span>
      </button>`;
    };
    const chips = S.families.map((f, i) => `<button class="fam-chip" data-fam="${i}" aria-pressed="${i === lineageOpen.fam}"><span class="cd-sw" style="background:${Land.byId[f.district].color}"></span>${esc(f.surname)}</button>`).join('');
    return `<div class="fam-bar">${chips}</div>
      <div class="fam-head">
        <div><h2>The ${esc(fam.surname)} family</h2><p>${esc(fam.trade)}s of ${esc(home ? home.name : d.name)}, ${esc(d.name)} · founded in Year ${fam.founded} AC · ${st.generations} generations · ${st.living} living members · ${st.dual} Dual Classm${st.dual === 1 ? 'an' : 'en'}</p></div>
        <div class="tree-zoom"><button class="tl-btn small" data-tz="out" aria-label="Zoom out">−</button><button class="tl-btn small" data-tz="fit" aria-label="Fit the tree">⤢</button><button class="tl-btn small" data-tz="in" aria-label="Zoom in">+</button></div>
      </div>
      <div class="lv-body tree-scroll">
        <div class="tree-size" style="width:${(totalW + 40) * treeScale}px;height:${(H + 20) * treeScale}px">
          <div class="tree" style="width:${totalW + 40}px;height:${H + 20}px;transform:scale(${treeScale})">
            <svg class="tree-links" width="${totalW + 40}" height="${H + 20}"><g transform="translate(20,10)">${links.map(l => `<path d="${l}"/>`).join('')}</g></svg>
            <div class="tree-cards" style="transform:translate(20px,10px)">${nodes.map(card).join('')}</div>
          </div>
        </div>
      </div>
      <div class="tree-legend"><span class="pb dual">Dual Classman</span><span class="pb sails">Sailsman</span><span class="pb soldier">Navy</span><span class="pb drafted">Drafted</span><span class="leg-dead">Grey: died</span><span class="leg-inlaw">Dashed: married into the family</span></div>`;
  }

  function onLineageClick(e) {
    const b = e.target.closest('[data-lv],[data-fam],[data-tz],[data-person],[data-vessel]'); if (!b || !lineageOpen) return;
    if (b.dataset.lv === 'close') return closeLineage();
    if (b.dataset.lv) { lineageOpen.kind = b.dataset.lv; lineageOpen.fitNext = true; return renderLineage(); }
    if (b.dataset.fam) { lineageOpen.fam = +b.dataset.fam; lineageOpen.fitNext = true; return renderLineage(); }
    if (b.dataset.tz) {
      const sc = lineageEl.querySelector('.tree-scroll'), size = lineageEl.querySelector('.tree');
      if (b.dataset.tz === 'in') treeScale = Math.min(1.6, treeScale * 1.25);
      else if (b.dataset.tz === 'out') treeScale = Math.max(0.3, treeScale / 1.25);
      else treeScale = Math.max(0.3, Math.min(1, (sc.clientWidth - 10) / size.offsetWidth));
      return renderLineage();
    }
    if (b.dataset.person) {
      const fam = S.families[lineageOpen.fam], p = fam.people[b.dataset.person];
      const parent = p.parents.length ? fam.people[p.parents[0]] : null, sp = p.spouse ? fam.people[p.spouse] : null;
      const events = fam.log.filter(ev => ev.text.startsWith(`${p.first} ${p.surname}`));
      return App.showInfo({
        kicker: `The ${fam.surname} family`, title: `${p.first} ${p.surname}`, color: Land.byId[fam.district].color,
        subtitle: p.died !== null ? `${p.born}–${p.died} AC` : `Born ${p.born} AC · age ${S.ac - p.born}`,
        body: `<dl class="facts">
          <dt>Class</dt><dd>${p.dualSince ? `Dual Classman<small>Promoted in Year ${p.dualSince} AC${p.dualBy ? ` by ${esc(p.dualBy)}` : ''}</small>` : p.sailsman ? 'Sailsman' : (S.ac - p.born < 18 && p.died === null ? 'Child' : 'Classman')}</dd>
          ${p.trades.length ? `<dt>Trade${p.trades.length > 1 ? 's' : ''}</dt><dd>${esc(p.trades.join(' and '))}</dd>` : ''}
          ${sp ? `<dt>Married to</dt><dd>${esc(sp.first)} ${esc(sp.surname)}${p.married ? `<small>In Year ${p.married} AC</small>` : ''}</dd>` : ''}
          ${parent ? `<dt>Parents</dt><dd class="plain">${p.parents.map(id => esc(`${fam.people[id].first} ${fam.people[id].surname}`)).join(' and ')}</dd>` : ''}
          ${p.children.length ? `<dt>Children</dt><dd class="plain">${p.children.map(id => esc(fam.people[id].first)).join(', ')}</dd>` : ''}
          <dt>Home</dt><dd>${esc((Settlements.byId[fam.home] || {}).name || '')}<small>${esc(Land.byId[fam.district].name)}</small></dd>
        </dl>${events.length ? `<h4>Life events</h4><ul class="bullets">${events.map(ev => `<li>Year ${ev.ac} AC: ${esc(ev.text)}</li>`).join('')}</ul>` : ''}`,
      });
    }
    if (b.dataset.vessel) {
      const v = vessels()[+b.dataset.vessel];
      return App.showInfo({ kicker: `The ${ordinal(v.n)} vessel of Cilla`, title: v.name, subtitle: `Year ${v.from} – ${v.to ?? 'today'} AC`, body: `
        <dl class="facts"><dt>Chosen by</dt><dd>${v.n === 1 ? 'Cilla, in the cave on Mount Veston' : esc(v.chosenBy)}</dd>
        <dt>Before</dt><dd>${v.n === 1 ? 'The man in the cave' : v.advisor ? 'A Supreme Advisor' : 'A classman, chosen against custom'}</dd>
        ${v.origin ? `<dt>Name origin</dt><dd>${esc(v.origin)}</dd>` : ''}
        <dt>Years of rule</dt><dd>${(v.to ?? S.ac) - v.from}</dd></dl>${v.note ? `<p>${esc(v.note)}</p>` : ''}<p class="muted">Each vessel takes the title Cilla, and has no children.</p>` });
    }
  }

  // population over the simulated years: one series, hover for exact values
  let spark = null;
  function bindSpark(cv, tip) {
    spark = { cv, tip, hover: null };
    cv.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); spark.hover = e.clientX - r.left; drawSpark(); });
    cv.addEventListener('mouseleave', () => { spark.hover = null; drawSpark(); });
  }
  function drawSpark() {
    if (!spark || !spark.cv.isConnected) return;
    const { cv, tip } = spark, dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 74;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    const h = S.history, a0 = PRESENT, a1 = Math.max(PRESENT + 30, S.ac);
    const vals = h.map(p => p.total), lo = Math.min(...vals) * 0.98, hi = Math.max(...vals) * 1.02;
    const X = (ac) => 4 + (ac - a0) / (a1 - a0) * (W - 8), Y = (v) => H - 16 - (v - lo) / (hi - lo || 1) * (H - 24);
    // shaded periods of war and collapse, labelled
    const band = (key, color, text) => {
      let s = null;
      h.forEach((p, i) => {
        if (p[key] && s === null) s = p.ac;
        if ((!p[key] || i === h.length - 1) && s !== null) {
          const e = p[key] ? p.ac : p.ac - 1;
          g.fillStyle = color; g.fillRect(X(s), 0, Math.max(2, X(e) - X(s)), H - 14);
          g.fillStyle = '#c8d5e1'; g.font = '600 10px "Source Sans 3", sans-serif'; g.fillText(text, X(s) + 3, 10); s = null;
        }
      });
    };
    band('war', 'rgba(255,106,74,0.16)', 'War');
    band('collapse', 'rgba(242,201,76,0.14)', 'Collapse');
    g.strokeStyle = 'rgba(156,190,220,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, H - 14.5); g.lineTo(W, H - 14.5); g.stroke();
    g.fillStyle = '#8ea3b6'; g.font = '10.5px "Source Sans 3", sans-serif'; g.textAlign = 'left'; g.fillText(`${a0} AC`, 2, H - 2); g.textAlign = 'right'; g.fillText(`${a1} AC`, W - 2, H - 2); g.textAlign = 'left';
    g.strokeStyle = '#e29a63'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
    h.forEach((p, i) => i ? g.lineTo(X(p.ac), Y(p.total)) : g.moveTo(X(p.ac), Y(p.total))); g.stroke();
    const lastP = h[h.length - 1]; g.beginPath(); g.arc(X(lastP.ac), Y(lastP.total), 3.5, 0, Math.PI * 2); g.fillStyle = '#e29a63'; g.fill();
    if (spark.hover !== null) {
      const ac = Math.round(a0 + (spark.hover - 4) / (W - 8) * (a1 - a0)), p = h.find(q => q.ac === ac);
      if (p) {
        g.strokeStyle = 'rgba(233,239,245,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(ac) + 0.5, 0); g.lineTo(X(ac) + 0.5, H - 14); g.stroke();
        g.beginPath(); g.arc(X(ac), Y(p.total), 4, 0, Math.PI * 2); g.fillStyle = '#e29a63'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#0f1b29'; g.stroke();
        tip.hidden = false; tip.textContent = `Year ${ac} AC: ${fmt(p.total)}`;
        tip.style.left = `${Math.min(W - 130, Math.max(0, X(ac) - 60))}px`;
      } else tip.hidden = true;
    } else tip.hidden = true;
  }

  // ------------------------------------------------------------------ play
  function togglePlay() { playing ? pause() : play(); }
  function play() {
    if (S.ac >= LAST) reset();
    playing = true; lastT = performance.now(); acc = 0;
    cancelAnimationFrame(raf);
    const loop = (t) => {
      if (!playing) return;
      acc += (t - lastT) / 1000 * speed; lastT = t;
      let stepped = false;
      while (acc >= 1) { acc -= 1; if (!step()) { pause(); break; } stepped = true; }
      if (stepped) refresh();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    refresh();
  }
  function pause() { playing = false; cancelAnimationFrame(raf); if (document.getElementById('civPlay')) refresh(); }

  // ------------------------------------------------------------------ hover, click, panels
  function describe(x, y) {
    if (x < 0 || y < 0 || x > T.imageWidth || y > T.imageHeight) return null;
    const id = T.districtAt(x, y), d = id && Land.byId[id], i = T.cellIndex(x, y);
    if (!d) return { title: T.elev[i] <= 0 ? Land.seaNameAt(x, y) : 'Unclaimed land', lines: [Land.TYPES[Land.typeAt(i)]] };
    return { title: d.name, color: d.color, lines: [d.ruler ? `Ruler: ${d.ruler.name}` : (d.rulerNote || ''), `${fmt(total(id))} people`, Land.TYPES[Land.typeAt(i)]].filter(Boolean) };
  }
  function hit(sx, sy) {
    let best = null, bd = Infinity;
    for (const h of hitTargets) { const dd = Math.hypot(h.sx - sx, h.sy - sy); if (dd <= h.r + 4 && dd < bd) { bd = dd; best = h; } }
    return best;
  }
  function click({ sx, sy, x, y }) {
    const h = hit(sx, sy);
    if (h) return App.showPlace(h.item);
    const id = T.districtAt(x, y);
    if (id) App.showDistrict(id);
  }

  function districtExtra(d) {
    const n = total(d.id), change = d.population ? n / d.population - 1 : 0;
    const advisors = S.advisors.filter(a => place(a.seat) && place(a.seat).district === d.id);
    return `
      <h4>Year ${S.ac} AC</h4>
      <dl class="facts">
        <dt>Population now</dt><dd>${fmt(n)}${S.ac !== PRESENT && d.population ? `<small>${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}% since Year ${PRESENT}</small>` : ''}</dd>
        ${d.id === 'capital' ? `<dt>Supreme Leader</dt><dd>${esc(S.leader.name)}<small>Vessel of Cilla since Year ${S.leader.since} AC</small></dd>` : ''}
        ${advisors.length ? `<dt>Supreme Advisors</dt><dd class="plain">${advisors.map(a => esc(a.name)).join(', ')}</dd>` : ''}
      </dl>
      ${n ? `<h4>Social classes</h4>${classTable(districtClasses(d.id), n)}` : ''}`;
  }
  function placeExtra(p) {
    if (typeof p.population !== 'number' || !S.pop[p.id]) return '';
    const away = S.draftFrom[p.id];
    return `<h4>Social classes, Year ${S.ac} AC</h4>${classTable(classesOf(p), S.pop[p.id])}${away ? `<p class="muted">Another ${fmt(away)} people from here are away, drafted into the war.</p>` : ''}`;
  }

  reset();

  return {
    id: 'civitas', name: 'Civitas',
    get background() { return Views.terra.background; },
    activate() { refresh(); },
    deactivate() { pause(); closeLineage(); },
    animating: () => pulses.length > 0 || S.war || S.blockade || (state.economy && !Prefs.reduceMotion),
    setLayer(k, on) { state[k] = on; const inp = document.querySelector(`#sidebar input[data-k="${k}"]`); if (inp) inp.checked = on; refresh(); },
    drawWorld, drawScreen, describe, click, buildSidebar, districtExtra, placeExtra,
    livePop: (p) => S.pop[p.id] ?? p.population,
    hitTest: (sx, sy) => !!hit(sx, sy),
    // for later phases (social pyramid, succession, Presentation Mode)
    get sim() { return S; }, classesOf, districtClasses, play, pause, step: () => { step(); refresh(); }, reset: () => { reset(); refresh(); },
    togglePlay, stepKey: (d) => { if (d > 0) { pause(); step(); refresh(); } },
    openLineage, closeLineage,
  };
})();
