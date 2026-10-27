/* Deterministic, seekable digestion scenes. The host owns the playback clock. */
import { ENZYMES, maskEnzymeNames } from './memory.mjs';
import { PANCREATIC_ENZYMES, pancreaticEnzymePositions } from './pancreas.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const C = {
  ink: '#243c3a', soft: '#657973', cream: '#fff9ed', paper: '#fffdf7',
  wall: '#efb1a2', wallDeep: '#d47a6e', wallPale: '#f9ded3',
  enzyme: '#087e78', enzymeLight: '#d5eee6', starch: '#f2be49',
  starchEdge: '#a77718', protein: '#71a8dd', proteinEdge: '#366a9b',
  fat: '#ed9950', fatEdge: '#b86223', water: '#67b7df',
  blood: '#d95d68', lymph: '#64a579', bile: '#9baa3e', residue: '#987055',
};
let sceneSerial = 0;
const textOriginals = new WeakMap();
const ariaOriginals = new WeakMap();
const nodeNameStates = new WeakMap();

const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const progress = (t, start, end) => clamp((t - start) / (end - start));
const smooth = (n) => n * n * (3 - 2 * n);
const mix = (a, b, n) => a + (b - a) * n;
const tween = (t, start, end) => smooth(progress(t, start, end));
const point = (a, b, n) => [mix(a[0], b[0], n), mix(a[1], b[1], n)];
const gate = (t, start, end, fade = .6) => Math.min(progress(t, start, start + fade), 1 - progress(t, end - fade, end));

function el(tag, attributes = {}, parent, text) {
  const node = document.createElementNS(SVG_NS, tag);
  attr(node, attributes);
  if (text !== undefined) setText(node, text);
  if (parent) parent.appendChild(node);
  return node;
}
function attr(node, values) {
  for (const [key, value] of Object.entries(values)) {
    const original = String(value);
    if (key.startsWith('aria-')) {
      let originals = ariaOriginals.get(node);
      if (!originals) {
        originals = new Map();
        ariaOriginals.set(node, originals);
      }
      originals.set(key, original);
      const masked = maskEnzymeNames(original, nodeNameStates.get(node)?.mode || 'visible');
      if (node.getAttribute(key) !== masked) node.setAttribute(key, masked);
    } else node.setAttribute(key, original);
  }
}
function opacity(node, value) { node.setAttribute('opacity', clamp(value).toFixed(3)); }
function position(node, x, y, scale = 1, rotate = 0) {
  node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotate.toFixed(2)}) scale(${scale.toFixed(3)})`);
}
function label(parent, text, x, y, options = {}) {
  return el('text', {
    x, y, 'text-anchor': options.anchor || 'middle', 'font-size': options.size || 24,
    'font-weight': options.weight || 650, fill: options.fill || C.ink,
    'paint-order': 'stroke', stroke: options.outline ? C.paper : 'none',
    'stroke-width': options.outline ? 7 : 0, 'stroke-linejoin': 'round',
  }, parent, text);
}
function setText(node, text) {
  const original = String(text);
  textOriginals.set(node, original);
  const masked = maskEnzymeNames(original, nodeNameStates.get(node)?.mode || 'visible');
  if (node.textContent !== masked) node.textContent = masked;
}
function createNameMask(svg) {
  const state = { mode: 'visible' };
  // Collect once, including invisible chapters, the SVG title, and accessible names.
  const nodes = [svg, ...svg.querySelectorAll('*')].filter(node => textOriginals.has(node) || ariaOriginals.has(node));
  nodes.forEach(node => nodeNameStates.set(node, state));
  function refresh() {
    for (const node of nodes) {
      if (textOriginals.has(node)) setText(node, textOriginals.get(node));
      const originals = ariaOriginals.get(node);
      if (originals) {
        for (const [key, original] of originals) {
          const masked = maskEnzymeNames(original, state.mode);
          if (node.getAttribute(key) !== masked) node.setAttribute(key, masked);
        }
      }
    }
  }
  return {
    refresh,
    setMode(mode) {
      state.mode = ['visible', 'hidden', 'hint'].includes(mode) ? mode : 'visible';
      refresh();
    },
  };
}
function path(parent, d, attributes = {}) {
  return el('path', { d, fill: 'none', stroke: C.wallDeep, 'stroke-width': 4,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attributes }, parent);
}
function line(parent, x1, y1, x2, y2, attributes = {}) {
  return el('line', { x1, y1, x2, y2, stroke: C.soft, 'stroke-width': 3, 'stroke-linecap': 'round', ...attributes }, parent);
}
function pill(parent, text, x, y, width, fill = C.paper, color = C.ink) {
  const group = el('g', {}, parent);
  el('rect', { x: x - width / 2, y: y - 22, width, height: 42, rx: 21, fill, stroke: 'none' }, group);
  label(group, text, x, y + 7, { size: 22, fill: color });
  return group;
}
function artwork(parent, filename, x, y, width, height, description = '', attributes = {}) {
  return el('image', {
    href: `./assets/${filename}`, x, y, width, height,
    preserveAspectRatio: 'xMidYMid meet',
    ...(description ? { role: 'img', 'aria-label': description } : { 'aria-hidden': 'true' }),
    ...attributes,
  }, parent);
}
function droplet(parent, color = C.water, scale = 1) {
  const g = el('g', {}, parent);
  if (color === C.water || color === C.bile) {
    artwork(g, color === C.water ? 'water-drop-v5.png' : 'bile-drop-v5.png',
      -18, -21, 36, 42, color === C.water ? '물방울' : '쓸개즙 방울');
  } else {
    path(g, 'M0 -15 C-5 -6 -13 1 -13 8 A13 13 0 0 0 13 8 C13 1 5 -6 0 -15 Z', {
      fill: color, stroke: 'white', 'stroke-width': 2,
    });
  }
  position(g, 0, 0, scale);
  return g;
}
function bead(parent, kind, r = 22) {
  const g = el('g', {}, parent);
  if (kind === 'starch') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 3 * i - Math.PI / 6;
      return `${Math.cos(a) * r},${Math.sin(a) * r}`;
    }).join(' ');
    el('polygon', { points: pts, fill: C.starch, stroke: C.starchEdge, 'stroke-width': 2.5 }, g);
    el('path', { d: `M${-r * .38} ${-r * .35} L0 ${-r * .54} L${r * .35} ${-r * .34}`,
      fill: 'none', stroke: '#fff0b4', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
  } else {
    el('rect', { x: -r, y: -r, width: r * 2, height: r * 2, rx: r * .44,
      fill: C.protein, stroke: C.proteinEdge, 'stroke-width': 2.5 }, g);
    el('path', { d: `M${-r * .53} ${-r * .32} Q${-r * .53} ${-r * .53} ${-r * .3} ${-r * .53} L${r * .25} ${-r * .53}`,
      fill: 'none', stroke: '#c9e5ff', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
  }
  return g;
}
function chain(parent, count, kind = 'starch', r = 22) {
  const g = el('g', {}, parent);
  const bonds = Array.from({ length: count - 1 }, () => line(g, 0, 0, 0, 0, {
    stroke: kind === 'starch' ? C.starchEdge : C.proteinEdge, 'stroke-width': 7,
  }));
  const beads = Array.from({ length: count }, () => bead(g, kind, r));
  return {
    group: g,
    set(points, bondAlpha = 1, alpha = 1) {
      opacity(g, alpha);
      points.forEach((p, i) => position(beads[i], p[0], p[1]));
      bonds.forEach((bond, i) => {
        attr(bond, { x1: points[i][0], y1: points[i][1], x2: points[i + 1][0], y2: points[i + 1][1] });
        opacity(bond, Array.isArray(bondAlpha) ? bondAlpha[i] : bondAlpha);
      });
    },
  };
}
function enzyme(parent, name, letter) {
  const g = el('g', {}, parent);
  const halo = el('circle', { r: 37, fill: C.enzymeLight, opacity: 0 }, g);
  const body = el('g', {}, g);
  const mascot = Object.values(ENZYMES).find(definition => definition.name === name);
  if (mascot) {
    // Transparent artwork shares the old anchor; names stay above the reaction.
    el('image', {
      href: `./assets/${mascot.asset}`, x: -34, y: -32, width: 68, height: 68,
      preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': `${mascot.name} 캐릭터`,
    }, body);
  } else {
    path(body, 'M-24 0 C-28 -20 -11 -31 8 -26 C25 -22 31 -7 23 4 L12 -1 L5 10 L20 19 C7 33 -14 29 -23 13 Z', {
      fill: C.enzyme, stroke: '#075f5a', 'stroke-width': 2,
    });
    label(body, letter, letter === '효소' ? -7 : -6, letter === '효소' ? 6 : 8, {
      size: letter === '효소' ? 14 : 24, fill: 'white', weight: 800,
    });
  }
  const nameLabel = label(g, name, 0, -41, { size: 23, outline: true, fill: C.enzyme });
  return {
    group: g,
    name: nameLabel,
    set(x, y, alpha = 1, contact = 0, rotation = 0) {
      position(g, x, y);
      opacity(g, alpha);
      opacity(halo, contact * .75);
      body.setAttribute('transform', `rotate(${rotation})`);
    },
  };
}
function triglyceride(parent) {
  const g = el('g', {}, parent);
  const mono = el('g', {}, g);
  path(mono, 'M0 -22 L0 22 M0 0 L16 0 L26 -5 L36 3 L47 -3 L58 1', {
    stroke: C.fatEdge, 'stroke-width': 8,
  });
  [-22, 0, 22].forEach(y => el('circle', { cx: 0, cy: y, r: 5.5, fill: C.fat }, mono));
  const tails = [-1, 1].map(() => {
    const part = el('g', {}, g);
    path(part, 'M0 0 L16 0 L26 -5 L36 3 L47 -3 L58 1', { stroke: C.fatEdge, 'stroke-width': 8 });
    return part;
  });
  return {
    group: g,
    set(monoAt, topAt, bottomAt, alpha = 1, scale = 1) {
      opacity(g, alpha);
      position(mono, monoAt[0], monoAt[1], scale);
      position(tails[0], topAt[0], topAt[1], scale);
      position(tails[1], bottomAt[0], bottomAt[1], scale);
    },
    intact(x, y, alpha = 1, scale = 1) {
      this.set([x, y], [x, y - 22 * scale], [x, y + 22 * scale], alpha, scale);
    },
  };
}
function flowDots(parent, count = 5, color = C.enzyme, scale = .5) {
  return Array.from({ length: count }, () => droplet(parent, color, scale));
}
function flowAlong(dots, t, start, end, points, scale = .5) {
  const active = gate(t, start, end, .5);
  dots.forEach((dot, i) => {
    const fraction = ((t - start) * .38 + i / dots.length) % 1;
    const u = fraction < 0 ? fraction + 1 : fraction;
    const index = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
    const p = point(points[index], points[index + 1], u * (points.length - 1) - index);
    position(dot, p[0], p[1], scale);
    opacity(dot, active * Math.min(1, u * 6, (1 - u) * 6));
  });
}
function interpolateChain(from, to, t) { return from.map((p, i) => point(p, to[i], t)); }

function createFrame(container, stageIndex) {
  const id = `digestion-scene-${++sceneSerial}`;
  const svg = el('svg', {
    viewBox: '0 0 800 440', preserveAspectRatio: 'xMidYMid meet',
    width: '100%', height: '100%', role: 'img',
    'aria-label': ['입 속 음식과 아밀레이스', '식도의 연동 운동', '위의 펩신과 단백질',
      '작은창자의 쓸개즙과 소화 효소', '작은창자 벽에서의 소화와 흡수', '큰창자에서의 물 흡수와 배출'][stageIndex],
    style: 'display:block;overflow:hidden;font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",sans-serif;',
  }, container);
  el('title', {}, svg, '음식이 우리 몸을 지나는 과정 — 시간에 따라 움직이는 물질 모형');
  const defs = el('defs', {}, svg);
  const tissue = el('pattern', {
    id: `${id}-tissue`, x: 0, y: 0, width: 800, height: 440,
    patternUnits: 'userSpaceOnUse', patternContentUnits: 'userSpaceOnUse',
  }, defs);
  artwork(tissue, 'tissue-surface-v5.png', 0, 0, 800, 440, '', { preserveAspectRatio: 'none' });
  const grad = el('linearGradient', { id: `${id}-wall`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': C.wallPale }, grad);
  el('stop', { offset: 1, 'stop-color': C.wall }, grad);
  const arrow = el('marker', { id: `${id}-arrow`, viewBox: '0 0 10 10', refX: 8, refY: 5,
    markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  path(arrow, 'M0 0 L10 5 L0 10 Z', { fill: C.enzyme, stroke: 'none' });
  el('rect', { width: 800, height: 440, rx: 24, fill: C.cream }, svg);
  el('rect', { x: 18, y: 58, width: 764, height: 321, rx: 28, fill: C.paper, opacity: 1 }, svg);
  const content = el('g', {}, svg);
  const headerBg = el('rect', { x: 18, y: 10, width: 764, height: 42, rx: 21, fill: C.paper, opacity: .93 }, svg);
  const heading = label(svg, '', 400, 39, { size: 24, weight: 750 });
  el('rect', { x: 18, y: 390, width: 764, height: 40, rx: 20, fill: C.paper, opacity: .96 }, svg);
  const caption = label(svg, '', 400, 417, { size: 22, weight: 550, fill: C.soft });
  return { svg, content, heading, caption, wall: `url(#${id}-wall)`, tissue: `url(#${id}-tissue)`,
    arrow: `url(#${id}-arrow)`, headerBg };
}

function mouth(frame) {
  const { content: g, heading, caption, arrow } = frame;
  // The image provides moist tissue texture; the open lumen remains a clear model space.
  path(g, 'M25 121 C170 63 620 63 775 121 V69 H25 Z', {
    fill: frame.tissue, stroke: '#d9a28c', 'stroke-width': 2,
  });
  path(g, 'M25 319 C178 371 622 371 775 319 V381 H25 Z', {
    fill: frame.tissue, stroke: '#d9a28c', 'stroke-width': 2,
  });
  const food = el('g', {}, g);
  const bite = el('image', { href: './assets/food-bite.png', x: -83, y: -83, width: 166, height: 166 }, food);
  const crumbs = Array.from({ length: 4 }, (_, i) => {
    const image = artwork(g, 'food-bolus-v5.png', -43, -37, 86, 74, '잘게 씹힌 음식 조각');
    opacity(image, 0);
    return image;
  });
  const teeth = el('g', {}, g);
  const uppers = el('g', {}, teeth);
  const lowers = el('g', {}, teeth);
  [350, 400, 450].forEach(x => {
    const upper = el('g', { transform: `translate(${x} 139) rotate(180)` }, uppers);
    artwork(upper, 'tooth-v5.png', -34, -31, 68, 62, '윗니');
    artwork(lowers, 'tooth-v5.png', x - 34, 274, 68, 62, '아랫니');
  });
  const foodLabel = label(g, '음식 한입', 400, 361, { size: 25 });
  const source = el('g', {}, g);
  path(source, 'M139 97 H204 Q243 97 243 134 V174', { stroke: C.wall, 'stroke-width': 17 });
  path(source, 'M139 97 H204 Q243 97 243 134 V174', { stroke: C.enzymeLight, 'stroke-width': 9 });
  artwork(source, 'salivary-gland-v5.png', 14, 45, 145, 121, '침샘');
  label(source, '침샘', 85, 186, { size: 24, outline: true });
  label(source, '침', 274, 94, { size: 28, anchor: 'start', fill: C.enzyme, outline: true });
  const saliva = flowDots(g, 5, C.enzyme, .42);
  const molecular = el('g', {}, g);
  const starch = chain(molecular, 8, 'starch', 22);
  const start = Array.from({ length: 8 }, (_, i) => [135 + i * 65, 264]);
  const result = [[100, 268], [145, 268], [190, 268], [235, 268], [400, 268], [450, 268], [585, 268], [635, 268]];
  const initialLabel = label(molecular, '녹말: 길게 연결된 분자', 390, 337, { size: 26 });
  const labels = el('g', {}, molecular);
  label(labels, '남은 녹말', 168, 338, { size: 24 });
  label(labels, '엿당', 425, 338, { size: 24 });
  label(labels, '엿당', 610, 338, { size: 24 });
  const amylase = enzyme(g, '아밀레이스', 'A');
  const reusable = pill(g, '다시 작용해요', 559, 161, 166, C.enzymeLight, C.enzyme);
  const contactMark = path(g, 'M0 -12 L0 -20 M-9 -8 L-16 -14 M9 -8 L16 -14', { stroke: C.starchEdge, 'stroke-width': 3 });
  return t => {
    const chew = progress(t, 4, 8);
    const fadeFood = 1 - progress(t, 7, 9);
    position(food, mix(130, 400, tween(t, 0, 4)), 225, mix(.78, 1, tween(t, 0, 4)) * (1 - .65 * chew), Math.sin(t * 4) * chew * 8);
    opacity(food, fadeFood * (1 - progress(t, 4.6, 6.4)));
    crumbs.forEach((crumb, i) => {
      const angle = i * Math.PI / 2 + .4;
      const spread = 28 + chew * 48;
      position(crumb, 400 + Math.cos(angle) * spread, 235 + Math.sin(angle) * spread * .55,
        .7 - chew * .22, Math.sin(t * 7 + i) * 12 * gate(t, 4, 8, .2));
      opacity(crumb, progress(t, 4, 5.4) * fadeFood);
    });
    const jaw = Math.sin((t - 4) * Math.PI * 2) * 14 * gate(t, 4, 8, .4);
    uppers.setAttribute('transform', `translate(0 ${jaw + chew * 8})`);
    lowers.setAttribute('transform', `translate(0 ${-jaw - chew * 8})`);
    opacity(teeth, gate(t, 3, 9, .8));
    opacity(foodLabel, 1 - progress(t, 7, 8));
    opacity(source, progress(t, 7.3, 8.3));
    flowAlong(saliva, t, 8, 13.8, [[135, 97], [203, 97], [243, 135], [243, 186]], .42);
    const alpha = progress(t, 8, 10);
    const splitOne = tween(t, 16, 18.2);
    const splitTwo = tween(t, 20, 22);
    const points = start.map((p, i) => {
      const amount = i < 6 ? splitOne : Math.max(splitOne * .3, splitTwo);
      return point(p, result[i], amount);
    });
    starch.set(points, [1, 1, 1, 1 - progress(t, 16, 16.6), 1, 1 - progress(t, 20, 20.6), 1], alpha);
    opacity(initialLabel, alpha * (1 - progress(t, 16, 18)));
    opacity(labels, progress(t, 20, 22));
    let a;
    if (t < 10) a = point([154, 97], [243, 138], tween(t, 8.7, 10));
    else if (t < 13) a = point([243, 138], [290, 192], tween(t, 10, 13));
    else if (t < 16.4) a = point([290, 192], [362, 235], tween(t, 13, 15.3));
    else if (t < 19) a = point([362, 235], [494, 231], tween(t, 16.4, 19));
    else if (t < 21) a = [mix(494, 531, tween(t, 19, 21)), 235];
    else a = point([531, 235], [353, 177], tween(t, 21, 25));
    amylase.set(a[0], a[1], progress(t, 8.7, 9.3), gate(t, 14.7, 16.8, .5) + gate(t, 19.2, 21, .5));
    opacity(amylase.name, progress(t, 11, 12.4));
    opacity(reusable, progress(t, 23, 25));
    const flash = Math.max(gate(t, 15.9, 16.8, .2), gate(t, 19.9, 20.8, .2));
    position(contactMark, t < 18 ? 363 : 532, 262);
    opacity(contactMark, flash);
    if (t < 4) {
      setText(heading, '음식이 입으로 들어왔어요');
      setText(caption, '입에서 음식의 여행이 시작돼요.');
    } else if (t < 8) {
      setText(heading, '치아가 음식물을 잘게 부숴요');
      setText(caption, '씹기는 음식의 크기를 줄이는 기계적 소화예요.');
    } else if (t < 13) {
      setText(heading, '침샘에서 나온 침 속에 아밀레이스가 있어요');
      setText(caption, '침이 관을 지나 입안으로 흘러나와 음식과 섞여요.');
    } else if (t < 22) {
      setText(heading, '아밀레이스가 녹말에 닿아 연결을 끊어요');
      setText(caption, '녹말의 일부가 더 작은 엿당으로 분해돼요.');
    } else {
      setText(heading, '녹말 일부는 남고, 엿당이 생겼어요');
      setText(caption, '아밀레이스는 없어지지 않고 다시 작용할 수 있어요.');
    }
  };
}

function esophagus(frame) {
  const { content: g, heading, caption, arrow, wall } = frame;
  const stomach = path(g, 'M327 326 C335 351 366 376 434 376 H603 C672 376 702 329 669 302 C637 277 591 299 562 324 L473 330 Z', {
    fill: frame.tissue, stroke: C.wallDeep, 'stroke-width': 4,
  });
  const lumen = path(g, '', { fill: '#fff8df', stroke: 'none' });
  const left = path(g, '', { stroke: C.wallDeep, 'stroke-width': 58 });
  const right = path(g, '', { stroke: C.wallDeep, 'stroke-width': 58 });
  const leftInner = path(g, '', { stroke: frame.tissue, 'stroke-width': 50 });
  const rightInner = path(g, '', { stroke: frame.tissue, 'stroke-width': 50 });
  const muscles = Array.from({ length: 7 }, (_, i) => {
    const ring = el('g', {}, g);
    const l = line(ring, 290, 90 + i * 37, 326, 90 + i * 37, { stroke: '#bb776a', 'stroke-width': 6, opacity: .6 });
    const r = line(ring, 474, 90 + i * 37, 510, 90 + i * 37, { stroke: '#bb776a', 'stroke-width': 6, opacity: .6 });
    return [l, r];
  });
  const bolus = el('g', {}, g);
  artwork(bolus, 'food-bolus-v5.png', -50, -42, 100, 84, '씹어서 뭉쳐진 음식 덩어리');
  const yellow = bead(bolus, 'starch', 8); position(yellow, -19, 14);
  const blue = bead(bolus, 'protein', 8); position(blue, 12, 17);
  const squeeze = label(g, '뒤쪽 근육 수축', 167, 173, { size: 24 });
  const squeezeLine = line(g, 215, 188, 330, 188, { stroke: C.enzyme, 'stroke-width': 3 });
  const pushArrow = path(g, 'M400 188 V218', { stroke: C.enzyme, 'stroke-width': 4, 'marker-end': arrow });
  const bolusLabel = label(g, '음식 덩어리', 628, 198, { size: 24 });
  const bolusLine = line(g, 544, 212, 449, 212, { stroke: C.soft });
  label(g, '입', 400, 75, { size: 22 });
  label(g, '위', 629, 351, { size: 28 });
  return t => {
    const y = t < 3 ? mix(85, 126, tween(t, 0, 3)) : mix(126, 315, tween(t, 3, 14));
    const x = mix(400, 555, tween(t, 14, 18));
    const bolusY = t < 14 ? y : mix(315, 340, tween(t, 14, 18));
    const waveCenter = y - 52;
    const contraction = gate(t, 2.7, 14.7, .8);
    const curve = [];
    const other = [];
    for (let yy = 73; yy <= 332; yy += 7) {
      const swell = Math.exp(-Math.pow((yy - waveCenter) / 27, 2)) * 57 * contraction;
      curve.push([310 + swell, yy]);
      other.push([490 - swell, yy]);
    }
    const leftD = curve.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1]}`).join(' ');
    const rightD = other.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1]}`).join(' ');
    [left, leftInner].forEach(node => node.setAttribute('d', leftD));
    [right, rightInner].forEach(node => node.setAttribute('d', rightD));
    lumen.setAttribute('d', leftD + ' ' + other.slice().reverse().map(p => `L${p[0].toFixed(1)} ${p[1]}`).join(' ') + ' Z');
    muscles.forEach(([l, r], i) => {
      const yy = 90 + i * 37;
      const squeeze = Math.exp(-Math.pow((yy - waveCenter) / 27, 2)) * 57 * contraction;
      attr(l, { x1: 287 + squeeze, x2: 326 + squeeze });
      attr(r, { x1: 474 - squeeze, x2: 513 - squeeze });
    });
    position(bolus, x, bolusY, 1, Math.sin(t * 2) * 3);
    attr(squeeze, { y: clamp(waveCenter + 6, 122, 281) });
    attr(squeezeLine, { y1: waveCenter, y2: waveCenter, x2: 355 });
    opacity(squeeze, contraction);
    opacity(squeezeLine, contraction);
    pushArrow.setAttribute('d', `M400 ${y + 48} V${y + 70}`);
    opacity(pushArrow, gate(t, 3, 13.4, .6));
    attr(bolusLabel, { y: Math.min(258, bolusY - 10) });
    attr(bolusLine, { y1: Math.min(278, bolusY + 4), y2: bolusY, x2: x + 48 });
    opacity(bolusLabel, 1 - progress(t, 13, 15));
    opacity(bolusLine, 1 - progress(t, 13, 15));
    setText(heading, t < 3 ? '삼킨 음식이 식도로 들어와요' : t < 14 ? '음식 뒤쪽의 근육이 조여서 앞으로 밀어요' : '음식이 위에 도착했어요');
    setText(caption, t < 14 ? '이 움직임을 연동 운동이라고 해요.' : '식도에서는 새 소화 효소가 분비되지 않아요.');
  };
}

function stomach(frame) {
  const { content: g, heading, caption, wall } = frame;
  path(g, 'M75 162 C52 90 154 61 220 98 C281 144 321 78 477 81 C657 81 748 140 732 255 C725 346 640 375 479 369 C329 376 249 345 186 315 C92 310 54 243 75 162 Z', {
    fill: '#fff8e7', stroke: frame.tissue, 'stroke-width': 40,
  });
  const glands = el('g', {}, g);
  [104, 145, 186].forEach((x, i) => {
    path(glands, `M${x - 10} 82 C${x - 21} 98 ${x - 19} 125 ${x} 133 C${x + 19} 125 ${x + 21} 98 ${x + 10} 82 Z`, {
      fill: frame.tissue, stroke: '#ba645c', 'stroke-width': 2.5,
    });
    path(glands, `M${x} 86 C${x - 7} 100 ${x + 7} 110 ${x} 127`, {
      stroke: '#d99282', 'stroke-width': 5,
    });
  });
  label(g, '위벽의 샘', 130, 168, { size: 22, outline: true });
  label(g, '위액', 264, 105, { size: 28, fill: C.enzyme, outline: true });
  path(g, 'M175 125 Q203 147 232 174', { stroke: C.wallDeep, 'stroke-width': 8, opacity: .6 });
  const juice = flowDots(g, 5, C.enzyme, .46);
  const acid = pill(g, '염산 → 산성 환경', 592, 117, 228, '#f7e3de', '#99554d');
  const acidNote = label(g, '(효소 아님)', 592, 154, { size: 18, fill: '#99554d' });
  const acidity = Array.from({ length: 4 }, (_, i) => {
    const group = el('g', {}, g);
    el('circle', { r: 16, fill: '#f5d7d0', stroke: '#d79c91', 'stroke-width': 1.5 }, group);
    label(group, 'H⁺', 0, 7, { size: 21, fill: '#a76458', weight: 700 });
    return group;
  });
  const foodBolus = el('g', {}, g);
  artwork(foodBolus, 'food-bolus-v5.png', -50, -45, 100, 90, '위액과 섞이는 음식 덩어리');
  const foodBolusLabel = label(g, '음식 덩어리', 644, 197, { size: 22, outline: true });
  const protein = chain(g, 6, 'protein', 23);
  const input = [[220, 258], [285, 258], [350, 258], [415, 258], [480, 258], [545, 258]];
  const result = [[160, 267], [220, 267], [280, 267], [490, 267], [550, 267], [610, 267]];
  const initialLabel = label(g, '단백질', 385, 339, { size: 27 });
  const outputLabels = el('g', {}, g);
  label(outputLabels, '단백질 조각', 220, 339, { size: 25 });
  label(outputLabels, '단백질 조각', 550, 339, { size: 25 });
  const pepsin = enzyme(g, '펩신', 'P');
  const mixing = path(g, 'M596 229 C635 252 632 291 602 305', { stroke: '#cc927c', 'stroke-width': 4, 'marker-end': frame.arrow });
  const working = pill(g, '다시 작용', 620, 179, 131, C.enzymeLight, C.enzyme);
  return t => {
    const mixingAlpha = 1 - progress(t, 4, 6);
    position(foodBolus, 649 + Math.sin(t * 2.2) * 7 * mixingAlpha,
      251 + Math.cos(t * 2.2) * 8 * mixingAlpha, 1, Math.sin(t * 2) * 8 * mixingAlpha);
    opacity(foodBolus, 1 - progress(t, 7, 10));
    opacity(foodBolusLabel, 1 - progress(t, 7, 10));
    const separation = tween(t, 16, 20);
    const points = interpolateChain(input, result, separation).map((p, i) => [
      p[0] + Math.sin(t * 2.2 + i * .45) * 12 * mixingAlpha,
      p[1] + Math.cos(t * 2.2 + i * .55) * 11 * mixingAlpha,
    ]);
    protein.set(points, [1, 1, 1 - progress(t, 15.5, 16.5), 1, 1]);
    opacity(mixing, mixingAlpha);
    opacity(initialLabel, 1 - progress(t, 16, 18));
    opacity(outputLabels, progress(t, 18, 20));
    opacity(acid, progress(t, 6.5, 8));
    opacity(acidNote, progress(t, 6.5, 8));
    flowAlong(juice, t, 5, 10.6, [[145, 119], [184, 135], [219, 169], [259, 194]], .46);
    acidity.forEach((acid, i) => {
      const u = tween(t, 5.5 + i * .6, 9.4 + i * .4);
      position(acid, mix(145, 245 + i * 105, u), mix(119, 154 + (i % 2) * 26, u));
      opacity(acid, progress(t, 5.5 + i * .6, 6.5 + i * .6) * .85);
    });
    let at;
    if (t < 10) at = point([145, 124], [304, 184], tween(t, 5.4, 10));
    else if (t < 15.8) at = point([304, 184], [382, 230], tween(t, 10, 14.5));
    else if (t < 20) at = point([382, 230], [391, 176], tween(t, 15.8, 20));
    else at = point([391, 176], [490, 213], tween(t, 20, 24.5));
    pepsin.set(at[0], at[1], progress(t, 5.4, 6.3), gate(t, 13.5, 16.6, .5));
    opacity(pepsin.name, progress(t, 8, 9.5));
    opacity(working, progress(t, 21, 23));
    if (t < 5) {
      setText(heading, '위가 음식물을 주무르며 섞어요');
      setText(caption, '위의 근육 운동으로 음식이 위액과 골고루 섞여요.');
    } else if (t < 10) {
      setText(heading, '위벽에서 펩신과 염산이 든 위액이 나와요');
      setText(caption, '위액의 염산은 위 속을 산성으로 만들어요.');
    } else if (t < 20) {
      setText(heading, '펩신이 단백질에 닿아 연결을 끊어요');
      setText(caption, '길게 연결된 단백질이 더 작은 단백질 조각으로 나뉘어요.');
    } else {
      setText(heading, '단백질이 더 작은 조각으로 바뀌었어요');
      setText(caption, '단백질 조각은 작은창자에서 더 분해돼요.');
    }
  };
}

function smallIntestine(frame) {
  const { content: g, heading, caption } = frame;
  path(g, 'M50 184 Q400 153 750 184 M50 364 Q400 386 750 364', {
    stroke: '#d39a86', 'stroke-width': 32,
  });
  path(g, 'M50 184 Q400 153 750 184 M50 364 Q400 386 750 364', {
    stroke: frame.tissue, 'stroke-width': 27,
  });
  // Show one source and one process at a time: delivery, then bile, then reactions.
  const bileSource = el('g', { 'data-intestine-layer':'bile-source' }, g);
  artwork(bileSource, 'liver-gallbladder-v5.png', 83, 69, 188, 125, '간과 그 아래의 쓸개');
  label(bileSource, '간', 42, 106, { size: 24, outline: true });
  line(bileSource, 61, 101, 112, 101, { stroke: '#9d7966', 'stroke-width': 2 });
  label(bileSource, '쓸개', 46, 171, { size: 23, outline: true });
  line(bileSource, 77, 164, 132, 159, { stroke: '#7b8737', 'stroke-width': 2 });
  path(bileSource, 'M166 142 L207 142 Q239 142 260 176 L300 192', { stroke: '#b7bc76', 'stroke-width': 11 });
  path(bileSource, 'M166 142 L207 142 Q239 142 260 176 L300 192', { stroke: '#e4e8bd', 'stroke-width': 5 });
  const bileFlow = flowDots(bileSource, 6, C.bile, .43);

  const pancreaticSource = el('g', { 'data-intestine-layer':'pancreatic-source' }, g);
  artwork(pancreaticSource, 'pancreas-v5.png', 552, 60, 195, 98, '소화 효소가 들어 있는 이자액을 만드는 이자');
  label(pancreaticSource, '이자', 650, 76, { size: 24, outline: true });
  line(pancreaticSource, 650, 84, 650, 94, { stroke: '#b58e56', 'stroke-width': 2 });
  path(pancreaticSource, 'M622 126 L580 142 Q550 155 526 178 L500 192', { stroke: '#ddb77a', 'stroke-width': 11 });
  path(pancreaticSource, 'M622 126 L580 142 Q550 155 526 178 L500 192', { stroke: '#ffedd1', 'stroke-width': 5 });
  label(pancreaticSource, '이자액', 595, 181, { size: 21, fill: C.enzyme, outline: true });
  const pancreaticFlow = flowDots(pancreaticSource, 4, C.enzyme, .43);
  label(g, '작은창자 안', 400, 183, { size: 22, fill: C.soft, outline: true });
  const delivery = el('g', { 'data-intestine-layer':'enzyme-delivery' }, g);
  const arrivals = pancreaticEnzymePositions(4.8);
  const cargoLabels = el('g', {}, delivery);
  PANCREATIC_ENZYMES.forEach((id,index) => {
    const e=ENZYMES[id], x=arrivals[index].x;
    label(cargoLabels, e.name, x, 322, {size:27,weight:850});
    label(cargoLabels, e.target+' 담당', x, 344, {size:18,fill:C.soft});
  });
  const pancreaticCargo = PANCREATIC_ENZYMES.map(id => {
    const cargo = el('g', { 'data-pancreatic-enzyme': id }, delivery);
    artwork(cargo, ENZYMES[id].asset, -48, -48, 96, 96, ENZYMES[id].name+' 캐릭터가 이자액에 들어 작은창자로 이동');
    return cargo;
  });

  const bileScene = el('g', { 'data-intestine-layer':'bile-dispersion' }, g);
  const bigDrop = artwork(bileScene, 'oil-drop-v5.png', 320, 193, 160, 160, '큰 지방 방울');
  const drops = [245, 400, 555].map(x => artwork(bileScene, 'oil-drop-v5.png', x - 48, 225, 96, 96, '작은 지방 방울'));
  const fats = Array.from({ length: 3 }, () => triglyceride(bileScene));
  const bileDots = Array.from({ length: 10 }, () => {
    const dot = el('g', {}, bileScene);
    artwork(dot, 'bile-drop-v5.png', -10, -12, 20, 24, '지방 방울을 흩어 놓는 쓸개즙');
    return dot;
  });
  const bileLabel = label(bileScene, '큰 지방 방울', 400, 346, { size: 25 });

  const starchScene = el('g', {}, g);
  const starch = chain(starchScene, 4, 'starch', 26);
  const amylase = enzyme(starchScene, '아밀레이스', 'A');
  const starchLabel = label(starchScene, '남은 녹말', 400, 354, { size: 26 });

  const proteinScene = el('g', {}, g);
  const protein = chain(proteinScene, 6, 'protein', 23);
  const trypsin = enzyme(proteinScene, '트립신', 'T');
  const proteinLabel = label(proteinScene, '단백질 조각', 400, 355, { size: 26 });

  const lipidScene = el('g', {}, g);
  const lipidDrop = artwork(lipidScene, 'oil-drop-v5.png', 318, 196, 164, 154, '분해할 지방이 들어 있는 방울');
  const lipid = triglyceride(lipidScene);
  const lipase = enzyme(lipidScene, '라이페이스', 'L');
  const fatLabel = label(lipidScene, '지방 분자', 400, 358, { size: 26 });
  const monoLabel = label(lipidScene, '모노글리세리드', 251, 357, { size: 23 });
  const acidsLabel = label(lipidScene, '지방산 2개', 559, 357, { size: 23 });
  const resultBadge = pill(lipidScene, '효소는 다시 작용해요', 438, 209, 242, C.enzymeLight, C.enzyme);
  g.appendChild(delivery);
  return lessonTime => {
    // Present bile first and enzyme delivery second; reaction clocks stay unchanged.
    const t=lessonTime<7?lessonTime+5:lessonTime<12?lessonTime-7:lessonTime;
    const current = t < 12 ? 0 : t < 20 ? 1 : t < 27 ? 2 : 3;
    const arriving=t<5, emulsifying=t>=5&&t<12;
    pancreaticSource.setAttribute('visibility',arriving?'visible':'hidden');
    delivery.setAttribute('visibility',arriving?'visible':'hidden');
    bileSource.setAttribute('visibility',emulsifying?'visible':'hidden');
    bileScene.setAttribute('visibility',emulsifying?'visible':'hidden');
    opacity(cargoLabels,progress(t,3.9,4.6));
    opacity(bileScene, emulsifying ? 1 : 0);
    opacity(starchScene, current === 1 ? 1 : 0);
    opacity(proteinScene, current === 2 ? 1 : 0);
    opacity(lipidScene, current === 3 ? 1 : 0);
    flowAlong(bileFlow, t, 5, 8.5, [[166, 142], [208, 143], [260, 177], [318, 218]], .43);
    flowAlong(pancreaticFlow, t, 0, 5.6, [[622, 126], [580, 143], [529, 178], [493, 218]], .43);
    pancreaticEnzymePositions(t).forEach((cargo,index) => {
      position(pancreaticCargo[index], cargo.x, cargo.y, cargo.scale);
      opacity(pancreaticCargo[index], cargo.opacity);
    });
    const dispersion = tween(t, 6, 11);
    opacity(bigDrop, 1 - progress(t, 6.6, 9.8));
    drops.forEach((drop, i) => {
      const size = mix(78, 96, dispersion);
      attr(drop, { x: mix(400, [245, 400, 555][i], dispersion) - size / 2,
        y: 273 - size / 2, width: size, height: size });
      opacity(drop, progress(t, 7, 9));
    });
    fats.forEach((fat, i) => {
      const initial = [[365, 248], [406, 269], [371, 298]][i];
      const target = [[225, 273], [380, 273], [535, 273]][i];
      const p = point(initial, target, dispersion);
      fat.intact(p[0], p[1], 1, .65);
    });
    bileDots.forEach((dot, i) => {
      const angle = Math.PI * 2 * i / bileDots.length;
      const radius = mix(102, 73, tween(t, 3, 7));
      position(dot, 400 + Math.cos(angle) * radius + Math.cos(angle) * dispersion * 74,
        273 + Math.sin(angle) * radius * .65);
      opacity(dot, gate(t, 5, 11.8, 1));
    });
    setText(bileLabel, t < 8 ? '큰 지방 방울' : '작은 지방 방울 · 분자는 그대로');

    const sugarSplit = tween(t, 16, 18.7);
    starch.set(interpolateChain([[290, 275], [360, 275], [440, 275], [510, 275]],
      [[245, 277], [300, 277], [500, 277], [555, 277]], sugarSplit), [1, 1 - progress(t, 16, 16.6), 1]);
    let sugarEnzyme = t < 16.4
      ? point([566, 163], [400, 247], tween(t, 12, 15.3))
      : point([400, 247], [613, 244], tween(t, 16.4, 19.3));
    amylase.set(sugarEnzyme[0], sugarEnzyme[1], 1, gate(t, 15, 16.8, .3));
    setText(starchLabel, t < 17 ? '남은 녹말' : '엿당               엿당');

    const proteinSplit = tween(t, 23.3, 26);
    const proteinStart = [[175, 275], [231, 275], [287, 275], [501, 275], [557, 275], [613, 275]];
    const proteinEnd = [[122, 277], [176, 277], [280, 277], [462, 277], [516, 277], [638, 277]];
    protein.set(interpolateChain(proteinStart, proteinEnd, proteinSplit), [1, 1 - progress(t, 23.3, 23.8), 0, 1, 1 - progress(t, 24.5, 25)]);
    let proteinEnzyme;
    if (t < 23.5) proteinEnzyme = point([550, 166], [259, 247], tween(t, 20, 22.7));
    else if (t < 25.1) proteinEnzyme = point([259, 247], [579, 248], tween(t, 23.5, 24.7));
    else proteinEnzyme = point([579, 248], [662, 213], tween(t, 25.1, 27));
    trypsin.set(proteinEnzyme[0], proteinEnzyme[1], 1, Math.max(gate(t, 22.6, 23.8, .3), gate(t, 24.3, 25.3, .3)));
    setText(proteinLabel, t < 24 ? '단백질 조각' : '연결이 더 끊어져 작아진 조각들');

    const fatSplit = tween(t, 30, 33.5);
    lipid.set(point([372, 277], [228, 277], fatSplit), point([372, 255], [522, 242], fatSplit),
      point([372, 299], [522, 297], fatSplit), 1, 1.05);
    opacity(lipidDrop, 1 - progress(t, 29, 32));
    let fatEnzyme = t < 30.6 ? point([557, 165], [394, 244], tween(t, 27, 29.6))
      : point([394, 244], [666, 273], tween(t, 30.6, 34.6));
    lipase.set(fatEnzyme[0], fatEnzyme[1], 1, gate(t, 29, 31, .4));
    opacity(fatLabel, 1 - progress(t, 30.5, 32));
    opacity(monoLabel, progress(t, 32, 33.5));
    opacity(acidsLabel, progress(t, 32, 33.5));
    opacity(resultBadge, progress(t, 34, 35));
    if (t < 5) {
      setText(heading, '이자액 속 세 효소가 작은창자로 들어와요');
      setText(caption, '이자에서 만든 이자액에 세 소화 효소가 들어 있어요.');
    } else if (t < 12) {
      setText(heading, '쓸개즙이 지방 방울을 잘게 흩어 놓아요');
      setText(caption, '쓸개즙은 효소가 아니에요. 지방 분자의 연결은 그대로예요.');
    } else if (t < 20) {
      setText(heading, '이자액의 아밀레이스가 남은 녹말을 분해해요');
      setText(caption, '아밀레이스가 녹말에 작용하여 엿당을 만들어요.');
    } else if (t < 27) {
      setText(heading, '이자액의 트립신이 단백질 조각을 분해해요');
      setText(caption, '단백질의 연결이 더 끊어지고, 작은창자 벽에서 소화가 마무리돼요.');
    } else if (t < 34) {
      setText(heading, '이자액의 라이페이스가 지방 분자를 분해해요');
      setText(caption, '지방은 주로 지방산과 모노글리세리드로 나뉘어요.');
    } else {
      setText(heading, '지방 분자가 흡수되기 좋은 크기로 나뉘었어요');
      setText(caption, '작아진 소화 산물은 다음 장면에서 작은창자 벽을 통과해요.');
    }
  };
}

function absorption(frame) {
  const { content: g, heading, caption, wall, arrow } = frame;
  const inset = el('g', {}, g);
  el('rect', { x: 29, y: 66, width: 145, height: 145, rx: 18, fill: '#fffaf1', stroke: '#e4c6b5', 'stroke-width': 2 }, inset);
  // Keep the three-villus outline exact while the generated tissue supplies its surface.
  path(inset, 'M42 196 V148 C42 119 46 104 59 104 C73 104 78 118 78 148 V188 Q82 198 87 188 V126 C87 95 92 83 105 83 C118 83 124 97 124 126 V188 Q129 198 134 188 V150 C134 120 139 108 151 108 C164 108 169 121 169 150 V196 Z', {
    fill: frame.tissue, stroke: '#c68d7c', 'stroke-width': 2.5,
  });
  path(inset, 'M49 180 V147 Q49 117 59 111 M94 179 V125 Q94 98 104 91 M141 181 V150 Q141 122 150 116', {
    stroke: '#fff0e2', 'stroke-width': 3, opacity: .8,
  });
  label(inset, '융털', 103, 233, { size: 22 });
  el('rect', { x: 93, y: 86, width: 34, height: 49, rx: 8, fill: 'none', stroke: C.enzyme, 'stroke-width': 2.5, 'stroke-dasharray': '5 5' }, inset);
  path(g, 'M167 129 L194 177', { stroke: C.enzyme, 'stroke-width': 2, 'stroke-dasharray': '5 5' });
  label(g, '작은창자 안', 683, 89, { size: 22, fill: C.soft });
  const wallGroup = el('g', {}, g);
  const cells = [];
  for (let i = 0; i < 10; i++) {
    const cell = el('rect', { x: 190 + i * 56, y: 207, width: 54, height: 91, rx: 17,
      fill: frame.tissue, stroke: '#cf9a8b', 'stroke-width': 2 }, wallGroup);
    el('ellipse', { cx: 217 + i * 56, cy: 278, rx: 9, ry: 6.5, fill: '#c98a82', opacity: .55 }, wallGroup);
    cells.push(cell);
    for (let k = 0; k < 4; k++) line(wallGroup, 199 + i * 56 + k * 12, 208, 199 + i * 56 + k * 12, 198, { stroke: C.wallDeep, 'stroke-width': 4 });
  }
  label(g, '작은창자 벽', 102, 270, { size: 24 });
  // Parallel destinations: the lipid route does not pass through a blood vessel.
  path(g, 'M190 341 H450', { stroke: '#edb0b5', 'stroke-width': 31 });
  path(g, 'M190 341 H450', { stroke: C.blood, 'stroke-width': 22 });
  path(g, 'M383 341 H438', { stroke: '#ffdde1', 'stroke-width': 3, 'marker-end': arrow });
  label(g, '모세 혈관', 320, 378, { size: 23, fill: '#a5414d' });
  path(g, 'M505 341 H747', { stroke: '#cbe2c9', 'stroke-width': 31 });
  path(g, 'M505 341 H747', { stroke: C.lymph, 'stroke-width': 22 });
  label(g, '암죽관', 626, 378, { size: 23, fill: '#3f7d50' });
  const fixedEnzymes = el('g', {}, g);
  const maltase = enzyme(fixedEnzymes, '소화 효소', '효소');
  const peptidase = enzyme(fixedEnzymes, '소화 효소', '효소');
  attr(maltase.name, { y: 62, 'font-size': 25 });
  attr(peptidase.name, { y: 62, 'font-size': 25 });
  label(maltase.group, '(말테이스)', 0, 83, { size: 15, fill: C.soft, weight: 500 });
  label(peptidase.group, '(펩티데이스)', 0, 83, { size: 15, fill: C.soft, weight: 500 });
  const supportA = path(fixedEnzymes, 'M266 189 V214', { stroke: C.enzyme, 'stroke-width': 9 });
  const supportB = path(fixedEnzymes, 'M528 189 V214', { stroke: C.enzyme, 'stroke-width': 9 });
  // Supports stay embedded in the apical wall; enzyme groups never follow products.
  const sugars = chain(g, 2, 'starch', 23);
  const proteins = chain(g, 2, 'protein', 22);
  const sugarLabel = label(g, '엿당', 266, 108, { size: 24 });
  const proteinLabel = label(g, '단백질 조각', 528, 108, { size: 24 });
  const glucoseResult = pill(g, '포도당', 267, 108, 112, '#fff1bc', '#886113');
  const aminoResult = pill(g, '아미노산', 528, 108, 136, '#dfeffc', '#366a9b');
  const crossing = path(g, 'M392 187 V245', { stroke: C.enzyme, 'stroke-width': 3.5, 'marker-end': arrow });
  const fatProducts = triglyceride(g);
  const fatLabel = label(g, '지방산 · 모노글리세리드', 474, 115, { size: 23 });
  const packet = el('g', {}, g);
  el('circle', { r: 27, fill: '#fff4cf', stroke: '#e5b34f', 'stroke-width': 3 }, packet);
  const rebuilt = triglyceride(packet);
  rebuilt.intact(-17, 0, 1, .6);
  const cellLabel = pill(g, '세포 안에서 다시 지방으로', 559, 167, 300, '#fff0d6', '#946032');
  const lymphLabel = label(g, '주로 암죽관으로', 626, 112, { size: 24, fill: '#3f7d50' });
  return t => {
    const zoom = mix(.72, 1, tween(t, 0, 4));
    wallGroup.setAttribute('transform', `translate(${(1 - zoom) * 470} ${(1 - zoom) * 250}) scale(${zoom})`);
    opacity(inset, 1 - progress(t, 24, 25));
    maltase.set(266, 189, progress(t, 3, 4), gate(t, 5.8, 8.5, .6));
    peptidase.set(528, 189, progress(t, 3, 4), gate(t, 11.5, 14.3, .6));
    opacity(fixedEnzymes, 1 - progress(t, 23, 24));
    const sugarContact = tween(t, 4, 6.6);
    const sugarSplit = tween(t, 7, 9.5);
    let sugarPoints = [[241, mix(137, 159, sugarContact)], [291, mix(137, 159, sugarContact)]];
    sugarPoints = interpolateChain(sugarPoints, [[221, 143], [311, 143]], sugarSplit);
    const proteinContact = tween(t, 10, 12.4);
    const proteinSplit = tween(t, 13, 15.5);
    let proteinPoints = [[503, mix(137, 159, proteinContact)], [553, mix(137, 159, proteinContact)]];
    proteinPoints = interpolateChain(proteinPoints, [[480, 143], [576, 143]], proteinSplit);
    if (t >= 16) {
      const absorb = tween(t, 16, 21);
      const transport = tween(t, 21, 24);
      sugarPoints = sugarPoints.map((p, i) => [mix(p[0], 235 + i * 55 + transport * 30, absorb), mix(p[1], 341, absorb)]);
      proteinPoints = proteinPoints.map((p, i) => [mix(p[0], 350 + i * 55 + transport * 15, absorb), mix(p[1], 341, absorb)]);
    }
    const molecularAlpha = progress(t, 3, 4) * (1 - progress(t, 23.3, 24.4));
    sugars.set(sugarPoints, 1 - progress(t, 7, 7.6), molecularAlpha);
    proteins.set(proteinPoints, 1 - progress(t, 13, 13.6), molecularAlpha);
    opacity(sugarLabel, molecularAlpha * (1 - progress(t, 7.5, 8.7)));
    opacity(proteinLabel, molecularAlpha * (1 - progress(t, 13.5, 14.7)));
    opacity(glucoseResult, progress(t, 8, 9.5) * (1 - progress(t, 23, 24)));
    opacity(aminoResult, progress(t, 14, 15.5) * (1 - progress(t, 23, 24)));
    opacity(crossing, gate(t, 16, 21, 1));
    const fatAlpha = gate(t, 24, 29.3, .6);
    const enter = tween(t, 24.4, 27.3);
    const assemble = tween(t, 27.3, 28.8);
    let mono = point([351, 140], [592, 251], enter);
    let top = point([483, 127], [618, 229], enter);
    let bottom = point([483, 165], [618, 273], enter);
    mono = point(mono, [594, 251], assemble);
    top = point(top, [594, 235.6], assemble);
    bottom = point(bottom, [594, 266.4], assemble);
    fatProducts.set(mono, top, bottom, fatAlpha, .7);
    const rebuiltAlpha = progress(t, 28.2, 29.2);
    const lymphTravel = tween(t, 29.3, 32);
    position(packet, mix(611, 620, lymphTravel), mix(251, 341, lymphTravel), .92);
    opacity(packet, rebuiltAlpha);
    opacity(fatLabel, gate(t, 24, 28.4, .6));
    opacity(cellLabel, gate(t, 26.5, 30, .7));
    opacity(lymphLabel, progress(t, 29.5, 30.5));
    cells.forEach((cell, i) => cell.setAttribute('fill', t >= 26 && t < 29.5 && i === 7 ? '#f8d39a' : frame.tissue));
    if (t < 4) {
      setText(heading, '융털의 표면을 크게 들여다볼까요?');
      setText(caption, '작은창자 안쪽의 융털은 영양소를 흡수하는 표면을 넓혀요.');
    } else if (t < 10) {
      setText(heading, '작은창자 벽의 효소가 엿당을 포도당으로 나눠요');
      setText(caption, '이 소화 효소는 작은창자 벽에 붙어 작용해요.');
    } else if (t < 16) {
      setText(heading, '작은창자 벽의 효소가 단백질 조각을 더 분해해요');
      setText(caption, '단백질 조각의 소화가 마무리되며 아미노산이 생겨요.');
    } else if (t < 24) {
      setText(heading, '포도당과 아미노산이 작은창자 벽을 통과해요');
      setText(caption, '작은 소화 산물이 모세 혈관으로 흡수되어 운반돼요.');
    } else if (t < 29.3) {
      setText(heading, '지방 소화 산물도 작은창자 벽 세포로 들어와요');
      setText(caption, '지방산과 모노글리세리드는 세포 안에서 다시 지방이 돼요.');
    } else {
      setText(heading, '다시 만들어진 지방은 주로 암죽관으로 가요');
      setText(caption, '지방은 운반 입자에 담겨 암죽관을 통해 이동해요.');
    }
  };
}

function largeIntestine(frame) {
  const { content: g, heading, caption, arrow } = frame;
  path(g, 'M74 147 H578 Q686 147 686 232 V319', { stroke: C.wallDeep, 'stroke-width': 149 });
  path(g, 'M74 147 H578 Q686 147 686 232 V319', { stroke: frame.tissue, 'stroke-width': 140 });
  path(g, 'M74 147 H578 Q686 147 686 232 V319', { stroke: '#fff4d8', 'stroke-width': 94 });
  // Segment folds show the enclosing bowel wall without blocking the lumen.
  [150, 263, 376, 489].forEach(x => {
    path(g, `M${x} 83 Q${x + 12} 98 ${x + 11} 108 M${x} 211 Q${x + 12} 197 ${x + 11} 188`, {
      stroke: '#d78d7c', 'stroke-width': 5,
    });
  });
  path(g, 'M643 320 L647 337 M725 320 L721 337', { stroke: C.wallDeep, 'stroke-width': 12 });
  label(g, '항문', 578, 342, { size: 24 });
  line(g, 615, 335, 643, 331, { stroke: C.soft, 'stroke-width': 2 });
  const residue = el('g', {}, g);
  const pieces = Array.from({ length: 6 }, () =>
    artwork(residue, 'residue-v5.png', -22, -20, 44, 40, '소화되지 않은 찌꺼기 조각'));
  const particles = Array.from({ length: 7 }, () => droplet(g, C.water, .63));
  const waterLabel = pill(g, '물 일부 흡수', 386, 288, 184, '#e4f4fb', '#337da7');
  const residueLabel = el('g', {}, g);
  label(residueLabel, '소화되지 않은', 160, 253, { size: 22, outline: true });
  label(residueLabel, '찌꺼기와 물', 160, 281, { size: 22, outline: true });
  const absorbArrows = [
    path(g, 'M320 201 V251', { stroke: C.water, 'stroke-width': 3.5, 'marker-end': arrow }),
    path(g, 'M446 201 V251', { stroke: C.water, 'stroke-width': 3.5, 'marker-end': arrow }),
  ];
  const stoolLabel = label(g, '대변', 554, 255, { size: 26 });
  const exitArrow = path(g, 'M686 341 V365', { stroke: C.enzyme, 'stroke-width': 3, 'marker-end': arrow });
  return t => {
    let center;
    if (t < 4) center = point([88, 147], [343, 147], tween(t, 0, 4));
    else if (t < 11) center = [343, 147];
    else if (t < 15) center = point([343, 147], [636, 165], tween(t, 11, 15));
    else if (t < 17) center = point([636, 165], [685, 281], tween(t, 15, 17));
    else center = point([685, 281], [685, 360], tween(t, 17, 21));
    const collect = tween(t, 9, 13);
    pieces.forEach((part, i) => {
      const a = i * Math.PI * 2 / 6;
      const r = mix(39, 19, collect) * (1 - .21 * tween(t, 17, 21));
      const x = center[0] + Math.cos(a) * r;
      const y = center[1] + Math.sin(a) * r * .57;
      const rx = mix(18 + i % 2 * 4, 17, collect);
      const ry = mix(16 + i % 3 * 2, 15, collect);
      attr(part, { x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 });
    });
    particles.forEach((drop, i) => {
      const startOffset = [[-54, -5], [-30, 31], [-10, -31], [23, 30], [51, -6], [-18, 7], [24, -8]][i];
      const at = [center[0] + startOffset[0] * (1 - collect * .65), center[1] + startOffset[1] * (1 - collect * .65)];
      let target = at;
      if (i < 5) {
        const out = tween(t, 4.6 + i * .4, 8.3 + i * .5);
        const destination = [265 + i * 45, i % 2 ? 311 : 66];
        target = point([343 + startOffset[0], 147 + startOffset[1]], destination, out);
        if (t < 4.6 + i * .4) target = at;
        opacity(drop, 1 - progress(t, 10.5, 12));
      } else opacity(drop, 1 - progress(t, 10, 13));
      position(drop, target[0], target[1], .61);
    });
    opacity(waterLabel, gate(t, 4, 11.5, .8));
    opacity(residueLabel, 1 - progress(t, 10.5, 12));
    absorbArrows.forEach(node => opacity(node, gate(t, 5, 10.8, .7)));
    opacity(stoolLabel, progress(t, 12.5, 14));
    opacity(exitArrow, gate(t, 17, 20, .5));
    if (t < 4) {
      setText(heading, '남은 찌꺼기와 물이 큰창자로 들어와요');
      setText(caption, '작은창자에서 소화·흡수되지 않은 물질이 큰창자로 이동해요.');
    } else if (t < 11) {
      setText(heading, '큰창자에서 남은 물의 일부가 흡수돼요');
      setText(caption, '물은 작은창자에서도 흡수돼요. 큰창자에서도 일부를 흡수해요.');
    } else if (t < 17) {
      setText(heading, '찌꺼기가 대변이 되어 항문 쪽으로 이동해요');
      setText(caption, '물이 줄어들면서 찌꺼기가 더 단단해져요.');
    } else {
      setText(heading, '대변이 항문을 통해 몸 밖으로 배출돼요');
      setText(caption, '음식의 소화·흡수 여정이 끝났어요.');
    }
  };
}

const BUILDERS = [mouth, esophagus, stomach, smallIntestine, absorption, largeIntestine];
const DURATIONS = [28, 18, 25, 36, 32, 22];

export function mountScene(container, stageIndex) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('mountScene requires a DOM container.');
  const index = clamp(Math.trunc(Number(stageIndex)) || 0, 0, 5);
  const frame = createFrame(container, index);
  const render = BUILDERS[index](frame);
  const names = createNameMask(frame.svg);
  let destroyed = false;
  const api = {
    update(t) {
      if (destroyed) return;
      const seconds = Number.isFinite(Number(t)) ? clamp(Number(t), 0, DURATIONS[index]) : 0;
      render(seconds);
      names.refresh();
    },
    setNameMode(mode) {
      if (destroyed) return;
      names.setMode(mode);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      frame.svg.remove();
    },
  };
  api.update(0);
  return api;
}
