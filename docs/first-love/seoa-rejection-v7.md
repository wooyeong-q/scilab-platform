# 서아 부정 엔딩의 거절 손동작 — 2026-10-22

기존 여주인공 서아의 극혐 엔딩 그림에 손바닥을 앞으로 내미는 거절 동작을 추가했다. 얼굴, 긴 갈색 머리, 교복과 원래의 표정을 유지했다. 새 그림은 게임의 부정 엔딩과 교사 미리보기 썸네일에 함께 연결한다.

- 도구: 내장 image_gen, 기존 `ending-disgust-v5.webp` 편집 후 투명 배경으로 정리.
- 에셋: `public/labs/first-love/assets/ending-disgust-v7.webp` (1024×1536, 투명 WebP, 333,154 bytes).
- 생성된 PNG의 실제 알파를 보존하며 Sharp로 WebP 포맷만 변환했다. 불투명한 v6 중간 에셋은 제거했다.
- 접근성 대체 텍스트에 거절 손동작을 반영하고 앱/CSS 캐시 버전을 갱신했다.
- 다른 캐릭터, 미소·당황 엔딩, 엔딩 경계, 저장된 진행 상태와 교과 문제는 변경하지 않았다.

## 확인

- 새 그림의 얼굴과 다섯 손가락, 손과 팔의 연결, 화면 안의 배치를 육안으로 확인했다.
- 앱 구문 검사와 `git diff --check`를 통과했고, 기존 이야기 테스트 3개가 모두 통과했다.
- 실제 엔딩 화면에서 발견한 네모난 배경을 제거하기 위해 추가 image_gen 편집을 수행했다. 최종 WebP는 RGBA이며 알파 범위가 0–254로 확인된다.

## 최종 편집 프롬프트

```text
Use case: identity-preserve.
Asset type: replacement ending illustration for the Korean school romance game “오늘, 너에게”.
Image 1 is the edit target: the existing fictional heroine Seoa's disgust ending.
Primary request: Add an unmistakable rejecting / “stop, don't come closer” hand gesture to this SAME heroine while retaining her existing intense disgust expression.
Change only her arm and hand pose: raise ONE hand to upper-chest / shoulder height with the OPEN PALM facing directly toward the viewer, wrist upright, five anatomically correct fingers naturally separated, elbow naturally bent in her existing school blazer sleeve. The palm must clearly signal firm refusal, NOT a friendly wave, thumbs-up, fist, or peace sign. Keep the hand fully inside the image, near the body, away from the face so that both her expression and the entire hand remain clearly visible in a narrow phone viewport. Her other arm stays lowered naturally.
Preserve her exact recognizable face and existing facial expression: deeply knitted brows, narrowed direct eyes, visibly wrinkled nose, one side of the upper lip raised in strong repulsion. Preserve eye/nose/mouth sizes and face proportions; do not beautify away the disgust, turn it into surprise, or use cartoon symbols.
Keep unchanged her long flowing chestnut-brown hair, navy school blazer with gold buttons, white collared shirt, blue-gray ribbon bow, pleated navy skirt, realistic youthful proportions, head-to-upper-thigh framing, figure placement, warm orange sunset rim lighting, dark softly blurred background, detailed polished Korean romance manhwa rendering and palette. Single character. Portrait 1024x1536. Fully opaque background as in the source. No text, captions, watermark, props, extra people, extra arms or extra fingers.
```

## 투명 배경 마무리 프롬프트

```text
Use case: background-extraction.
Image 1 is the EDIT TARGET: the finished fictional schoolgirl Seoa rejection ending illustration.
Remove ONLY the entire opaque dark/orange background behind the girl and replace it with genuine transparent alpha, so the figure can be composited directly over the game's existing cherry-blossom garden. This must be a clean isolated character cutout, with NO rectangular dark background, NO orange vignette, NO glow plane, NO gradient, NO scenery and NO baked checkerboard.
Preserve the character EXACTLY: her recognizable face, intense disgust expression with knitted brows, narrowed direct gaze and curled upper lip, long flowing chestnut hair with its individual strands, navy blazer, white shirt, blue-gray bow, navy pleated skirt, body proportions, scale and framing. Preserve the open-palm rejection gesture exactly, with the same hand location, all five fingers and natural arm anatomy. Do not move or redraw the face or gesture. Keep warm sunset rim highlights ON the hair and clothing, but remove all background color from empty spaces and between individual hair strands. Keep smooth antialiased clean edges without dark fringes.
Single whole figure from top of head to upper thighs, portrait 1024x1536, same placement as source. Transparent background. No text, props, additional people or altered outfit.
```
