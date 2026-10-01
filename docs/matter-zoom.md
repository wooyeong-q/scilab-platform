# 확대! 물질 탐험 연구소 — 일곱 물질 확대 관찰

운영 경로: [프로그램 실행](https://scilab-platform.vercel.app/run/matter-zoom) · [직접 실행](https://scilab-platform.vercel.app/labs/matter-zoom/index.html) · 소개 `/programs/matter-zoom`

## 이번 변경

기존의 간단한 확대 흐름에 산소·이산화 탄소·헬륨·철을 추가해 총 7개 물질을 제공한다. 기본 수준은 중학교 2학년이다.

- 첫 화면에서 물질을 선택하고 실물 일러스트 → 분자 또는 원자 → 원자 내부 → 원자핵을 직접 눌러 확대한다.
- 산소는 같은 종류의 원자 2개, 이산화 탄소는 다른 종류의 원자 3개로 이루어진 분자다. 헬륨은 분자로 묶이지 않은 원자들, 철은 반복된 원자 배열을 보여 준다.
- 관찰 중에는 작은 물질 선택 메뉴로 7개 물질 사이를 이동한다. 새 활동 단계나 필수 문제를 추가하지 않았다.
- 원소 비교는 방금 본 원자를 포함한 세 원자를 보여 준다. 원자 번호와 전기적 중성도 현재 선택한 원자에서 이어진다.
- 양성자 +, 중성자 0, 전자 −는 기호·텍스트를 함께 표시한다. 입자를 누르면 위치를 강조하고 설명한다.
- 원자핵을 보다가 전자를 선택하면 원자 전체로 돌아간다. 정답·점수·필수 클릭 수로 이동을 막지 않는다.
- 전자 껍질·전자배치·궤도선은 제공하지 않는다. 고등학교 선택 확장과 반별 링크는 계속 사용할 수 있다.

## 물질별 경로

| 물질 | 직접 선택하는 확대 경로 |
|---|---|
| 물 | 물방울 → 물 분자들 → H₂O 하나 → H 또는 O 선택 → 원자 내부 → 원자핵 |
| 수소 기체 | 기체 용기 → 수소 분자들 → H₂ 하나 → H 선택 → 원자 내부 → 원자핵 |
| 금 | 금 조각 → 반복된 금 원자 배열 → Au 선택 → 원자 내부 → 원자핵 |
| 산소 기체 | 기체 용기 → 산소 분자들 → O₂ 하나 → O 선택 → 원자 내부 → 원자핵 |
| 이산화 탄소 | 기체 용기 → 이산화 탄소 분자들 → O–C–O 하나 → C 또는 O 선택 → 원자 내부 → 원자핵 |
| 헬륨 기체 | 헬륨 풍선 → 따로 떨어진 헬륨 원자들 → He 선택 → 원자 내부 → 원자핵 |
| 철 | 순수한 철 조각 → 반복된 철 원자 배열 → Fe 선택 → 원자 내부 → 원자핵 |

헬륨은 풍선의 고무가 아니라 안에 든 기체를 관찰한다고 안내한다. 철은 합금인 강철 대신 순수한 철의 모형이다. 물·산소·이산화 탄소 등에 공통으로 포함된 원자는 어느 물질에서 골라도 같은 양성자 수를 보여 준다.

## 연결된 개념

- **원소 비교:** H·O·Au를 기본 비교한다. He 관찰 후에는 H·He·O, C 관찰 후에는 H·C·O, Fe 관찰 후에는 O·Fe·Au를 비교한다. 각 원자핵의 양성자 수와 원자 번호를 함께 표시한다. 선택 확장에서는 전자 수가 다른 Na와 Na⁺도 같은 원소임을 확인한다.
- **원자 번호:** 양성자 그림·개수·원자 번호·원소 이름이 함께 바뀐다. 슬라이더·이전/다음 버튼·실제 족과 주기 위치의 1~20 주기율표를 사용할 수 있다. 철은 26번, 금은 79번으로 표 범위 밖임을 안내한다.
- **전기적 중성:** 현재 원자의 +와 −를 같은 수로 짝지어 전하 합이 0임을 표시한다. 선택 확장에서는 Na⁺와 Cl⁻의 실제 입자 수를 확인한다.
- **고등학교 선택 확장:** 같은 확대 경험에서 탄소-12·탄소-13의 중성자 수와 질량수를 비교한다.

## 여러 교사와 학급

상단 **메뉴 → 반별 수업 링크 만들기**에서 수준을 정하고 반 이름을 한 줄에 하나씩 입력한다. 최대 12개 링크를 만들며, 같은 반 이름이어도 암호학적 무작위 128비트 ID가 각각 부여된다. 이전 수업을 이어서 하려면 같은 링크를 다시 사용한다.

기록은 학생의 현재 브라우저에 수업 ID·수준별로 저장된다. 공용 기기에서는 이어서 하기 또는 새 학생으로 시작을 선택한다. 다른 반의 기록을 초기화하지 않는다. 서버 수업방·학생 명단·교사별 결과 집계는 제공하지 않는다.

v2·v3·v4 기록은 v5 관찰 상태로 복원한다. 이번 추가는 같은 v5 형식을 사용한다. 기존 및 새 물질의 원자·입자 기록을 복원하며, 헬륨·철·금은 잘못 저장된 분자 화면 대신 원자 내부로 연결한다. 예전 껍질·평가 기록은 제외한다.

## 이번에 추가·수정한 파일

| 파일 | 변경 내용 |
|---|---|
| `public/labs/matter-zoom/data.mjs` | 7개 물질, Fe 원자 데이터, 공통 분자 배치·색상, 새 관찰 기록 |
| `public/labs/matter-zoom/app.js` | 물질 유형에 따른 확대, 새 원자 선택, 현재 원자 비교, 간단한 물질 메뉴 |
| `public/labs/matter-zoom/style.css` | 7개 선택 카드의 4·3·2열 반응형 배치, 새 실물 그림 크기 |
| `public/labs/matter-zoom/index.html` | 7개 물질을 반영한 페이지 설명 |
| `public/labs/matter-zoom/exploration.mjs` | 새 물질·원자 관찰 기록 복원 |
| `public/labs/matter-zoom/program.json` | 7개 물질과 실제 제공 기능 안내 |
| `public/labs/matter-zoom/assets/oxygen.webp` | 산소 기체 용기 일러스트 |
| `public/labs/matter-zoom/assets/carbon-dioxide.webp` | 이산화 탄소 기체 용기 일러스트 |
| `public/labs/matter-zoom/assets/helium.webp` | 헬륨 풍선 일러스트 |
| `public/labs/matter-zoom/assets/iron.webp` | 순수한 철 조각 일러스트 |
| `scripts/register-matter-zoom.mjs` | 기존 3종 안내를 7종으로 갱신하며 관리자 수정·조회·추천 수 보존 |
| `tests/matter-zoom-materials.test.cjs` | 물질 구성·분자 배치·새 원자 기록·확대 경로 검증 |
| `tests/matter-zoom-catalog-modes.test.cjs` | 3종 안내 갱신과 관리자 수정 보존 검증 |
| `docs/matter-zoom.md` | 현재 구현·검증 보고 |

기존 3개 실물 그림, 플랫폼 라우트·데이터베이스 스키마·수업 링크 형식은 계속 사용한다. 레거시 전자배치 데이터는 이전 버전 회귀 검사용으로 남아 있으며 현재 UI에서 사용하지 않는다.

## 과학적 검토

| 선택한 원자 | 양성자 | 중성자: 이번 모형의 예 | 전자 |
|---|---:|---:|---:|
| 수소 H | 1 | 0 | 1 |
| 헬륨 He | 2 | 2 | 2 |
| 탄소 C | 6 | 6 | 6 |
| 산소 O | 8 | 8 | 8 |
| 철 Fe | 26 | 30 | 26 |
| 금 Au | 79 | 118 | 79 |

- 중성자 수는 해당 동위 원자의 예이며 원소의 고정 값으로 가르치지 않는다. 가장 흔한 수소 원자에는 중성자가 없다.
- 물은 H₂O, 수소 기체는 H₂, 산소 기체는 O₂, 이산화 탄소는 CO₂로 표현한다. CO₂의 원자는 일직선이다. 모형의 연결선은 원자가 연결됨을 나타내며 결합 차수 학습용 구조식이 아니다.
- 헬륨 기체는 원자들이 따로 존재하며 분자 연결선을 그리지 않는다. 금·철의 실제 입체 구조는 반복된 평면 배열로 단순화한다.
- Fe·Au의 내부 그림에는 일부 입자만 표시하고 전체 개수를 별도로 표시한다.
- 전자는 원자핵 주변의 불규칙한 위치에 표시한다. 위치가 고정된 것이 아님을 안내하며, 실제 사진이나 확률 밀도 영상으로 주장하지 않는다.
- 분자·금속에서 선택해 보여 주는 내부는 독립된 중성 원자의 단순화 모형이다. 실제 결합·공유 전자·금속 전자의 이동은 표현하지 않는다.
- Na⁺는 양성자 11·전자 10, Cl⁻는 양성자 17·전자 18. 양성자 수와 원소의 종류는 유지된다.
- 원자 번호 조작은 서로 다른 원자의 모형을 비교하는 것이며 실제 원자핵을 바꾸는 실험이 아니다.

## 검증

- 물질 구성·상태 복원·반별 링크·카탈로그 갱신 관련 자동 테스트 **20개 통과**.
- 실제 Chromium에서 7개 물질의 확대 및 뒤로 이동, 모든 선택 가능한 원자의 p/n/e 수, 원자핵·전자 전환, 새 물질 메뉴, 관찰 기록과 새로고침 후 이어서 하기를 확인했다.
- 3개 개념 화면에서 현재 원자가 유지되고, 주기율표는 20개 원소를 제공하며, Fe·Au의 표 범위 밖 안내가 나오는지 확인했다.
- 화면 너비 **360·390·768·1366px에서 40개 가로 넘침 검사 통과**. 별도 한국어 글꼴을 갖춘 브라우저에서 선택 화면과 CO₂·He의 모바일 화면을 시각적으로 확인했다. 브라우저 실행 오류는 없었다.
- 이는 화면 크기를 바꾼 브라우저 검사이며 실제 휴대기기·학생 대상 수업 검사를 대신하지 않는다.

## 실물 일러스트 제작 기록

내장 이미지 생성 기능으로 새 이미지 4개를 각각 생성했다. 사진 같은 실물 일러스트만 생성했으며, 정확성이 필요한 입자 모형은 코드로 그렸다. 원본을 800×800 WebP로 변환했다. 새 파일의 합계는 190,870바이트다.

공통 프롬프트 (`${subject}`에 아래 소재 문구를 삽입):

```text
Use case: product-mockup. Asset type: square material-selection photo illustration for a Korean middle-school science app. Create a polished photorealistic science museum specimen illustration of ${subject}. Subject centered, fully visible with generous margins, dark navy and deep teal softly blurred studio backdrop, soft dramatic side lighting, crisp realistic texture. Match a calm dark science explorer interface. Square 1:1 composition. No people, no diagrams, no atom symbols beyond the specified physical label, no captions or extra text, no border, no watermark.
```

- `oxygen.webp`: a small brushed silver oxygen gas cylinder standing on a dark slate laboratory surface, simple brass regulator, clean white label with only the exact text 'O₂', no tubing, the gas inside is invisible and colorless
- `carbon-dioxide.webp`: a clear, wide cylindrical glass laboratory gas collecting jar with a fitted flat glass lid, a small clean white label with only the exact text 'CO₂', standing on a dark slate laboratory surface, contains invisible colorless carbon dioxide gas; absolutely no liquid, no smoke, no mist, no vapor, no colored contents
- `helium.webp`: one round pale lavender latex balloon filled with helium, floating against a dark navy studio background with a short delicate white string below, the rubber is opaque and the gas is invisible, no writing, no letters, no face, not a foil balloon
- `iron.webp`: a single compact pure iron sample, a rough-cut silver gray metallic block with realistic uneven fracture facets, subtle metallic glints, sitting on dark slate; no orange rust, no gold color, no tools, no writing

## 남아 있는 확인

- 실제 중2 학생이 설명 없이 눌러야 할 대상을 알아보는지 수업 관찰이 필요하다. 자동 동작 검사만으로 직관성·학습 효과를 입증하지 않는다.
- 실제 iPad/Safari, 학교 동시 접속 환경은 별도 확인이 남아 있다.
- 기록은 현재 브라우저에 저장되므로 기기 변경이나 브라우저 저장 공간 삭제 시 이어지지 않는다.
