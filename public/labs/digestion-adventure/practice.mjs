import { ENZYMES, maskEnzymeNames } from './memory.mjs';
import { ASSOCIATIONS } from './associations.mjs';

// Repeat amylase in both places: enzymes are reusable, not one-use matching cards.
const ORDER = ['stomach-pepsin', 'intestine-amylase', 'intestine-trypsin', 'mouth-amylase', 'intestine-lipase'];
const CHOICES = ['lipase', 'pepsin', 'amylase', 'trypsin'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);

export const createPractice = () => ({ index: 0, selected: null, solved: false, finished: false });
export const currentMission = state => ASSOCIATIONS.find(item => item.id === ORDER[state.index]);
export function chooseEnzyme(state, key) {
  if (state.finished || state.solved || !ENZYMES[key]) return false;
  state.selected = key;
  state.solved = key === currentMission(state).enzymeKey;
  return state.solved;
}
export function nextMission(state) {
  if (!state.solved || state.finished) return false;
  if (state.index === ORDER.length - 1) state.finished = true;
  else { state.index++; state.selected = null; state.solved = false; }
  return true;
}

function feedback(state, mode) {
  const mission = currentMission(state);
  if (!state.selected) return '장소와 영양소, 두 단서를 함께 보고 효소 친구를 골라 주세요.';
  const selected = ENZYMES[state.selected];
  if (state.solved) {
    const extra = mission.enzymeKey === 'trypsin'
      ? '위에서 시작한 단백질 소화를 이어받아요. 두 곰은 서로 다른 효소예요.'
      : mission.enzymeKey === 'pepsin'
      ? '위에서는 단백질 소화를 시작해요. 작은창자의 곰과 작용하는 장소가 달라요.'
      : mission.enzymeKey === 'amylase'
      ? '같은 종류의 효소가 입과 작은창자 두 곳에서 작용해요.'
      : '쓸개즙은 방울을 흩어 놓고, 이 효소가 지방 분자를 분해해요.';
    return `${maskEnzymeNames(mission.sentence, mode)} ${mission.source}에 들어 있어요. ${extra}`;
  }
  if (selected.target === mission.target) return `단백질 담당은 맞아요! 이번 장소는 ${mission.place}예요. 두 곰 중 어느 친구가 이곳에서 일했는지 다시 떠올려 보세요.`;
  return `이 친구는 ${selected.target} 담당이에요. 지금 분해할 것은 ${mission.target}이에요. 다른 친구를 골라 보세요.`;
}

export function renderPractice(state, mode = 'visible') {
  if (state.finished) return `<section class="dispatch dispatch-complete" aria-labelledby="dispatch-title"><p class="eyebrow">다섯 상황 · 역할 연결 완료</p><h2 id="dispatch-title" tabindex="-1">이제 그림을 보고 설명할 수 있나요?</h2><p>“어디에서, 어떤 효소가, 무엇을 무엇으로 분해한다.”<br>친구와 번갈아 한 문장씩 말해 보세요.</p><div class="dispatch-takeaways"><p><strong>입과 작은창자의 토끼</strong><span>같은 종류의 효소 · 서로 다른 소화액</span></p><p><strong>위와 작은창자의 근육 곰</strong><span>서로 다른 효소 · 같은 단백질 담당</span></p><p><strong>작은창자의 통통 햄스터</strong><span>쓸개즙의 도움 뒤 지방 분해</span></p></div><div class="dispatch-complete-actions"><button data-practice-action="restart">다시 연결하기</button><button data-practice-action="connections">연결표로 확인하기 →</button></div></section>`;
  const mission = currentMission(state);
  const enzyme = ENZYMES[mission.enzymeKey];
  return `<section class="dispatch" aria-labelledby="dispatch-title"><div class="dispatch-heading"><div><p class="eyebrow">효소 친구 출동!</p><h2 id="dispatch-title" tabindex="-1">누가 이곳에서 일할까요?</h2></div><span class="dispatch-progress">${state.index + 1} / ${ORDER.length}</span></div>
    <div class="dispatch-mission"><img src="./assets/${mission.organAsset}" alt="${mission.place}의 확대 삽화" width="1536" height="1024"><div><span>어디서?</span><strong>${mission.place}</strong></div><span class="dispatch-plus" aria-hidden="true">＋</span><div><span>무엇을 분해?</span><strong>${mission.target}</strong></div><p>장소에 맞는 담당 효소를 골라요.</p></div>
    <div class="dispatch-choices" role="group" aria-label="출동할 효소 고르기">${CHOICES.map(key => {
      const e = ENZYMES[key];
      const name = mode === 'hidden' ? '이름을 떠올려요' : maskEnzymeNames(e.name, mode);
      const selected = state.selected === key;
      return `<button class="dispatch-choice" data-practice-choice="${key}" data-team="${e.team}" data-result="${selected ? state.solved ? 'correct' : 'retry' : ''}" aria-pressed="${selected}" ${state.solved ? 'disabled' : ''}><img src="./assets/${e.asset}" alt="${e.look}" width="1254" height="1254"><strong>${escapeHTML(name)}</strong><span>${escapeHTML(e.look)}</span></button>`;
    }).join('')}</div>
    <div class="dispatch-response" data-solved="${state.solved}"><div class="dispatch-feedback" role="status" aria-live="polite"><strong>${state.solved ? '연결 성공!' : state.selected ? '한 번 더 생각해 봐요.' : '먼저 생각해요.'}</strong>${state.solved ? `<p class="dispatch-result"><span>${escapeHTML(mission.substrate || enzyme.substrate)}</span><i aria-hidden="true">→</i><b>${escapeHTML(enzyme.result)}</b></p>` : ''}<p>${escapeHTML(feedback(state, mode))}</p></div><button data-practice-action="next" ${state.solved ? '' : 'disabled'}>${state.index === ORDER.length - 1 ? '연결 완료' : '다음 출동'} →</button></div>
  </section>`;
}
