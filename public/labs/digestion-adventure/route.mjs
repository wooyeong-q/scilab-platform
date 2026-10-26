/**
 * Large, seekable digestion-route view.
 * `t` is the absolute elapsed time, in seconds, within the selected stage.
 * No local clock, CSS animation, or transition is used: every frame is a pure
 * projection of (stageIndex, t, mode), including the camera and muscle wave.
 */

const DURATIONS = [28, 18, 25, 36, 32, 22];
const STAGE_NAMES = ['입', '식도', '위', '작은창자 · 소화', '작은창자 · 흡수', '큰창자 · 배출'];
const FULL_BOX = [0, 0, 500, 740];
const FOCUS_BOXES = [
  [70, 50, 360, 270],
  [100, 110, 350, 300],
  [100, 255, 370, 280],
  [75, 410, 360, 270],
  [90, 430, 350, 260],
  [60, 380, 400, 340],
];

const ESO_PATH = 'M250 131 L250 277 C250 292 266 298 281 302';
const SMALL_PATH = 'M294 405 C286 420 303 425 302 440 C302 452 170 445 166 466 C162 487 323 470 325 493 C327 516 166 497 165 522 C164 547 326 528 325 553 C324 578 168 558 167 584 C166 607 278 587 282 610 C284 626 172 610 149 628';
const COLON_PATH = 'M149 628 C132 646 120 632 120 607 L120 471 Q120 443 148 443 H344 Q375 443 375 472 V604 Q375 641 344 645 H290 Q250 645 250 679 V700';
const STOMACH_SHAPE = 'M277 282 C286 296 293 306 306 299 C320 277 348 281 363 297 C391 327 385 363 365 382 C345 403 319 394 307 397 C296 399 299 408 294 415 L278 407 C276 392 288 378 302 375 C319 371 305 358 291 345 C279 331 279 306 277 282Z';

let instanceNumber = 0;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = n => { const v = clamp(n); return v * v * (3 - 2 * v); };
const lerp = (a, b, n) => a + (b - a) * n;

/** Mount one route view. The caller owns playback and calls update each frame. */
export function mountRoute(container) {
  if (!container || typeof container.replaceChildren !== 'function') {
    throw new TypeError('mountRoute requires a DOM container.');
  }

  const id = `digestion-route-${++instanceNumber}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', FULL_BOX.join(' '));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', `${id}-title ${id}-description`);
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'digestion-route');
  svg.setAttribute('data-route-view', '');
  svg.style.cssText = 'display:block;width:100%;height:100%;max-height:none;overflow:hidden;background:#fff9ef;border-radius:inherit;';

  const tube = (d, width, insideWidth, color = '#efb49b') => `
    <path data-outline d="${d}" fill="none" stroke="#c38e82" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${insideWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const arrow = d => `<path d="${d}" fill="none" stroke="#176e65" stroke-width="3.2" stroke-linecap="round" marker-end="url(#${id}-arrow)"/>`;
  const name = (organ, x, y, text, size = 26, anchor = 'start') => `<text data-label="${organ}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="800" fill="#68796e" stroke="#fff9ef" stroke-width="6" paint-order="stroke">${text}</text>`;

  svg.innerHTML = `
    <title id="${id}-title">입에서 항문까지, 음식의 현재 위치</title>
    <desc id="${id}-description">입, 식도, 위, 작은창자, 큰창자, 항문으로 이어지는 소화관의 모식도입니다. 간, 쓸개, 이자는 소화액을 보내는 보조 기관이며 음식이 지나지 않습니다. 음식 아이콘은 소화 후에도 현재 내용물의 위치를 나타냅니다.</desc>
    <defs>
      <marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#176e65" stroke-width="2" stroke-linejoin="round"/></marker>
      <marker id="${id}-duct-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#67895c" stroke-width="2" stroke-linejoin="round"/></marker>
      <path id="${id}-mouth-track" d="M250 115 L250 131"/>
      <path id="${id}-eso-track" d="${ESO_PATH}"/>
      <path id="${id}-stomach-entry" d="M281 302 C292 314 306 323 323 339"/>
      <path id="${id}-stomach-mix" d="M323 339 C353 306 374 349 347 371 C325 390 291 364 304 338 C313 321 330 327 323 339Z"/>
      <path id="${id}-stomach-exit" d="M323 339 C338 365 312 389 294 405"/>
      <path id="${id}-small-track" d="${SMALL_PATH}"/>
      <path id="${id}-colon-track" d="${COLON_PATH}"/>
    </defs>

    <g font-family="'Noto Sans KR',system-ui,sans-serif">
      <path d="M250 25 C295 25 316 56 307 94 C302 113 292 132 278 143 L278 166 L367 204 C399 219 411 248 408 294 L395 396 L407 663 C372 704 315 718 250 718 C185 718 128 704 93 663 L105 396 L92 294 C89 248 101 219 133 204 L222 166 L222 143 C208 132 198 113 193 94 C184 56 205 25 250 25Z" fill="#f7f1e5" stroke="#eee4d3" stroke-width="2"/>

      <g data-organ="1">
        ${tube(ESO_PATH, 26, 17, '#f5c6ba')}
      </g>

      <g data-organ="0">
        <path data-outline d="M220 105 Q249 91 280 105 L277 123 Q250 140 223 123Z" fill="#eea38f" stroke="#c38e82" stroke-width="3.5"/>
        <path d="M226 108 Q251 101 274 108 L272 114 H228Z" fill="#fffef8"/>
        <path d="M235 122 Q250 115 266 122" fill="none" stroke="#db726e" stroke-width="5" stroke-linecap="round"/>
      </g>

      <g data-organ="2">
        <path data-outline d="${STOMACH_SHAPE}" fill="#efa998" stroke="#c38e82" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M315 310 C349 297 374 328 363 354 C356 372 334 381 315 379" fill="none" stroke="#fbd9c7" stroke-width="8" stroke-linecap="round" opacity=".8"/>
        <path d="M304 322 C325 312 348 322 350 342 M311 344 C329 336 344 343 342 357" fill="none" stroke="#dc867c" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      </g>

      <g data-accessory>
        <path d="M119 310 C145 287 191 289 218 305 L247 327 C225 332 216 343 201 354 C176 366 143 354 120 342Z" fill="#b9936d" stroke="#a2805e" stroke-width="2"/>
        <path d="M202 351 C219 350 222 362 216 375 C211 386 201 382 198 373 C196 365 199 356 202 351Z" fill="#91a876" stroke="#738b59" stroke-width="2"/>
        <path d="M218 416 C244 401 278 404 315 416 L306 433 C274 428 245 440 221 430Z" fill="#e7c286" stroke="#c5a267" stroke-width="2"/>
        <path d="M210 380 C213 404 255 400 289 425 M284 422 L291 429" fill="none" stroke="#789262" stroke-width="3" stroke-dasharray="5 5" marker-end="url(#${id}-duct-arrow)"/>
        <g fill="#766e5b" font-weight="700" stroke="#fff9ef" stroke-width="5" paint-order="stroke">
          <text x="153" y="330" font-size="23">간</text>
          <text x="143" y="383" font-size="21">쓸개</text>
          <text x="329" y="426" font-size="21">이자</text>
        </g>
        <path d="M181 375H196 M315 421H324" stroke="#9d9b81" stroke-width="1.5" fill="none"/>
      </g>

      <g data-organ="5">
        ${tube(COLON_PATH, 34, 23, '#dbb7ad')}
        <path d="${COLON_PATH}" fill="none" stroke="#b88c84" stroke-width="25" stroke-dasharray="2 17" stroke-linecap="round" opacity=".35"/>
        <ellipse data-outline cx="250" cy="700" rx="13" ry="5" fill="#c38b7c" stroke="#c38e82" stroke-width="2"/>
      </g>

      <g data-organ="3">
        ${tube(SMALL_PATH, 24, 16, '#f3bea0')}
      </g>

      <g data-arrows="0">${arrow('M250 144V159')}</g>
      <g data-arrows="1">${arrow('M250 202V231')}</g>
      <g data-arrows="2">${arrow('M345 308Q366 321 362 343')}</g>
      <g data-arrows="3">
        ${arrow('M225 478L262 481')}
        ${arrow('M269 506L232 509')}
        ${arrow('M223 538L260 541')}
        ${arrow('M268 569L231 572')}
      </g>
      <g data-arrows="5">
        ${arrow('M120 546V515')}
        ${arrow('M223 443H261')}
        ${arrow('M375 518V550')}
        ${arrow('M250 666V686')}
      </g>

      <g fill="none" stroke="#acb6a5" stroke-width="1.6" stroke-linecap="round">
        <path d="M187 112H216 M278 219H321 M380 340H407 M335 566H372 M250 430V435 M267 701H286"/>
      </g>
      ${name(0, 155, 120, '입', 28)}
      ${name(1, 331, 227, '식도', 26)}
      ${name(2, 414, 348, '위', 30)}
      ${name(3, 379, 574, '작은창자', 26)}
      ${name(5, 250, 422, '큰창자', 26, 'middle')}
      ${name(5, 291, 708, '항문', 21)}

      <g data-wave opacity="0" fill="none" stroke="#d77d68" stroke-width="5.5" stroke-linecap="round">
        <path d="M-26 -11Q-12 0-26 11 M26 -11Q12 0 26 11"/>
      </g>

      <g data-outlet opacity="0">
        <path d="M239 719L250 729L261 719" fill="none" stroke="#19786b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="288" y="660" width="86" height="32" rx="16" fill="#e2f2e8" stroke="#89b8a6" stroke-width="1.5"/>
        <text x="331" y="682" text-anchor="middle" font-size="17" font-weight="800" fill="#17685d">배출 완료</text>
      </g>

      <g data-food-marker>
        <title>이 음식 아이콘은 소화 후에도 현재 내용물의 위치를 표시합니다.</title>
        <circle data-food-pulse r="37" fill="none" stroke="#e68e4a" stroke-width="2" opacity=".68"/>
        <circle r="31" fill="#fffef7" stroke="#125f57" stroke-width="4"/>
        <circle r="27" fill="#fff2dc"/>
        <image href="./assets/food-bite.png" x="-28" y="-28" width="56" height="56" preserveAspectRatio="xMidYMid meet"/>
        <g data-food-label transform="translate(0 51)">
          <rect x="-30" y="-14" width="60" height="28" rx="14" fill="#125f57" stroke="#fff9ef" stroke-width="2"/>
          <text x="0" y="6" text-anchor="middle" font-size="18" font-weight="800" fill="#fffef7">음식</text>
        </g>
      </g>
    </g>`;

  container.replaceChildren(svg);

  const query = selector => svg.querySelector(selector);
  const organs = [...svg.querySelectorAll('[data-organ]')];
  const labels = [...svg.querySelectorAll('[data-label]')];
  const arrows = [...svg.querySelectorAll('[data-arrows]')];
  const accessory = query('[data-accessory]');
  const marker = query('[data-food-marker]');
  const foodLabel = query('[data-food-label]');
  const pulse = query('[data-food-pulse]');
  const wave = query('[data-wave]');
  const outlet = query('[data-outlet]');
  const title = query(`#${id}-title`);
  const tracks = {};
  for (const key of ['mouth-track', 'eso-track', 'stomach-entry', 'stomach-mix', 'stomach-exit', 'small-track', 'colon-track']) {
    const path = query(`#${id}-${key}`);
    tracks[key] = {path, length: path.getTotalLength()};
  }

  function point(key, progress) {
    const track = tracks[key];
    return track.path.getPointAtLength(track.length * clamp(progress));
  }

  function currentPosition(stage, time) {
    if (stage === 0) {
      if (time >= 25) return point('mouth-track', smooth((time - 25) / 3));
      const chewing = smooth(time / 2) * (1 - smooth((time - 22) / 3));
      return {x: 250 + Math.sin(time * 3.8) * 2.8 * chewing, y: 115 + Math.sin(time * 7.6) * 1.8 * chewing};
    }
    if (stage === 1) return point('eso-track', smooth((time - 3) / 11));
    if (stage === 2) {
      if (time < 3) return point('stomach-entry', smooth(time / 3));
      if (time < 20) return point('stomach-mix', ((time - 3) / 17 * 2) % 1);
      return point('stomach-exit', smooth((time - 20) / 5));
    }
    if (stage === 3) return point('small-track', smooth((time - 3) / 30) * 0.58);
    if (stage === 4) return point('small-track', 0.58 + smooth((time - 4) / 25) * 0.42);
    return point('colon-track', smooth((time - 4) / 13));
  }

  // Fit the complete halo and label, not only the centre of the food image.
  // This is particularly important at the top of the esophagus and the anus.
  function safeFocusBox(stage, position, labelAbove) {
    let [x, y, width, height] = FOCUS_BOXES[stage];
    const left = position.x - 46, right = position.x + 46;
    const top = position.y - (labelAbove ? 74 : 46);
    const bottom = position.y + (labelAbove ? 40 : 74);
    if (left < x) x = left;
    if (right > x + width) x = right - width;
    if (top < y) y = top;
    if (bottom > y + height) y = bottom - height;
    x = clamp(x, 0, FULL_BOX[2] - width);
    y = clamp(y, 0, FULL_BOX[3] - height);
    return [x, y, width, height];
  }

  let destroyed = false;

  function update(stageIndex, t, mode = 'auto') {
    if (destroyed) return;
    const inputStage = Number(stageIndex);
    const stage = clamp(Number.isFinite(inputStage) ? Math.trunc(inputStage) : 0, 0, 5);
    const inputTime = Number(t);
    const time = clamp(Number.isFinite(inputTime) ? inputTime : 0, 0, DURATIONS[stage]);
    const activeOrgan = stage === 1 && time >= 14 ? 2 : stage === 4 ? 3 : stage;
    const position = currentPosition(stage, time);
    const labelAbove = position.y > 635;

    for (const group of organs) {
      const active = Number(group.dataset.organ) === activeOrgan;
      group.setAttribute('opacity', active ? '1' : '0.34');
      for (const outline of group.querySelectorAll('[data-outline]')) {
        outline.setAttribute('stroke', active ? '#197b6e' : '#c38e82');
      }
    }
    for (const label of labels) {
      const active = Number(label.dataset.label) === activeOrgan;
      label.setAttribute('fill', active ? '#125f57' : '#708071');
      label.setAttribute('opacity', active ? '1' : '.8');
    }
    for (const group of arrows) {
      group.setAttribute('opacity', Number(group.dataset.arrows) === activeOrgan ? '.85' : '.21');
    }
    accessory.setAttribute('opacity', stage === 3 ? '.88' : '.46');

    // The toast is a location icon for the current contents, even after the
    // food has been chemically digested. It does not depict intact toast in
    // the small intestine or colon. Exact breakdown is shown in the lab view.
    const exited = stage === 5 ? smooth((time - 17) / 3) : 0;
    marker.setAttribute('transform', `translate(${position.x.toFixed(3)} ${position.y.toFixed(3)})`);
    marker.setAttribute('opacity', String(1 - exited));
    foodLabel.setAttribute('transform', `translate(0 ${labelAbove ? -52 : 51})`);
    pulse.setAttribute('r', (37 + Math.sin(time * 3.2)).toFixed(3));
    pulse.setAttribute('opacity', (.59 + Math.sin(time * 3.2) * .16).toFixed(3));

    const waveVisible = stage === 1 && time >= 6 && time <= 14;
    const waveY = clamp(position.y - 35, 132, 264);
    wave.setAttribute('opacity', waveVisible ? '.84' : '0');
    wave.setAttribute('transform', `translate(250 ${waveY.toFixed(3)}) scale(${(1 - .12 * Math.sin(time * 4)).toFixed(3)} 1)`);
    outlet.setAttribute('opacity', String(exited));

    const focusBox = safeFocusBox(stage, position, labelAbove);
    const zoom = mode === 'full' ? 0 : mode === 'focus' ? 1 : smooth((time - .6) / 1.4);
    const box = FULL_BOX.map((value, i) => lerp(value, focusBox[i], zoom));
    svg.setAttribute('viewBox', box.map(n => n.toFixed(3)).join(' '));
    svg.setAttribute('data-stage', String(stage));
    svg.setAttribute('data-mode', mode === 'full' || mode === 'focus' ? mode : 'auto');
    svg.setAttribute('data-time', time.toFixed(3));
    const status = stage === 5 && time >= 20 ? '배출 완료' : stage === 1 && time >= 14 ? '현재 음식 위치: 위에 도착' : `현재 음식 위치: ${STAGE_NAMES[stage]}`;
    title.textContent = status;
  }

  function destroy() {
    destroyed = true;
    svg.remove();
  }

  update(0, 0);
  return {update, destroy};
}
