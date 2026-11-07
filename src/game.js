(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PER_STATION = 5;
  const TINTS = ['#d8413d', '#2f7fd6', '#e89a1c', '#2f9a66', '#8b58cf', '#d9578f'];
  const STORE_KEY = 'choo-choo-train';
  const EXPERT = Puzzles.EXPERT_LEVEL;
  const DIFFICULTY = { easy: 1, medium: 7, hard: 13, veryHard: EXPERT };
  const key = Puzzles.key;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  // Dev aids: ?level=12 &type=matrix &seed=7. These sessions never touch saved progress.
  const forcedLevel = Number(params.get('level')) || null;
  const forcedType = params.get('type');
  const forcedSeed = params.has('seed') ? Puzzles.seeded(Number(params.get('seed'))) : null;
  const sandbox = Boolean(forcedLevel || forcedType || forcedSeed);

  // ---- saved progress ----
  const state = { lang: 'lv', muted: false, rating: 1, solved: 0 };

  function load() {
    if (sandbox) return;
    try {
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY)));
    } catch { /* storage unavailable or corrupt: start fresh */ }
  }

  function save() {
    if (sandbox) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch { /* storage unavailable: progress just won't persist */ }
  }

  // ---- text ----
  const text = () => STRINGS[state.lang];
  const inlineGlyph = (g) => `<span class="inl">${Art.svg(g)}</span>`;
  const fmt = (s, p = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (p[k] && p[k].k ? inlineGlyph(p[k]) : p[k]));
  const stationIndex = () => Math.floor(state.solved / PER_STATION);
  const stationName = (i) => {
    const names = text().stations;
    return names[i % names.length];
  };

  function clueHtml(c) {
    if (c.guess) {
      const pegs = '●'.repeat(c.hits) + '○'.repeat(c.near);
      const label = fmt(text().pegs, { hits: c.hits, near: c.near });
      return `${c.guess.map((g) => inlineGlyph(g)).join('')}<span class="pegs" role="img" aria-label="${label}">${pegs}</span>`;
    }
    if (c.eq) {
      const [a, op, b, total] = c.eq;
      return `${inlineGlyph(a)} ${op} ${inlineGlyph(b)} = ${total}`;
    }
    return fmt(text().clues[c.id], c);
  }

  // ---- current puzzle ----
  let run = null; // { puzzle, slots, items, selected, mistakes, hintStage, notice }
  let trains = [];
  let busy = true;
  let playing = false;
  let blindExplained = false;
  const recent = [];

  const canPlay = () => run && !busy;

  // ---- building the trains ----
  function carHtml(car, index, tall, numbered) {
    const classes = ['car'];
    if (!tall) classes.push('plain');
    if (numbered) classes.push('numbered');
    const tint = car.tint ? Art.COLOR[car.tint] : TINTS[index % TINTS.length];
    const plate = car.label ? `<div class="plate">${Art.svg(car.label)}</div>` : '';
    const number = numbered ? `<span class="num">${index + 1}</span>` : '';
    const cargo = car.cargo
      ? `<div class="tile fixed">${Art.svg(car.cargo)}</div>`
      : `<button class="slot" type="button" aria-label="${fmt(text().carriage, { n: index + 1 })}">?</button>`;
    return `<div class="${classes.join(' ')}" style="--tint:${tint}">
      <div class="cargo">${cargo}</div>
      <div class="car-body">${plate}${number}</div>
      <div class="bogie">${Art.WHEEL}${Art.WHEEL}</div>
      <i class="coupler"></i></div>`;
  }

  function buildTrains(puzzle) {
    const numbered = Boolean(puzzle.numbered);
    $('tracks').innerHTML = puzzle.tracks.map((cars) => {
      const tall = cars.some((c) => c.label);
      return `<div class="track"><div class="train ${tall ? '' : 'compact'}">
        ${cars.map((c, i) => carHtml(c, i, tall, numbered)).join('')}
        <div class="loco">${Art.locomotive()}</div>
      </div><div class="rail"></div></div>`;
    }).join('');

    trains = [...document.querySelectorAll('.train')].map((el) => ({
      el,
      cars: [...el.querySelectorAll('.car')],
      spins: [...el.querySelectorAll('.spin')],
      driveWheels: [...el.querySelectorAll('.lw')],
      rod: el.querySelector('.rod'),
      stack: el.querySelector('.stack'),
      art: el.querySelector('.loco-art'),
      x: 0,
      move: null,
      puffs: 0,
      nextIdlePuff: performance.now() + 500 + Math.random() * 900,
    }));
  }

  function buildItems(puzzle) {
    const platform = $('platform');
    platform.innerHTML = '';
    return puzzle.items.map((glyph, i) => {
      const spot = document.createElement('div');
      spot.className = 'spot';
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.innerHTML = Art.svg(glyph);
      tile.setAttribute('aria-label', fmt(text().item, { n: i + 1 }));
      tile.style.visibility = 'hidden';
      spot.append(tile);
      platform.append(spot);
      const item = { glyph, key: key(glyph), tile, spot, slot: null, placed: false };
      attachTile(item);
      return item;
    });
  }

  function linkSlots(puzzle) {
    const cars = puzzle.tracks.flat();
    const carEls = [...document.querySelectorAll('.car')];
    const slots = [];
    cars.forEach((car, i) => {
      if (!car.accepts) return;
      const slot = {
        car: carEls[i],
        el: carEls[i].querySelector('.slot'),
        accepts: car.accepts,
        filled: false,
        item: null,
      };
      slot.car.addEventListener('click', () => {
        if (canPlay() && run.selected && !slot.filled) tryPlace(run.selected, slot);
      });
      slots.push(slot);
    });
    return slots;
  }

  // ---- layout ----
  // Picks the carriage size (--u) that fits the trains and items into the window, and moves
  // the items beside the trains when that gives a clearly bigger picture.
  function fit() {
    const puzzle = run ? run.puzzle : DEMO;
    const W = window.innerWidth;
    const H = window.innerHeight - $('hud').offsetHeight - $('board').offsetHeight - 22;
    const t = puzzle.tracks.length;
    const n = Math.max(...puzzle.tracks.map((c) => c.length));
    const tall = puzzle.tracks[0].some((c) => c.label);
    const trackUnits = (tall ? 1.66 : puzzle.numbered ? 1.36 : 1.26) * t;
    const widthUnits = n * 1.06 + (tall ? 1.66 : 1.5) + 0.25;
    const m = puzzle.items.length;
    const MAX = 140;

    const stacked = Math.min(W / widthUnits, H / (trackUnits + (m ? 1.1 : 0.2)), MAX);
    const cols = m > 3 ? 2 : 1;
    const rows = Math.ceil(m / cols);
    const beside = Math.min(W / (widthUnits + cols * 1.04 + 0.3), H / trackUnits, H / (rows * 1.04 + 0.2), MAX);
    const side = m > 0 && beside > stacked * 1.15;

    const u = side ? beside : stacked;
    // When the trains are limited by width (phones held upright), spare height lets the
    // items on the platform grow, which makes them easier to grab.
    const spare = H - trackUnits * u - 0.3 * u;
    const iu = side ? u * 0.84 : Math.min(Math.max(u * 0.84, 92), spare, (W - 24) / (m * 1.17 || 1));
    const root = document.documentElement.style;
    root.setProperty('--u', `${u.toFixed(1)}px`);
    root.setProperty('--iu', `${iu.toFixed(1)}px`);
    root.setProperty('--cols', cols);
    $('app').classList.toggle('side', side);
    const edge = side ? $('tracks') : $('platform');
    root.setProperty('--horizon', `${Math.round(window.innerHeight - edge.getBoundingClientRect().top)}px`);
  }

  // ---- input ----
  function attachTile(item) {
    const { tile } = item;
    let drag = null;
    let skipClick = false;

    tile.addEventListener('pointerdown', (e) => {
      skipClick = false;
      if (!canPlay() || item.placed || e.button) return;
      drag = { x: e.clientX, y: e.clientY, moved: false, over: null };
      tile.setPointerCapture(e.pointerId);
    });

    tile.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 7) return;
      if (!drag.moved) {
        drag.moved = true;
        tile.classList.add('dragging');
        Sound.pick();
        select(null);
      }
      tile.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      const over = slotAt(e.clientX, e.clientY);
      if (over !== drag.over) {
        if (drag.over) drag.over.el.classList.remove('over');
        if (over) over.el.classList.add('over');
        drag.over = over;
      }
    });

    const finish = (e) => {
      if (!drag) return;
      const { moved, over } = drag;
      drag = null;
      if (!moved) return;
      skipClick = true;
      tile.classList.remove('dragging');
      if (over) over.el.classList.remove('over');
      if (e.type === 'pointerup' && over && canPlay()) tryPlace(item, over);
      else returnTile(tile);
    };
    tile.addEventListener('pointerup', finish);
    tile.addEventListener('pointercancel', finish);

    // A plain tap or Enter/Space lands here: pick the item up, then choose a carriage.
    tile.addEventListener('click', () => {
      if (skipClick) {
        skipClick = false;
        return;
      }
      if (!canPlay()) return;
      if (item.placed) {
        if (run.puzzle.blind) unload(item);
        return;
      }
      select(run.selected === item ? null : item);
      if (run.selected) Sound.pick();
    });
  }

  function select(item) {
    if (!run) return;
    if (run.selected) run.selected.tile.classList.remove('selected');
    run.selected = item;
    if (item) item.tile.classList.add('selected');
    $('tracks').classList.toggle('waiting', Boolean(item));
  }

  function slotAt(x, y) {
    const pad = 10;
    let best = null;
    let bestDistance = Infinity;
    for (const slot of run.slots) {
      if (slot.filled) continue;
      const r = slot.car.getBoundingClientRect();
      if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) continue;
      const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
      if (d < bestDistance) {
        best = slot;
        bestDistance = d;
      }
    }
    return best;
  }

  function returnTile(tile) {
    const from = tile.style.transform;
    tile.style.transform = '';
    if (from) tile.animate([{ transform: from }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
  }

  function clearHintMarks() {
    document.querySelectorAll('.hint-me').forEach((el) => el.classList.remove('hint-me'));
  }

  const fits = (slot) => slot.filled && slot.accepts.includes(slot.item.key);

  function tryPlace(item, slot) {
    if (run.puzzle.blind || slot.accepts.includes(item.key)) place(item, slot);
    else reject(item, slot);
  }

  function place(item, slot) {
    const { tile } = item;
    const from = tile.getBoundingClientRect();
    tile.style.transform = '';
    select(null);
    clearHintMarks();
    item.placed = true;
    item.slot = slot;
    slot.filled = true;
    slot.item = item;
    if (run.notice === 'wrongLoad') {
      run.notice = null;
      showHint();
    }
    const cargo = slot.el.parentElement;
    cargo.replaceChildren(tile);
    tile.classList.add('loaded');
    if (!run.puzzle.blind) tile.tabIndex = -1;
    const to = tile.getBoundingClientRect();
    tile.animate([
      { transformOrigin: '0 0', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` },
      { transformOrigin: '0 0', transform: 'none' },
    ], { duration: 230, easing: 'cubic-bezier(.2,.8,.3,1)' });
    if (!REDUCED) {
      slot.car.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(5px)', offset: 0.55 },
        { transform: 'translateY(0)' },
      ], { duration: 300, delay: 150 });
    }
    Sound.place();
    sparks(to.left + to.width / 2, to.top + to.height / 2);
    if (run.slots.every(fits)) solved();
    else if (run.slots.every((s) => s.filled)) wrongLoad();
  }

  // Takes a loaded item back to its place on the platform. Only blind puzzles allow this.
  function unload(item) {
    const { tile, slot } = item;
    const from = tile.getBoundingClientRect();
    tile.parentElement.replaceChildren(slot.el);
    item.spot.append(tile);
    tile.classList.remove('loaded');
    tile.tabIndex = 0;
    item.placed = false;
    item.slot = null;
    slot.filled = false;
    slot.item = null;
    const to = tile.getBoundingClientRect();
    tile.animate([
      { transformOrigin: '0 0', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` },
      { transformOrigin: '0 0', transform: 'none' },
    ], { duration: 230, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }

  // A blind train that fails its check gives nothing away: everything comes off, right or not.
  async function wrongLoad() {
    busy = true;
    run.mistakes += 1;
    Sound.wrong();
    if (!REDUCED) {
      run.slots.forEach((s) => s.car.animate(
        [0, -7, 7, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 340, delay: 200 }));
    }
    await wait(700);
    run.items.filter((i) => i.placed).forEach(unload);
    run.notice = 'wrongLoad';
    showHint();
    if (run.mistakes >= 2) $('btn-hint').classList.add('nudge');
    busy = false;
  }

  function reject(item, slot) {
    run.mistakes += 1;
    Sound.wrong();
    select(null);
    returnTile(item.tile);
    if (!REDUCED) {
      slot.car.animate([0, -7, 7, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 340 });
    }
    if (run.mistakes >= 2) $('btn-hint').classList.add('nudge');
  }

  // First press explains the rule, later presses point at one correct move.
  function useHint() {
    if (!canPlay()) return;
    $('btn-hint').classList.remove('nudge');
    run.hintStage = Math.min(run.hintStage + 1, 2);
    showHint();
    if (run.hintStage === 2) {
      clearHintMarks();
      // On a blind train the item or the carriage may be tied up by a wrong move, so free them.
      const slot = run.slots.find((s) => !fits(s));
      if (slot.filled) unload(slot.item);
      const item = run.items.find((i) => slot.accepts.includes(i.key));
      if (item.placed) unload(item);
      slot.el.classList.add('hint-me');
      item.tile.classList.add('hint-me');
    }
  }

  function showHint() {
    const [id, p, extra] = run.puzzle.hint;
    const lines = [];
    if (run.notice) lines.push(text()[run.notice]);
    if (run.hintStage) lines.push(fmt(text().hints[id], p));
    if (run.hintStage && extra) lines.push(text().hints[extra]);
    $('hint').innerHTML = lines.join(' ');
    fit();
  }

  // ---- progress ----
  function ratingChange() {
    if (run.puzzle.blind) {
      if (run.hintStage >= 2) return -0.3;
      if (run.hintStage === 1) return 0;
      return [0.5, 0.1][run.mistakes] ?? -0.3;
    }
    if (run.hintStage >= 2) return 0;
    if (run.hintStage === 1) return 0.2;
    return [0.5, 0.3, 0.1][run.mistakes] ?? -0.25;
  }

  async function solved() {
    busy = true;
    // The rating stays in its tier, so a child on a good run never drifts into adult puzzles.
    const adult = state.rating >= EXPERT;
    const lowest = adult ? EXPERT : 1;
    const highest = adult ? Puzzles.MAX_LEVEL + 0.9 : EXPERT - 0.1;
    state.rating = Math.max(lowest, Math.min(highest, state.rating + ratingChange()));
    state.solved += 1;
    save();
    updateHud();
    $('btn-hint').classList.remove('nudge');
    run.items.filter((i) => !i.placed).forEach((i) => i.tile.classList.add('left-behind'));
    await wait(420);
    await depart();
    if (state.solved % PER_STATION === 0) await reachStation();
    nextPuzzle();
  }

  async function reachStation() {
    const i = stationIndex();
    applyTheme(i);
    const banner = $('banner');
    banner.innerHTML = `<small>${text().nextStation}</small>${stationName(i)}`;
    banner.classList.add('show');
    Sound.fanfare();
    await wait(1700);
    banner.classList.remove('show');
    await wait(250);
  }

  async function nextPuzzle() {
    busy = true;
    const puzzle = Puzzles.generate(forcedLevel || state.rating, {
      recent,
      type: forcedType,
      rnd: forcedSeed || Math.random,
    });
    recent.push(puzzle.type);
    if (recent.length > 3) recent.shift();

    run = { puzzle, slots: [], items: [], selected: null, mistakes: 0, hintStage: 0, notice: null };
    if (puzzle.blind && !blindExplained) {
      blindExplained = true;
      run.notice = 'blindRule';
    }
    buildTrains(puzzle);
    $('tracks').classList.toggle('blind', Boolean(puzzle.blind));
    run.items = buildItems(puzzle);
    run.slots = linkSlots(puzzle);
    showBoard();
    fit();
    await arrive();
    run.items.forEach((item, i) => {
      item.tile.style.visibility = '';
      if (!REDUCED) {
        item.tile.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 240, delay: i * 70, fill: 'backwards', easing: 'cubic-bezier(.3,1.5,.5,1)' });
      }
    });
    busy = false;
  }

  function showBoard() {
    const { puzzle } = run;
    $('prompt').textContent = text().prompts[puzzle.prompt[0]];
    $('clues').innerHTML = (puzzle.clues || []).map((c) => `<li>${clueHtml(c)}</li>`).join('');
    showHint();
  }

  function updateHud() {
    $('station-name').textContent = stationName(stationIndex());
    const lit = state.solved % PER_STATION;
    $('lamps').innerHTML = Array.from({ length: PER_STATION }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('');
    $('score').innerHTML = `${Art.STAR}<span>${state.solved}</span>`;
  }

  // ---- train motion ----
  function moveTrains(mode, duration) {
    const T = REDUCED ? duration * 0.45 : duration;
    return Promise.all(trains.map((train, i) => new Promise((done) => {
      const width = train.el.offsetWidth;
      train.move = {
        mode,
        start: performance.now() + i * 110,
        T,
        D: (window.innerWidth + width) / 2 + 60,
        done,
      };
    })));
  }

  async function depart() {
    Sound.whistle();
    trains.forEach(steamBurst);
    await wait(REDUCED ? 300 : 700);
    await moveTrains('leave', 2700);
  }

  async function arrive() {
    trains.forEach((t) => { t.x = -window.innerWidth * 2; applyTrain(t, 0); });
    await moveTrains('arrive', 1900);
    Sound.hiss();
    Sound.bell();
    trains.forEach(steamBurst);
  }

  function applyTrain(train, speed) {
    train.el.style.transform = `translateX(${train.x.toFixed(1)}px)`;
    const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 100;
    const carTurn = (train.x / (u * 0.1)) * 57.3;
    for (const spin of train.spins) spin.setAttribute('transform', `rotate(${carTurn.toFixed(1)} 50 50)`);

    const k = train.art.getBoundingClientRect().width / 216;
    for (const w of train.driveWheels) {
      const turn = (train.x / (Number(w.dataset.r) * k)) * 57.3;
      const parts = w.querySelector('path');
      parts.setAttribute('transform', `rotate(${turn.toFixed(1)} ${w.dataset.cx} ${w.dataset.cy})`);
    }
    const crank = train.x / (30 * k);
    train.rod.setAttribute('transform', `translate(${(9 * Math.cos(crank)).toFixed(1)} ${(7 * Math.sin(crank)).toFixed(1)})`);

    if (!REDUCED) {
      const bob = Math.min(speed / 500, 1) * 1.6;
      train.cars.forEach((car, i) => {
        car.style.transform = bob ? `translateY(${(Math.sin(train.x * 0.03 + i * 1.7) * bob).toFixed(1)}px)` : '';
      });
    }
  }

  function updateTrain(train, now, dt, index) {
    const m = train.move;
    if (m && now >= m.start) {
      const p = Math.min((now - m.start) / m.T, 1);
      const before = train.x;
      train.x = m.mode === 'leave' ? m.D * p ** 2.6 : -m.D * (1 - p) ** 2.6;
      const speed = Math.abs(train.x - before) / Math.max(dt, 0.001);
      applyTrain(train, p === 1 ? 0 : speed);

      // One chuff and one puff of smoke per half turn of the big wheel, so sound, smoke and
      // wheels stay in step as the train speeds up.
      const k = train.art.getBoundingClientRect().width / 216;
      const halfTurns = Math.floor(Math.abs(train.x) / (Math.PI * 30 * k));
      if (halfTurns !== train.puffs) {
        train.puffs = halfTurns;
        const strength = Math.min(speed / 900, 1);
        if (index === 0) Sound.chuff(m.mode === 'leave' ? 0.35 + 0.65 * strength : 0.15 + 0.4 * strength);
        puff(train, 1 + strength * 0.5);
      }
      if (p === 1) {
        train.move = null;
        m.done();
      }
    } else if (!m && now > train.nextIdlePuff) {
      train.nextIdlePuff = now + 1100 + Math.random() * 900;
      puff(train, 0.55);
    }
  }

  // ---- smoke and sparks ----
  const canvas = $('smoke');
  const ctx = canvas.getContext('2d');
  const particles = [];
  const puffSprite = makeSprite('rgba(246,246,250,.92)', 'rgba(205,209,218,.6)');

  function makeSprite(core, mid) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, core);
    grad.addColorStop(0.6, mid);
    grad.addColorStop(1, 'rgba(190,195,205,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addParticle(p) {
    if (particles.length > 260) particles.shift();
    particles.push(Object.assign({ age: 0 }, p));
  }

  function puff(train, scale) {
    const r = train.stack.getBoundingClientRect();
    if (r.right < -40 || r.left > window.innerWidth + 40) return;
    const size = r.width * 0.42 * scale;
    addParticle({
      kind: 'smoke',
      x: r.left + r.width * (0.3 + Math.random() * 0.4),
      y: r.top,
      vx: -14 - Math.random() * 22,
      vy: -(58 + Math.random() * 36) * Math.max(scale, 0.7),
      size,
      grow: size * 1.7,
      life: 1.5 + Math.random() * 0.9,
      alpha: 0.9,
    });
  }

  // Steam jets from beside the wheels, plus a tall plume for the whistle.
  function steamBurst(train) {
    const r = train.art.getBoundingClientRect();
    if (r.right < 0 || r.left > window.innerWidth) return;
    for (let i = 0; i < 14; i++) {
      addParticle({
        kind: 'smoke',
        x: r.left + r.width * (0.25 + Math.random() * 0.5),
        y: r.bottom - 4,
        vx: (Math.random() - 0.5) * 240,
        vy: -18 - Math.random() * 46,
        size: r.width * 0.09,
        grow: r.width * 0.26,
        life: 0.7 + Math.random() * 0.5,
        alpha: 0.75,
      });
    }
    for (let i = 0; i < 7; i++) setTimeout(() => puff(train, 1.2), i * 90);
  }

  function sparks(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 170;
      addParticle({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        size: 3 + Math.random() * 4,
        life: 0.45 + Math.random() * 0.3,
      });
    }
  }

  function drawParticles(dt) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') {
        p.vy += 420 * dt;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = i % 2 ? '#ffcf5c' : '#fff3c4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, 7);
        ctx.fill();
      } else {
        p.vx *= 1 - 0.9 * dt;
        p.vy *= 1 - 0.55 * dt;
        const d = (p.size + p.grow * t) * 2;
        ctx.globalAlpha = p.alpha * (1 - t) ** 1.4;
        ctx.drawImage(puffSprite, p.x - d / 2, p.y - d / 2, d, d);
      }
    }
    ctx.globalAlpha = 1;
  }

  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    trains.forEach((train, i) => updateTrain(train, now, dt, i));
    drawParticles(dt);
    requestAnimationFrame(frame);
  }

  // ---- scenery ----
  function applyTheme(i) {
    const theme = Art.THEMES[i % Art.THEMES.length];
    const root = document.documentElement.style;
    root.setProperty('--ground', theme.ground);
    root.setProperty('--platform', theme.platform);
    document.body.style.background = theme.sky[0];
    const holder = $('scene');
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.style.opacity = holder.children.length ? 0 : 1;
    layer.innerHTML = Art.scene(i);
    holder.append(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => { layer.style.opacity = 1; }));
    while (holder.children.length > 2) holder.firstElementChild.remove();
  }

  // ---- title, menu and language ----
  // The title screen shows the brief's own example as a finished train.
  const DEMO = {
    numbered: false,
    items: [],
    tracks: [[
      { label: { k: 'text', v: 'C' }, cargo: { k: 'text', v: 'A' } },
      { label: { k: 'icon', id: 'lemon' }, cargo: { k: 'icon', id: 'cherries' } },
      { label: { k: 'text', v: '6' }, cargo: { k: 'text', v: '3' } },
    ]],
  };

  function refreshText() {
    const s = text();
    document.documentElement.lang = state.lang;
    document.title = s.title;
    $('title-text').textContent = s.title;
    $('tagline').textContent = s.tagline;
    $('btn-play').textContent = state.solved ? s.continue : s.play;
    $('btn-hint').setAttribute('aria-label', s.hintBtn);
    $('btn-hint').title = s.hintBtn;
    $('btn-menu').setAttribute('aria-label', s.menu);
    $('btn-menu').title = s.menu;
    $('menu-title').textContent = s.menu;
    $('menu-lang-label').textContent = s.language;
    $('menu-sound-label').textContent = s.sound;
    $('menu-diff-label').textContent = s.difficulty;
    $('menu-restart').textContent = s.restart;
    $('menu-close').textContent = s.close;
    refreshSound();
    refreshDifficulty();
    document.querySelectorAll('.lang-switch').forEach(renderLangSwitch);
    updateHud();
    if (run) {
      showBoard();
      run.items.forEach((item, i) => item.tile.setAttribute('aria-label', fmt(s.item, { n: i + 1 })));
    }
  }

  function renderLangSwitch(holder) {
    holder.innerHTML = [['lv', 'Latviešu'], ['en', 'English']].map(([id, name]) => (
      `<button class="chip" type="button" data-lang="${id}" aria-pressed="${id === state.lang}">${name}</button>`)).join('');
  }

  function refreshSound() {
    const s = text();
    const label = state.muted ? s.soundOff : s.soundOn;
    const button = $('btn-sound');
    button.innerHTML = state.muted ? Art.UI.soundOff : Art.UI.soundOn;
    button.setAttribute('aria-label', label);
    button.title = label;
    $('menu-sound').textContent = state.muted ? s.off : s.on;
    $('menu-sound').setAttribute('aria-pressed', String(!state.muted));
    Sound.setMuted(state.muted);
  }

  function refreshDifficulty() {
    const s = text();
    const current = Object.keys(DIFFICULTY).filter((id) => state.rating >= DIFFICULTY[id]).pop();
    $('menu-diff').innerHTML = Object.keys(DIFFICULTY).map((id) => (
      `<button class="chip" type="button" data-diff="${id}" aria-pressed="${id === current}">${s[id]}</button>`)).join('');
  }

  function toggleSound() {
    Sound.unlock();
    state.muted = !state.muted;
    save();
    refreshSound();
  }

  // Sends the waiting train off without scoring it, for when the settings change mid-puzzle.
  async function replacePuzzle() {
    if (!canPlay()) return;
    busy = true;
    select(null);
    run.items.forEach((i) => { if (!i.placed) i.tile.style.visibility = 'hidden'; });
    await depart();
    nextPuzzle();
  }

  async function start() {
    if (playing) return;
    playing = true;
    Sound.unlock();
    const title = $('title');
    title.classList.add('gone');
    document.body.classList.remove('titled');
    await depart();
    title.hidden = true;
    nextPuzzle();
  }

  let restartArmed = false;
  function disarmRestart() {
    restartArmed = false;
    $('menu-restart').textContent = text().restart;
  }

  function bindUi() {
    $('btn-hint').innerHTML = Art.UI.hint;
    $('btn-menu').innerHTML = Art.UI.menu;
    $('btn-play').addEventListener('click', start);
    $('btn-hint').addEventListener('click', useHint);
    $('btn-sound').addEventListener('click', toggleSound);
    $('menu-sound').addEventListener('click', toggleSound);
    $('btn-menu').addEventListener('click', () => {
      refreshDifficulty();
      $('menu').showModal();
    });
    $('menu-close').addEventListener('click', () => $('menu').close());
    // Two presses rather than confirm(), which embedded pages may not be allowed to show.
    $('menu').addEventListener('close', disarmRestart);
    $('menu-restart').addEventListener('click', () => {
      if (!restartArmed) {
        restartArmed = true;
        $('menu-restart').textContent = text().restartSure;
        return;
      }
      disarmRestart();
      state.rating = 1;
      state.solved = 0;
      save();
      applyTheme(0);
      refreshText();
      $('menu').close();
      replacePuzzle();
    });
    $('menu-diff').addEventListener('click', (e) => {
      const id = e.target.dataset.diff;
      if (!id) return;
      state.rating = DIFFICULTY[id];
      save();
      refreshDifficulty();
      $('menu').close();
      replacePuzzle();
    });
    document.addEventListener('click', (e) => {
      const lang = e.target.dataset && e.target.dataset.lang;
      if (!lang || lang === state.lang) return;
      state.lang = lang;
      save();
      refreshText();
      fit();
    });
    window.addEventListener('resize', () => {
      resizeCanvas();
      fit();
    });
  }

  function init() {
    load();
    $('defs').innerHTML = Art.defs();
    bindUi();
    resizeCanvas();
    applyTheme(stationIndex());
    document.body.classList.add('titled');
    buildTrains(DEMO);
    refreshText();
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    requestAnimationFrame(frame);
    if (params.has('dev')) {
      window.__choo = {
        state,
        start,
        get run() { return run; },
        get busy() { return busy; },
        solveOne() {
          const slot = run.slots.find((s) => !s.filled);
          place(run.items.find((i) => !i.placed && slot.accepts.includes(i.key)), slot);
        },
        load(itemIndex, slotIndex) {
          tryPlace(run.items[itemIndex], run.slots[slotIndex]);
        },
      };
    }
  }

  init();
})();
