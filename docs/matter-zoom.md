# 확대! 물질 탐험 연구소 구현 보고

## 프로그램 경로

- 실행: `/run/matter-zoom`
- 소개: `/programs/matter-zoom`
- 직접 실행: `/labs/matter-zoom/index.html`
- 운영 도메인: `https://scilab-platform.vercel.app`
- 프로그램 ID: `matter-zoom`

기존 프로그램과 별개의 프로그램으로 등록한다. 신규 항목만 삽입하는 멱등 스크립트를 성공한 빌드 뒤에 실행하며, 기존 항목·관리자 수정·좋아요 수를 덮어쓰지 않는다. 로그인 없이 독립적으로 사용할 수 있다.

## 추가·수정 파일

| 구분 | 파일 | 역할 |
|---|---|---|
| 추가 | `public/labs/matter-zoom/index.html` | 독립 실행 문서·접근성 기본 구조 |
| 추가 | `public/labs/matter-zoom/app.js` | 확대 장면·입자 조작·탐구 활동·기록·인쇄 |
| 추가 | `public/labs/matter-zoom/style.css` | 반응형 관찰 화면·모션 감소·인쇄 스타일 |
| 추가 | `public/labs/matter-zoom/data.mjs` | 물질 경로·원소 1~20·금·입자·발견 데이터 |
| 추가 | `public/labs/matter-zoom/core.mjs` | 전자 배치 규칙·종합 평가·진행 복구 검증 |
| 추가 | `public/labs/matter-zoom/program.json` | 플랫폼 프로그램 메타데이터 |
| 추가 | `public/labs/matter-zoom/assets/water.webp` | 물방울 실물 도입 일러스트 |
| 추가 | `public/labs/matter-zoom/assets/hydrogen.webp` | 무색 수소 기체가 담긴 용기 일러스트 |
| 추가 | `public/labs/matter-zoom/assets/gold.webp` | 순금 조각 실물 도입 일러스트 |
| 추가 | `scripts/register-matter-zoom.mjs` | 운영 카탈로그 신규 항목 등록 |
| 추가 | `tests/matter-zoom.test.cjs` | 과학 데이터·조작 규칙·저장 복구·카탈로그 회귀 검사 |
| 추가 | `docs/matter-zoom.md` | 구현·검증·과학적 표현·이미지 제작 보고 |
| 수정 | `lib/programs.ts` | 개발 환경 카탈로그에 프로그램 연결 |
| 수정 | `package.json` | 성공한 빌드 뒤 신규 프로그램 등록 실행 |

## 구현한 확대 경험

물질 선택과 동시에 실물 일러스트에서 입자 모형으로 전환한다. 선택한 입자를 중심으로 화면을 확대하고 다음 관찰 수준을 같은 화면에 이어서 보여준다. 단계별 바깥으로 이동, 지나온 확대 수준 재방문, 다른 물질 선택을 지원한다. 운영체제의 모션 감소 설정에서는 애니메이션 없이 전환한다.

| 물질 | 확대 경로 | 선택 가능한 원자 |
|---|---|---|
| 물 | 물방울 → 여러 물 분자 → H₂O 한 분자 → 원자 하나 → 내부 → 원자핵 | 수소 H, 산소 O |
| 수소 기체 | 투명한 기체 용기 → 여러 수소 분자 → H₂ 한 분자 → 원자 하나 → 내부 → 원자핵 | 수소 H |
| 금 | 금 조각 → 반복된 금 원자 배열 → 배열의 원자 선택 → 원자 하나 → 내부 → 원자핵 | 금 Au |

모형 속 +·0·− 또는 설명 버튼을 선택하면 양성자·중성자·전자라는 이름, 위치, 전기적 성질, 수를 확인한다. 원자핵 펼치기/다시 모으기와 원자핵 추가 확대를 제공한다. 핵심 발견은 탐험 기록에 저장한다.

## 연결된 탐구 활동

1. **원자 비교**: 수소·산소·금의 양성자, 전자, 중성자 예, 이름, 원자 번호를 나란히 비교한다. 산소의 양성자 8개를 유지하고 중성자를 8/9/10개로 바꿔 같은 원소인지 탐구한다.
2. **원자 번호**: H 1, O 8, Au 79를 양성자 수와 연결한다. 잘못 선택하면 힌트를 제공한다.
3. **중성**: 수소/산소의 전자를 더하거나 빼고 전체 전하를 관찰한다. 양성자 수 = 전자 수일 때 전체 전하가 0이 됨을 확인한다.
4. **전자 배치**: 1~20 중성 원자를 선택하고 전자를 껍질에 드래그하거나 버튼·키보드로 배치한다. 안쪽 우선·활동별 수용 범위·전자 총수 초과를 검사한다. 되돌리기, 초기화, 정답 확인을 제공한다. H, He, Li, O, Ne, Na, K, Ca 빠른 선택을 제공한다.
5. **주기율표**: 1~20 원소의 실제 주기/족 위치에 번호·기호·이름을 표시한다. 선택하면 중성 원자 정보와 전자 배치를 확인하고 해당 원자의 배치 활동으로 이동할 수 있다. 작은 화면에서는 표 안에서 가로 스크롤한다.
6. **종합 탐험**: 이름이 가려진 Mg 원자(양성자 12, 전자 12)의 중성 여부·원자 번호·원소·전자 배치를 분석한다. 오답 항목별 단서를 제공한다. 완료 뒤 O 원자로 다시 분석할 수 있다.

브라우저 내 자동 저장, 손상된 저장 데이터 복구, 탐험 기록 열람·인쇄·초기화를 지원한다. 이름·계정·학습지·특정 교과서 페이지는 요구하지 않는다.

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

## 검증

- 자동 테스트 45개 통과: 기존 41개 + 신규 4개. 신규 검사는 원소 20종의 전자 배치, 순서·수용 범위·초과 배치 거부, 대표 물질 구성, 동위원소 수치, 종합 문제, 저장 데이터, 등록 멱등성을 확인한다.
- `npx tsc --noEmit` 통과.
- Chromium 전체 흐름 통과: 실제 확대 애니메이션, 물의 H/O 선택, H₂와 금 배열, 입자 클릭·핵 확대, 비교·중성자 변경, 원자 번호, 중성 조절, 전자 배치, 20개 원소 탐색, Mg 종합 문제, 새로고침 복원.
- 전자 배치의 마우스 드래그·터치 드래그·키보드 Enter·버튼 대체 조작 통과. 잘못된 껍질/순서 배치 거부 확인.
- 7개 탐구 화면 전체를 1366 / 1024 / 768 / 390 / 360px에서 검사: 문서 가로 넘침 없음. 작은 화면의 주기율표 내부 가로 스크롤은 의도된 동작. 데스크톱·모바일 화면 캡처를 육안 검토했다.
- 브라우저 JavaScript 오류 없음. 손상된 저장 데이터로도 첫 화면 정상 복구.
- Next.js 플랫폼 소개 페이지·홈 카탈로그·iframe 실행 화면 통합 검증 통과. 390px 실행 프레임도 문서 가로 넘침 없음.

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
