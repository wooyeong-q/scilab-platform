import { ENZYMES } from './memory.mjs';

export const PANCREATIC_ENZYMES = Object.freeze(['amylase', 'trypsin', 'lipase']);

// A single, teacher-controlled delivery: every enzyme reaches the lumen before
// the first small-intestine observation freezes at 4.8 seconds.
export function pancreaticEnzymePositions(time) {
  const t = Number.isFinite(Number(time)) ? Number(time) : 0;
  return PANCREATIC_ENZYMES.map((id, index) => {
    const p = Math.max(0, Math.min(1, (t - index * .35) / 3.5));
    const u = p * p * (3 - 2 * p);
    const points = [[622, 126], [580, 143], [529, 178], [500, 205], [[445, 220], [500, 220], [555, 220]][index]];
    const segment = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
    const fraction = u * (points.length - 1) - segment;
    return {
      id,
      x: points[segment][0] + (points[segment + 1][0] - points[segment][0]) * fraction,
      y: points[segment][1] + (points[segment + 1][1] - points[segment][1]) * fraction,
      opacity: Math.max(0, Math.min(1, (6 - t) / 1.2)),
    };
  });
}

export function renderPancreaticSource(nameMode = 'visible') {
  return `<div class="pancreatic-source" aria-label="이자에서 나온 이자액 속 세 효소가 작은창자로 이동해요">
    <div class="pancreatic-organ"><img src="./assets/pancreas-v5.png" alt="이자" width="1536" height="1024"><strong>이자</strong><span>이자액을 만들어요</span></div>
    <span class="pancreatic-arrow" aria-hidden="true">→</span>
    <div class="pancreatic-fluid"><h3>이자액 속 소화 효소</h3><div class="pancreatic-team">${PANCREATIC_ENZYMES.map(id => {
      const e = ENZYMES[id];
      const name = nameMode === 'hidden' ? '어떤 효소?' : nameMode === 'hint' ? e.hint : e.name;
      return `<div data-pancreatic-enzyme="${id}"><img src="./assets/${e.asset}" alt="${e.look}" width="1254" height="1254"><strong>${name}</strong><span>${e.target} 담당</span></div>`;
    }).join('')}</div></div>
    <span class="pancreatic-arrow" aria-hidden="true">→</span>
    <div class="pancreatic-organ"><img src="./assets/intestine-organ-v3.png" alt="작은창자" width="1536" height="1024"><strong>작은창자</strong><span>관을 통해 들어와요</span></div>
  </div>`;
}
