# 〈오늘, 너에게〉 장소 배경

생성 방식: 내장 imagegen. 사용자 요청에 따른 신규 생성 이미지이며 외부 사진·캐릭터를 사용하지 않았다. PNG 원본은 작업 공간에 유지하고, 배포용으로 Sharp의 WebP 인코딩만 적용했다. 창작 편집·합성·크롭은 하지 않았다.

파일: `public/labs/first-love/assets/locations-v1.webp`

한 장을 2×2 동일 크기 영역으로 사용한다. `background-size: 200% 200%` 기준 왼쪽 위는 교실, 오른쪽 위는 도서관, 왼쪽 아래는 동아리실, 오른쪽 아래는 운동장 옆 벤치이다. 이미지에 정답 숫자나 표식을 직접 넣지 않았으며, 정확한 퍼즐 정보는 UI에서 별도로 표시해야 한다.

## 생성 프롬프트

```text
Use case: illustration-story.
Asset type: ONE production background atlas for a Korean school first-love visual-novel puzzle game, title "오늘, 너에게" (do NOT render the title).
Primary request: A single wide landscape image, aspect ratio 16:9, divided into exactly FOUR EQUAL QUADRANTS in a 2 by 2 grid. Panels touch edge to edge, no gutter, no frame, no border. Each quadrant is itself a full landscape scene; geometry is exactly left half/right half/top half/bottom half for CSS background positioning.
Style: high-end contemporary Korean romance webtoon / painted anime background, delicate crisp architectural linework with richly hand-painted light and textures, cinematic calm composition, beautiful believable Korean school interiors, warm ivory walls, muted navy accents, honey colored wood, fresh green trees, amber sunlight. Consistent brushwork and perspective in all four scenes. No people at all, no text at all, no lettering, no numbers, no logos, no hearts, no horror. Not 3D render, not photorealistic.
TOP LEFT quadrant: quiet empty Korean classroom after afternoon classes. Large sunlit windows on left wall, a green chalkboard front center, teacher's wooden desk at front, orderly student desks in foreground. A desk with a pale closed paper file prominently in foreground. On the right a distinct wooden paper-file cabinet with nine clearly separate cubbies arranged as a neat 3x3 square. Detailed ordinary school furniture, peaceful late afternoon.
TOP RIGHT quadrant: sunny school library. Large wooden book-return desk in foreground with exactly four neatly stacked hardback books and a simple paper folder, many bookshelf rows behind, tall windows and gentle sunlight. A small study worktable by the return desk. No people, no signage.
BOTTOM LEFT quadrant: empty clubroom temporarily used to prepare a friend's confession. Wide preparation table in foreground; on it a small handheld megaphone, a large completely blank freestanding signboard, neatly stacked folders and a closed cream envelope. Bookshelves and orderly little storage compartments along right wall. The props are mildly overenthusiastic but setting feels warm and realistic, no heart shapes.
BOTTOM RIGHT quadrant: peaceful wooden bench beside a Korean school playground at golden hour. Bench is foreground center-right, distant school building and green trees behind, visible sandy playground to left, warm rays through trees, soft wind suggested by leaves. Empty bench. Gentle quiet first-love atmosphere.
Composition: keep useful foreground objects clear and visually distinct, avoid clutter; light travels left to right consistently. Fine details without tiny illegible marks. Deliver one SINGLE four-scene background atlas.
```
