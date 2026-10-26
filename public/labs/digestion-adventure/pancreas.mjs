export const PANCREATIC_ENZYMES = Object.freeze(['amylase', 'trypsin', 'lipase']);

// A single, teacher-controlled delivery. Characters enter one at a time,
// then remain together in the lumen before the 4.8-second hold frame.
export function pancreaticEnzymePositions(time) {
  const t = Number.isFinite(Number(time)) ? Number(time) : 0;
  return PANCREATIC_ENZYMES.map((id, index) => {
    const delay=index*1.25;
    const p = Math.max(0, Math.min(1, (t - delay) / 1.2));
    const u = p * p * (3 - 2 * p);
    const points = [[622, 126], [580, 143], [529, 178], [500, 205], [[230, 245], [400, 245], [570, 245]][index]];
    const segment = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
    const fraction = u * (points.length - 1) - segment;
    return {
      id,
      x: points[segment][0] + (points[segment + 1][0] - points[segment][0]) * fraction,
      y: points[segment][1] + (points[segment + 1][1] - points[segment][1]) * fraction,
      scale: .55+.45*Math.max(0,Math.min(1,(p-.7)/.3)),
      opacity: Math.max(0, Math.min(1, (t-delay)/.18, (6-t)/1.2)),
    };
  });
}

export function renderPancreaticSource() {
  // Characters and organs appear once, at full size, in the observation scene.
  return `<div class="pancreatic-source"><p>소화 효소가 들어오는 길</p><strong>이자 <span aria-hidden="true">→</span> 이자액 <span aria-hidden="true">→</span> 작은창자</strong></div>`;
}
