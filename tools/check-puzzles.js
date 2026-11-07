#!/usr/bin/env node
// Generates many puzzles at every level and re-checks them with code that is separate from
// the generators, because a puzzle with two right answers (or none) is the worst bug here.
//   node tools/check-puzzles.js [puzzlesPerLevelAndType]
const P = require('../src/puzzles.js');
const STRINGS = require('../src/i18n.js');

const perCase = Number(process.argv[2]) || 400;
const failures = new Map();
const seen = new Map();
const clueCounts = new Map();

function fail(type, why, puzzle) {
  const id = `${type}: ${why}`;
  if (!failures.has(id)) failures.set(id, { n: 0, sample: puzzle });
  failures.get(id).n += 1;
}

const isText = (g) => g.k === 'text';
const num = (g) => Number(g.v);

function checkSequenceGivens(p) {
  const cars = p.tracks[0];
  const filled = cars.filter((c) => c.cargo).length;
  if (filled < 3) fail(p.type, 'fewer than 3 visible terms', p);
}

function checkNumberSeq(p) {
  checkSequenceGivens(p);
  const seq = p.seq;
  const answers = p.items.filter((g) => p.tracks[0].some((c) => c.accepts && c.accepts.includes(P.key(g))));
  if (answers.length !== 1) fail(p.type, 'not exactly one answer', p);
  if (seq.some((v) => v < 0 || v > 99)) fail(p.type, 'term out of range', p);
  const diffs = seq.slice(1).map((v, i) => v - seq[i]);
  const steady = diffs.every((d) => d === diffs[0]);
  if (p.rule.add && !steady) fail(p.type, 'steady rule is not steady', p);
  if (p.rule.double && !seq.slice(1).every((v, i) => v === seq[i] * 2)) fail(p.type, 'not doubling', p);
  // No wrong item may also continue the sequence as plain arithmetic from the visible terms.
  const at = p.tracks[0].findIndex((c) => c.accepts);
  if (steady) {
    for (const g of p.items) {
      const v = num(g);
      const trial = seq.slice();
      trial[at] = v;
      const d = trial.slice(1).map((x, i) => x - trial[i]);
      if (v !== seq[at] && d.every((x) => x === d[0])) fail(p.type, 'second arithmetic answer', p);
    }
  }
}

function checkLogic(p) {
  const n = p.passengers.length;
  const answers = P.seatings(n, p.rawClues);
  if (answers.length !== 1) fail('logic', `${answers.length} seatings fit`, p);
  // Independent brute force: try every way of seating the passengers, applying clues by hand.
  let count = 0;
  const walk = (seat, used) => {
    if (seat.length === n) {
      const ok = p.rawClues.every((c) => {
        const A = seat[c.a];
        const B = seat[c.b];
        switch (c.t) {
          case 'at': return A === c.n;
          case 'notAt': return A !== c.n;
          case 'left': return A < B;
          case 'next': return Math.abs(A - B) === 1;
          case 'notNext': return Math.abs(A - B) !== 1;
          case 'justLeft': return A + 1 === B;
          case 'loco': return A === n - 1;
          default: throw new Error(c.t);
        }
      });
      if (ok) {
        count += 1;
        p.tracks[0].forEach((car, pos) => {
          const who = seat.indexOf(pos);
          if (!car.accepts.includes(P.key({ k: 'icon', id: p.passengers[who] }))) fail('logic', 'carriage disagrees with clues', p);
        });
      }
      return;
    }
    for (let i = 0; i < n; i++) if (!used.has(i)) walk(seat.concat([i]), new Set(used).add(i));
  };
  walk([], new Set());
  if (count !== 1) fail('logic', `brute force found ${count}`, p);
  clueCounts.set(n, Math.max(clueCounts.get(n) || 0, p.clues.length));
}

function checkEquation(p) {
  const values = p.items.map(num);
  const n = p.ids.length;
  let count = 0;
  const walk = (assign) => {
    if (assign.length === n) {
      const val = (g) => assign[p.ids.indexOf(g.id)];
      const ok = p.eqs.every(([a, op, b, total]) => (op === '+' ? val(a) + val(b) : val(a) - val(b)) === total);
      if (ok) count += 1;
      return;
    }
    values.forEach((v) => { if (!assign.includes(v)) walk(assign.concat([v])); });
  };
  walk([]);
  if (count !== 1) fail('equation', `${count} assignments fit`, p);
}

function checkOdd(p) {
  const accepted = new Set(p.tracks[0][0].accepts);
  const left = p.items.filter((g) => !accepted.has(P.key(g)));
  if (left.length !== 1 || P.key(left[0]) !== p.oddKey) fail('odd', 'wrong number left over', p);
  if (['parity', 'five', 'three'].includes(p.variant)) {
    const test = { parity: (v) => v % 2, five: (v) => v % 5 === 0, three: (v) => v % 3 === 0 }[p.variant];
    const groups = new Map();
    p.items.forEach((g) => {
      const t = test(num(g));
      groups.set(t, (groups.get(t) || 0) + 1);
    });
    if (![...groups.values()].includes(1)) fail('odd', 'rule does not single one out', p);
    if (new Set(p.items.map((g) => g.v.length)).size !== 1) fail('odd', 'mixed digit counts', p);
  }
  if (p.variant === 'color' && new Set(p.items.map((g) => g.shape)).size !== p.items.length) fail('odd', 'repeated shape', p);
  if (p.variant === 'shape' && new Set(p.items.map((g) => g.color)).size !== p.items.length) fail('odd', 'repeated colour', p);
}

function checkMatrix(p) {
  const cells = p.tracks.map((row) => row.map((c) => c.cargo || null));
  const hole = p.tracks.flat().find((c) => c.accepts);
  const answer = p.items.find((g) => hole.accepts.includes(P.key(g)));
  const grid = cells.map((row) => row.map((g) => g || answer));
  // Each varying attribute must be a consistent function of position: every row is either
  // constant in it or uses all three values, and the same goes for every column.
  for (const a of p.attrs) {
    const lines = [...grid, ...[0, 1, 2].map((j) => grid.map((row) => row[j]))];
    for (const line of lines) {
      const size = new Set(line.map((g) => g[a])).size;
      if (size === 2) fail('matrix', `attribute ${a} has a 2-value line`, p);
    }
  }
  // A wrong item must break at least one of those lines if put in the hole.
  for (const g of p.items) {
    if (g === answer) continue;
    const trial = cells.map((row) => row.map((c) => c || g));
    const lines = [...trial, ...[0, 1, 2].map((j) => trial.map((row) => row[j]))];
    const breaks = p.attrs.some((a) => lines.some((l) => new Set(l.map((x) => x[a])).size === 2));
    if (!breaks) fail('matrix', 'wrong item also fits the lines', p);
  }
  if (p.items.length < 3) fail('matrix', 'too few choices', p);
}

function checkMirror(p) {
  for (const car of p.tracks[0]) {
    const flipped = car.label.cells.map((c) => Math.floor(c / 3) * 3 + 2 - (c % 3)).sort((a, b) => a - b);
    const want = P.key({ k: 'grid', cells: flipped, color: car.label.color });
    if (!car.accepts.includes(want)) fail('mirror', 'item is not the mirror image', p);
    if (want === P.key(car.label)) fail('mirror', 'symmetric picture', p);
  }
}

function checkSum(p) {
  for (const car of p.tracks[0]) {
    const m = /^(\d+)([+−×])(\d+)$/.exec(car.label.v);
    const [a, b] = [Number(m[1]), Number(m[3])];
    const v = m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
    if (!car.accepts.includes(P.key({ k: 'text', v: String(v) }))) fail('sum', 'wrong result', p);
  }
}

function checkOrder(p) {
  const ranks = p.tracks[0].map((car) => {
    const g = p.items.find((x) => car.accepts.includes(P.key(x)));
    return isText(g) ? num(g) : g.k === 'count' ? g.n : g.size;
  });
  const sorted = ranks.slice().sort((a, b) => (p.down ? b - a : a - b));
  if (ranks.join() !== sorted.join()) fail('order', 'carriages not in order', p);
}

function checkPattern(p) {
  checkSequenceGivens(p);
  if (p.motif === 'two') return;
  const period = p.motif.length;
  const cars = p.tracks[0];
  // The whole first period must be visible so the rule can be seen.
  if (cars.slice(0, period).some((c) => !c.cargo)) fail('pattern', 'first period hidden', p);
}

function checkAnalogy(p) {
  const [[a, b], [c, d]] = p.tracks;
  if (!a.cargo || !b.cargo || !c.cargo || !d.accepts) fail('analogy', 'bad layout', p);
  if (P.key(a.cargo) === P.key(b.cargo)) fail('analogy', 'nothing changes', p);
  if (p.items.length < 3) fail('analogy', 'too few choices', p);
  if (p.kind === 'number') {
    const k = num(b.cargo) - num(a.cargo);
    if (!d.accepts.includes(P.key({ k: 'text', v: String(num(c.cargo) + k) }))) fail('analogy', 'wrong sum', p);
    if (num(a.cargo) * 2 === num(b.cargo)) fail('analogy', 'also reads as doubling', p);
  }
  // A choice that only differs in rotation on a symmetric shape would look identical.
  const looks = p.items.map((g) => (g.k === 'shape' && !['arrow', 'wedge'].includes(g.shape)
    ? P.key(Object.assign({}, g, { rot: 0 })) : P.key(g)));
  if (new Set(looks).size !== looks.length) fail('analogy', 'two choices look identical', p);
}

function checkShunt(p) {
  const [top, middle, bottom] = p.tracks.map((t) => t.map((c) => c.cargo && P.key(c.cargo)));
  const answer = p.tracks[2].map((c) => c.accepts[0]);
  if (bottom.some(Boolean)) fail('shunt', 'bottom train is not empty', p);
  if (new Set(top).size !== top.length) fail('shunt', 'repeated carriage', p);
  // Read the move off the two visible trains, as a player has to.
  const from = middle.map((k) => top.indexOf(k));
  if (from.some((v, i) => v === i)) fail('shunt', 'a carriage stays put', p);
  let line = middle;
  for (let i = 0; i < p.times; i++) line = from.map((f) => line[f]);
  if (line.join('|') !== answer.join('|')) fail('shunt', 'answer is not the same move', p);
  if (line.join('|') === top.join('|') || line.join('|') === middle.join('|')) fail('shunt', 'answer repeats a visible train', p);
}

// Every way of combining two cells, with every turn and flip of the second picture.
const CELL_RULES = Array.from({ length: 16 }, (_, table) => (a, b) => Boolean(table & (1 << (a * 2 + b))));
const coords = (i) => [i % 3 - 1, Math.floor(i / 3) - 1];
const SYMMETRIES = [
  ([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x],
  ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [y, x], ([x, y]) => [-y, -x],
];

function overlayCells(a, b, rule, symmetry) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    const [x, y] = symmetry(coords(i));
    if (rule(Number(a.includes(i)), Number(b.includes((y + 1) * 3 + x + 1)))) out.push(i);
  }
  return out.join();
}

function checkOverlay(p) {
  const cells = (c) => (c.cargo ? c.cargo.cells : null);
  const [one, two, three] = p.tracks.map((t) => t.map(cells));
  const answer = p.items.find((g) => p.tracks[2][2].accepts.includes(P.key(g)));
  const results = new Set();
  let fits = 0;
  for (const rule of CELL_RULES) {
    for (const symmetry of SYMMETRIES) {
      if ([one, two].every(([a, b, c]) => overlayCells(a, b, rule, symmetry) === c.join())) {
        fits += 1;
        results.add(overlayCells(three[0], three[1], rule, symmetry));
      }
    }
  }
  if (!fits) fail('overlay', 'no rule explains the rows', p);
  if (!results.has(answer.cells.join())) fail('overlay', 'answer does not follow the rule', p);
  for (const g of p.items) {
    if (g !== answer && results.has(g.cells.join())) fail('overlay', 'a second rule picks another item', p);
  }
  if (p.items.length !== 6) fail('overlay', 'too few choices', p);
}

function checkCode(p) {
  const n = p.secret.length;
  const score = (guess, code) => {
    const hits = guess.filter((g, i) => g === code[i]).length;
    return [hits, guess.filter((g) => code.includes(g)).length - hits];
  };
  let count = 0;
  const walk = (code) => {
    if (code.length === n) {
      if (p.rawGuesses.every((g, i) => score(g, code).join() === `${p.clues[i].hits},${p.clues[i].near}`)) count += 1;
      return;
    }
    for (let v = 0; v < 6; v++) if (!code.includes(v)) walk(code.concat([v]));
  };
  walk([]);
  if (count !== 1) fail('code', `${count} codes fit`, p);
  p.tracks[0].forEach((car, i) => {
    if (!car.accepts.includes(P.key(p.pool[p.secret[i]]))) fail('code', 'carriage disagrees with the secret', p);
  });
  if (p.clues.some((c) => c.hits + c.near === 0)) fail('code', 'an attempt scored nothing', p);
  if (p.clues.length > n + 1) fail('code', 'too many attempts to show', p);
}

function checkLiar(p) {
  const n = p.passengers.length;
  const holds = (seat, c) => {
    const A = seat[c.a];
    const B = seat[c.b];
    switch (c.t) {
      case 'notAt': return A !== c.n;
      case 'left': return A < B;
      case 'justLeft': return A + 1 === B;
      case 'next': return Math.abs(A - B) === 1;
      case 'notNext': return Math.abs(A - B) !== 1;
      case 'gap': return Math.abs(A - B) === 2;
      default: throw new Error(c.t);
    }
  };
  let count = 0;
  const together = new Set();
  const walk = (seat) => {
    if (seat.length === n) {
      const met = p.rawClues.map((c, i) => (holds(seat, c) ? i : -1)).filter((i) => i >= 0);
      met.forEach((x, i) => met.slice(i + 1).forEach((y, j) => met.slice(i + j + 2).forEach((z) => together.add(`${x},${y},${z}`))));
      const lies = p.rawClues.filter((c) => !holds(seat, c));
      if (lies.length !== 1) return;
      count += 1;
      if (lies[0] !== p.lie) fail('liar', 'a different clue is the lie', p);
      p.tracks[0].forEach((car, pos) => {
        const who = seat.indexOf(pos);
        if (!car.accepts.includes(P.key({ k: 'icon', id: p.passengers[who] }))) fail('liar', 'carriage disagrees with clues', p);
      });
      return;
    }
    for (let i = 0; i < n; i++) if (!seat.includes(i)) walk(seat.concat([i]));
  };
  walk([]);
  if (count !== 1) fail('liar', `${count} seatings fit`, p);
  // The lie must not show itself by contradicting one or two other clues outright.
  const m = p.rawClues.length;
  if (together.size !== (m * (m - 1) * (m - 2)) / 6) fail('liar', 'a few clues openly contradict', p);
  if (p.hint[1].n !== p.rawClues.indexOf(p.lie) + 1) fail('liar', 'hint names the wrong clue', p);
  if (p.clues.length > n + 1) fail('liar', 'too many clues to show', p);
}

const isPrime = (v) => {
  for (let d = 2; d * d <= v; d++) if (v % d === 0) return false;
  return v > 1;
};
const steps = (s) => s.slice(1).map((v, i) => v - s[i]);
const SEQ_RULES = {
  fibonacci: (s) => s.slice(2).every((v, i) => v === s[i] + s[i + 1]),
  linear: (s) => { const p = (s[2] - s[1]) / (s[1] - s[0]); return s.slice(2).every((v, i) => v - s[i + 1] === p * (s[i + 1] - s[i])); },
  squares: (s) => { const d = steps(steps(s)); return d.every((v) => v === 2) || steps(d).every((v) => v === 6); },
  interleaved: (s) => [0, 1].every((o) => new Set(steps(s.filter((_, i) => i % 2 === o))).size === 1),
  doublingSteps: (s) => { const d = steps(s); return d.slice(1).every((v, i) => v === d[i] * (d[1] / d[0])); },
  alternating: (s) => { const q = s[2] - s[1]; const p = s[1] / s[0]; return s.every((v, i) => !i || v === (i % 2 ? s[i - 1] * p : s[i - 1] + q)); },
  primes: (s) => [-2, -1, 0, 1].some((k) => s.every((v) => isPrime(v + k))),
  digitSums: (s) => s.slice(1).every((v, i) => v === s[i] + [...String(s[i])].reduce((sum, d) => sum + Number(d), 0)),
  primeSteps: (s) => steps(s).every(isPrime),
};

function checkHardSeq(p) {
  const cars = p.tracks.flat();
  if (cars.length !== 8 || cars.slice(0, 6).some((c) => !c.cargo) || cars.slice(6).some((c) => !c.accepts)) fail('hardseq', 'bad layout', p);
  if (p.seq.some((v) => v < 0 || v > 999)) fail('hardseq', 'term out of range', p);
  if (!SEQ_RULES[p.kind](p.seq)) fail('hardseq', `not a ${p.kind} sequence`, p);
  // A plainer rule must not explain the six visible terms and predict something else.
  const shown = p.seq.slice(0, 6);
  const want = p.seq.slice(6).join();
  for (let a = -4; a <= 4; a++) {
    for (let b = -4; b <= 4; b++) {
      for (let c = -200; c <= 200; c++) {
        const next = (x, y) => a * y + b * x + c;
        if (!shown.slice(2).every((v, i) => v === next(shown[i], shown[i + 1]))) continue;
        const x = next(shown[4], shown[5]);
        if (`${x},${next(shown[5], x)}` !== want) fail('hardseq', 'a recurrence reads differently', p);
      }
    }
  }
  if (new Set(steps(steps(steps(shown)))).size === 1 && !['squares', 'fibonacci'].includes(p.kind)) {
    const row3 = steps(steps(steps(shown)))[0];
    const d = [shown, steps(shown), steps(steps(shown))].map((s) => s[s.length - 1]);
    const x = d[0] + d[1] + d[2] + row3;
    if (x !== p.seq[6]) fail('hardseq', 'a polynomial reads differently', p);
  }
}

function checkSystem(p) {
  const n = p.ids.length;
  const calc = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b };
  let count = 0;
  const walk = (assign) => {
    if (assign.length === n) {
      const val = (g) => assign[p.ids.indexOf(g.id)];
      if (p.eqs.every(([a, op, b, total]) => calc[op](val(a), val(b)) === total)) {
        count += 1;
        if (assign.join() !== p.vals.join()) fail('system', 'a different assignment fits', p);
      }
      return;
    }
    for (let v = 1; v <= 9; v++) if (!assign.includes(v)) walk(assign.concat([v]));
  };
  walk([]);
  if (count !== 1) fail('system', `${count} assignments fit`, p);
  if (p.eqs.some(([a, , b]) => a.id === b.id)) fail('system', 'a line has only one picture', p);
  if (p.items.length !== 6) fail('system', 'too few choices', p);
}

const SPECIFIC = {
  numseq: checkNumberSeq,
  logic: checkLogic,
  equation: checkEquation,
  odd: checkOdd,
  matrix: checkMatrix,
  mirror: checkMirror,
  sum: checkSum,
  order: checkOrder,
  pattern: checkPattern,
  analogy: checkAnalogy,
  visual: checkSequenceGivens,
  gridseq: checkSequenceGivens,
  shunt: checkShunt,
  overlay: checkOverlay,
  code: checkCode,
  liar: checkLiar,
  hardseq: checkHardSeq,
  system: checkSystem,
};

function checkText(p) {
  for (const lang of Object.keys(STRINGS)) {
    const s = STRINGS[lang];
    if (!s.prompts[p.prompt[0]]) fail(p.type, `no ${lang} prompt ${p.prompt[0]}`, p);
    if (!s.hints[p.hint[0]]) fail(p.type, `no ${lang} hint ${p.hint[0]}`, p);
    const placeholders = (s.hints[p.hint[0]] || '').match(/\{(\w+)\}/g) || [];
    for (const ph of placeholders) {
      if (!p.hint[1] || p.hint[1][ph.slice(1, -1)] === undefined) fail(p.type, `hint ${p.hint[0]} lacks ${ph}`, p);
    }
    if (p.hint[2] && !s.hints[p.hint[2]]) fail(p.type, `no ${lang} hint ${p.hint[2]}`, p);
    for (const c of p.clues || []) if (c.id && !s.clues[c.id]) fail(p.type, `no ${lang} clue ${c.id}`, p);
  }
}

function checkShape(p) {
  const cars = Math.max(...p.tracks.map((t) => t.length));
  if (cars > 6) fail(p.type, 'more than 6 carriages', p);
  if (p.items.length > 6) fail(p.type, 'more than 6 items', p);
  for (const car of p.tracks.flat()) {
    if (car.accepts && !p.items.some((g) => car.accepts.includes(P.key(g)))) fail(p.type, 'no item fits a slot', p);
  }
}

let total = 0;
for (let level = 1; level <= P.MAX_LEVEL; level++) {
  for (const t of P.TYPES.filter((x) => x.min <= level && level <= x.max)) {
    for (let i = 0; i < perCase; i++) {
      const rnd = P.seeded(level * 1000003 + t.id.length * 7919 + i * 31 + t.id.charCodeAt(1));
      let p;
      try {
        p = P.generate(level, { type: t.id, rnd });
      } catch (e) {
        fail(t.id, `threw: ${e.message}`, null);
        continue;
      }
      total += 1;
      seen.set(p.type, (seen.get(p.type) || 0) + 1);
      if (!P.isValid(p)) fail(p.type, 'isValid rejected', p);
      checkShape(p);
      checkText(p);
      if (SPECIFIC[p.type]) SPECIFIC[p.type](p);
    }
  }
}

// Normal selection must work at every level, with and without recent types excluded.
for (let level = 1; level <= P.MAX_LEVEL + 3; level++) {
  const recent = [];
  for (let i = 0; i < 200; i++) {
    const p = P.generate(level, { recent, rnd: P.seeded(level * 77 + i) });
    if (recent.includes(p.type) && P.TYPES.filter((x) => x.min <= level && level <= x.max).length > 3) {
      fail(p.type, 'repeated a recent type', p);
    }
    // Children must never meet the adult tier, and adults must never get a children's puzzle.
    if (p.blind !== (level >= P.EXPERT_LEVEL)) fail(p.type, 'puzzle in the wrong tier', p);
    if (level < P.EXPERT_LEVEL && ['shunt', 'overlay', 'code', 'liar', 'hardseq', 'system'].includes(p.type)) fail(p.type, 'adult type for a child', p);
    if (level >= P.EXPERT_LEVEL && !['shunt', 'overlay', 'code', 'liar', 'hardseq', 'system', 'matrix'].includes(p.type)) fail(p.type, 'child type for an adult', p);
    recent.push(p.type);
    if (recent.length > 3) recent.shift();
  }
}

console.log(`checked ${total} puzzles`);
console.log([...seen].map(([k, v]) => `${k}:${v}`).join(' '));
console.log('most clues by passenger count:', Object.fromEntries(clueCounts));
if (failures.size) {
  for (const [id, f] of failures) {
    console.log(`FAIL ${id} (x${f.n})`);
    if (f.sample) console.log('   ', JSON.stringify({ tracks: f.sample.tracks, items: f.sample.items }).slice(0, 420));
  }
  process.exit(1);
}
console.log('all good');
