// Generated organ illustrations with precise text and route overlays. No automatic playback.
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

function villusIllustration(nutrient = null) {
  const route = nutrient?.route;
  const destination = route === 'lymph' ? '암죽관' : '모세 혈관';
  const label = nutrient ? `${nutrient.label}이 융털의 겉면을 통과해 ${destination}으로 흡수되는 경로` : '융털 단면. 가운데의 초록색 암죽관과 그 주변의 붉고 푸른 모세 혈관';
  return `<figure class="abs-villus-art" data-route="${route || 'both'}"><img class="abs-villus-image" src="./assets/villus-cutaway-v2.webp" width="960" height="960" alt="${esc(label)}"><span class="abs-tissue-place">작은창자 안</span><span class="abs-villus-callout abs-villus-blood" data-active="${route !== 'lymph'}"><strong>모세 혈관</strong><small>융털 속 주변</small></span><span class="abs-villus-callout abs-villus-lymph" data-active="${route !== 'blood'}"><strong>암죽관</strong><small>융털 속 가운데</small></span><span class="abs-villus-wall">융털의 겉면</span>${nutrient ? `<svg class="abs-route-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="abs-route-arrow" markerUnits="userSpaceOnUse" markerWidth="48" markerHeight="48" refX="43" refY="24" orient="auto"><path d="M0 0 L48 24 L0 48Z" fill="${route === 'lymph' ? '#31794d' : '#ad3e55'}"/></marker></defs><path d="${route === 'lymph' ? 'M-100 410 C100 410 210 520 365 520 L535 520' : 'M-100 410 C100 410 245 490 450 490'}" fill="none" stroke="#fffdf6" stroke-width="24"/><path d="${route === 'lymph' ? 'M-100 410 C100 410 210 520 365 520 L535 520' : 'M-100 410 C100 410 245 490 450 490'}" fill="none" stroke="${route === 'lymph' ? '#31794d' : '#ad3e55'}" stroke-width="14" marker-end="url(#abs-route-arrow)"/></svg><span class="abs-entering-nutrient">${esc(nutrient.label)}</span>${route === 'lymph' ? '<span class="abs-fat-assembly">벽 세포에서<br>지방 재합성</span>' : ''}` : ''}<figcaption>벽을 건너 들어온 곳 = 몸속</figcaption></figure>`;
}

function foldIllustration(folded) {
  return `<img class="abs-surface-art" src="./assets/wall-${folded ? 'folded' : 'smooth'}-v2.webp" width="960" height="640" alt="${folded ? '큰 주름 위에 작은 융털들이 빽빽하게 돋아난 작은창자 안쪽 벽의 입체 삽화' : '같은 바닥 너비에서 주름과 융털이 없다고 가정한 매끈한 장벽의 비교용 입체 삽화'}">`;
}

function structureView(state) {
  return `<div class="abs-stage abs-structure"><div class="abs-figure"><div class="abs-zoom-origin"><img src="./assets/intestine-organ-v3.png" width="1536" height="1024" alt="안쪽 벽에 주름이 있는 작은창자"><p><strong>작은창자 → 안쪽 주름 → 융털</strong><span>소화관 중 가장 긴 작은창자의 안쪽 벽이에요.</span></p></div>${villusIllustration()}</div><div class="abs-copy"><p class="eyebrow">구조와 기능을 연결해요</p><h3>주름 + 융털<br><em>표면적이 넓어져요.</em></h3><p>음식 속 영양소와 닿는 면적이 넓어서<br><strong>영양소를 효율적으로 흡수</strong>할 수 있어요.</p><div class="abs-surface-control" role="group" aria-label="작은창자 안쪽 벽의 표면 비교"><button type="button" data-abs-surface="smooth" aria-pressed="${state.surface === 'smooth'}">매끈한 벽</button><button type="button" data-abs-surface="folded" aria-pressed="${state.surface === 'folded'}">주름·융털 있는 벽</button></div><div class="abs-surface-result" role="status" aria-live="polite">${foldIllustration(state.surface === 'folded')}<strong>${state.surface === 'folded' ? '같은 바닥 너비, 더 넓은 접촉 표면' : '같은 바닥 너비, 좁은 접촉 표면'}</strong></div><p class="abs-model-note">표면적을 비교하기 위한 모형이에요. 실제 주름·융털의 크기와 비율은 달라요.</p></div></div>`;
}

function routeView(state) {
  const nutrient = ABSORPTION_NUTRIENTS.find(item => item.id === state.nutrient) || ABSORPTION_NUTRIENTS[0];
  const lymph = nutrient.route === 'lymph';
  return `<div class="abs-stage abs-routes"><div class="abs-figure">${villusIllustration(nutrient)}<p class="abs-model-note">색과 모양은 물질을 구별하는 학습 모형이에요.</p></div><div class="abs-copy"><p class="eyebrow">물질을 눌러 흡수 경로를 비교해요</p><div class="abs-nutrient-choices" role="group" aria-label="흡수 경로를 볼 물질">${ABSORPTION_NUTRIENTS.map(item => `<button type="button" data-abs-nutrient="${item.id}" aria-pressed="${item.id === nutrient.id}" aria-describedby="abs-route-answer"><span class="abs-nutrient-dot" data-shape="${item.shape}" style="--nutrient-color:${item.color}" aria-hidden="true"></span>${item.label}</button>`).join('')}</div><div id="abs-route-answer" class="abs-route-answer" data-route="${nutrient.route}" role="status" aria-live="polite" aria-atomic="true"><span>${nutrient.origin}</span><h3>${nutrient.label}</h3><p class="abs-destination"><span aria-hidden="true">→</span> ${lymph ? '주로 암죽관' : '모세 혈관'}</p><p>${nutrient.text}</p></div><div class="abs-two-routes"><p><strong>모세 혈관</strong><span>포도당 · 아미노산 · 무기염류 등</span></p><p><strong>암죽관</strong><span>지방산·모노글리세리드 흡수 후<br>재합성된 지방이 주로 이동</span></p></div><p class="abs-model-note">물도 작은창자에서 흡수돼요. 지방은 긴 사슬 지방의 대표 경로를 나타냈어요.</p></div></div>`;
}

function transportView() {
  return `<div class="abs-stage abs-transport"><p class="abs-transport-intro">흡수된 영양소는 <strong>혈액을 통해 심장을 거쳐 온몸의 세포</strong>로 운반돼요.</p><div class="abs-transport-art" role="group" aria-label="융털의 모세 혈관에서 간을 거치는 길과 암죽관에서 림프관을 거치는 길이 혈액으로 합쳐져 심장을 지나 온몸의 세포로 이동해요."><figure class="abs-transport-start"><img src="./assets/villus-cutaway-v2.webp" width="960" height="960" alt="융털 속의 두 흡수 경로"><figcaption>작은창자 융털</figcaption></figure><div class="abs-transport-branches"><div class="abs-transport-blood"><p><strong>모세 혈관</strong><span>포도당·아미노산 등</span></p><span class="abs-branch-arrow" aria-hidden="true">→</span><figure><img src="./assets/liver-gallbladder-v5.png" width="1536" height="1024" alt="간"><figcaption>간</figcaption></figure></div><div class="abs-transport-lymph"><p><strong>암죽관</strong><span>재합성된 지방</span></p><span class="abs-branch-arrow" aria-hidden="true">→</span><strong class="abs-lymph-name">림프관</strong></div><p class="abs-flow-merge">두 경로 모두 <strong>혈액에 합류</strong></p></div><figure class="abs-transport-heart"><img src="./assets/heart-v2.webp" width="960" height="960" alt="흡수된 영양소가 든 혈액을 온몸으로 보내는 심장"><figcaption>심장</figcaption></figure><figure class="abs-transport-cells"><img src="./assets/body-cells-v2.webp" width="960" height="960" alt="영양소를 전달받아 사용하는 몸의 세포들"><figcaption>온몸의 세포</figcaption></figure></div><div class="abs-cell-uses"><p><span aria-hidden="true">01</span><strong>에너지원</strong><small>생명 활동에 필요한 에너지</small></p><p><span aria-hidden="true">02</span><strong>몸 구성</strong><small>몸을 이루는 물질을 만드는 재료</small></p><p><span aria-hidden="true">03</span><strong>기능 조절</strong><small>몸의 기능을 조절하는 데 사용</small></p></div><p class="abs-model-note">몸속 운반 경로를 단순화한 모형이에요. 모든 영양소가 세 역할을 똑같이 하는 것은 아니에요.</p></div>`;
}

function colonView() {
  return `<div class="abs-stage abs-colon"><div class="abs-colon-figure"><span class="abs-colon-kicker">작은창자에서 흡수되지 않은 내용물</span><span class="abs-down-arrow" aria-hidden="true">↓</span><img src="./assets/colon-organ-v3.png" alt="큰창자와 직장, 항문을 보여 주는 삽화" width="1536" height="1024"><div class="abs-colon-forks"><p><img class="abs-colon-token" src="./assets/water-drop-v5.png" alt="" width="1536" height="1024"><strong>남은 물의 일부</strong><span>벽을 건너 몸속으로 흡수</span></p><p><img class="abs-colon-token" src="./assets/residue-v5.png" alt="" width="1536" height="1024"><strong>흡수되지 않은 찌꺼기</strong><span>대변 → 직장 → 항문</span></p></div></div><div class="abs-copy"><p class="eyebrow">소화 · 흡수 · 배출을 구별해요</p><h3>큰창자의 주된 일은<br><em>수분 흡수와 대변 형성</em></h3><ul class="abs-colon-facts"><li><strong>소화 효소에 의한 소화 ×</strong><span>큰창자는 사람의 소화 효소를 분비하지 않아요.</span></li><li><strong>남은 물 일부 흡수 ○</strong><span>대부분의 물은 작은창자에서 흡수되고, 큰창자에서 남은 물의 일부가 흡수돼요.</span></li><li><strong>대변을 몸 밖으로 배출</strong><span>흡수되지 않은 찌꺼기는 대변이 되어 직장을 거쳐 항문으로 나가요.</span></li></ul><p class="abs-model-note">큰창자는 약 1.5m의 굵은 관이에요. 많은 미생물이 살며, 일부 비타민을 만들기도 해요. 미생물의 작용은 사람의 소화 효소에 의한 소화와 구별해요.</p></div></div>`;
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
