import { ENZYMES, maskEnzymeNames } from './memory.mjs';

// A relationship has its own identity: amylase has two places and two scene links.
// `place` means where the enzyme acts; `source` names the digestive fluid.
export const ASSOCIATIONS = Object.freeze([
  Object.freeze({ id: 'mouth-amylase', place: '입', organAsset: 'mouth-organ-v3.png', enzymeKey: 'amylase', target: '녹말', source: '침', stage: 0, beat: 3, sentence: '입에서 아밀레이스가 녹말을 분해해요.' }),
  Object.freeze({ id: 'stomach-pepsin', place: '위', organAsset: 'stomach-organ-v3.png', enzymeKey: 'pepsin', target: '단백질', source: '위액', stage: 2, beat: 2, sentence: '위에서 펩신이 단백질을 짧게 나눠요.' }),
  Object.freeze({ id: 'intestine-amylase', place: '소장', organAsset: 'intestine-organ-v3.png', enzymeKey: 'amylase', target: '녹말', source: '이자액', stage: 3, beat: 2, sentence: '소장에서 아밀레이스가 남은 녹말을 분해해요.' }),
  Object.freeze({ id: 'intestine-trypsin', place: '소장', organAsset: 'intestine-organ-v3.png', enzymeKey: 'trypsin', target: '단백질', source: '이자액', stage: 3, beat: 3, sentence: '소장에서 트립신이 단백질 조각을 더 작게 나눠요.' }),
  Object.freeze({ id: 'intestine-lipase', place: '소장', organAsset: 'intestine-organ-v3.png', enzymeKey: 'lipase', target: '지방', source: '이자액', stage: 3, beat: 4, sentence: '소장에서 라이페이스가 지방을 분해해요.' })
]);

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const normalizeMode = value => ['visible', 'hidden', 'hint'].includes(value) ? value : 'visible';

function renderRelationship(association, mode) {
  const enzyme = ENZYMES[association.enzymeKey];
  const name = mode === 'hidden' ? '어떤 효소?' : maskEnzymeNames(enzyme.name, mode);
  const sentence = maskEnzymeNames(association.sentence, mode);
  const nameLabel = mode === 'hidden' ? '이름을 가린 소화 효소' : mode === 'hint' ? `효소 이름의 첫 글자: ${enzyme.name.slice(0, 1)}` : enzyme.name;

  return `<li class="assoc-row" data-association="${association.id}" data-team="${enzyme.team}">
    <span class="assoc-arrow assoc-arrow-place" aria-hidden="true">→</span>
    <div class="assoc-enzyme">
      <span class="assoc-portrait"><img src="./assets/${enzyme.asset}" alt="소화 효소 캐릭터" width="1254" height="1254" decoding="async"></span>
      <div class="assoc-enzyme-copy">
        <span class="assoc-mobile-label" aria-hidden="true">어떤 효소가?</span>
        <strong class="assoc-enzyme-name" aria-label="${escapeHTML(nameLabel)}">${escapeHTML(name)}</strong>
        <p class="assoc-sentence">${escapeHTML(sentence)}</p>
        <span class="assoc-source">${escapeHTML(association.source)}에 들어 있어요</span>
      </div>
    </div>
    <span class="assoc-arrow assoc-arrow-target" aria-hidden="true">→</span>
    <div class="assoc-target">
      <span class="assoc-nutrient-model" aria-hidden="true"><i></i><i></i><i></i></span>
      <div class="assoc-target-copy"><span class="assoc-mobile-label" aria-hidden="true">무엇을?</span><strong>${escapeHTML(association.target)}</strong><small>${association.target === '녹말' ? '탄수화물' : '분해 대상'}</small></div>
    </div>
    <button type="button" class="assoc-visit" data-visit-association="${association.id}" aria-label="${escapeHTML(association.place)}에서 ${escapeHTML(association.target)}을 분해하는 장면 보기"><span>장면 보기</span><span aria-hidden="true">↗</span></button>
  </li>`;
}

function renderPlaceGroup(relationships, mode) {
  const first = relationships[0];
  return `<section class="assoc-group${relationships.length > 1 ? ' assoc-group-multiple' : ''}" aria-label="${escapeHTML(first.place)}에서 작용하는 소화 효소">
    <div class="assoc-place">
      <img class="assoc-organ" src="./assets/${first.organAsset}" alt="${escapeHTML(first.place)}의 확대 삽화" width="1536" height="1024" decoding="async">
      <div class="assoc-place-copy"><span class="assoc-mobile-label" aria-hidden="true">어디서?</span><h2>${escapeHTML(first.place)}<span>에서</span></h2></div>
    </div>
    <ol class="assoc-relations">${relationships.map(association => renderRelationship(association, mode)).join('')}</ol>
  </section>`;
}

/**
 * Pure HTML renderer. The caller owns recall controls and delegated click events.
 * Mount in a full-width container, and load associations.css after styles.css.
 */
export function renderAssociations(nameMode = 'visible') {
  const mode = normalizeMode(nameMode);
  const groups = [];
  for (const association of ASSOCIATIONS) {
    const last = groups[groups.length - 1];
    if (last && last[0].place === association.place) last.push(association);
    else groups.push([association]);
  }
  return `<div class="assoc-board" data-name-mode="${mode}" role="group" aria-label="작용하는 장소, 소화 효소, 영양소 연결표">
    <div class="assoc-head" aria-hidden="true">
      <div class="assoc-column-heading assoc-place-heading"><strong>어디서?</strong><span>작용하는 장소</span></div>
      <div class="assoc-path-heading"><div class="assoc-column-heading assoc-enzyme-heading"><strong>어떤 효소가?</strong><span>소화 효소</span></div><div class="assoc-column-heading assoc-target-heading"><strong>무엇을?</strong><span>영양소 · 분해 대상</span></div></div>
    </div>
    <div class="assoc-groups">${groups.map(group => renderPlaceGroup(group, mode)).join('')}</div>
    <p class="assoc-note"><strong>장소는 효소가 작용하는 곳이에요.</strong><span>표에 나온 소장 효소들은 이자에서 나온 이자액에 들어 있어요.</span></p>
  </div>`;
}
