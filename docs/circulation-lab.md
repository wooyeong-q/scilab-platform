# 혈액 순환 탐험실

Entry point: `/labs/circulation-lab/index.html`. Browser-local static lesson; no database, user records, room polling, third-party scripts or continuous animation. This change supplies the activity and metadata asset, without registering a homepage catalog entry. Production catalog ownership and deletion protection remain unchanged.

## Lesson and interaction

1. Observe the four chambers, three vessel types and blood components. The anatomical right is on the viewer's left. The realistic illustrations are supporting models; exact names and flow connections are separate DOM/SVG annotations.
2. Step through the complete route, pulmonary circuit or systemic circuit. Observation mode advances manually; prediction mode requires choosing the next correct location. Pulmonary and tissue gas exchange are revealed on demand.
3. Solve a 6×6 word maze using adjacent orthogonal cells and the ten-location circulation cycle. Both `폐` and `온몸` are explicitly expanded to their capillary beds. Any adjacent word can be selected, including a wrong word. The explicit 경로 확인 button evaluates the chosen transitions and highlights errors; reaching the goal alone never grants success. Following the selected trail backwards supports undo. Reveal is distinguished from completing the activity.
4. Start with an editable path, draw any self-avoiding orthogonal route of at least 11 cells from the top-left start to bottom-right goal, then fill other words. The prominent 정답 경로 바꾸기 button preserves the current route for revision; 새 경로 그리기 starts over. Sharing displays a large locally generated QR for the complete maze URL, without sending the board to any external QR service. Route cells retain the biological order. The editor counts all valid biological routes and only enables sharing for exactly one solution. Updating a word invalidates prior verification.

The example maze uses 21 cells (two complete circuits). Repeated rounds make all the locations necessary while letting a rectangular maze start and end at the same circulatory location. The end of the activity does not mean blood stops circulating. `우심실` and `대동맥` are supported starting places. Shared URL fragments contain only version, dimensions, start and cell words; they exclude the solution, identity and performance data. Imported fragments are length-bounded, structurally validated and re-solved before use. Draft word boards are saved locally when localStorage is available.

## Scientific checks

Reference: [NHLBI: How Blood Flows through the Heart](https://www.nhlbi.nih.gov/health/heart/blood-flow).

- Pulmonary: right ventricle → pulmonary artery → lung capillaries → pulmonary veins → left atrium.
- Systemic: left ventricle → aorta → tissue capillaries → venae cavae → right atrium.
- Atria receive blood; ventricles send it out. Artery/vein classification depends on direction relative to the heart, not oxygen content. Both actual oxygen-rich and oxygen-poor blood are red.
- Lung exchange adds oxygen and removes carbon dioxide from blood; tissue exchange transfers oxygen to cells and carbon dioxide into blood.

## Images

All five anatomical observation assets were created with the built-in imagegen tool. The original PNG outputs were inspected and converted to WebP without compositional edits. Heart, lungs and tissue retain alpha. The learning graphics use raster images, with code limited to readable UI labels, selection indicators and exact route arrows.

Final generation briefs:

- `assets/blood-observation.webp`: landscape microscopic blood observation; red biconcave erythrocytes, one larger ivory leukocyte with lobed purple nucleus, tiny purple platelet fragments, pale plasma; calm realistic semi-3D lighting; no labels or arrows; proportions and counts illustrative.
- `assets/heart-cutaway.webp`: isolated frontal cutaway of an anatomical teaching heart model; four visible chambers, septum, valves, thicker left ventricular wall, natural coral/crimson tissue, anatomical right on viewer's left; transparent background; no labels, arrows or schematic geometry.
- `assets/vessels-observation.webp`: three realistic enlarged vessel teaching models on ivory: thick-walled artery, thin capillary with red cells in single file, thinner-walled wide vein with valve leaflets; differing magnifications; no text, diagrams or arrows.
- `assets/lungs.webp`: isolated realistic pink paired lungs with trachea, main bronchi and subtle vessel texture; transparent background; no heart, labels, arrows or schematic shapes.
- `assets/tissue-capillaries.webp`: isolated tissue teaching model, peach cells surrounded by fine red capillaries and biconcave red blood cells; transparent background; no alveoli, text, arrows, blue blood or geometric substitutes.

## Verification

Run `node --test tests/circulation-lab.test.cjs`. Coverage includes 100 seeded unique puzzles, actual solution traversal, anatomical circuit order, manual path validation, ambiguous-board detection, bounded shared-link import, encode/decode and backtracking.

Browser QA covers chamber selection, observation assets, correct prediction and manual advancement, lung gas exchange, editing/checking, URL exchange and completing the exchanged puzzle. Responsive QA uses 1280×720 and 390px wide embedded viewports. Normal program deployment follows the existing Git/Vercel workflow, with an exact main-head lease.

QR vendor: Project Nayuki QR-Code-generator (MIT), TypeScript compiled with Node stripTypeScriptTypes; license retained in vendor/qrcodegen.mjs. Independent ZXing decoder recovered the exact shared URL from the generated QR modules.


## Textbook visual supplement (2026-10-27)

Reviewed the user-provided 동물과 에너지 textbook, printed pages 202–207 (PDF pages 15–20). The added 눈으로 확인 tab covers the identified conceptual gaps as short, manually controlled observations:

| Textbook | Supplement |
| --- | --- |
| 202: pulse measurement | Real 60-second tap counter plus editable resting/activity readings, immediate comparison and bars; no example readings represented as student measurements. |
| 203: pumping and valves | Receiving vs ejection stages, opposite inlet/outlet valve states, backflow explanation and realistic open/closed atrioventricular valve closeups. Motion and anatomical enlargement are explicitly models. |
| 204: vessel structure, pressure and slow capillary flow | Side-by-side illustrations and simultaneous qualitative flow comparison; no claim that arbitrary marker distances are physical speed ratios. |
| 204, 206: tissue exchange | Successive arrival, oxygen/nutrient delivery, carbon-dioxide/waste return stages, alongside the actual tissue illustration. |
| 205: blood classification | Plasma as liquid vs erythrocytes/leukocytes/platelets as blood cell components; hemoglobin explains red appearance and oxygen transport. |

Both `assets/valve-open.webp` and `assets/valve-closed.webp` were made with the built-in imagegen tool. Final briefs: a nongory realistic classroom closeup of a tricuspid atrioventricular valve in a coral muscle ring, ivory leaflets folded outward leaving a visible passage (open), versus all three leaflets meeting and sealing the passage (closed), ivory background, no text/arrows/diagram geometry. They illustrate valve opening rather than exact anatomy or a quantitative cardiac model. Browser QA at 1280×720 confirmed the experimental panel fits, four-direction material labels appear stepwise, flow markers travel different distances and actual input values update the pulse comparison immediately. Unit coverage includes valve state transitions, material directions and measured-value comparison.

## 2026-10-27 시각 탐구·가독성 개편

- 거친 실물 조직 질감을 모두 교과서 삽화풍의 매끈한 래스터 이미지로 교체했다. 장기를 CSS/SVG 도형으로 대체하지 않았다.
- 혈관 비교: 세 트랙에서 혈액 표식이 지속적으로 동시에 흐른다. 동맥/정맥보다 모세혈관이 느리며 실제 속도 비율을 의미하지 않는다. 일시정지는 현재 위치를 유지한다.
- 온몸 물질 교환: 산소·영양소 표식은 혈액에서 세포로, 이산화 탄소·노폐물 표식은 세포에서 혈액으로 혈관 벽을 건넌다. 단계 선택과 일시정지를 제공한다.
- 맥박: 기본 활동은 모의 심장 두 개의 박동 간격 비교다. 72·120회/분은 설명용 값임을 명시한다. 직접 측정은 선택이며 손목 그림, 15초 타이머, 횟수×4 자동 환산을 제공한다. 기기/센서 없이 진행한다.
- 읽기: 본문 18px, 활동 버튼 16–17px, 보조 안내 13–14px. 짙은 글자색을 사용하고 좁은 화면에서는 줄바꿈을 허용한다. 우측 설명이 넘칠 때 스크롤을 허용하여 글자를 줄이지 않는다.
- QA: 1280×720과 390px 화면 육안 검토. 18회/15초→72회/분, 30회/15초→120회/분, 증가량48 자동 반영 확인. 기존 미로·공유 등 12개 테스트 통과.

### 이미지 제작 기록 (built-in image_gen)

프로젝트 저장 위치: `public/labs/circulation-lab/assets/`. 아래 파일은 모두 새 이미지로 교체했다.

공통 프롬프트: “Use case: scientific-educational. Asset for Korean middle school circulation interactive. Style: approachable hand-painted textbook illustration, clean matte surface, gentle pastel shading, crisp clear silhouettes on plain warm ivory background. Anatomically recognizable but NOT photorealistic, no gore, no wet shine, no exposed muscle fibers, no tiny organic textures, no creepy realism, no geometric diagram substitutes, no text, no watermark. Large centered composition.”

개별 대상:
- `heart-cutaway.webp`: four chambers, thick left ventricular wall on viewer right, red and blue major vessels, school anatomy cutaway.
- `blood-observation.webp`: soft red biconcave discs, pale lavender leukocyte with lobed purple nucleus upper right, tiny violet platelets lower right, pale yellow plasma.
- `vessels-observation.webp`: upright thick-walled artery left, thin single-cell-wall capillary middle, thin-walled wide-lumen vein with inward valve leaflets right.
- `lungs.webp`: pale pink paired lungs, trachea and branching bronchi.
- `tissue-capillaries.webp`: upper tissue cells with lavender nuclei; bottom horizontal thin capillary with RBCs; clear middle gap for animated labels.
- `valve-open.webp` / `valve-closed.webp`: smooth ivory tricuspid leaflets in coral ring, visibly open passage / sealed central meeting of leaflets.
- `pulse-wrist.webp`: two hands, palm-up forearm and index/middle fingers touching radial pulse on thumb side of wrist; no device.

## 2026-10-27 전체 글씨·오른쪽 설명 가독성 재설계

- Noto Sans KR 가변 WOFF2를 함께 제공해 본문과 SVG 이름표에 적용했다. 글꼴 라이선스는 assets/fonts/OFL.txt에 포함한다.
- 오른쪽 본문22px, 핵심 역할24px, 항목 값24px, 주요 조작20px. 흰 배경과 짙은 남색 글자에 역할 표시만 녹색 띠로 구분한다.
- 오른쪽을390px로 넓혔다. 보충 설명은 ‘원리 더 보기’로 펼쳐 읽도록 바꾸고 핵심 설명과 조작을 먼저 보여준다.
- 심장 이름표44 SVG단위, 순환 이름표42단위로 확대했다. 순환 그림에서는 ‘폐’·‘온몸’으로 짧게 쓰고 오른쪽에는 정확한 이름과 설명을 유지한다.
- 미로 안내를 짧게 다듬고 ‘새 미로·정답 보기’로 보조 조작을 모았다. 오답 선택, 경로 편집, QR 공유 동작은 유지했다.
- 1280×720에서 심장·혈관·순환·미로를 육안 확인했다. 기존12개 테스트를 통과했다.
