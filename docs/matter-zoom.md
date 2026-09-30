# 확대! 물질 탐험 연구소 구현 보고

## 프로그램 경로

- 실행: `/run/matter-zoom`
- 소개: `/programs/matter-zoom`
- 직접 실행: `/labs/matter-zoom/index.html`
- 운영 도메인: `https://scilab-platform.vercel.app`
- 프로그램 ID: `matter-zoom`

기본 진입은 중학교 2학년이다. 고등학교 확장 수준을 선택할 수 있다. 학생 계정 없이 독립적으로 사용하며, 교사는 반별 공개 링크를 만들어 배포한다. 등록 스크립트는 신규 항목을 삽입하고 기존 항목에서는 원래 등록 값과 일치하는 안내 필드만 갱신한다. 관리자가 수정한 필드, 제목, 조회·추천 수와 다른 프로그램은 보존한다.

## 이번 추가·수정 파일

| 구분 | 파일 | 역할 |
|---|---|---|
| 수정 | `public/labs/matter-zoom/index.html` | 수준·수업 링크 조작 추가 |
| 수정 | `public/labs/matter-zoom/app.js` | 두 수준의 활동, 반별 링크 생성, 공용 기기 재시작, 판단 기록 |
| 수정 | `public/labs/matter-zoom/style.css` | 수준·교사 화면 반응형·키보드 포커스 |
| 수정 | `public/labs/matter-zoom/data.mjs` | 전하 크기 설명과 배치 활동의 범위 명시 |
| 수정 | `public/labs/matter-zoom/core.mjs` | 수준별 상태 복원과 완료 근거 재검증 |
| 추가 | `public/labs/matter-zoom/levels.mjs` | 수준 안내·비교 사례·수준별 종합 문제 |
| 추가 | `public/labs/matter-zoom/session.mjs` | 독립 수업 ID·공개 링크·기록 저장 범위 |
| 수정 | `public/labs/matter-zoom/program.json` | 카탈로그의 수준·반별 사용 안내 |
| 수정 | `scripts/register-matter-zoom.mjs` | 기존 관리자 수정 보존하며 안내 갱신 |
| 추가 | `tests/matter-zoom-core-v2.test.cjs` | 저장 복원·학습 근거 검증 |
| 추가 | `tests/matter-zoom-levels.test.cjs` | 입자 수·이온·선택 확장 평가 |
| 추가 | `tests/matter-zoom-session.test.cjs` | 수업·수준별 기록 분리·링크 처리 |
| 추가 | `tests/matter-zoom-catalog-modes.test.cjs` | 등록 멱등성·관리자 수정 보존 |
| 수정 | `docs/matter-zoom.md` | 이번 구현·검증 보고 |

기존 실물 일러스트, 플랫폼 라우트, 데이터베이스 스키마는 그대로 사용한다.

## 학습 수준과 여러 교사의 수업

| 수준 | 핵심 활동 | 추가 탐구 |
|---|---|---|
| 중학교 · 기본 | 중2 원소·원자·분자, 원자 구성 입자, 원자 번호, 전기적 중성, 이온과 원소 구별 | 단순 껍질 전자 배치와 1~20 주기율표 탐색 |
| 고등학교 · 선택 확장 | 공통 확대 탐험과 원소·전하 판단, 최외각 전자와 족·주기 비교 | 화학 선택과목의 질량수·동위 원소 비교. 질량수 답을 생략해도 기본 분석 완료 가능 |

고등학교 전체 교육과정이나 특정 선택과목 전체를 대체하는 프로그램은 아니다. 양자수·오비탈·전자 확률 분포는 요구하지 않는다. 중학교 기본 화면에서 질량수·동위 원소를 필수로 평가하지 않는다.

상단 **수업 링크 만들기**에서 수준을 정하고 반 이름을 한 줄에 하나씩 입력하면 최대 12개의 링크를 생성한다. 각 링크는 암호학적 무작위 128비트 수업 ID를 가진다. 같은 반 이름을 사용한 서로 다른 교사, 한 교사의 여러 반, 같은 반의 새 수업을 구분한다. 이어서 하는 수업은 이전 링크를 다시 사용한다.

진행 기록의 저장 키는 수업 ID와 수준을 포함하며 학생의 브라우저에만 저장된다. 서버 수업방·학생 명단·교사별 조회 권한·반 전체 결과 집계는 제공하지 않는다. 링크는 공개 설정이며 인증 수단이 아니다. 링크를 아는 학생이 열어도 다른 기기의 기록을 읽거나 바꿀 수 없다.

공용 기기에서는 기존 기록이 있으면 **내 기록 이어서 탐험 / 새 학생으로 시작**을 먼저 선택한다. 초기화는 현재 링크·수준의 이 기기 기록에만 적용된다. 반별 링크에서 다른 수준을 선택하면 안내 후 개인 탐험으로 이동하며 기존 반 기록은 보존한다.

## 구현한 확대 경험

물질 선택과 동시에 실물 일러스트에서 입자 모형으로 전환한다. 선택한 입자를 중심으로 화면을 확대하고 다음 관찰 수준을 같은 화면에 이어서 보여준다. 단계별 바깥으로 이동, 지나온 확대 수준 재방문, 다른 물질 선택을 지원한다. 운영체제의 모션 감소 설정에서는 애니메이션 없이 전환한다.

| 물질 | 확대 경로 | 선택 가능한 원자 |
|---|---|---|
| 물 | 물방울 → 여러 물 분자 → H₂O 한 분자 → 원자 하나 → 내부 → 원자핵 | 수소 H, 산소 O |
| 수소 기체 | 투명한 기체 용기 → 여러 수소 분자 → H₂ 한 분자 → 원자 하나 → 내부 → 원자핵 | 수소 H |
| 금 | 금 조각 → 반복된 금 원자 배열 → 배열의 원자 선택 → 원자 하나 → 내부 → 원자핵 | 금 Au |

모형 속 +·0·− 또는 설명 버튼을 선택하면 양성자·중성자·전자라는 이름, 위치, 전기적 성질, 수를 확인한다. 원자핵 펼치기/다시 모으기와 원자핵 추가 확대를 제공한다. 핵심 발견은 탐험 기록에 저장한다.

## 연결된 탐구 활동

1. **분자 읽기**: H₂O와 H₂에서 원자의 총 개수와 원소 종류 수를 구분한다. 금은 분자 묶음이 아닌 반복된 원자 배열로 관찰한다.
2. **원자 비교·원자 번호**: H·O·Au의 양성자 수를 비교하고 각각 1·8·79와 연결한다. 중성자 수는 해당 원자의 예이며 암기 대상으로 쓰지 않는다.
3. **전하와 원소 구별**: H/O 모형의 전자 수를 조절해 중성을 확인한다. Na·Na⁺·Ne를 비교하여 전자 수가 같아도 다른 원소일 수 있음을 판단한다. 모든 전자 수 조합이 실제 안정한 입자는 아님을 안내한다.
4. **전자 배치**: 1~20 바닥상태 중성 원자의 전자를 드래그·버튼·키보드로 배치한다. 잘못된 순서와 과다 배치를 거부한다. Mg의 잘못된 예상 `2,10`을 `2,8,2`로 고치고 판단 근거를 선택한다. K·Ca는 네 번째 껍질을 사용한다.
5. **주기율표**: 원자번호 1~20의 실제 족·주기 위치와 기호·이름을 탐색한다. 고등학교에서는 Li·Na·K, F·Cl, He·Ne·Ar의 최외각 전자를 비교한다. 헬륨의 최외각 전자 2개 예외를 명시한다.
6. **종합 탐험**: 중학교는 F·Mg·Na⁺, 고등학교는 C-12·C-13·Cl⁻·Ca²⁺ 사례를 순서대로 분석한다. 중성 여부, 원자 번호, 원소, 제시된 전자 수에 맞는 배치와 양성자라는 근거를 확인한다. 고등학교 질량수는 선택 문항이다. 이온 완료 화면은 실제 이온 기호를 표시한다.
7. **탐험 기록**: 확인한 개념과 학생이 실제 선택한 예상·판단 근거를 함께 열람·인쇄한다. 현재 수업·학습 수준을 표시한다.

브라우저 자동 저장, 손상된 저장 복구, 활동 근거에 맞는 완료 상태 재검증을 지원한다. 이름·계정·학습지·특정 교과서 페이지를 요구하지 않는다.

## 과학적 오류 검토

| 검토 항목 | 적용 결과 |
|---|---|
| 물과 분자 | ‘물 원자’라는 표현을 사용하지 않는다. H₂O는 H 2개와 O 1개로 표현한다. |
| 수소 기체 | H₂ 분자와 H 원자를 구분한다. 기체는 무색이므로 용기 일러스트에 유색 기체를 넣지 않는다. |
| 금속 구조 | 금을 분자 묶음으로 표현하지 않고 반복된 원자 배열로 나타낸다. 3차원을 평면으로 단순화했다고 안내한다. |
| 모형 전환 | 분자/금속에서 원자 내부로 들어가기 전에 독립된 중성 원자 모형으로 전환함을 알린다. 공유 전자·금속 내 전자 이동은 생략했다고 명시한다. |
| 사진과 모형 | 실물 이미지는 사실적인 일러스트이며 원자 모형은 실사진이 아님을 안내한다. 입자 색·크기·거리·확대 비율이 실제와 다름을 명시한다. |
| 원자핵 | 양성자와 중성자로 이루어짐을 설명하되 가장 흔한 수소-1의 중성자 0개 예외를 표시한다. |
| 전하 | 양성자 +1, 중성자 0, 전자 −1의 상대값을 사용한다. 중성은 양성자 수와 전자 수가 같은 상태다. |
| 원소와 원자 번호 | 양성자 수가 원소 종류를 결정하고 원자 번호와 같음을 일관되게 적용한다. |
| 중성자 수 | 원소별 고정 상수가 아니라 특정 동위원소의 예로 표시한다. H-1, O-16, Au-197을 비교한다. 금-197은 양성자 79, 중성자 118이다. |
| 금 내부 | 중성 Au의 전자 수는 79개다. 그림에는 입자 일부만 표시하고 실제 개수를 함께 적는다. 1~20의 단순 배치 활동에서 제외한다. |
| 전자 궤도 | 원형 껍질은 배치 모형일 뿐 실제 행성 궤도가 아니라고 안내한다. |
| 배치 범위 | 바닥상태 중성 원자 1~20만 다룬다. 3번째 껍질의 일반적 최대 용량이 8이라는 오해를 막는 문구를 넣었다. K=2,8,8,1, Ca=2,8,8,2를 포함한다. |
| 주기율표 | H~Ca 20종의 번호·기호·이름·주기·족을 확인했다. Au 79는 표 범위 밖임을 명시한다. |

검토 근거: [OpenStax 원자 구조와 기호](https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism), [OpenStax 원자·동위원소·분자](https://openstax.org/books/biology-2e/pages/2-1-atoms-isotopes-ions-and-molecules-the-building-blocks), [Royal Society of Chemistry 금](https://periodic-table.rsc.org/element/79/gold), [RSC 주기율표](https://periodic-table.rsc.org/).

## 이번 검증

- `npm test`: 기존 프로그램을 포함한 자동 테스트 12개 파일 모두 통과.
- `npx tsc --noEmit`, 앱 구문 검사, `git diff --check` 통과.
- 수업·수준 저장 키 분리, 같은 반 이름의 독립 링크, 잘못된 URL 입력, 저장 데이터 검증을 검사했다.
- 중2 기본/고등학교 확장 활동과 선택 질량수 평가, Na·Na⁺·Ne 및 이온 문제의 입자 수·배치 합계·전하를 검토했다.
- 운영 카탈로그 안내 변경은 관리자 수정·제목·조회/추천 수와 다른 프로그램을 보존하는 회귀 검사를 통과했다.
- Chromium: 두 수준 모두 물·수소·금부터 종합 활동까지 실제 조작으로 완료했다. 중학교 3개·고등학교 4개 종합 사례, 오답 차단, 선택 질량수 생략/오답 수정, 판단 기록을 확인했다.
- SVG 키보드 Enter/Space 선택과 실제 포인터 전자 드래그를 확인했다.
- 두 수준의 7개 화면과 링크 생성 창을 360/390/768/1366px에서 검사한 65건 모두 문서 가로 넘침이 없었다. 작은 화면의 주기율표 내부 스크롤은 의도된 동작이다. 한글 데스크톱·모바일 캡처를 검토했다.
- 동일 반 이름의 독립 링크, 반별·수준별 진행 기록 분리, 새로고침 이어가기, 현재 반만 초기화, 다른 수준 개인 탐험 이동 후 기존 반 복귀를 확인했다. 별도 브라우저 프로세스에서는 동일 수업 링크라도 새 학생으로 시작했다.
- 반 이름에 HTML을 입력해도 문자로만 표시되며 브라우저 JavaScript 오류가 없었다.

## 이미지 제작

내장 이미지 생성 도구를 사용해 세 장의 사실적인 일러스트를 제작했다. 웹에서 빠르게 표시하도록 800×800 WebP로 변환했다. 과학 정보를 담는 원자·분자·주기율표는 생성 이미지가 아닌 데이터 기반 SVG/HTML로 구현했다.

공통 프롬프트: `Use case: product-mockup. Asset type: scientific learning website material selection and zoom-start photograph-like illustration. Square 1024 composition, subject occupies middle 55 percent, isolated in dark navy studio background, crisp high quality photorealistic 3D studio rendering, elegant scientific museum look, strong clean silhouette, ample dark navy negative space on all sides. No decorative molecules, diagrams, borders, UI or watermark. No text except the requested label.`

- `assets/water.webp`: `A single beautiful clear water droplet hovering just above still water, delicate concentric ripples, aqua highlights. The droplet and ripple centered.`
- `assets/hydrogen.webp`: `One realistic transparent clear sealed laboratory glass gas jar with glass stopper, containing colorless invisible hydrogen gas, upright, no liquid, no smoke, no glowing gas. A very small simple label on the front reads H₂.`
- `assets/gold.webp`: `One small irregular nugget of pure metallic gold, realistic uneven gold surface with rich golden reflections, centered, sitting on a dark navy studio surface. No jewelry or coins.`

## 남은 한계

- 실제 iPad/Safari 및 학교의 실제 동시 접속 수업 환경은 별도 실기기 점검이 필요하다. 브라우저 자동 검증은 Chromium과 터치 에뮬레이션으로 수행한다.
- 브라우저 저장 공간 삭제, 시크릿 모드 종료, 다른 기기에서는 진행 기록이 이어지지 않는다.
- 이 프로그램은 원자 구조 이해를 위한 단순화 모형이다. 실제 결합·전자 확률 분포·핵 안정성 계산은 다루지 않는다.
