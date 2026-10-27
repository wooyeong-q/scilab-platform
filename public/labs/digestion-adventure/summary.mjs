import { ENZYMES } from './memory.mjs';

const portrait = key => `<img src="./assets/${ENZYMES[key].asset}" width="1254" height="1254" alt="${ENZYMES[key].look} 모습의 ${ENZYMES[key].target} 담당 효소 캐릭터">`;
const organForPlace = place => place === '입' ? 'mouth-organ-v3.png' : place === '위' ? 'stomach-organ-v3.png' : 'intestine-organ-v3.png';
const step = (number, place, source, enzyme, change, extra = '') => `<li class="summary-process-step"><div class="summary-step-intro"><span class="summary-step-number" aria-hidden="true">${String(number).padStart(2, '0')}</span><img class="summary-step-organ" src="./assets/${organForPlace(place)}" width="1536" height="1024" alt="${place.startsWith('작은창자') ? '작은창자' : place}의 확대 삽화"><div class="summary-process-meta"><span class="summary-place">${place}</span><span class="summary-fluid">${source === '이자액' ? '<span class="summary-pancreatic-source"><img src="./assets/pancreas-v5.png" alt="" width="1536" height="1024"><span>이자 → <b>이자액</b></span></span>' : source}</span></div></div><h3>${enzyme}</h3><p class="summary-change">${change}</p>${extra ? `<p class="summary-extra">${extra}</p>` : ''}</li>`;
const absorption = text => `<li class="summary-absorption"><span>작은창자 융털에서 흡수</span><strong>${text}</strong></li>`;

/** Keep every card mounted so the app's text-node name mask survives navigation. */
export function renderSummaryCards({ layout = 'single', activeTeam = 'starch' } = {}) {
  const selectedLayout = layout === 'all' ? 'all' : 'single';
  const selectedTeam = ['starch', 'protein', 'fat'].includes(activeTeam) ? activeTeam : 'starch';
  const hiddenFor = team => selectedLayout === 'single' && team !== selectedTeam ? ' hidden' : '';
  return `<div class="summary-cards summary-processes" data-summary-layout="${selectedLayout}">
    <article id="summary-path-starch" class="summary-card" data-team="starch"${hiddenFor('starch')}><div class="summary-card-heading"><div><span class="small">탄수화물</span><h2>녹말</h2></div><div class="summary-portraits">${portrait('amylase')}</div></div><ol class="summary-process-list" aria-label="녹말의 소화와 흡수">
      ${step(1, '입', '침', '아밀레이스', '<b>녹말</b> <span>→</span> 엿당 등', '녹말의 일부가 분해돼요.')}
      ${step(2, '작은창자', '이자액', '아밀레이스', '<b>남은 녹말</b> <span>→</span> 엿당 등')}
      ${step(3, '작은창자 벽', '벽의 소화 효소', '소화 효소 <small class="enzyme-detail">(말테이스)</small>', '엿당 <span>→</span> <b>포도당</b>')}
      ${absorption('포도당 <span>→</span> 모세 혈관')}
    </ol></article>
    <article id="summary-path-protein" class="summary-card" data-team="protein"${hiddenFor('protein')}><div class="summary-card-heading"><div><span class="small">몸을 구성하는 영양소</span><h2>단백질</h2></div><div class="summary-portraits summary-portraits-pair">${portrait('pepsin')}${portrait('trypsin')}</div></div><ol class="summary-process-list" aria-label="단백질의 소화와 흡수">
      ${step(1, '위', '위액', '펩신', '<b>단백질</b> <span>→</span> 짧은 조각', '염산: 산성 환경 · 효소 아님')}
      ${step(2, '작은창자', '이자액', '트립신', '단백질 조각 <span>→</span> 더 작은 조각')}
      ${step(3, '작은창자 벽', '벽의 소화 효소', '소화 효소 <small class="enzyme-detail">(펩티데이스)</small>', '작은 조각 <span>→</span> <b>아미노산</b>')}
      ${absorption('아미노산 <span>→</span> 모세 혈관')}
    </ol></article>
    <article id="summary-path-fat" class="summary-card" data-team="fat"${hiddenFor('fat')}><div class="summary-card-heading"><div><span class="small">에너지를 저장하는 영양소</span><h2>지방</h2></div><div class="summary-portraits">${portrait('lipase')}</div></div><ol class="summary-process-list" aria-label="지방의 소화와 흡수">
      ${step(1, '작은창자', '쓸개에서', '쓸개즙 <small class="summary-not-enzyme">효소 아님</small>', '큰 지방 방울 <span>→</span> 작은 방울', '유화: 지방 분자는 그대로예요.')}
      ${step(2, '작은창자', '이자액', '라이페이스', '<b>지방</b> <span>→</span> 지방산 + 모노글리세리드')}
      ${step(3, '작은창자 벽 세포', '흡수된 성분으로', '지방 재합성', '분해된 성분 <span>→</span> 지방으로 다시 결합')}
      ${absorption('재합성된 지방 <span>→</span> 주로 암죽관')}
    </ol></article>
  </div>`;
}
