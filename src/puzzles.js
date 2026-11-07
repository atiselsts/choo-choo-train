// Puzzle generators. Pure logic with no DOM, so tools/check-puzzles.js can run it in Node.
//
// A glyph is a plain object describing a picture (see art.js). Two glyphs are "the same"
// when key(a) === key(b).
//
// A puzzle looks like:
//   { type, prompt:[id,params], hint:[id,params], items:[glyph], clues?:[...], numbered?:bool,
//     compact?:bool, tracks:[[car,...],...] }
// A car has an optional `label` (shown on its side), an optional `cargo` (already loaded),
// and, when the player must fill it, `accepts`: the keys of the items that may go there.
// A `blind` puzzle gives no feedback per item: the train is only checked once it is full.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Puzzles = api;
})(this, function () {
  'use strict';

  const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon', 'cross'];
  const FRUIT = ['apple', 'cherries', 'lemon', 'pear', 'banana', 'strawberry', 'grapes'];
  const ANIMALS = ['cat', 'rabbit', 'bear', 'frog', 'pig', 'fish', 'bird'];
  const VEHICLES = ['car', 'boat', 'plane', 'rocket', 'balloon'];
  const PLANTS = ['tree', 'flower', 'mushroom', 'cactus'];
  const PASSENGERS = ['cat', 'rabbit', 'bear', 'frog', 'pig'];
  const SILHOUETTES = ['apple', 'banana', 'cherries', 'rabbit', 'cat', 'fish', 'bird', 'boat',
    'plane', 'rocket', 'tree', 'mushroom', 'car', 'cactus', 'flower'];
  // No O/I (they look like 0/1); only letters shared by the Latvian and English alphabets.
  const LETTERS = 'ABCDEFGHKLMNPRSTUVZ'.split('');
  // Letters whose capital and small forms really look different.
  const CASE_LETTERS = 'ABDEGHNRT'.split('');
  // The outer ring of a 3x3 grid, clockwise from the top left.
  const RING = [0, 1, 2, 5, 8, 7, 6, 3];
  // Levels 1-20 are for children. Very hard (for adults) is a separate tier above them: the
  // rating never crosses between the two by itself.
  const EXPERT_LEVEL = 21;
  const HARDER_LEVEL = 25; // where the second, tougher half of the adult tier starts
  const MAX_LEVEL = 30;

  // ---- glyph constructors ----
  const T = (v) => ({ k: 'text', v: String(v) });
  const I = (id, shadow) => (shadow ? { k: 'icon', id, shadow: true } : { k: 'icon', id });
  const S = (shape, color, o) => Object.assign(
    { k: 'shape', shape, color, fill: 'solid', size: 1, rot: 0, n: 1 }, o);
  const C = (n, id) => ({ k: 'count', n, id });
  const G = (cells, color) => ({ k: 'grid', cells: cells.slice().sort((a, b) => a - b), color });
  const K = (h, m) => ({ k: 'clock', h, m });
  const P = (sides, color) => ({ k: 'poly', sides, color });

  function key(g) {
    return JSON.stringify(Object.keys(g).sort().map((k) => [k, g[k]]));
  }

  // ---- randomness ----
  function makeRng(rnd) {
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    return {
      int,
      shuffle,
      pick: (arr) => arr[int(0, arr.length - 1)],
      sample: (arr, n) => shuffle(arr).slice(0, n),
      chance: (p) => rnd() < p,
    };
  }

  function seeded(seed) {
    let a = seed >>> 0;
    return function () { // mulberry32
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- car and puzzle helpers ----
  const given = (g) => ({ cargo: g });
  const blank = (g) => ({ accepts: [key(g)] });
  const labelled = (label, answer) => ({ label, accepts: [key(answer)] });

  function make(r, type, prompt, hint, tracks, items, extra) {
    return Object.assign({ type, prompt, hint, tracks, items: r.shuffle(items) }, extra);
  }

  // Adds candidates to `items` (skipping repeats) until it holds `total` glyphs.
  function fill(items, candidates, total) {
    const seen = new Set(items.map(key));
    const out = items.slice();
    for (const c of candidates) {
      if (out.length >= total) break;
      if (!seen.has(key(c))) {
        seen.add(key(c));
        out.push(c);
      }
    }
    return out;
  }

  function range(a, b) {
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  const categories = (r) => ({
    letters: LETTERS.map(T),
    numbers: range(2, 9).map(T),
    fruit: FRUIT.map((id) => I(id)),
    animals: ANIMALS.map((id) => I(id)),
    vehicles: VEHICLES.map((id) => I(id)),
    plants: PLANTS.map((id) => I(id)),
    shapes: SHAPES.map((s) => S(s, r.pick(COLORS))),
  });

  // ---- matching puzzles ----
  function genSort(L, r) {
    const n = L < 4 ? 3 : L < 6 ? 4 : r.pick([4, 5]);
    const cats = categories(r);
    const pairs = r.sample(Object.keys(cats), n).map((c) => r.sample(cats[c], 2));
    return make(r, 'sort', ['sort'], ['sort'],
      [pairs.map(([label, item]) => labelled(label, item))], pairs.map((p) => p[1]));
  }

  function genColor(L, r) {
    const n = L < 3 ? 3 : 4;
    const colors = r.sample(COLORS, n);
    const shapes = r.sample(SHAPES, n);
    const items = colors.map((c, i) => S(shapes[i], c));
    return make(r, 'color', ['color'], ['color'],
      [colors.map((c, i) => Object.assign(labelled(S('blob', c), items[i]), { tint: c }))], items);
  }

  function genCount(L, r) {
    const n = L < 4 ? 3 : 4;
    const values = r.sample(range(1, L < 4 ? 6 : 9), n);
    const id = r.pick(FRUIT);
    const items = values.map((v) => C(v, id));
    return make(r, 'count', ['count'], ['count'],
      [values.map((v, i) => labelled(T(v), items[i]))], items);
  }

  function genShadow(L, r) {
    const ids = r.sample(SILHOUETTES, L < 5 ? 3 : 4);
    return make(r, 'shadow', ['shadow'], ['shadow'],
      [ids.map((id) => labelled(I(id, true), I(id)))], ids.map((id) => I(id)));
  }

  function genCase(L, r) {
    const letters = r.sample(CASE_LETTERS, L < 6 ? 3 : 4);
    const flip = L >= 6 && r.chance(0.5);
    const up = (c) => T(c);
    const low = (c) => T(c.toLowerCase());
    const items = letters.map(flip ? up : low);
    return make(r, 'case', ['case'], ['case'],
      [letters.map((c, i) => labelled((flip ? low : up)(c), items[i]))], items);
  }

  function genSum(L, r) {
    const n = L < 8 ? 3 : 4;
    const ops = ['+'];
    if (L >= 7) ops.push('−');
    if (L >= 11) ops.push('×');
    const top = L < 7 ? 10 : 20;
    const made = new Map();
    while (made.size < n) {
      const op = r.pick(ops);
      let a;
      let b;
      let v;
      if (op === '+') {
        a = r.int(1, top - 2);
        b = r.int(1, top - a);
        v = a + b;
      } else if (op === '−') {
        a = r.int(3, top);
        b = r.int(1, a - 1);
        v = a - b;
      } else {
        a = r.int(2, 6);
        b = r.int(2, 5);
        v = a * b;
      }
      if (!made.has(v)) made.set(v, `${a}${op}${b}`);
    }
    const answers = [...made.keys()];
    const near = r.shuffle(answers.flatMap((v) => [v - 1, v + 1, v + 2]).filter((v) => v > 0));
    const items = fill(answers.map(T), near.map(T), L >= 8 ? n + 1 : n);
    return make(r, 'sum', ['sum'], ['sum'],
      [answers.map((v) => labelled(T(made.get(v)), T(v)))], items);
  }

  function genClock(L, r) {
    const half = L >= 9 && r.chance(0.5);
    const hours = r.sample(range(1, 12), L < 9 ? 3 : 4);
    const m = half ? 30 : 0;
    const items = hours.map((h) => K(h, m));
    return make(r, 'clock', ['clock'], [half ? 'clockHalf' : 'clock'],
      [hours.map((h, i) => labelled(T(`${h}:${half ? '30' : '00'}`), items[i]))], items);
  }

  function mirrorCells(cells) {
    return cells.map((c) => Math.floor(c / 3) * 3 + (2 - (c % 3)));
  }

  function genMirror(L, r) {
    const n = L < 13 ? 3 : 4;
    const color = r.pick(COLORS);
    const pairs = [];
    const seen = new Set();
    for (let tries = 0; pairs.length < n && tries < 500; tries++) {
      const cells = r.sample(range(0, 8), r.int(3, 5));
      const a = G(cells, color);
      const b = G(mirrorCells(cells), color);
      if (key(a) === key(b) || seen.has(key(a)) || seen.has(key(b))) continue;
      seen.add(key(a));
      seen.add(key(b));
      pairs.push([a, b]);
    }
    if (pairs.length < n) return null;
    return make(r, 'mirror', ['mirror'], ['mirror'],
      [pairs.map(([a, b]) => labelled(a, b))], pairs.map((p) => p[1]));
  }

  // ---- ordering ----
  function genOrder(L, r) {
    const n = L < 8 ? 3 : L < 12 ? 4 : 5;
    const variants = ['size', 'numbers', 'count'];
    const variant = r.pick(variants);
    const down = L >= 10 && r.chance(0.5);
    let sorted;
    if (variant === 'size') {
      const sizes = [0.4, 0.55, 0.7, 0.85, 1].slice(5 - n);
      const shape = r.pick(SHAPES);
      const color = r.pick(COLORS);
      sorted = sizes.map((size) => S(shape, color, { size }));
    } else if (variant === 'numbers') {
      const top = L < 8 ? 20 : 99;
      sorted = r.sample(range(1, top), n).sort((a, b) => a - b).map(T);
    } else {
      const id = r.pick(FRUIT);
      sorted = r.sample(range(1, 9), n).sort((a, b) => a - b).map((v) => C(v, id));
    }
    const line = down ? sorted.slice().reverse() : sorted;
    return make(r, 'order', [down ? 'orderDown' : 'orderUp'], [down ? 'orderDown' : 'orderUp'],
      [line.map((g) => blank(g))], line, { numbered: true, plain: true, order: variant, down });
  }

  // ---- sequences ----
  function seqCars(seq, blanks) {
    return seq.map((g, i) => (blanks.includes(i) ? blank(g) : given(g)));
  }

  function tokens(r) {
    const family = r.pick(['shapes', 'colors', 'icons', 'letters']);
    if (family === 'shapes') {
      const shapes = r.sample(SHAPES, 6);
      const colors = r.sample(COLORS, 6);
      return shapes.map((s, i) => S(s, colors[i]));
    }
    if (family === 'colors') {
      const shape = r.pick(SHAPES);
      return r.sample(COLORS, 6).map((c) => S(shape, c));
    }
    if (family === 'icons') return r.sample(FRUIT.concat(ANIMALS), 6).map((id) => I(id));
    return r.sample(LETTERS, 6).map(T);
  }

  function genPattern(L, r) {
    if (L >= 10 && r.chance(0.4)) return genPatternTwoRules(L, r);
    const motifs = L < 4 ? ['AB', 'ABC'] : ['AB', 'ABC', 'AAB', 'ABB'];
    const motif = r.pick(motifs);
    const len = motif === 'AB' ? 5 : 6;
    const period = motif.length;
    const pool = tokens(r);
    const letterOf = (i) => 'ABC'.indexOf(motif[i % period]);
    const seq = range(0, len - 1).map((i) => pool[letterOf(i)]);

    // The whole first period always stays visible, so the rule can be read off the train.
    let blanks;
    if (L < 5) {
      blanks = [len - 1];
    } else if (L < 7 || r.chance(0.5)) {
      blanks = [r.int(period, len - 1)];
    } else {
      const options = [];
      for (let i = period; i < len - 1; i++) {
        if (key(seq[i]) !== key(seq[i + 1])) options.push([i, i + 1]);
      }
      blanks = options.length ? r.pick(options) : [len - 1];
    }
    const answers = blanks.map((i) => seq[i]);
    const motifPool = pool.slice(0, new Set(motif).size);
    const items = fill(answers, r.shuffle(motifPool).concat(r.shuffle(pool.slice(3))), blanks.length + 2);
    return make(r, 'pattern', [blanks.includes(len - 1) && blanks.length === 1 ? 'patternNext' : 'patternGap'],
      ['pattern', { n: period }], [seqCars(seq, blanks)], items, { motif });
  }

  // Shape repeats every 2 cars while colour repeats every 3: two rules to track at once.
  function genPatternTwoRules(L, r) {
    const shapes = r.sample(SHAPES, 2);
    const colors = r.sample(COLORS, 3);
    const seq = range(0, 5).map((i) => S(shapes[i % 2], colors[i % 3]));
    const blankAt = r.int(4, 5);
    const answer = seq[blankAt];
    const wrong = shapes.flatMap((s) => colors.map((c) => S(s, c)));
    return make(r, 'pattern', ['patternTwo'], ['patternTwo'],
      [seqCars(seq, [blankAt])], fill([answer], r.shuffle(wrong), 4), { motif: 'two' });
  }

  function numberRule(L, r) {
    const up = [1, 2, 5, 10];
    const mid = [3, 4, 6];
    const down = [-1, -2, -5, -10];
    const kinds = [];
    up.forEach((k) => kinds.push({ add: k }));
    if (L >= 8) mid.concat(down).forEach((k) => kinds.push({ add: k }));
    if (L >= 12) {
      kinds.push({ double: true }, { double: true }, { grow: true }, { grow: true });
      kinds.push({ alt: true }, { alt: true });
    }
    return r.pick(kinds);
  }

  function genNumberSeq(L, r) {
    const rule = numberRule(L, r);
    const len = 5;
    let seq;
    let hint;
    if (rule.add) {
      const k = rule.add;
      const first = k > 0 ? r.int(1, 20) : r.int(1, 10) + Math.abs(k) * (len - 1);
      seq = range(0, len - 1).map((i) => first + i * k);
      hint = [k > 0 ? 'seqUp' : 'seqDown', { k: Math.abs(k) }];
    } else if (rule.double) {
      const a = r.int(1, 3);
      seq = range(0, len - 1).map((i) => a * 2 ** i);
      hint = ['seqDouble'];
    } else if (rule.grow) {
      // +2, +3, +4, +5. Starting at 2 or more keeps it from looking like doubling.
      let v = r.int(2, 9);
      seq = [v];
      for (let i = 2; seq.length < len; i++) {
        v += i;
        seq.push(v);
      }
      hint = ['seqGrow'];
    } else {
      // Alternating +a, -b, drawn so that the shown terms cannot be read as steady growth.
      const a = r.int(3, 6);
      const b = r.int(1, a - 1);
      let v = r.int(b + 1, 12);
      seq = [v];
      while (seq.length < len) {
        v += seq.length % 2 ? a : -b;
        seq.push(v);
      }
      hint = ['seqAlt', { a, b }];
    }
    // Sequences with a changing step need their earlier terms visible, so blank the last one.
    const steady = Boolean(rule.add);
    const at = steady && L >= 7 ? r.int(1, len - 1) : len - 1;
    const v = seq[at];
    const step = Math.abs(rule.add || 2);
    const near = r.shuffle([v + 1, v - 1, v + step + 1, v - step - 1, v + 2 * step, v + 3])
      .filter((x) => x >= 0 && !seq.includes(x));
    const items = fill([T(v)], near.map(T), L < 10 ? 3 : 4);
    return make(r, 'numseq', [at === len - 1 ? 'numNext' : 'numGap'], hint,
      [seq.map((x, i) => (i === at ? blank(T(x)) : given(T(x))))], items, { rule, seq });
  }

  function genVisualSeq(L, r) {
    const variant = r.pick(['rotate', 'rotate', 'sides', 'dots', 'grow']);
    const color = r.pick(COLORS);
    const len = 5;
    let seq;
    let wrong;
    let hint;
    if (variant === 'rotate') {
      const step = r.pick(L < 10 ? [90, -90, 45, -45] : [90, -90, 45, -45, 135, -135]);
      const start = r.pick([0, 45, 90, 180, 270]);
      const shape = r.pick(['arrow', 'wedge']);
      const at = (i) => (((start + i * step) % 360) + 360) % 360;
      seq = range(0, len - 1).map((i) => S(shape, color, { rot: at(i) }));
      wrong = r.shuffle(range(0, 7).map((i) => S(shape, color, { rot: i * 45 })));
      hint = [step > 0 ? 'turnRight' : 'turnLeft', { k: Math.abs(step) }];
    } else if (variant === 'sides') {
      const start = r.int(3, 4);
      seq = range(0, len - 1).map((i) => P(start + i, color));
      wrong = r.shuffle(range(3, 10).map((s) => P(s, color)));
      hint = ['sides'];
    } else if (variant === 'dots') {
      const id = r.pick(FRUIT);
      const k = r.int(1, 2);
      const start = k === 1 ? r.int(1, 5) : 1;
      seq = range(0, len - 1).map((i) => C(start + i * k, id));
      wrong = r.shuffle(range(1, 9).map((n) => C(n, id)));
      hint = ['seqUp', { k }];
    } else {
      const shape = r.pick(SHAPES);
      const sizes = [0.4, 0.55, 0.7, 0.85, 1];
      seq = sizes.map((size) => S(shape, color, { size }));
      wrong = r.shuffle([0.3, 0.4, 0.55, 0.7, 0.85, 1].map((size) => S(shape, color, { size })));
      hint = ['grows'];
    }
    const at = L >= 9 ? r.int(1, len - 1) : len - 1;
    const items = fill([seq[at]], wrong, L < 12 ? 3 : 4);
    return make(r, 'visual', ['watch'], hint, [seqCars(seq, [at])], items, { variant });
  }

  function genGridSeq(L, r) {
    const step = L >= 12 ? r.pick([1, 2, 3]) : 1;
    const dir = r.pick([1, -1]);
    const two = L >= 15 && r.chance(0.5);
    const color = r.pick(COLORS);
    const start = r.int(0, 7);
    const at = (i) => RING[(((start + dir * step * i) % 8) + 8) % 8];
    // The second dot goes round the other way, half a ring out of step.
    const at2 = (i) => RING[(((start + 3 - dir * i) % 8) + 8) % 8];
    const frame = (i) => G(two ? [...new Set([at(i), at2(i)])] : [at(i)], color);
    const seq = range(0, 4).map(frame);
    const blankAt = L >= 13 ? r.int(2, 4) : 4;
    const wrong = r.shuffle(range(0, 7)).map((i) => (
      two ? G([...new Set([RING[i], RING[(i + 3) % 8]])], color) : G([RING[i]], color)));
    const items = fill([seq[blankAt]], wrong, 4);
    return make(r, 'gridseq', ['watch'], [two ? 'gridTwo' : 'gridOne'],
      [seqCars(seq, [blankAt])], items);
  }

  // ---- odd one out ----
  function genOdd(L, r) {
    const n = L < 9 ? 3 : 4;
    const variants = ['category', 'category'];
    if (L >= 5) variants.push('color', 'shape');
    if (L >= 7) variants.push('parity', 'parity');
    if (L >= 8) variants.push('fill');
    if (L >= 9) variants.push('five');
    if (L >= 11) variants.push('three');
    const variant = r.pick(variants);
    let group;
    let odd;
    let hint;
    if (variant === 'category') {
      const cats = categories(r);
      const eligible = Object.keys(cats).filter((c) => cats[c].length >= n);
      let [a, b] = r.sample(eligible, 2);
      // A fruit among plants (or the reverse) is arguable, so swap that pairing out.
      if ([a, b].includes('fruit') && [a, b].includes('plants')) a = 'letters';
      if (a === b) b = 'numbers';
      group = r.sample(cats[a], n);
      odd = r.pick(cats[b]);
      hint = ['oddKind'];
    } else if (variant === 'color') {
      const [c1, c2] = r.sample(COLORS, 2);
      const shapes = r.sample(SHAPES, n + 1);
      group = shapes.slice(0, n).map((s) => S(s, c1));
      odd = S(shapes[n], c2);
      hint = ['oddColor'];
    } else if (variant === 'shape') {
      const [s1, s2] = r.sample(SHAPES, 2);
      const colors = r.sample(COLORS, n + 1);
      group = colors.slice(0, n).map((c) => S(s1, c));
      odd = S(s2, colors[n]);
      hint = ['oddShape'];
    } else if (variant === 'fill') {
      const [f1, f2] = r.sample(['solid', 'outline', 'stripes', 'dots'], 2);
      const shapes = r.sample(SHAPES, n + 1);
      const colors = r.sample(COLORS, n + 1);
      group = range(0, n - 1).map((i) => S(shapes[i], colors[i], { fill: f1 }));
      odd = S(shapes[n], colors[n], { fill: f2 });
      hint = ['oddFill'];
    } else {
      // Every number has two digits, so "the only short number" can't be a second answer.
      const test = {
        parity: (v) => v % 2 === 0,
        five: (v) => v % 5 === 0,
        three: (v) => v % 3 === 0,
      }[variant];
      const all = range(10, variant === 'parity' ? 40 : 60);
      const yes = all.filter(test);
      const no = all.filter((v) => !test(v));
      const flip = variant === 'parity' && r.chance(0.5);
      group = r.sample(flip ? no : yes, n).map(T);
      odd = T(r.pick(flip ? yes : no));
      hint = [{ parity: flip ? 'oddOddNumbers' : 'oddEvenNumbers', five: 'oddFive', three: 'oddThree' }[variant]];
    }
    const accepts = group.map(key);
    return make(r, 'odd', ['odd'], hint, [group.map(() => ({ accepts }))], group.concat([odd]),
      { plain: true, oddKey: key(odd), variant });
  }

  // ---- analogies: the top train shows a change, the bottom train needs the same change ----
  function genAnalogy(L, r) {
    const kinds = ['color', 'fill', 'size', 'count', 'swap', 'turn'];
    if (L >= 10) kinds.push('number', 'case');
    const kind = r.pick(kinds);
    if (kind === 'number') return analogyNumber(r);
    if (kind === 'case') return analogyCase(r);

    const [c1, c2, c3] = r.sample(COLORS, 3);
    const [s1, s2, s3] = r.sample(SHAPES, 3);
    const transforms = {
      color: (g) => Object.assign({}, g, { color: c3 }),
      fill: (g) => Object.assign({}, g, { fill: 'outline' }),
      size: (g) => Object.assign({}, g, { size: 0.55 }),
      count: (g) => Object.assign({}, g, { n: 2 }),
      swap: (g) => Object.assign({}, g, { shape: s3 }),
      turn: (g) => Object.assign({}, g, { rot: (g.rot + 90) % 360 }),
    };
    const pair = L >= 12 && r.chance(0.5);
    const second = pair ? r.pick(['color', 'fill', 'size', 'count'].filter((k) => k !== kind)) : null;
    const apply = (g) => {
      const once = transforms[kind](g);
      return second ? transforms[second](once) : once;
    };
    let a;
    let c;
    if (kind === 'turn') {
      const shape = r.pick(['arrow', 'wedge']);
      a = S(shape, c1, { rot: r.pick([0, 90, 180, 270]) });
      c = S(shape, c2, { rot: r.pick([0, 90, 180, 270]) });
    } else if (kind === 'swap') {
      a = S(s1, c1); // same start shape on both trains, or the swap would have no meaning
      c = S(s1, c2);
    } else {
      a = S(s1, c1);
      c = S(s2, c2);
    }
    const b = apply(a);
    const d = apply(c);
    const others = Object.keys(transforms).filter((k) => k !== 'turn' || c.shape === 'arrow' || c.shape === 'wedge');
    const wrong = [c, transforms[kind](c)].concat(second ? [transforms[second](c)] : [])
      .concat(r.shuffle(others).map((k) => transforms[k](c)), [b, a]);
    const items = fill([d], wrong, 4);
    return make(r, 'analogy', ['analogy'], [pair ? 'analogyTwo' : `an_${kind}`],
      [[given(a), given(b)], [given(c), blank(d)]], items, { compact: true, kind, second });
  }

  function analogyNumber(r) {
    // k differs from a, so "add k" can't also be read as "double".
    const a = r.int(2, 9);
    const k = r.pick(range(2, 9).filter((x) => x !== a));
    const c = r.pick(range(2, 12).filter((x) => x !== a));
    const d = c + k;
    const wrong = [c, d + 1, d - 1, 2 * c, a + k].filter((x) => x > 0 && x !== d).map(T);
    return make(r, 'analogy', ['analogy'], ['an_number', { k }],
      [[given(T(a)), given(T(a + k))], [given(T(c)), blank(T(d))]],
      fill([T(d)], r.shuffle(wrong), 4), { compact: true, kind: 'number', k });
  }

  function analogyCase(r) {
    const [a, c, x, y] = r.sample(CASE_LETTERS, 4);
    const low = (s) => s.toLowerCase();
    const wrong = [T(c), T(low(a)), T(low(x)), T(low(y))];
    return make(r, 'analogy', ['analogy'], ['an_case'],
      [[given(T(a)), given(T(low(a)))], [given(T(c)), blank(T(low(c)))]],
      fill([T(low(c))], wrong, 4), { compact: true, kind: 'case' });
  }

  // ---- 3x3 matrices, laid out as three short trains ----
  function genMatrix(L, r) {
    const values = {
      shape: r.sample(['circle', 'square', 'triangle', 'star', 'diamond', 'heart'], 3),
      color: r.sample(COLORS, 3),
      fill: ['solid', 'outline', 'stripes'],
      n: [1, 2, 3],
    };
    const expert = L >= EXPERT_LEVEL;
    const count = L >= HARDER_LEVEL ? 4 : L >= 16 ? 3 : 2;
    const attrs = r.sample(Object.keys(values), count);
    const rules = L < 13
      ? r.shuffle(['row', 'col'])
      : r.shuffle(['row', 'col', 'latin', 'latin2']).slice(0, count);
    if (!rules.some((x) => x !== 'row')) rules[0] = 'col';
    const index = {
      row: (i) => i,
      col: (i, j) => j,
      latin: (i, j) => (i + j) % 3,
      latin2: (i, j) => (i + 2 * j) % 3,
    };
    const base = { shape: r.pick(values.shape), color: r.pick(values.color), fill: 'solid', n: 1 };
    const cell = (i, j) => {
      const o = Object.assign({}, base);
      attrs.forEach((a, x) => { o[a] = values[a][index[rules[x]](i, j)]; });
      return S(o.shape, o.color, { fill: o.fill, n: o.n });
    };
    const lowest = expert ? 0 : 1;
    const bi = L >= 14 ? r.int(lowest, 2) : 2;
    const bj = L >= 14 ? r.int(lowest, 2) : 2;
    const answer = cell(bi, bj);
    const wrong = attrs.flatMap((a) => values[a].map((v) => {
      const o = { shape: answer.shape, color: answer.color, fill: answer.fill, n: answer.n, [a]: v };
      return S(o.shape, o.color, { fill: o.fill, n: o.n });
    }));
    const items = fill([answer], r.shuffle(wrong), expert ? 6 : 4);
    const tracks = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (
      i === bi && j === bj ? blank(answer) : given(cell(i, j)))));
    return make(r, 'matrix', ['matrix'], ['matrix'], tracks, items,
      { compact: true, attrs, rules, values });
  }

  // ---- logic: seat the passengers from clues ----
  const CLUE_TEST = {
    at: (p, c) => p[c.a] === c.n,
    notAt: (p, c) => p[c.a] !== c.n,
    left: (p, c) => p[c.a] < p[c.b],
    next: (p, c) => Math.abs(p[c.a] - p[c.b]) === 1,
    notNext: (p, c) => Math.abs(p[c.a] - p[c.b]) !== 1,
    justLeft: (p, c) => p[c.a] + 1 === p[c.b],
    gap: (p, c) => Math.abs(p[c.a] - p[c.b]) === 2,
    loco: (p, c, n) => p[c.a] === n - 1,
  };

  const permMemo = new Map();
  function permutations(n) {
    if (n === 1) return [[0]];
    if (permMemo.has(n)) return permMemo.get(n);
    const out = [];
    for (const p of permutations(n - 1)) {
      for (let i = 0; i < n; i++) out.push(p.slice(0, i).concat([n - 1], p.slice(i)));
    }
    permMemo.set(n, out);
    return out;
  }

  // Returns every seating (p[passenger] = carriage index) that satisfies the clues.
  function seatings(n, clues) {
    return permutations(n).filter((p) => clues.every((c) => CLUE_TEST[c.t](p, c, n)));
  }

  function logicClues(n, seat, L, r) {
    const candidates = [];
    const ids = range(0, n - 1);
    for (const a of ids) {
      for (const pos of ids) {
        if (seat[a] === pos) candidates.push({ t: 'at', a, n: pos });
        else candidates.push({ t: 'notAt', a, n: pos });
      }
      if (seat[a] === n - 1) candidates.push({ t: 'loco', a });
      for (const b of ids) {
        if (a === b) continue;
        if (seat[a] < seat[b]) candidates.push({ t: 'left', a, b });
        if (L >= 12) {
          if (a < b && Math.abs(seat[a] - seat[b]) === 1) candidates.push({ t: 'next', a, b });
          if (a < b && Math.abs(seat[a] - seat[b]) !== 1) candidates.push({ t: 'notNext', a, b });
          if (seat[a] + 1 === seat[b]) candidates.push({ t: 'justLeft', a, b });
        }
      }
    }
    // Clues that pin someone down outright come last, so the player has to reason a bit.
    const direct = (c) => c.t === 'at' || c.t === 'loco';
    const ordered = r.shuffle(candidates.filter((c) => !direct(c)))
      .concat(r.shuffle(candidates.filter(direct)));
    let chosen = [];
    let left = seatings(n, chosen).length;
    for (const c of ordered) {
      const now = seatings(n, chosen.concat([c])).length;
      if (now < left) {
        chosen.push(c);
        left = now;
      }
      if (left === 1) break;
    }
    // Drop any clue that turned out to be redundant.
    for (const c of chosen.slice()) {
      const without = chosen.filter((x) => x !== c);
      if (seatings(n, without).length === 1) chosen = without;
    }
    return chosen;
  }

  function genLogic(L, r) {
    const n = L < 12 ? 3 : L < 16 ? 4 : 5;
    const ids = r.sample(PASSENGERS, n);
    const seat = r.shuffle(range(0, n - 1));
    const clues = logicClues(n, seat, L, r);
    if (clues.length > n + 1) return null;
    const byCar = [];
    seat.forEach((pos, a) => { byCar[pos] = I(ids[a]); });
    const shown = clues.map((c) => {
      const o = { id: `c_${c.t}`, a: I(ids[c.a]) };
      if (c.b !== undefined) o.b = I(ids[c.b]);
      if (c.n !== undefined) o.n = c.n + 1;
      return o;
    });
    return make(r, 'logic', ['logic'], ['logic'], [byCar.map((g) => blank(g))], ids.map((id) => I(id)),
      { clues: shown, rawClues: clues, passengers: ids, numbered: true, plain: true });
  }

  // ---- picture equations ----
  function genEquation(L, r) {
    const three = L >= 17 && r.chance(0.6);
    const count = three ? 3 : 2;
    const ids = r.sample(FRUIT, count);
    const vals = r.sample(range(1, 9), count);
    const [a, b, c] = ids.map((id) => I(id));
    const [va, vb, vc] = vals;
    let eqs;
    if (three) {
      eqs = [[a, '+', a, va * 2], [a, '+', b, va + vb], [b, '+', c, vb + vc]];
    } else if (L >= 15 && va > vb && r.chance(0.5)) {
      eqs = [[a, '+', b, va + vb], [a, '−', b, va - vb]];
    } else {
      eqs = [[a, '+', a, va * 2], [a, '+', b, va + vb]];
    }
    const near = r.shuffle(vals.flatMap((v) => [v + 1, v - 1, v + 2])).filter((v) => v > 0).map(T);
    const items = fill(vals.map(T), near, count + 1);
    return make(r, 'equation', ['equation'], ['equation'],
      [ids.map((id, i) => labelled(I(id), T(vals[i])))], items,
      { clues: eqs.map((e) => ({ eq: e })), eqs, ids });
  }

  // ---- very hard: for adults ----

  // Shunting: the same rearrangement, carriage by carriage, is applied again (and again).
  function genShunt(L, r) {
    const harder = L >= HARDER_LEVEL;
    const n = harder ? 6 : 5;
    const times = harder ? 2 : 1;
    const apply = (line, p) => p.map((from) => line[from]);
    const isSame = (p, q) => p.every((v, i) => v === q[i]);
    const identity = range(0, n - 1);
    let move;
    for (let tries = 0; tries < 200 && !move; tries++) {
      const p = r.shuffle(identity);
      const twice = apply(p, p);
      // No carriage stays put, and repeating the move must not simply undo it.
      if (p.some((v, i) => v === i) || isSame(twice, identity)) continue;
      if (harder && isSame(apply(twice, p), identity)) continue;
      move = p;
    }
    if (!move) return null;
    const first = tokens(r);
    const line = first.slice(0, n);
    const middle = apply(line, move);
    let last = middle;
    for (let i = 0; i < times; i++) last = apply(last, move);
    return make(r, 'shunt', [harder ? 'shuntTwice' : 'shunt'], ['shunt'],
      [line.map(given), middle.map(given), last.map((g) => blank(g))], last, { move, times });
  }

  // Each row of pictures obeys one rule: the third picture is made from the first two.
  const OVERLAY_OPS = {
    or: (a, b) => a || b,
    and: (a, b) => a && b,
    xor: (a, b) => a !== b,
    minus: (a, b) => a && !b,
    minusBack: (a, b) => b && !a,
  };
  // Where each cell of a 3x3 picture comes from after the picture is turned or flipped.
  const GRID_TURNS = {
    none: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    right: [6, 3, 0, 7, 4, 1, 8, 5, 2],
    left: [2, 5, 8, 1, 4, 7, 0, 3, 6],
    half: [8, 7, 6, 5, 4, 3, 2, 1, 0],
    mirror: [2, 1, 0, 5, 4, 3, 8, 7, 6],
    flip: [6, 7, 8, 3, 4, 5, 0, 1, 2],
    diagonal: [0, 3, 6, 1, 4, 7, 2, 5, 8],
    otherDiagonal: [8, 5, 2, 7, 4, 1, 6, 3, 0],
  };
  // All 16 ways two cells can combine, so a rule is only "the" rule if nothing else fits either.
  const CELL_TABLES = range(0, 15).map((table) => (a, b) => Boolean((table >> (Number(a) * 2 + Number(b))) & 1));

  function combine(a, b, rule, turnId) {
    const turned = GRID_TURNS[turnId].map((from) => b.includes(from));
    return range(0, 8).filter((i) => rule(a.includes(i), turned[i]));
  }

  function genOverlay(L, r) {
    const harder = L >= HARDER_LEVEL;
    const op = r.pick(harder ? ['xor', 'minus', 'minusBack', 'or', 'and'] : ['xor', 'xor', 'minus', 'minusBack']);
    const turn = harder ? r.pick(['right', 'left', 'half', 'mirror', 'flip']) : 'none';
    const color = r.pick(COLORS);
    const allTurns = Object.keys(GRID_TURNS);
    const everyRule = CELL_TABLES.flatMap((o) => allTurns.map((t) => [o, t]));
    const namedRules = Object.values(OVERLAY_OPS).flatMap((o) => allTurns.map((t) => [o, t]));
    const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
    const picture = () => r.sample(range(0, 8), r.int(3, 6)).sort((x, y) => x - y);
    for (let tries = 0; tries < 300; tries++) {
      const rows = [0, 1, 2].map(() => {
        const a = picture();
        const b = picture();
        return [a, b, combine(a, b, OVERLAY_OPS[op], turn)];
      });
      if (rows.some((row) => row[2].length < 2 || row[2].length > 7)) continue;
      // The two finished rows must leave only this rule standing.
      const fits = everyRule.filter(([o, t]) => rows.slice(0, 2).every(([a, b, c]) => same(combine(a, b, o, t), c)));
      if (fits.length !== 1) continue;
      const [a, b, answerCells] = rows[2];
      const answer = G(answerCells, color);
      const traps = namedRules.map(([o, t]) => G(combine(a, b, o, t), color)).filter((g) => g.cells.length);
      const nudged = range(0, 8).map((i) => G(
        answerCells.includes(i) ? answerCells.filter((c) => c !== i) : answerCells.concat([i]), color));
      const items = fill([answer], r.shuffle(traps).concat(r.shuffle(nudged)), 6);
      const tracks = rows.map((row, i) => row.map((cells, j) => (
        i === 2 && j === 2 ? blank(answer) : given(G(cells, color)))));
      const hint = turn === 'none' ? [`ov_${op}`] : [`ov_${op}`, {}, `turn_${turn}`];
      return make(r, 'overlay', ['overlay'], hint, tracks, items, { compact: true, op, turn, rows });
    }
    return null;
  }

  // Code breaking: earlier attempts at loading the train, each scored like a combination lock.
  function scoreGuess(guess, secret) {
    let hits = 0;
    let near = 0;
    guess.forEach((g, i) => {
      if (g === secret[i]) hits += 1;
      else if (secret.includes(g)) near += 1;
    });
    return { hits, near };
  }

  function arrangements(pool, n) {
    if (n === 0) return [[]];
    return pool.flatMap((v) => arrangements(pool.filter((x) => x !== v), n - 1).map((rest) => [v, ...rest]));
  }

  function genCode(L, r) {
    const n = L >= HARDER_LEVEL ? 5 : 4;
    const limit = n + 1;
    const all = arrangements(range(0, 5), n);
    const same = (x, y) => x.hits === y.hits && x.near === y.near;
    for (let tries = 0; tries < 40; tries++) {
      const secret = r.pick(all);
      let left = all;
      let guesses = [];
      for (const g of r.shuffle(all).slice(0, 120)) {
        if (scoreGuess(g, secret).hits >= n - 1) continue; // too close to the answer to be fun
        const score = scoreGuess(g, secret);
        const next = left.filter((c) => same(scoreGuess(g, c), score));
        // Skip guesses that barely narrow things down, so each line on the board earns its place.
        if (next.length > left.length * 0.6) continue;
        guesses.push(g);
        left = next;
        if (left.length === 1) break;
      }
      if (left.length !== 1) continue;
      for (const g of guesses.slice()) {
        const rest = guesses.filter((x) => x !== g);
        const fits = all.filter((c) => rest.every((x) => same(scoreGuess(x, c), scoreGuess(x, secret))));
        if (fits.length === 1) guesses = rest;
      }
      if (guesses.length > limit) continue;
      const pool = tokens(r);
      const shown = guesses.map((g) => Object.assign({ guess: g.map((i) => pool[i]) }, scoreGuess(g, secret)));
      return make(r, 'code', ['code'], ['code'], [secret.map((i) => blank(pool[i]))], pool,
        { clues: shown, rawGuesses: guesses, secret, pool, numbered: true, plain: true });
    }
    return null;
  }

  // Seating again, but exactly one clue is a lie.
  function liarSeatings(n, clues) {
    return permutations(n).filter((p) => (
      clues.filter((c) => !CLUE_TEST[c.t](p, c, n)).length === 1));
  }

  function liarCandidates(n) {
    const out = [];
    const ids = range(0, n - 1);
    for (const a of ids) {
      for (const pos of ids) out.push({ t: 'notAt', a, n: pos });
      for (const b of ids) {
        if (a === b) continue;
        out.push({ t: 'left', a, b }, { t: 'justLeft', a, b });
        if (a < b) out.push({ t: 'next', a, b }, { t: 'notNext', a, b }, { t: 'gap', a, b });
      }
    }
    return out;
  }

  function genLiar(L, r) {
    const n = L >= HARDER_LEVEL ? 6 : 5;
    const perms = permutations(n);
    const holds = (p, c) => CLUE_TEST[c.t](p, c, n);
    const limit = n + 1;
    const possible = (...clues) => perms.some((p) => clues.every((c) => holds(p, c)));
    for (let tries = 0; tries < 80; tries++) {
      const seat = r.pick(perms);
      const pool = r.shuffle(liarCandidates(n));
      const lie = pool.find((c) => !holds(seat, c) && c.t !== 'notAt');
      // A lie that openly contradicts another clue would give itself away at a glance.
      const truths = pool.filter((c) => holds(seat, c) && possible(c, lie));
      const lies = new Int8Array(perms.length);
      const tally = (c, by) => perms.forEach((p, i) => { if (!holds(p, c)) lies[i] += by; });
      const liveCount = () => lies.reduce((sum, v) => sum + (v === 1 ? 1 : 0), 0);
      let chosen = [lie];
      tally(lie, 1);
      let live = liveCount();
      for (const c of truths) {
        tally(c, 1);
        const now = liveCount();
        if (now < live * 0.8) {
          chosen.push(c);
          live = now;
        } else {
          tally(c, -1);
        }
        if (live === 1) break;
      }
      if (live !== 1) continue;
      for (const c of chosen.slice(1)) {
        const without = chosen.filter((x) => x !== c);
        if (liarSeatings(n, without).length === 1) chosen = without;
      }
      if (chosen.length > limit) continue;
      const rest = chosen.slice(1);
      if (!rest.every((c, i) => rest.slice(i + 1).every((d) => possible(c, d, lie)))) continue;
      const order = r.shuffle(chosen);
      const ids = r.sample(PASSENGERS.concat(['bird']), n);
      const byCar = [];
      seat.forEach((pos, a) => { byCar[pos] = I(ids[a]); });
      const shown = order.map((c) => {
        const o = { id: `c_${c.t}`, a: I(ids[c.a]) };
        if (c.b !== undefined) o.b = I(ids[c.b]);
        if (c.n !== undefined) o.n = c.n + 1;
        return o;
      });
      return make(r, 'liar', ['liar'], ['liar', { n: order.indexOf(lie) + 1 }],
        [byCar.map((g) => blank(g))], ids.map((id) => I(id)),
        { clues: shown, rawClues: order, lie, passengers: ids, numbered: true, plain: true });
    }
    return null;
  }

  // Every simple rule that explains the visible terms, as the two terms it would give next.
  // A hard sequence is only fair when all the readings agree.
  function seqReadings(terms) {
    const found = new Set();
    const extend = (next) => {
      const out = terms.slice();
      out.push(next(out));
      out.push(next(out));
      found.add(out.slice(-2).join());
    };
    for (let p = -3; p <= 3; p++) {
      for (let q = -3; q <= 3; q++) {
        const c = terms[2] - p * terms[1] - q * terms[0];
        const step = (s) => p * s[s.length - 1] + q * s[s.length - 2] + c;
        if (terms.slice(2).every((v, i) => v === step(terms.slice(0, i + 2)))) extend(step);
      }
    }
    // Polynomials: some row of differences is constant.
    const rows = [terms];
    while (rows[rows.length - 1].length > 2) {
      const row = rows[rows.length - 1];
      rows.push(row.slice(1).map((v, i) => v - row[i]));
    }
    rows.forEach((row, depth) => {
      if (depth >= 1 && depth <= 3 && row.every((v) => v === row[0])) {
        extend((s) => {
          let d = s;
          for (let i = 0; i < depth; i++) d = d.slice(1).map((v, x) => v - d[x]);
          let v = d[d.length - 1];
          for (let i = depth - 1; i >= 0; i--) {
            let e = s;
            for (let x = 0; x < i; x++) e = e.slice(1).map((w, y) => w - e[y]);
            v += e[e.length - 1];
          }
          return v;
        });
      }
    });
    // Two sequences taking turns, each with its own steady step or steady factor.
    const split = [terms.filter((_, i) => i % 2 === 0), terms.filter((_, i) => i % 2 === 1)];
    const steady = (s) => s.slice(2).every((v, i) => v - s[i + 1] === s[1] - s[0]);
    const factor = (s) => s[0] !== 0 && s.slice(2).every((v, i) => v * s[i] === s[i + 1] * s[i + 1]);
    if (split.every(steady)) extend((s) => s[s.length - 2] + (s[s.length - 2] - s[s.length - 4]));
    if (split.every(factor)) extend((s) => (s[s.length - 2] ** 2) / s[s.length - 4]);
    return found;
  }

  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
  const digitSum = (v) => String(v).split('').reduce((sum, d) => sum + Number(d), 0);

  // Each maker returns [terms, hint]. The tougher ones only appear in the upper half of the tier.
  const SEQ_MAKERS = {
    fibonacci(r) {
      const seq = [r.int(1, 6), r.int(2, 9)];
      while (seq.length < 8) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      return [seq, ['sq_fibonacci']];
    },
    linear(r) {
      const p = r.pick([2, 2, 3]);
      const q = r.pick([-3, -2, -1, 1, 2, 3, 5]);
      const seq = [r.int(2, 6)];
      while (seq.length < 8) seq.push(p * seq[seq.length - 1] + q);
      return [seq, ['sq_linear', { p, q: Math.abs(q), sign: q > 0 ? '+' : '−' }]];
    },
    squares(r) {
      const power = r.pick([2, 2, 3]);
      const k = r.pick([-3, -2, -1, 1, 2, 3, 5]);
      const start = r.int(1, 4);
      const seq = range(start, start + 7).map((i) => i ** power + k);
      return [seq, [power === 2 ? 'sq_squares' : 'sq_cubes']];
    },
    interleaved(r) {
      const s = r.pick([3, 4, 5, 7]);
      const t = r.pick([-2, -3, 2, 6, 8].filter((x) => x !== s));
      const a = r.int(1, 9);
      const b = r.int(20, 40);
      return [range(0, 7).map((i) => (i % 2 ? b + t * ((i - 1) / 2) : a + s * (i / 2))), ['sq_interleaved']];
    },
    doublingSteps(r) {
      const k = r.pick([2, 3]);
      const seq = [r.int(1, 9)];
      let step = r.int(1, 3);
      while (seq.length < 8) {
        seq.push(seq[seq.length - 1] + step);
        step *= k;
      }
      return [seq, ['sq_steps', { k }]];
    },
    alternating(r) {
      const p = r.pick([2, 3]);
      const q = r.pick([-4, -3, -2, 1, 2, 3, 4]);
      const seq = [r.int(2, 7)];
      while (seq.length < 8) {
        const v = seq[seq.length - 1];
        seq.push(seq.length % 2 ? v * p : v + q);
      }
      return [seq, ['sq_alternating', { p, q: Math.abs(q), sign: q > 0 ? '+' : '−' }]];
    },
    primes(r) {
      const start = r.int(1, 8);
      const k = r.pick([0, 0, 1, 2, -1]);
      return [PRIMES.slice(start, start + 8).map((v) => v + k), [k ? 'sq_primesShift' : 'sq_primes', { k: Math.abs(k), sign: k > 0 ? '+' : '−' }]];
    },
    digitSums(r) {
      const seq = [r.int(11, 60)];
      while (seq.length < 8) seq.push(seq[seq.length - 1] + digitSum(seq[seq.length - 1]));
      return [seq, ['sq_digits']];
    },
    primeSteps(r) {
      const seq = [r.int(1, 15)];
      const from = r.int(0, 2);
      while (seq.length < 8) seq.push(seq[seq.length - 1] + PRIMES[from + seq.length - 1]);
      return [seq, ['sq_primeSteps']];
    },
  };

  // Two trains read as one line of eight, the second train carrying on from the first.
  function genHardSeq(L, r) {
    const kinds = ['fibonacci', 'linear', 'squares', 'interleaved', 'doublingSteps', 'alternating', 'primes'];
    if (L >= HARDER_LEVEL) kinds.splice(0, 3, 'digitSums', 'primeSteps');
    for (let tries = 0; tries < 60; tries++) {
      const kind = r.pick(kinds);
      const [seq, hint] = SEQ_MAKERS[kind](r);
      if (seq.some((v) => v < 0 || v > 999)) continue;
      const shown = seq.slice(0, 6);
      const readings = seqReadings(shown);
      readings.add(seq.slice(6).join());
      if (readings.size !== 1) continue;
      const [x, y] = seq.slice(6);
      const step = y - x;
      const traps = [x + step, y + step, y - 1, y + 1, x - 1, x + 1, 2 * x - seq[5], y + seq[5] - x, x + 2, y - 2];
      const wrong = r.shuffle(traps.filter((v) => v > 0 && v <= 999 && !shown.includes(v))).map(T);
      const items = fill([T(x), T(y)], wrong, 6);
      const cars = seq.map((v, i) => (i >= 6 ? blank(T(v)) : given(T(v))));
      return make(r, 'hardseq', ['hardseq'], hint, [cars.slice(0, 4), cars.slice(4)], items,
        { kind, seq, compact: true });
    }
    return null;
  }

  // Simultaneous equations with no line that gives a picture away on its own.
  const EQ_VALUE = {
    '+': (a, b) => a + b,
    '−': (a, b) => a - b,
    '×': (a, b) => a * b,
  };

  function genSystem(L, r) {
    const count = L >= HARDER_LEVEL ? 4 : 3;
    const all = arrangements(range(1, 9), count);
    for (let tries = 0; tries < 40; tries++) {
      const vals = r.pick(all);
      const candidates = [];
      for (let a = 0; a < count; a++) {
        for (let b = 0; b < count; b++) {
          if (a === b) continue;
          if (a < b) candidates.push([a, '+', b], [a, '×', b]);
          if (vals[a] > vals[b]) candidates.push([a, '−', b]);
        }
      }
      const same = (assign, [a, op, b]) => (
        EQ_VALUE[op](assign[a], assign[b]) === EQ_VALUE[op](vals[a], vals[b]));
      let chosen = [];
      let left = all;
      for (const e of r.shuffle(candidates)) {
        const next = left.filter((v) => same(v, e));
        if (next.length === left.length) continue;
        chosen.push(e);
        left = next;
        if (left.length === 1) break;
      }
      if (left.length !== 1) continue;
      for (const e of chosen.slice()) {
        const without = chosen.filter((x) => x !== e);
        if (all.filter((v) => without.every((x) => same(v, x))).length === 1) chosen = without;
      }
      if (chosen.length > count + 1) continue;
      const ids = r.sample(FRUIT, count);
      const eqs = chosen.map(([a, op, b]) => [I(ids[a]), op, I(ids[b]), EQ_VALUE[op](vals[a], vals[b])]);
      const wrong = r.shuffle(range(1, 9).filter((v) => !vals.includes(v))).map(T);
      return make(r, 'system', ['system'], ['system'],
        [ids.map((id, i) => labelled(I(id), T(vals[i])))], fill(vals.map(T), wrong, 6),
        { clues: eqs.map((e) => ({ eq: e })), eqs, ids, vals });
    }
    return null;
  }

  // ---- catalogue and selection ----
  const TYPES = [
    { id: 'sort', min: 1, max: 7, gen: genSort },
    { id: 'color', min: 1, max: 5, gen: genColor },
    { id: 'count', min: 1, max: 7, gen: genCount },
    { id: 'shadow', min: 2, max: 8, gen: genShadow },
    { id: 'pattern', min: 2, max: 20, gen: genPattern },
    { id: 'case', min: 3, max: 9, gen: genCase },
    { id: 'sum', min: 4, max: 20, gen: genSum },
    { id: 'odd', min: 4, max: 20, gen: genOdd },
    { id: 'order', min: 5, max: 20, gen: genOrder },
    { id: 'numseq', min: 5, max: 20, gen: genNumberSeq },
    { id: 'clock', min: 6, max: 12, gen: genClock },
    { id: 'visual', min: 7, max: 20, gen: genVisualSeq },
    { id: 'logic', min: 8, max: 20, gen: genLogic },
    { id: 'analogy', min: 8, max: 20, gen: genAnalogy },
    { id: 'mirror', min: 9, max: 20, gen: genMirror },
    { id: 'gridseq', min: 10, max: 20, gen: genGridSeq },
    { id: 'matrix', min: 11, max: 99, gen: genMatrix },
    { id: 'equation', min: 13, max: 20, gen: genEquation },
    { id: 'shunt', min: EXPERT_LEVEL, max: 99, gen: genShunt },
    { id: 'overlay', min: EXPERT_LEVEL, max: 99, gen: genOverlay },
    { id: 'code', min: EXPERT_LEVEL, max: 99, gen: genCode },
    { id: 'liar', min: EXPERT_LEVEL, max: 99, gen: genLiar },
    { id: 'hardseq', min: EXPERT_LEVEL, max: 99, gen: genHardSeq },
    { id: 'system', min: EXPERT_LEVEL, max: 99, gen: genSystem },
  ];

  function slotsOf(p) {
    return p.tracks.flat().filter((c) => c.accepts);
  }

  // Counts how many ways the slots can be filled. Odd-one-out slots are interchangeable,
  // so there only the set of items used matters.
  function countSolutions(p) {
    const slots = slotsOf(p);
    const keys = p.items.map(key);
    const found = new Set();
    const used = new Set();
    const pickFor = (i, chosen) => {
      if (i === slots.length) {
        found.add((p.type === 'odd' ? chosen.slice().sort() : chosen).join('|'));
        return;
      }
      keys.forEach((k, x) => {
        if (used.has(x) || !slots[i].accepts.includes(k)) return;
        used.add(x);
        pickFor(i + 1, chosen.concat([k]));
        used.delete(x);
      });
    };
    pickFor(0, []);
    return found.size;
  }

  function isValid(p) {
    if (!p) return false;
    const keys = p.items.map(key);
    return new Set(keys).size === keys.length
      && slotsOf(p).length > 0
      && keys.length >= slotsOf(p).length
      && countSolutions(p) === 1;
  }

  function generate(level, options) {
    const o = options || {};
    const r = makeRng(o.rnd || Math.random);
    const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
    const recent = o.recent || [];
    let pool = TYPES.filter((t) => t.min <= L && L <= t.max);
    if (o.type) pool = TYPES.filter((t) => t.id === o.type);
    const fresh = pool.filter((t) => !recent.includes(t.id));
    if (fresh.length) pool = fresh;
    // Types the player has only just unlocked turn up more often.
    const weighted = pool.flatMap((t) => (L - t.min < 3 ? [t, t, t] : [t]));
    for (let tries = 0; tries < 200; tries++) {
      const t = r.pick(weighted);
      const p = t.gen(L, r);
      if (isValid(p)) {
        p.level = L;
        p.blind = L >= EXPERT_LEVEL;
        return p;
      }
    }
    throw new Error(`could not generate a puzzle at level ${L}`);
  }

  return {
    generate, key, seeded, isValid, countSolutions, seatings, liarSeatings, slotsOf, TYPES,
    MAX_LEVEL, EXPERT_LEVEL, COLORS, CLUE_TEST,
  };
});
