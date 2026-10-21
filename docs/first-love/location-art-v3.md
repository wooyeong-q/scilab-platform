# 오늘, 너에게 — 장소 배경 v3

2026-10-21. 기존 소스와 자산을 수정하지 않고 새 배경 6개를 제작했다.

## 파일

경로 기준: 저장소 루트. 여섯 파일 모두 **1536 × 864 px, 정확한 16:9, 불투명 WebP**다.

| 장면 | 파일 | 바이트 |
|---|---|---:|
| 교실 | `public/labs/first-love/assets/room-classroom-v3.webp` | 219426 |
| 복도 | `public/labs/first-love/assets/room-corridor-v3.webp` | 215658 |
| 도서관 | `public/labs/first-love/assets/room-library-v3.webp` | 173586 |
| 동아리실 | `public/labs/first-love/assets/room-club-v3.webp` | 212766 |
| 교정 | `public/labs/first-love/assets/room-courtyard-v3.webp` | 407932 |
| 벚꽃 엔딩 | `public/labs/first-love/assets/room-cherry-v3.webp` | 373164 |

## 생성 방법과 참조

내장 `image_gen.imagegen`으로 각 장면을 별도 생성했다. 사용자 첨부를 색감·빛·그림 질감 참조로만 사용하고 새 공간 구도를 요청했다. 인물 일러스트 참조는 벚꽃과 노을 분위기에만 사용했다. 참조 원본을 배경으로 복사하지 않았다.

- 실내 장면 참조: `/workspace/scratch/79d64fe5d24a/upload/image(20261021-084449).png`, `/workspace/scratch/79d64fe5d24a/upload/image(20261021-084456).png`.
- 교정·벚꽃 장면 참조: `/workspace/scratch/79d64fe5d24a/upload/image(20261021-084502).png`, `/workspace/scratch/79d64fe5d24a/upload/image(20261021-084557).png`.
- 최초 생성 PNG는 1672 × 941 px였다. 도서관은 책등과 펼친 책의 글자 흔적을 지우는 이미지 편집을 1회, 동아리실은 우측 상단 장식 흉상을 붓꽂이로 바꾸는 이미지 편집을 1회 진행했다. 두 편집 모두 내장 imagegen을 사용했다.
- 최종 PNG에 `sharp.resize(1536, 864, { fit: 'cover', position: 'centre' }).webp({ quality: 88, effort: 6 })`를 적용했다. 후처리는 리사이즈와 인코딩뿐이며 창작 요소를 코드로 합성하지 않았다. 원본 비율과의 차이가 작아 가장자리 변화는 1 px 미만이다.
- 여섯 최종 WebP를 각각 열어 시각 확인했다. 사람·실루엣·UI·판독 가능한 글자 없음, 빈 이동 공간, 주요 탐색 소품을 확인했다.

## 좌표 사용 규칙

아래 좌표는 **최종 1536 × 864 그림 전체**를 기준으로 한 퍼센트다. 왼쪽 위가 `(0, 0)`, 오른쪽 아래가 `(100, 100)`이며 x는 오른쪽, y는 아래로 증가한다. 자동 검출값이 아닌 시각 확인한 사물 중심의 근사값이다. 좌표는 캔버스 전체에 바로 사용할 수 있으며, `object-fit: cover`로 그림을 추가 잘라내는 화면에서는 표시 영역 기준으로 변환해야 한다. 16:9 비율을 유지하거나 `contain`을 쓰면 좌표 이동이 없다. 사물 그림 위에 강조 테두리나 마커는 넣지 않았다.

### P9 교실 필수 세 사물

| 사물 | 중심 x% | 중심 y% | 대략적인 그림 내 범위 (left, top, right, bottom)% |
|---|---:|---:|---|
| 붉은 리본 파일 묶음 | 17.5 | 79.5 | (0.0, 71.8, 33.2, 87.9) |
| 파란 파일 | 43.4 | 58.6 | (38.2, 56.6, 48.7, 60.7) |
| 3×3 아홉칸 자료함 | 88.7 | 42.8 | (81.8, 32.6, 95.6, 52.7) |

붉은 리본 매듭 자체를 탐색 기준으로 삼을 때는 `(17.8, 75.8)`을 사용한다. 파일 묶음 일부가 화면 왼쪽 경계까지 걸쳐 있지만 리본과 종이 묶음의 정체성은 명확하다. 자료함에는 세로·가로 각각 세 칸이 그려져 있고 9개 칸이 모두 구분된다.

### 교실 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 붉은 리본으로 묶은 파일 | 17.5 | 79.5 | P9 필수. 앞 왼쪽 책상 위. 리본 매듭은 (17.8, 75.8). |
| 파란 파일 | 43.4 | 58.6 | P9 필수. 중앙 왼쪽 중경 책상 위. |
| 3×3 아홉칸 자료함 | 88.7 | 42.8 | P9 필수. 오른쪽 뒤 벽. 3열·3행이 보임. |
| 교탁 | 65.1 | 55.4 | 칠판 앞. |
| 벽시계 | 67.5 | 19.7 | 숫자 없는 시계 면. |
| 왼쪽 창가 화분 | 4.9 | 46.5 | 가장 왼쪽 흰 화분. |
| 좁은 책장 | 46.6 | 39.7 | 칠판 왼쪽의 세로 책장. |

### 복도 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 게시판 | 83.6 | 38.1 | 빈 종이만 있는 오른쪽 게시판. |
| 복도 벤치 | 78.9 | 73.9 | 게시판 아래. |
| 우산꽂이 | 90.2 | 77.6 | 오른쪽 앞. 우산 2개. |
| 연녹색 사물함 | 59.7 | 51.1 | 오른쪽 중경. |
| 끝쪽 화분 | 42.3 | 47.7 | 복도 끝 창 앞. |
| 벚꽃이 보이는 창 | 13.4 | 30.0 | 왼쪽 가까운 창. |
| 교실 문 | 68.2 | 49.4 | 사물함과 게시판 사이. |

### 도서관 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 빨간 책갈피가 있는 펼친 책 | 11.5 | 69.2 | 왼쪽 앞 독서 책상. 책갈피 끝은 (12.5, 72.5). |
| 남색 수첩 | 22.3 | 64.4 | 펼친 책 뒤. |
| 독서 스탠드 | 19.5 | 51.0 | 왼쪽 책상 위. |
| 독서 책상 화분 | 26.6 | 46.8 | 독서 스탠드 오른쪽. |
| 나무 반납 트레이 | 80.7 | 51.8 | 오른쪽 반납대 위. |
| 반납 도서 더미 | 75.3 | 50.4 | 반납 트레이 왼쪽. |
| 오른쪽 큰 서가 | 93.8 | 42.5 | 무문자 색면 책등. |

### 동아리실 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 작은 확성기 | 48.4 | 59.1 | 준비 책상 중앙 왼쪽. |
| 접은 빈 안내판 | 55.8 | 53.4 | 확성기 뒤. 아무 글자 없음. |
| 봉투 정리함 | 69.1 | 57.1 | 책상 중앙 오른쪽. |
| 붉은 리본 롤 | 71.2 | 64.3 | 봉투 정리함 앞. |
| 공예용 가위 | 66.1 | 64.0 | 리본 롤 왼쪽. |
| 캔버스 가방 | 32.2 | 85.0 | 왼쪽 앞 의자에 걸림. |
| 메모 게시판 | 61.2 | 27.5 | 뒷벽. 빈 색종이. |

### 교정 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 앞쪽 나무 벤치 | 11.7 | 75.8 | 왼쪽 가까운 벤치. |
| 교정 음수대 | 31.9 | 68.2 | 왼쪽 중경. |
| 자전거와 거치대 | 23.0 | 62.8 | 음수대 뒤. |
| 교정 시계 | 58.4 | 41.0 | 중앙 시계 면. |
| 오른쪽 돌 화단 | 91.3 | 69.4 | 가까운 분홍·흰 꽃 화단. |
| 학교 출입구 | 32.2 | 53.5 | 왼쪽 건물 1층. |
| 오른쪽 벚나무 | 91.7 | 49.0 | 오른쪽 중경 큰 나무 줄기. |

### 벚꽃 엔딩 탐색 지점

| 사물 | x% | y% | 위치 메모 |
|---|---:|---:|---|
| 큰 벚나무 | 10.1 | 36.5 | 왼쪽 큰 나무 줄기. |
| 벤치 등받이 | 20.0 | 64.0 | 책과 구분해 클릭할 수 있는 등받이 중앙. |
| 벤치 위 닫힌 책 | 19.1 | 70.0 | 벤치 좌석의 연분홍 책. |
| 정원 가로등 | 19.9 | 46.7 | 벤치 뒤, 따뜻한 빛. |
| 정원 음수대 | 83.8 | 58.3 | 오른쪽 중경. |
| 오른쪽 돌 화단 | 94.3 | 66.5 | 오른쪽 가까운 돌벽·꽃. |
| 뒤쪽 작은 계단 | 66.6 | 57.8 | 화단 사이의 낮은 계단. |

## 정확한 생성 프롬프트

각 최초 생성 요청은 공통 프롬프트 다음에 `Scene: `과 해당 장면 프롬프트를 이어 붙였다. `transparent_background: false`이며 장면별 첨부 참조 2개를 `referenced_image_paths`로 전달했다.

### 공통

```text
Use case: illustration-story. Asset type: single original background for Korean school first-love visual novel, no characters.
Style-reference images are ONLY for broad art direction: warm hand-painted anime background, gentle architectural linework, softly textured color blocks, believable empty school, light-filled youth romance. Do not copy the exact room layout or details of any reference. Create a new original scene.
Image format: landscape 16:9, preferably 1920x1080 or higher. One whole scene, no collage, no panels. View the entire space from a comfortable eye-level medium-wide distance, natural 35mm-like framing, straight believable architecture, no close-up, no extreme wide angle or fisheye. Matte painted surfaces, not shiny photoreal 3D. Warm ivory and honey wood, soft muted blue shadows, gentle pink spring light.
Absolutely no people, silhouettes, ghosts, readable text, letters, numbers, logos, signs with writing, UI, highlights, arrows, or interaction markers. Make props recognizable but organically part of the setting.
```

### 교실

```text
A bright empty Korean school classroom during late afternoon in cherry blossom season. Several tidy rows of ordinary wooden student desks, whole green chalkboard and teacher desk at the back of the view, large windows along left wall with pastel pink blossoms outside, soft curtains. Three mandatory puzzle objects visibly integrated into the painting: (1) on the FOREGROUND LEFT student desk a beige bundle of paper folders securely tied with a clearly RED cloth ribbon, at roughly 24% x, 76% y; (2) on a separate MIDDLE-DISTANCE desk near CENTER LEFT, a single distinctly BLUE closed file folder, roughly 47% x, 61% y; (3) along the RIGHT BACK wall a medium-sized wooden paper-file cabinet with exactly NINE OPEN CUBBIES arranged THREE COLUMNS BY THREE ROWS, all nine compartments visible, roughly 82% x, 47% y. Cabinet must be large enough to distinguish its square compartments without zooming. None of these objects is floating or placed as a UI overlay. Also include a teacher desk, simple wall clock without numerals, potted plant on windowsill and a chair for natural exploration. Keep room wide and floor space visible, not an oversized close-up desk.
```

### 복도

```text
A long, empty Korean school corridor with sunlight and pink cherry blossoms outside the LEFT windows. Fresh spring late afternoon before sunset. This is a new composition rather than copying the reference: windows to left, classroom doors and a wooden noticeboard with BLANK sheets on right, a row of muted sage lockers in the middle distance on right, a modest wooden bench just below noticeboard, a potted plant near the far window, an unmarked umbrella stand beside near right classroom door. Entire long corridor visible with soft receding perspective, generous open walking space in center, golden patches of window light on matte floor, gentle pink outdoor reflections. All objects stationary and plausible.
```

### 도서관

```text
An inviting empty Korean school library in warm afternoon spring light. Show an entire spacious reading area from a comfortable distance: tall honey-wood bookshelves along right wall and in the rear, large tall windows on left showing pink cherry branches, book-return counter at middle right with a small stack of books and an unmarked wooden return tray, long reading desk on foreground left with a single open book and a clearly visible red cloth bookmark peeking from it. Include a simple reading lamp, a wooden chair, small potted plant, and a closed navy notebook naturally placed. No giant foreground books, no extreme shelf closeup. Quiet warm sunbeams and delicately painted shadows, comfortable airy room. Book spines have color blocks and no readable writing.
```

### 동아리실

```text
An empty school art-and-events clubroom prepared for an awkward but sweet first confession. Show the whole ordinary school clubroom, comfortable eye-level wide room view, windows on left with cherry blossoms outside, practical shelves and cabinets at back and right, broad clear walking space. On a central wooden preparation table, include a small ivory-and-soft-blue handheld megaphone on its side, a folded standing poster board made of plain blank cream cardstock, and a wooden envelope organizer holding several pastel envelopes. They must be separate recognizable plausible real objects, no warped geometry. Include a tiny roll of red ribbon beside a pair of craft scissors, a canvas tote on a nearby chair, and a small corkboard with blank color paper pinned above the shelf. Cheerful warm afternoon light, hand-painted anime scene. No writing or labels, no brand marks, no people. Keep table medium-sized and middle distance, not a giant foreground close-up.
```

### 교정

```text
An original spacious Korean school courtyard and cherry blossom walkway at pink-and-gold dusk. Composition has a school building far back on LEFT and rows of large flowering cherry trees receding on RIGHT, a broad gently curving brick path from the front center toward the campus, generous open central area for later character overlays. Show wide scenery, not branches filling the camera. Include a naturally placed wooden bench on left under one tree, a simple low stone planter with spring flowers near foreground right, a small drinking fountain near the school path, a bicycle rack with one plain bicycle in midground left, a dark schoolyard clock with no numerals in middle distance, and a few windblown pale petals. Hand-painted anime environmental art, soft coral sky, sunlight on honey pavement, muted cool shadows, restrained romantic atmosphere. Empty campus, no people, no readable letters, logos, or writing.
```

### 벚꽃 엔딩

```text
An original peaceful confession-ending location in a school garden at warm pink evening. One beautiful LARGE CHERRY TREE on the LEFT side with spreading softly glowing pale pink canopy, a modest wooden bench beneath the tree around the left midground, a broad clear empty path across the center and right with plenty of natural space for two later character overlays. The path curves gently toward a low school wall and distant campus building; pink peach evening sky visible in upper right, a handful of drifting petals and light petals on ground. Include a low stone flowerbed on right, a softly lit simple garden lamp behind the bench, a plain closed book resting on the bench, and a small low garden drinking fountain further back on right. Wide landscape shot at comfortable eye level, no extreme fisheye, no close-up, refined hand-painted Japanese/Korean romance animation background. All props stationary and plausible. Absolutely no people or silhouettes, no hearts, text, signs, logos or UI. Pink and golden light, intimate mood from environment alone, spacious open floor for dialogue characters.
```

### 도서관 정리 편집

참조: 최초 도서관 생성 결과 `exec-dff3c23e-b8a3-4bcd-a6a8-cbc86f5237c1.png`.

```text
Edit this single original school library background with a small cleanup only: remove all visible letters, glyphs and writing-like marks from book spines and notebook, and from the open book pages. Book spines should be plain muted color blocks, and open book pages should be plain ivory with only subtle paper shading. Preserve absolutely the same room layout, crop, warm hand-painted anime style, every object and exact position including open book with red bookmark foreground left, navy notebook, lamp, potted plant, wooden return tray on right, shelves, warm sunlight and colors. Do not add anything. Empty background, no people, no readable or unreadable lettering anywhere. Keep 16:9 landscape.
```

### 동아리실 정리 편집

참조: 최초 동아리실 생성 결과 `exec-fe7fd617-396a-489c-b940-903586caba46.png`.

```text
Edit this single original school clubroom background with one small cleanup only. Remove the human-shaped sculpted bust on the TOP RIGHT shelf completely and replace it with a simple plain ceramic vase holding three paintbrushes. There must be no human faces, figures, statues, or silhouettes anywhere. Preserve absolutely the same room layout, crop, warm painted anime style, all table props and their exact positions, blank folded sign, megaphone, envelope tray, ribbon roll, scissors, canvas tote, cabinets, windows, lighting, color and size. Do not add text or labels. The books are plain color spines. Keep 16:9 landscape.
```

## 생성 결과 원본 기록

아래 파일은 생성 도구가 작업 영역에 남긴 원본이다. 배포 자산은 위 WebP만 사용한다.

| 장면 | 최종 사용 PNG |
|---|---|
| 교실 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-58c46b7b-65ef-4a2b-ab33-8196183cc492.png` |
| 복도 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-008c57bf-4613-47cb-867c-14b7b39d3ba7.png` |
| 도서관 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-a23be894-1895-460c-a3f6-d9ba487b190c.png` |
| 동아리실 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-a572fc9f-ff21-4a2c-835c-21ec0c513c3a.png` |
| 교정 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-730295a7-7430-43d6-94fb-402bc8b71430.png` |
| 벚꽃 엔딩 | `/workspace/scratch/79d64fe5d24a/generated_images/exec-20101070-2f49-4ffe-ab74-2bf2c42d65a6.png` |

## 한계

- 완성된 하나의 래스터 그림이므로 사물을 개별 레이어처럼 이동할 수 없다. 탐색 UI와 캐릭터는 애플리케이션에서 별도로 배치해야 한다.
- 작은 가위·책갈피·시계·파란 파일은 좁은 모바일 화면에서 작아진다. 상호작용 판정 영역은 보이는 사물보다 넉넉하게 잡되, 인접 사물과 겹치지 않도록 화면에서 확인해야 한다.
- 제시한 좌표는 사물의 위치 안내다. 실제 앱의 대화창 높이, 캐릭터 배치, 화면 잘림에 따른 가림 여부는 이 자산 작업 범위에서 검증하지 않았다. 특히 교실 앞 파일은 하단 대화창에 가려질 수 있으므로 사진 탐색 모드에서는 전체 그림을 보여주는 편이 적합하다.
- 벚꽃 장면의 빈 길은 중앙·오른쪽에 넓게 남겼다. 교정과 벚꽃 엔딩은 같은 따뜻한 색감을 공유하되 별개의 장소 구도다.
- 원본·WebP 모두 시각 확인했으며, 배경 파일·본 문서 외의 코드와 기존 파일은 수정하지 않았다. Git 커밋·푸시·사이트 게시도 진행하지 않았다.

