// All pictures are drawn here as inline SVG, so the game needs no image files or emoji fonts.
const Art = (() => {
  const COLOR = {
    red: '#e0433f', blue: '#2f7fd6', green: '#35a052',
    yellow: '#f4bb1c', purple: '#8b58cf', orange: '#f27c21',
  };
  const INK = '#33291f';

  const ICONS = {
    apple: `<path d="M50 32C41 21 17 23 15 49c-2 22 14 43 25 43 5 0 7-3 10-3s5 3 10 3c11 0 27-21 25-43C83 23 59 21 50 32z" fill="#e0433f"/>
      <path d="M28 42c-4 7-4 18 1 26" stroke="#f6a39e" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M50 33c0-9 2-15 7-21" stroke="#6b4423" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M56 22c5-11 18-13 27-9-3 10-16 16-27 9z" fill="#47a44b"/>`,
    cherries: `<path d="M34 62C38 40 48 24 66 12M70 62C70 42 68 26 66 12" stroke="#5c8a32" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M66 12c9-6 20-3 24 5-9 6-19 4-24-5z" fill="#47a44b"/>
      <circle cx="31" cy="72" r="20" fill="#d32f3f"/><circle cx="72" cy="72" r="20" fill="#e0433f"/>
      <circle cx="24" cy="66" r="5" fill="#f6a39e"/><circle cx="65" cy="66" r="5" fill="#f9b6b1"/>`,
    lemon: `<g transform="rotate(-24 50 52)"><path d="M6 52c5-3 7-6 10-10 7-13 21-20 34-20s27 7 34 20c3 4 5 7 10 10-5 3-7 6-10 10-7 13-21 20-34 20s-27-7-34-20c-3-4-5-7-10-10z" fill="#f7d02c"/>
      <path d="M30 38c-6 4-9 9-10 15" stroke="#fdeb8f" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      <path d="M72 18c4-7 11-9 17-7-2 7-10 11-17 7z" fill="#47a44b"/>`,
    pear: `<path d="M52 18c-9 0-13 8-13 17 0 11-20 17-20 36 0 15 14 24 32 24s31-9 31-24c0-19-19-25-19-36 0-9-3-17-11-17z" fill="#b6cc3e"/>
      <path d="M32 62c-3 7-1 14 4 19" stroke="#dbe88d" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M52 20c0-6 1-10 5-14" stroke="#6b4423" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M57 15c6-7 15-7 21-3-4 8-14 10-21 3z" fill="#47a44b"/>`,
    banana: `<path d="M18 14C10 52 38 90 86 82c6-1 7-8 2-10C58 66 38 46 31 13c-1-6-11-6-13 1z" fill="#f7d02c"/>
      <path d="M24 20c0 28 24 54 58 58" stroke="#d9a916" stroke-width="3" fill="none"/>
      <path d="M17 16l1-8 11 1 1 8z" fill="#7a5a22"/>`,
    strawberry: `<path d="M50 94C30 82 12 58 17 40c3-12 18-14 33-10 15-4 30-2 33 10 5 18-13 42-33 54z" fill="#e0433f"/>
      <g fill="#fbe6a2"><ellipse cx="34" cy="48" rx="2.4" ry="3.6"/><ellipse cx="50" cy="46" rx="2.4" ry="3.6"/><ellipse cx="66" cy="48" rx="2.4" ry="3.6"/><ellipse cx="42" cy="62" rx="2.4" ry="3.6"/><ellipse cx="58" cy="62" rx="2.4" ry="3.6"/><ellipse cx="50" cy="77" rx="2.4" ry="3.6"/></g>
      <path d="M50 34C42 38 30 38 24 30c6-2 11-4 14-7-1-4 0-7 3-9l9 6 9-6c3 2 4 5 3 9 3 3 8 5 14 7-6 8-18 8-26 4z" fill="#47a44b"/>`,
    grapes: `<path d="M50 20c0-6 2-10 6-14" stroke="#6b4423" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M54 20c8-9 22-9 30-3-6 11-20 13-30 3z" fill="#47a44b"/>
      <g fill="#8b58cf"><circle cx="30" cy="36" r="13"/><circle cx="55" cy="33" r="13"/><circle cx="74" cy="44" r="12"/><circle cx="42" cy="55" r="13"/><circle cx="65" cy="62" r="13"/><circle cx="28" cy="60" r="11"/><circle cx="50" cy="78" r="13"/></g>
      <g fill="#c2a2ec"><circle cx="26" cy="32" r="3.4"/><circle cx="51" cy="29" r="3.4"/><circle cx="38" cy="51" r="3.4"/><circle cx="61" cy="58" r="3.4"/><circle cx="46" cy="74" r="3.4"/></g>`,
    cat: `<path d="M16 12l10 34 26-14zM84 12L74 46 48 32z" fill="#f09a3e"/><path d="M22 22l6 18 12-7zM78 22l-6 18-12-7z" fill="#fbd3b0"/>
      <ellipse cx="50" cy="58" rx="37" ry="32" fill="#f09a3e"/>
      <path d="M50 26v12M38 28l3 10M62 28l-3 10" stroke="#c96f1f" stroke-width="4" stroke-linecap="round"/>
      <circle cx="36" cy="54" r="5.5" fill="${INK}"/><circle cx="64" cy="54" r="5.5" fill="${INK}"/>
      <path d="M45 66h10l-5 6z" fill="#e0616b"/><path d="M50 72c-2 6-9 6-11 2M50 72c2 6 9 6 11 2" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M26 66L6 62M26 72L7 76M74 66l20-4M74 72l19 4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    rabbit: `<path d="M34 50C22 30 22 6 32 4s18 22 16 44zM66 50C78 30 78 6 68 4S50 26 52 48z" fill="#d9d5cf"/>
      <path d="M36 42c-7-14-7-28-3-30s10 14 10 28zM64 42c7-14 7-28 3-30s-10 14-10 28z" fill="#f4b6c0"/>
      <ellipse cx="50" cy="66" rx="32" ry="29" fill="#ece8e1"/>
      <circle cx="37" cy="61" r="5" fill="${INK}"/><circle cx="63" cy="61" r="5" fill="${INK}"/>
      <path d="M45 71h10l-5 5z" fill="#e0616b"/><path d="M50 76v5M44 82h12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="45" y="82" width="10" height="7" rx="2" fill="#fff"/>`,
    bear: `<circle cx="22" cy="28" r="15" fill="#8d5a33"/><circle cx="78" cy="28" r="15" fill="#8d5a33"/><circle cx="22" cy="28" r="7" fill="#c99a6b"/><circle cx="78" cy="28" r="7" fill="#c99a6b"/>
      <circle cx="50" cy="55" r="37" fill="#a56c3e"/><ellipse cx="50" cy="68" rx="19" ry="15" fill="#e0bd93"/>
      <circle cx="36" cy="48" r="5" fill="${INK}"/><circle cx="64" cy="48" r="5" fill="${INK}"/>
      <ellipse cx="50" cy="61" rx="7" ry="5" fill="${INK}"/><path d="M50 66v6M41 74c4 3 14 3 18 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    frog: `<circle cx="28" cy="30" r="16" fill="#5dbb4f"/><circle cx="72" cy="30" r="16" fill="#5dbb4f"/>
      <ellipse cx="50" cy="62" rx="42" ry="30" fill="#5dbb4f"/>
      <circle cx="28" cy="28" r="9.5" fill="#fff"/><circle cx="72" cy="28" r="9.5" fill="#fff"/><circle cx="30" cy="29" r="5" fill="${INK}"/><circle cx="70" cy="29" r="5" fill="${INK}"/>
      <path d="M22 62c10 15 46 15 56 0" stroke="#2c6f2e" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="18" cy="54" r="5" fill="#f4a7a0"/><circle cx="82" cy="54" r="5" fill="#f4a7a0"/>`,
    pig: `<path d="M20 34L14 12l26 10zM80 34l6-22-26 10z" fill="#ec94a4"/>
      <circle cx="50" cy="55" r="37" fill="#f6b4c0"/><ellipse cx="50" cy="63" rx="17" ry="12.5" fill="#ec94a4"/>
      <ellipse cx="44" cy="63" rx="3.2" ry="4.4" fill="#a8485c"/><ellipse cx="56" cy="63" rx="3.2" ry="4.4" fill="#a8485c"/>
      <circle cx="34" cy="44" r="5" fill="${INK}"/><circle cx="66" cy="44" r="5" fill="${INK}"/>
      <path d="M40 81c6 3 14 3 20 0" stroke="#a8485c" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    fish: `<path d="M64 50L94 24c3 18 3 34 0 52z" fill="#f27c21"/>
      <path d="M6 50c10-22 32-30 48-26 11 3 18 14 20 26-2 12-9 23-20 26-16 4-38-4-48-26z" fill="#f79a3f"/>
      <path d="M40 26c6-10 16-14 24-12-2 6-4 10-4 14zM42 74c4 6 10 10 16 10-1-5-2-8-1-12z" fill="#f27c21"/>
      <path d="M36 32c5 12 5 24 0 36M50 28c4 14 4 30 0 44" stroke="#fbc98e" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="44" r="6" fill="#fff"/><circle cx="21" cy="44" r="3.4" fill="${INK}"/>`,
    bird: `<path d="M74 60l24 6-22 12z" fill="#2f7fd6"/><circle cx="48" cy="56" r="33" fill="#4f9fe8"/>
      <circle cx="34" cy="26" r="0" fill="none"/><ellipse cx="46" cy="68" rx="20" ry="16" fill="#cfe6fb"/>
      <path d="M50 46c12-3 26 4 28 18-12 6-25 2-28-18z" fill="#2f7fd6"/>
      <path d="M18 44L0 52l18 7z" fill="#f4bb1c"/>
      <circle cx="31" cy="44" r="5.5" fill="#fff"/><circle cx="30" cy="44" r="3" fill="${INK}"/>
      <path d="M42 24c2-8 8-13 14-14 0 6-2 10-4 14" fill="#2f7fd6"/>
      <path d="M40 88v8M56 88v8" stroke="#d99a1a" stroke-width="4" stroke-linecap="round"/>`,
    car: `<path d="M26 44l10-18c2-3 4-4 7-4h24c3 0 5 1 7 4l10 18z" fill="#2f7fd6"/>
      <path d="M36 42l6-12c1-1 2-2 3-2h8v14zM60 42V28h6c2 0 3 1 3 2l7 12z" fill="#cfe6fb"/>
      <rect x="6" y="42" width="88" height="28" rx="11" fill="#e0433f"/>
      <rect x="84" y="50" width="10" height="7" rx="3" fill="#f7d02c"/>
      <circle cx="28" cy="72" r="13" fill="${INK}"/><circle cx="28" cy="72" r="5.5" fill="#d9d5cf"/><circle cx="72" cy="72" r="13" fill="${INK}"/><circle cx="72" cy="72" r="5.5" fill="#d9d5cf"/>`,
    boat: `<path d="M50 8v58" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/>
      <path d="M55 12c18 12 28 28 30 46H55z" fill="#f6f1e4" stroke="#d9d0bb" stroke-width="2"/><path d="M45 22C36 34 26 46 16 58h29z" fill="#e0433f"/>
      <path d="M8 66h84c-2 12-12 22-22 22H30C20 88 10 78 8 66z" fill="#8d5a33"/>
      <path d="M2 92c8-6 16-6 24 0s16 6 24 0 16-6 24 0 16 6 24 0" stroke="#2f7fd6" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    plane: `<path d="M38 52L22 92h14l28-40zM42 42L28 12h12l24 30z" fill="#2f7fd6"/>
      <path d="M4 50c0-7 7-11 16-11h56c8 0 20 5 20 11s-12 11-20 11H20c-9 0-16-4-16-11z" fill="#f6f1e4" stroke="#d9d0bb" stroke-width="2"/>
      <path d="M4 50c0-7 7-11 16-11l-8-17h10l14 17z" fill="#e0433f"/>
      <g fill="#2f7fd6"><circle cx="50" cy="48" r="3.6"/><circle cx="62" cy="48" r="3.6"/><circle cx="74" cy="48" r="3.6"/></g>`,
    rocket: `<path d="M34 62L16 80l4-26zM66 62l18 18-4-26z" fill="#e0433f"/>
      <path d="M50 4c17 15 22 38 16 66H34C28 42 33 19 50 4z" fill="#f6f1e4" stroke="#d9d0bb" stroke-width="2"/>
      <path d="M50 4c8 7 13 15 15 25H35c2-10 7-18 15-25z" fill="#e0433f"/>
      <circle cx="50" cy="44" r="9.5" fill="#2f7fd6" stroke="#d9d0bb" stroke-width="3"/>
      <path d="M38 72h24L50 97z" fill="#f4bb1c"/><path d="M44 72h12L50 86z" fill="#f27c21"/>`,
    balloon: `<path d="M50 4c24 0 38 16 38 34 0 16-16 28-26 38H38C28 66 12 54 12 38 12 20 26 4 50 4z" fill="#e0433f"/>
      <path d="M50 4c10 0 15 16 15 34 0 16-5 28-9 38H44c-4-10-9-22-9-38 0-18 5-34 15-34z" fill="#f4bb1c"/>
      <path d="M40 76l2 10M60 76l-2 10" stroke="#6b4423" stroke-width="2.6"/>
      <rect x="39" y="85" width="22" height="12" rx="3" fill="#8d5a33"/>`,
    tree: `<rect x="42" y="60" width="16" height="34" rx="3" fill="#8d5a33"/>
      <circle cx="50" cy="32" r="26" fill="#3f9a4a"/><circle cx="28" cy="50" r="20" fill="#3f9a4a"/><circle cx="72" cy="50" r="20" fill="#3f9a4a"/>
      <circle cx="42" cy="26" r="8" fill="#6cc06f"/>`,
    flower: `<path d="M50 54v42" stroke="#47a44b" stroke-width="6" stroke-linecap="round"/><path d="M50 82c10-12 22-12 30-8-6 10-18 14-30 8z" fill="#47a44b"/>
      <g fill="#ee6fa0"><circle cx="50" cy="16" r="14"/><circle cx="72" cy="30" r="14"/><circle cx="64" cy="54" r="14"/><circle cx="36" cy="54" r="14"/><circle cx="28" cy="30" r="14"/></g>
      <circle cx="50" cy="36" r="12" fill="#f7d02c"/>`,
    mushroom: `<path d="M38 54h24c1 14 3 26 6 36-4 6-32 6-36 0 3-10 5-22 6-36z" fill="#f3e8d3"/>
      <path d="M6 58C6 28 28 10 50 10s44 18 44 48c-14 6-74 6-88 0z" fill="#e0433f"/>
      <g fill="#fff"><circle cx="34" cy="32" r="8"/><circle cx="62" cy="26" r="6"/><circle cx="74" cy="46" r="7"/><circle cx="50" cy="48" r="6"/><circle cx="22" cy="49" r="5"/></g>`,
    cactus: `<path d="M36 94V22c0-20 28-20 28 0v72z" fill="#3f9a4a"/>
      <path d="M36 62H24c-8 0-12-6-12-13V34c0-10 14-10 14 0v14h10zM64 52h12c8 0 12-6 12-13V26c0-10-14-10-14 0v12H64z" fill="#3f9a4a"/>
      <path d="M46 24v60M55 34v54" stroke="#6cc06f" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 96h48" stroke="#b98a55" stroke-width="6" stroke-linecap="round"/>`,
  };

  function star(cx, cy, R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 ? r : R;
      pts.push(`${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function polygon(sides, R) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
      pts.push(`${(50 + R * Math.cos(a)).toFixed(1)},${(50 + R * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  const OUTLINES = {
    circle: '<circle cx="50" cy="50" r="40"/>',
    square: '<rect x="13" y="13" width="74" height="74" rx="7"/>',
    triangle: '<path d="M50 11l42 74H8z"/>',
    star: `<polygon points="${star(50, 53, 46, 20)}"/>`,
    heart: '<path d="M50 89C20 66 7 49 8 32c1-14 12-23 24-22 8 0 14 5 18 12 4-7 10-12 18-12 12-1 23 8 24 22 1 17-12 34-42 57z"/>',
    diamond: '<path d="M50 6l36 44-36 44-36-44z"/>',
    hexagon: `<polygon points="${polygon(6, 43)}"/>`,
    cross: '<path d="M37 10h26v27h27v26H63v27H37V63H10V37h27z"/>',
    arrow: '<path d="M50 6l34 38H62v48H38V44H16z"/>',
    wedge: '<path d="M50 50L50 8a42 42 0 1 1-42 42z"/>',
    blob: '<path d="M50 8c14 0 18 10 28 13s16 16 11 28 2 22-9 31-22 3-32 8-26 3-32-9-1-20-4-31 4-22 15-26S36 8 50 8z"/>',
  };

  function fillStyle(g) {
    const c = COLOR[g.color];
    if (g.fill === 'outline') return `fill="#fffaf0" stroke="${c}" stroke-width="9" stroke-linejoin="round"`;
    if (g.fill === 'stripes') return `fill="url(#pat-s-${g.color})" stroke="${c}" stroke-width="6" stroke-linejoin="round"`;
    if (g.fill === 'dots') return `fill="url(#pat-d-${g.color})" stroke="${c}" stroke-width="6" stroke-linejoin="round"`;
    return `fill="${c}"`;
  }

  // Fills use patterns defined once for the whole page; see Art.defs().
  function defs() {
    const parts = Object.entries(COLOR).map(([name, c]) => `
      <pattern id="pat-s-${name}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="14" fill="#fffaf0"/><rect width="7" height="14" fill="${c}"/></pattern>
      <pattern id="pat-d-${name}" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#fffaf0"/><circle cx="8" cy="8" r="4.6" fill="${c}"/></pattern>`);
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${parts.join('')}</defs></svg>`;
  }

  function shapeInner(g) {
    const one = `<g ${fillStyle(g)}>${OUTLINES[g.shape]}</g>`;
    const spots = {
      1: [[50, 50, 1]],
      2: [[28, 50, 0.5], [72, 50, 0.5]],
      3: [[50, 27, 0.46], [27, 71, 0.46], [73, 71, 0.46]],
    }[g.n || 1];
    return spots.map(([x, y, s]) => {
      const k = s * (g.size || 1);
      const turn = g.rot ? ` rotate(${g.rot} 50 50)` : '';
      return `<g transform="translate(${x - 50 * k} ${y - 50 * k}) scale(${k})${turn}">${one}</g>`;
    }).join('');
  }

  function textInner(v) {
    const size = v.length <= 2 ? 66 : v.length === 3 ? 48 : v.length === 4 ? 38 : 31;
    return `<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="900" fill="${INK}" font-family="Nunito,'Trebuchet MS',sans-serif">${v}</text>`;
  }

  // Spots for up to 9 things, laid out like dice so a number can be seen at a glance.
  const COUNT_SPOTS = {
    1: [[50, 50]],
    2: [[30, 50], [70, 50]],
    3: [[50, 28], [28, 70], [72, 70]],
    4: [[29, 29], [71, 29], [29, 71], [71, 71]],
    5: [[24, 24], [76, 24], [50, 50], [24, 76], [76, 76]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
    7: [[22, 22], [50, 22], [78, 22], [36, 50], [64, 50], [36, 78], [64, 78]],
    8: [[22, 22], [50, 22], [78, 22], [22, 50], [78, 50], [22, 78], [50, 78], [78, 78]],
    9: [[22, 22], [50, 22], [78, 22], [22, 50], [50, 50], [78, 50], [22, 78], [50, 78], [78, 78]],
  };

  function countInner(g) {
    const k = g.n <= 2 ? 0.42 : g.n <= 4 ? 0.38 : g.n <= 6 ? 0.28 : 0.25;
    return COUNT_SPOTS[g.n].map(([x, y]) => (
      `<g transform="translate(${x - 50 * k} ${y - 50 * k}) scale(${k})">${ICONS[g.id]}</g>`)).join('');
  }

  function gridInner(g) {
    let out = '';
    for (let i = 0; i < 9; i++) {
      const x = 11 + (i % 3) * 27;
      const y = 11 + Math.floor(i / 3) * 27;
      const on = g.cells.includes(i);
      out += `<rect x="${x}" y="${y}" width="25" height="25" rx="4" fill="${on ? COLOR[g.color] : '#ece2cc'}"/>`;
    }
    return out;
  }

  function clockInner(g) {
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const big = i % 3 === 0;
      const r1 = big ? 33 : 36;
      ticks += `<line x1="${(50 + r1 * Math.sin(a)).toFixed(1)}" y1="${(50 - r1 * Math.cos(a)).toFixed(1)}" x2="${(50 + 41 * Math.sin(a)).toFixed(1)}" y2="${(50 - 41 * Math.cos(a)).toFixed(1)}" stroke="${INK}" stroke-width="${big ? 4 : 2}" stroke-linecap="round"/>`;
    }
    const hourAngle = ((g.h % 12) + g.m / 60) * 30;
    const minuteAngle = g.m * 6;
    return `<circle cx="50" cy="50" r="46" fill="#fff" stroke="${INK}" stroke-width="5"/>${ticks}
      <line x1="50" y1="50" x2="50" y2="27" stroke="${INK}" stroke-width="7" stroke-linecap="round" transform="rotate(${hourAngle} 50 50)"/>
      <line x1="50" y1="50" x2="50" y2="15" stroke="#e0433f" stroke-width="4.5" stroke-linecap="round" transform="rotate(${minuteAngle} 50 50)"/>
      <circle cx="50" cy="50" r="5" fill="${INK}"/>`;
  }

  function inner(g) {
    switch (g.k) {
      case 'icon': return g.shadow ? `<g class="silhouette">${ICONS[g.id]}</g>` : ICONS[g.id];
      case 'text': return textInner(g.v);
      case 'shape': return shapeInner(g);
      case 'count': return countInner(g);
      case 'grid': return gridInner(g);
      case 'clock': return clockInner(g);
      case 'poly': return `<polygon points="${polygon(g.sides, 44)}" fill="${COLOR[g.color]}"/>`;
      default: throw new Error(`unknown glyph ${g.k}`);
    }
  }

  const svg = (g) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner(g)}</svg>`;

  const STAR = `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${star(50, 53, 46, 21)}" fill="#f4bb1c" stroke="#b9820c" stroke-width="5" stroke-linejoin="round"/></svg>`;

  const UI = {
    hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" fill="currentColor"/><rect x="9.5" y="19.5" width="5" height="2.5" rx="1" fill="currentColor"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };

  const WHEEL = `<svg class="wheel" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#2c2620"/><circle cx="50" cy="50" r="34" fill="#c9a14a"/><g class="spin"><path d="M50 18v64M18 50h64M27 27l46 46M73 27L27 73" stroke="#2c2620" stroke-width="8"/></g><circle cx="50" cy="50" r="11" fill="#2c2620"/></svg>`;

  // The locomotive faces right, pulling the carriages behind it. Its wheels, side rod and
  // chimney carry classes so game.js can animate them and find where the smoke comes out.
  function locomotive() {
    const wheel = (cx, r) => `<g class="lw" data-cx="${cx}" data-cy="${136 - r}" data-r="${r}">
      <circle cx="${cx}" cy="${136 - r}" r="${r}" fill="#2c2620"/><circle cx="${cx}" cy="${136 - r}" r="${r - 6}" fill="#d8413d"/>
      <path d="M${cx} ${136 - 2 * r + 7}V${136 - 7}M${cx - r + 7} ${136 - r}H${cx + r - 7}" stroke="#2c2620" stroke-width="4"/>
      <circle cx="${cx}" cy="${136 - r}" r="5" fill="#f4bb1c"/></g>`;
    return `<svg class="loco-art" viewBox="0 0 216 140" aria-hidden="true">
      <rect x="4" y="98" width="196" height="12" rx="4" fill="#2c2620"/>
      <path d="M200 110l14 22h-30l-6-22z" fill="#c9a14a" stroke="#2c2620" stroke-width="3"/>
      <rect x="12" y="24" width="66" height="76" rx="6" fill="#d8413d"/>
      <rect x="4" y="14" width="82" height="13" rx="6" fill="#2c2620"/>
      <rect x="24" y="36" width="42" height="32" rx="6" fill="#bfe3f4" stroke="#2c2620" stroke-width="4"/>
      <circle cx="45" cy="56" r="10" fill="#f6cfa8"/><path d="M34 52c0-11 22-11 22 0z" fill="#2f5ea8"/><rect x="33" y="50" width="26" height="4" rx="2" fill="#23467e"/>
      <circle cx="41" cy="58" r="1.6" fill="#2c2620"/><circle cx="49" cy="58" r="1.6" fill="#2c2620"/>
      <rect x="74" y="48" width="122" height="52" rx="24" fill="#2f7a55"/>
      <path d="M92 50v50M122 50v50M152 50v50" stroke="#f4bb1c" stroke-width="5"/>
      <rect x="182" y="52" width="16" height="44" rx="7" fill="#2c2620"/>
      <circle cx="201" cy="66" r="7" fill="#f7d02c" stroke="#2c2620" stroke-width="3"/>
      <path d="M100 48c0-16 24-16 24 0z" fill="#f4bb1c" stroke="#2c2620" stroke-width="3"/>
      <path d="M150 48l-4-26h26l-4 26z" fill="#2c2620"/>
      <rect class="stack" x="141" y="12" width="36" height="11" rx="4" fill="#2c2620"/>
      ${wheel(40, 30)}${wheel(112, 22)}${wheel(164, 22)}
      <g class="rod"><rect x="34" y="108" width="136" height="7" rx="3.5" fill="#f4bb1c" stroke="#2c2620" stroke-width="2"/></g>
    </svg>`;
  }

  // Scenery. Each theme is a palette plus the kind of tree on its hills.
  const THEMES = [
    { sky: ['#8fd3f4', '#e4f6ee'], far: '#a9d99a', near: '#7cc46e', sun: '#ffd95e', tree: 'round', treeColor: '#3f9a4a', ground: '#8cb96a', platform: '#d9c9a8' },
    { sky: ['#a7dbe0', '#eef5dc'], far: '#6fae7c', near: '#4e9460', sun: '#ffe08a', tree: 'pine', treeColor: '#22694a', ground: '#6d9e5c', platform: '#cfc3a4' },
    { sky: ['#7fc8f0', '#d9f1f7'], far: '#8fcfa8', near: '#6dbd8d', sun: '#fff0a0', tree: 'round', treeColor: '#3a8f62', ground: '#83b878', platform: '#dccfb2', lake: true },
    { sky: ['#f2cf95', '#fcefd2'], far: '#e0a94f', near: '#cc7f33', sun: '#ffe9a8', tree: 'round', treeColor: '#c4511f', ground: '#b58a4b', platform: '#dcc7a0' },
    { sky: ['#f08a6a', '#fbd58e'], far: '#a65f7e', near: '#7c4a78', sun: '#ffe08a', tree: 'pine', treeColor: '#4d2f60', ground: '#73527a', platform: '#d6b39c' },
    { sky: ['#bcd9ee', '#f2f8fc'], far: '#e6eef5', near: '#fbfdff', sun: '#fff6cc', tree: 'pine', treeColor: '#4d8a7a', ground: '#dfe9f0', platform: '#c7cfd6', snow: true },
    { sky: ['#1d2a5c', '#3f4f8c'], far: '#2c3a70', near: '#1f2c58', sun: '#f4efd0', tree: 'pine', treeColor: '#14204a', ground: '#27376a', platform: '#8d94ad', night: true },
  ];

  function tree(kind, x, y, s, color, snow) {
    if (kind === 'pine') {
      const cap = snow ? `<path d="M${x} ${y - 66 * s}l${12 * s} ${22 * s}h${-24 * s}z" fill="#fff"/>` : '';
      return `<rect x="${x - 4 * s}" y="${y - 12 * s}" width="${8 * s}" height="${14 * s}" fill="#5c3d24"/>
        <path d="M${x} ${y - 66 * s}l${22 * s} ${40 * s}h${-44 * s}zM${x} ${y - 46 * s}l${28 * s} ${38 * s}h${-56 * s}z" fill="${color}"/>${cap}`;
    }
    return `<rect x="${x - 4 * s}" y="${y - 18 * s}" width="${8 * s}" height="${20 * s}" fill="#6b4423"/>
      <circle cx="${x}" cy="${y - 34 * s}" r="${22 * s}" fill="${color}"/><circle cx="${x - 15 * s}" cy="${y - 22 * s}" r="${14 * s}" fill="${color}"/><circle cx="${x + 15 * s}" cy="${y - 22 * s}" r="${14 * s}" fill="${color}"/>`;
  }

  function scene(index) {
    const t = THEMES[index % THEMES.length];
    const spots = [[130, 322, 1], [250, 345, 1.3], [430, 318, 0.9], [640, 342, 1.2], [860, 322, 1], [1030, 345, 1.4], [1210, 320, 0.9], [1390, 342, 1.2], [1520, 325, 1]];
    const trees = spots.map(([x, y, s]) => tree(t.tree, x, y, s, t.treeColor, t.snow)).join('');
    let stars = '';
    if (t.night) {
      for (let i = 0; i < 40; i++) {
        stars += `<circle cx="${(i * 197) % 1600}" cy="${(i * 83) % 230}" r="${1.4 + (i % 3)}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`;
      }
    }
    const lake = t.lake ? '<ellipse cx="1120" cy="372" rx="430" ry="30" fill="#5cb4e4"/><ellipse cx="1060" cy="368" rx="240" ry="9" fill="#a8dcf5"/>' : '';
    const moon = t.night ? '<circle cx="1280" cy="72" r="46" fill="#1d2a5c" transform="translate(-22 -9)"/>' : '';
    return `<svg class="scene-art" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><linearGradient id="sky${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient></defs>
      <rect x="-400" y="-1200" width="2400" height="1600" fill="url(#sky${index})"/>${stars}
      <circle cx="1280" cy="82" r="50" fill="${t.sun}"/>${moon}
      <path d="M0 260C180 170 340 220 520 240S860 150 1060 220s340-30 540 40v140H0z" fill="${t.far}"/>
      <path d="M0 330c200-70 420-30 640-10s460-60 960 0v80H0z" fill="${t.near}"/>${lake}${trees}
    </svg>`;
  }

  return { svg, defs, STAR, UI, WHEEL, locomotive, scene, THEMES, COLOR };
})();
