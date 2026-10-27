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
