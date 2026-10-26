// Schematic teaching views: no automatic playback or new network requests.
export const ABSORPTION_STEPS = Object.freeze([
  { label: '주름과 융털', title: '작은창자 안쪽은 왜 울퉁불퉁할까요?' },
  { label: '두 가지 흡수 길', title: '융털 속에서 영양소는 어느 길로 갈까요?' },
  { label: '온몸의 세포로', title: '흡수한 영양소를 온몸의 세포로 보내요.' },
  { label: '큰창자와 배출', title: '몸에 들어온 영양소와 남은 찌꺼기는 길이 달라요.' },
]);

export const ABSORPTION_NUTRIENTS = Object.freeze([
  { id: 'glucose', label: '포도당', origin: '탄수화물의 최종 소화 산물', route: 'blood', shape: 'hexagon', color: '#d9aa22', text: '작게 소화된 포도당은 융털의 모세 혈관으로 들어가요.' },
  { id: 'amino', label: '아미노산', origin: '단백질의 최종 소화 산물', route: 'blood', shape: 'square', color: '#4e8cb8', text: '단백질이 아미노산까지 분해된 뒤, 융털의 모세 혈관으로 들어가요.' },
  { id: 'fat', label: '지방산·모노글리세리드', origin: '지방의 소화 산물', route: 'lymph', shape: 'circle', color: '#d98b43', text: '작은창자 벽 세포에서 지방으로 다시 합쳐진 뒤, 주로 암죽관으로 들어가요.' },
  { id: 'mineral', label: '무기염류', origin: '소화할 필요 없이 흡수', route: 'blood', shape: 'diamond', color: '#8c71a8', text: '무기염류는 효소로 더 작게 소화할 필요 없이 모세 혈관으로 흡수돼요.' },
  { id: 'water', label: '물', origin: '소화할 필요 없이 흡수', route: 'blood', shape: 'drop', color: '#4e9da9', text: '대부분의 물은 작은창자에서 흡수돼요. 큰창자는 남은 물의 일부를 흡수해요.' },
]);

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const createAbsorption = () => ({ step: 0, surface: 'folded', nutrient: 'glucose' });
export function selectAbsorptionStep(state, step) {
  if (!Number.isInteger(step) || step < 0 || step >= ABSORPTION_STEPS.length) return false;
  state.step = step;
  return true;
}
export function selectAbsorptionNutrient(state, id) {
  if (!ABSORPTION_NUTRIENTS.some(nutrient => nutrient.id === id)) return false;
  state.nutrient = id;
  return true;
}

function particle(nutrient, x, y, size = 9) {
  const common = `fill="${nutrient.color}" stroke="#fffef9" stroke-width="2"`;
  const shape = nutrient.shape === 'hexagon' ? `<path d="M-${size} 0 L-${size / 2} -${size} H${size / 2} L${size} 0 L${size / 2} ${size} H-${size / 2}Z" ${common}/>`
    : nutrient.shape === 'square' ? `<rect x="-${size}" y="-${size}" width="${size * 2}" height="${size * 2}" rx="3" ${common}/>`
    : nutrient.shape === 'diamond' ? `<path d="M0 -${size + 2} L${size} 0 L0 ${size + 2} L-${size} 0Z" ${common}/>`
    : nutrient.shape === 'drop' ? `<path d="M0 -${size + 3} Q-${size * 1.8} ${size} 0 ${size} Q${size * 1.8} ${size} 0 -${size + 3}Z" ${common}/>`
    : `<circle r="${size}" ${common}/>`;
  return `<g transform="translate(${x} ${y})">${shape}</g>`;
}

function villusSVG(nutrient = null) {
  const route = nutrient?.route;
  const bloodAlpha = route === 'lymph' ? '.22' : '1';
  const lymphAlpha = route === 'blood' ? '.22' : '1';
  const destination = route === 'lymph' ? '암죽관' : '모세 혈관';
  return `<svg class="abs-villus" viewBox="0 0 500 400" role="img" aria-labelledby="abs-villus-title abs-villus-desc">
    <title id="abs-villus-title">${nutrient ? `${esc(nutrient.label)}의 ${destination} 흡수 경로` : '융털 속 가운데 암죽관과 그 주변의 모세 혈관'}</title>
    <desc id="abs-villus-desc">작은창자 안쪽으로 돌출된 융털의 단면 모형. 가운데 암죽관이 있고 그 주변에 모세 혈관이 분포해요.${nutrient ? ' 영양소는 융털의 겉면을 통과해 몸속으로 들어가요.' : ''}</desc>
    <defs><linearGradient id="abs-tissue" x1="0" x2="1"><stop stop-color="#f5c6ac"/><stop offset=".5" stop-color="#fff0dc"/><stop offset="1" stop-color="#f3bda4"/></linearGradient><marker id="abs-route-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="${route === 'lymph' ? '#3c8053' : '#b64958'}"/></marker></defs>
    <path d="M135 326 V174 C135 106 163 55 215 55 C267 55 295 106 295 174 V326Z" fill="url(#abs-tissue)" stroke="#d58e7a" stroke-width="16" stroke-linejoin="round"/>
    <path d="M138 326 V174 C138 109 166 59 215 59 C264 59 292 109 292 174 V326" fill="none" stroke="#ffe9d8" stroke-width="4"/>
    <g class="abs-vessel-blood" opacity="${bloodAlpha}" fill="none" stroke-linecap="round">
      <path d="M170 350 V178 C170 127 183 99 215 99 C247 99 260 127 260 178 V350" stroke="#c65e68" stroke-width="11"/>
      <path d="M170 205 Q195 183 215 190 Q239 183 260 205 M170 246 Q195 226 215 233 Q239 226 260 246 M170 286 Q193 267 215 274 Q240 267 260 286" stroke="#d57d83" stroke-width="5"/>
      <path d="M260 350 V178 Q260 135 243 114" stroke="#7e98b7" stroke-width="5"/>
    </g>
    <path class="abs-vessel-lymph" d="M215 350 V146" fill="none" stroke="#69a372" stroke-width="22" stroke-linecap="round" opacity="${lymphAlpha}"/>
    <path d="M215 346 V150" fill="none" stroke="#b6d8a9" stroke-width="7" stroke-linecap="round" opacity="${lymphAlpha}"/>
    <path d="M22 337 H124 M306 337 H478" stroke="#d7c1aa" stroke-width="2"/>
    <text x="25" y="35" class="abs-svg-label">작은창자 안</text>
    <text x="319" y="130" class="abs-svg-label abs-blood-text" opacity="${bloodAlpha}">모세 혈관</text><path d="M315 140 H285 L260 163" fill="none" stroke="#b85160" stroke-width="2" opacity="${bloodAlpha}"/>
    <text x="319" y="217" class="abs-svg-label abs-lymph-text" opacity="${lymphAlpha}">암죽관</text><path d="M315 225 H279 L226 228" fill="none" stroke="#4e8658" stroke-width="2" opacity="${lymphAlpha}"/>
    <text x="319" y="242" class="abs-svg-small" opacity="${lymphAlpha}">융털 가운데</text>
    <text x="25" y="288" class="abs-svg-small">융털의</text><text x="25" y="311" class="abs-svg-small">겉면</text><path d="M90 297 H126" stroke="#a16c5a" stroke-width="2"/>
    ${nutrient ? `${particle(nutrient, 65, 110, 13)}${particle(nutrient, 92, 153, 10)}${route === 'lymph' ? '<rect x="132" y="185" width="30" height="54" rx="10" fill="#ffe5ae" stroke="#c3894a" stroke-width="2"/><text x="319" y="283" class="abs-svg-small">벽 세포에서</text><text x="319" y="306" class="abs-svg-small">지방 재합성</text><circle cx="215" cy="252" r="13" fill="#f2c56d" stroke="#a77937" stroke-width="2"/>' : particle(nutrient, 170, 219, 11) + particle(nutrient, 180, 278, 9)}<path d="${route === 'lymph' ? 'M98 177 Q125 186 147 211 L202 211' : 'M94 152 Q126 159 162 183'}" fill="none" stroke="${route === 'lymph' ? '#3c8053' : '#b64958'}" stroke-width="5" marker-end="url(#abs-route-arrow)"/>` : ''}
    <text x="250" y="386" text-anchor="middle" class="abs-svg-small">벽을 건너 들어온 곳 = 몸속</text>
  </svg>`;
}

function foldSVG(folded) {
  const top = folded ? 'M22 154 V98 Q22 65 45 65 Q68 65 68 98 V137 Q68 154 83 154 Q98 154 98 137 V66 Q98 33 121 33 Q144 33 144 66 V137 Q144 154 159 154 Q174 154 174 137 V89 Q174 56 197 56 Q220 56 220 89 V137 Q220 154 235 154 Q250 154 250 137 V66 Q250 33 273 33 Q296 33 296 66 V137 Q296 154 311 154 Q326 154 326 137 V98 Q326 65 349 65 Q372 65 372 98 V154' : 'M22 154 H372';
  return `<svg class="abs-fold-model" viewBox="0 0 394 195" role="img" aria-label="같은 바닥 너비에서 ${folded ? '주름과 융털이 돌출되어 접촉 표면이 넓어진 벽' : '평평한 벽'}을 비교하는 모형"><path d="${top} L372 175 H22Z" fill="#f8d7bd"/><path d="${top}" fill="none" stroke="#bd795d" stroke-width="7" stroke-linecap="round"/><path d="M22 183 H372 M22 178 V188 M372 178 V188" stroke="#899c80" stroke-width="2"/></svg>`;
}

function structureView(state) {
  return `<div class="abs-stage abs-structure"><div class="abs-figure"><div class="abs-zoom-origin"><img src="./assets/intestine-organ-v3.png" width="1536" height="1024" alt="안쪽 벽에 주름이 있는 작은창자"><p><strong>작은창자 → 안쪽 주름 → 융털</strong><span>소화관 중 가장 긴 작은창자의 안쪽 벽이에요.</span></p></div>${villusSVG()}</div><div class="abs-copy"><p class="eyebrow">구조와 기능을 연결해요</p><h3>주름 + 융털<br><em>표면적이 넓어져요.</em></h3><p>음식 속 영양소와 닿는 면적이 넓어서<br><strong>영양소를 효율적으로 흡수</strong>할 수 있어요.</p><div class="abs-surface-control" role="group" aria-label="작은창자 안쪽 벽의 표면 비교"><button type="button" data-abs-surface="smooth" aria-pressed="${state.surface === 'smooth'}">매끈한 벽</button><button type="button" data-abs-surface="folded" aria-pressed="${state.surface === 'folded'}">주름·융털 있는 벽</button></div><div class="abs-surface-result" role="status" aria-live="polite">${foldSVG(state.surface === 'folded')}<strong>${state.surface === 'folded' ? '같은 바닥 너비, 더 넓은 접촉 표면' : '같은 바닥 너비, 좁은 접촉 표면'}</strong></div><p class="abs-model-note">표면적을 비교하기 위한 모형이에요. 실제 주름·융털의 크기와 비율은 달라요.</p></div></div>`;
}

function routeView(state) {
  const nutrient = ABSORPTION_NUTRIENTS.find(item => item.id === state.nutrient) || ABSORPTION_NUTRIENTS[0];
  const lymph = nutrient.route === 'lymph';
  return `<div class="abs-stage abs-routes"><div class="abs-figure">${villusSVG(nutrient)}<p class="abs-model-note">색과 모양은 물질을 구별하는 학습 모형이에요.</p></div><div class="abs-copy"><p class="eyebrow">물질을 눌러 흡수 경로를 비교해요</p><div class="abs-nutrient-choices" role="group" aria-label="흡수 경로를 볼 물질">${ABSORPTION_NUTRIENTS.map(item => `<button type="button" data-abs-nutrient="${item.id}" aria-pressed="${item.id === nutrient.id}" aria-describedby="abs-route-answer"><span class="abs-nutrient-dot" data-shape="${item.shape}" style="--nutrient-color:${item.color}" aria-hidden="true"></span>${item.label}</button>`).join('')}</div><div id="abs-route-answer" class="abs-route-answer" data-route="${nutrient.route}" role="status" aria-live="polite" aria-atomic="true"><span>${nutrient.origin}</span><h3>${nutrient.label}</h3><p class="abs-destination"><span aria-hidden="true">→</span> ${lymph ? '주로 암죽관' : '모세 혈관'}</p><p>${nutrient.text}</p></div><div class="abs-two-routes"><p><strong>모세 혈관</strong><span>포도당 · 아미노산 · 무기염류 등</span></p><p><strong>암죽관</strong><span>지방산·모노글리세리드 흡수 후<br>재합성된 지방이 주로 이동</span></p></div><p class="abs-model-note">물도 작은창자에서 흡수돼요. 지방은 긴 사슬 지방의 대표 경로를 나타냈어요.</p></div></div>`;
}

function mobileTransportView() {
  return `<div class="abs-mobile-routes"><div><p><strong>모세 혈관</strong><span>포도당·아미노산 등</span></p><span aria-hidden="true">↓</span><p>간</p></div><div><p><strong>암죽관</strong><span>재합성된 지방</span></p><span aria-hidden="true">↓</span><p>림프관</p></div><p class="abs-mobile-merge"><span aria-hidden="true">↓</span> 혈액에 합류</p><p class="abs-mobile-heart">심장 <span aria-hidden="true">↓</span> 온몸의 세포</p></div>`;
}

function transportView() {
  return `<div class="abs-stage abs-transport"><p class="abs-transport-intro">흡수된 영양소는 <strong>혈액을 통해 심장을 거쳐 온몸의 세포</strong>로 운반돼요.</p><svg viewBox="0 0 1080 330" class="abs-transport-map" role="img" aria-labelledby="abs-transport-title"><title id="abs-transport-title">모세 혈관에서 간을 거치는 경로와 암죽관에서 림프관을 거치는 경로가 혈액으로 합쳐져 심장을 지나 온몸 세포로 이동하는 모형</title><defs><marker id="abs-transport-arrow" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" refX="16" refY="9" orient="auto"><path d="M0 0 L18 9 L0 18Z" fill="#73977b"/></marker></defs><path d="M190 90 H306 M190 232 H306 M420 90 H452 Q480 90 480 137 V165 H488 M420 232 H452 Q480 232 480 193 V165 H488 M571 165 H681 M798 165 H901" fill="none" stroke="#87a78a" stroke-width="6" marker-end="url(#abs-transport-arrow)"/><rect x="19" y="44" width="171" height="93" rx="19" fill="#f8e5e5" stroke="#d1a3aa" stroke-width="2"/><text x="104" y="80" class="abs-map-label">모세 혈관</text><text x="104" y="108" class="abs-map-small">포도당·아미노산 등</text><rect x="19" y="186" width="171" height="93" rx="19" fill="#e8f0df" stroke="#9cb78c" stroke-width="2"/><text x="104" y="224" class="abs-map-label">암죽관</text><text x="104" y="252" class="abs-map-small">재합성된 지방</text><rect x="310" y="57" width="112" height="65" rx="19" fill="#f6e3d2"/><text x="366" y="99" class="abs-map-label">간</text><rect x="310" y="200" width="112" height="65" rx="19" fill="#e2eedb"/><text x="366" y="241" class="abs-map-label">림프관</text><circle cx="538" cy="165" r="43" fill="#f4d3d7" stroke="#b95e6b" stroke-width="3"/><text x="538" y="173" class="abs-map-label">혈액</text><circle cx="743" cy="165" r="58" fill="#be626d"/><text x="743" y="157" class="abs-map-heart" aria-hidden="true">♥</text><text x="743" y="188" class="abs-map-heart-label">심장</text><g><circle cx="967" cy="151" r="39" fill="#f8dea5" stroke="#b79a5a" stroke-width="3"/><circle cx="967" cy="151" r="11" fill="#bd9e63"/><circle cx="1010" cy="190" r="30" fill="#ecdda7" stroke="#b79a5a" stroke-width="3"/><circle cx="1010" cy="190" r="8" fill="#bd9e63"/></g><text x="976" y="258" class="abs-map-label">온몸의 세포</text><text x="538" y="304" class="abs-map-small">암죽관으로 간 지방도 림프관을 거쳐 혈액에 합류해요.</text></svg>${mobileTransportView()}<div class="abs-cell-uses"><p><span aria-hidden="true">01</span><strong>에너지원</strong><small>생명 활동에 필요한 에너지</small></p><p><span aria-hidden="true">02</span><strong>몸 구성</strong><small>몸을 이루는 물질을 만드는 재료</small></p><p><span aria-hidden="true">03</span><strong>기능 조절</strong><small>몸의 기능을 조절하는 데 사용</small></p></div><p class="abs-model-note">몸속 운반 경로를 단순화한 모형이에요. 모든 영양소가 세 역할을 똑같이 하는 것은 아니에요.</p></div>`;
}

function colonView() {
  return `<div class="abs-stage abs-colon"><div class="abs-colon-figure"><span class="abs-colon-kicker">작은창자에서 흡수되지 않은 내용물</span><span class="abs-down-arrow" aria-hidden="true">↓</span><img src="./assets/colon-organ-v3.png" alt="큰창자와 직장, 항문을 보여 주는 삽화" width="1536" height="1024"><div class="abs-colon-forks"><p><span class="abs-water-symbol" aria-hidden="true">●</span><strong>남은 물의 일부</strong><span>벽을 건너 몸속으로 흡수</span></p><p><span class="abs-residue-symbol" aria-hidden="true">●</span><strong>흡수되지 않은 찌꺼기</strong><span>대변 → 직장 → 항문</span></p></div></div><div class="abs-copy"><p class="eyebrow">소화 · 흡수 · 배출을 구별해요</p><h3>큰창자의 주된 일은<br><em>수분 흡수와 대변 형성</em></h3><ul class="abs-colon-facts"><li><strong>소화 효소에 의한 소화 ×</strong><span>큰창자는 사람의 소화 효소를 분비하지 않아요.</span></li><li><strong>남은 물 일부 흡수 ○</strong><span>대부분의 물은 작은창자에서 흡수되고, 큰창자에서 남은 물의 일부가 흡수돼요.</span></li><li><strong>대변을 몸 밖으로 배출</strong><span>흡수되지 않은 찌꺼기는 대변이 되어 직장을 거쳐 항문으로 나가요.</span></li></ul><p class="abs-model-note">큰창자는 약 1.5m의 굵은 관이에요. 많은 미생물이 살며, 일부 비타민을 만들기도 해요. 미생물의 작용은 사람의 소화 효소에 의한 소화와 구별해요.</p></div></div>`;
}

export function renderAbsorption(state = createAbsorption()) {
  const step = ABSORPTION_STEPS[state.step] || ABSORPTION_STEPS[0];
  const content = [structureView, routeView, transportView, colonView][state.step] || structureView;
  return `<div class="abs-heading"><div><p class="eyebrow">소화 다음 이야기 · 융털에서 온몸까지</p><h1 id="absorption-title">흡수한 영양소는 어디로 갈까요?</h1></div><button type="button" class="abs-back-tour" data-abs-return="tour">소화 장면과 연결 →</button></div><nav class="abs-chapters" aria-label="흡수와 이동의 관찰 단계">${ABSORPTION_STEPS.map((item, index) => `<button type="button" data-abs-step="${index}" aria-pressed="${index === state.step}"><span>${String(index + 1).padStart(2, '0')}</span>${item.label}</button>`).join('')}</nav><section class="abs-main" aria-labelledby="abs-stage-title"><div class="abs-stage-heading"><h2 id="abs-stage-title" tabindex="-1">${step.title}</h2><span>${state.step + 1} / ${ABSORPTION_STEPS.length}</span></div>${content(state)}</section><div class="abs-footer"><p>한 번에 한 장면씩 · 버튼을 누를 때만 바뀌어요.</p><div><button type="button" data-abs-move="-1" ${state.step === 0 ? 'disabled' : ''}>← 이전</button><span role="status" aria-live="polite">${state.step + 1} / ${ABSORPTION_STEPS.length}</span><button type="button" data-abs-move="1">${state.step === ABSORPTION_STEPS.length - 1 ? '한눈에 정리 →' : '다음 장면 →'}</button></div></div>`;
}

export function mountAbsorption(root, { onTour, onSummary } = {}) {
  const state = createAbsorption();
  function render(focus = '') {
    root.innerHTML = renderAbsorption(state);
    if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }
  function move(direction) {
    if (direction !== -1 && direction !== 1) return;
    const next = state.step + direction;
    if (next === ABSORPTION_STEPS.length) { onSummary?.(); return; }
    if (selectAbsorptionStep(state, next)) render('#abs-stage-title');
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-abs-step')) {
      selectAbsorptionStep(state, Number(button.dataset.absStep));
      render(`[data-abs-step="${state.step}"]`);
    } else if (button.hasAttribute('data-abs-move')) {
      move(Number(button.dataset.absMove));
    } else if (button.hasAttribute('data-abs-nutrient')) {
      if (selectAbsorptionNutrient(state, button.dataset.absNutrient)) render(`[data-abs-nutrient="${state.nutrient}"]`);
    } else if (button.hasAttribute('data-abs-surface')) {
      if (!['smooth', 'folded'].includes(button.dataset.absSurface)) return;
      state.surface = button.dataset.absSurface;
      render(`[data-abs-surface="${state.surface}"]`);
    } else if (button.dataset.absReturn === 'tour') onTour?.(state.step === 3 ? 5 : 4);
  });
  render();
  return { show(step = state.step) { selectAbsorptionStep(state, step); render(); }, move };
}
