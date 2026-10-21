# Siwoo appearance v11

Updated the existing Cha Siwoo character to match the user's corrected direction: a youthful athletic schoolboy with tidy short side-swept hair, white school uniform shirt with sleeves rolled to the elbows, blue-gray tie and charcoal trousers. Yunjae remains unchanged.

Siwoo now uses four individual transparent portraits (neutral, amused, concerned and warm). All existing scene cues resolve to these assets. No dialogue lines, story version, saved progress, puzzles or catalog records were changed. The entry module and story import use v11 cache keys.

Image tool: built-in image_gen, transparent background enabled. Final PNGs are converted to WebP with alpha preserved, with no other post-processing. Discarded spiky-hair/varsity-jacket drafts are not used by the game.

## Final assets

- `public/labs/first-love/assets/siwoo-v11.webp`
- `public/labs/first-love/assets/siwoo-amused-v11.webp`
- `public/labs/first-love/assets/siwoo-concerned-v11.webp`
- `public/labs/first-love/assets/siwoo-warm-v11.webp`

## Validation

- `node --check public/labs/first-love/app.mjs` passed.
- All three existing story tests passed, including actor-specific expression cues and resumed dialogue.
- All four mood assets exist at 1024×1536 with transparent alpha; the combined WebP payload is about 390 KiB.
- The browser cover shows the updated Siwoo beside unchanged Yunjae, Seoa and Doha.
- P2 and P4 teacher previews load the new amused and concerned portraits with clean background composition and readable dialogue controls.
- Proof: `siwoo-uniform-v11.jpg`, captured from the P2 game frame.

## Prompt record

### Uniform and appearance correction

Use case: identity-preserve. Edit target: image 1, the new Cha Siwoo character with green varsity jacket. Supporting image 2 is a UNIFORM AND ART-STYLE reference only. User correction: the haircut looks ugly/spiky, and he MUST wear school uniform. Retain image 1's handsome friendly face identity, youthful Korean male student age, healthy warm skin, athletic shoulders, normal facial anatomy, natural relaxed standing pose and head-to-upper-thigh framing. Change ONLY hairstyle and clothing.
HAIR: replace the entire spiky hedgehog crop with a HANDSOME, TIDY, NATURAL SHORT IVY-LEAGUE SIDE-SWEPT HAIRCUT. Dark brown, neatly tapered short sides, top about 4–5 cm, soft grouped strands gently laid across and slightly back to one side, low natural volume, forehead mostly visible, clean ears. Smooth compact masculine silhouette, subtle texture. No all-over spikes, no sea-urchin tips, no buzz cut, no bowl or helmet silhouette, no long curtain fringe, no center part and no hair covering eyes. Should look like a handsome youthful school baseball team player between classes, not a soldier or punk.
CLOTHING: proper Korean school uniform from image 2, specifically its crisp white button-front COLLARED SCHOOL SHIRT, blue-gray school NECKTIE and charcoal uniform trousers with black belt. Shirt tucked into trousers, necktie slightly relaxed with only the very top collar button undone. Long shirt sleeves neatly rolled to the elbows, revealing normal healthy forearms, to suggest an athletic student. NO jacket or cardigan, NO varsity jacket, NO T-shirt, NO sports jersey. No logos, text, patches, baseball bat, glove or cap. One hand in pocket, other relaxed at side.
Neutral base expression: composed and approachable, lips closed and a small easy hint of smile, eyes meeting viewer. Match exact existing warm semi-realistic high-quality Korean romance manhwa rendering, realistic proportions and fine linework. ONE character centered in portrait 1024x1536. Complete hair and head, upper thighs, ample clear edge space. TRUE TRANSPARENT ALPHA BACKGROUND only, no vignette, scenery, gradient, halo, border, caption or extra figures.

### Final hair correction

Use case: precise-object-edit. Edit this fictional Korean student portrait. The previous haircut is still too bristly and spiky; the user explicitly disliked it. This edit MUST noticeably replace the HAIR SHAPE, not just recolor it.
Change ONLY hair. Give him a handsome clean short Korean IVY LEAGUE SIDE-PART hairstyle, 7:3 part, groomed straight dark espresso-brown hair with soft broad locks combed in one continuous sweep sideways and slightly backward. Short neat sideburns, close tapered sides above the ears, the top lies DOWN with low gentle volume. Keep most of the forehead visible with only one smooth small curved lock near one temple. The outer hair silhouette should be compact, rounded and smooth with only a few subtle natural loose tips. All locks lie in the same swept direction. REMOVE the old all-over tiny triangular spikes and needle-like tufts across the crown completely. NOT a center-part fringe, NOT a buzz cut, NOT bowl-cut bangs, NOT shaved bald, NOT a wet pompadour. Stylish youthful school sportsman.
Preserve EXACT face, face proportions, eyebrows, warm skin tone, expression, head angle, athletic build, white collared school shirt with sleeves rolled to elbows, blue-gray tie, gray trousers, hands, pose, camera framing, all other pixels and the original warm Korean romance manhwa illustration style. One figure, complete head to upper thighs, 1024x1536. TRUE TRANSPARENT ALPHA BACKGROUND. No background color, scenery, glow, text or props.

### amused

Use case: identity-preserve. Edit target is the supplied FINAL Cha Siwoo portrait. Preserve this exact recognizable face, tidy short smooth side-swept dark brown haircut with forehead visible (NO SPIKES), healthy warm skin, athletic shoulders, white collared SCHOOL UNIFORM SHIRT with sleeves rolled to elbows, loose blue-gray tie, charcoal school trousers, head tilt, hands, relaxed standing pose, head-to-upper-thigh framing and figure placement. Change ONLY the facial expression. Preserve the polished warm semi-realistic Korean romance manhwa style. Eyes, nose, mouth remain normal size and proportions; no exaggerated eye widening, gaping mouth, cartoon symbols, blush circles or distortion. ONE portrait, 1024x1536, SAME figure scale and pose as input, TRUE TRANSPARENT ALPHA BACKGROUND. No background, halo, panels, text or props.
Expression: He is teasing his friend gently and suppressing a laugh: one corner of closed lips lifts in a playful asymmetrical smirk, eyes narrow just slightly with amusement, slight cheek lift. A clearly amused look, distinct from his neutral expression. Natural and handsome, not sneering or mean.

### concerned

Use case: identity-preserve. Edit target is the supplied FINAL Cha Siwoo portrait. Preserve this exact recognizable face, tidy short smooth side-swept dark brown haircut with forehead visible (NO SPIKES), healthy warm skin, athletic shoulders, white collared SCHOOL UNIFORM SHIRT with sleeves rolled to elbows, loose blue-gray tie, charcoal school trousers, head tilt, hands, relaxed standing pose, head-to-upper-thigh framing and figure placement. Change ONLY the facial expression. Preserve the polished warm semi-realistic Korean romance manhwa style. Eyes, nose, mouth remain normal size and proportions; no exaggerated eye widening, gaping mouth, cartoon symbols, blush circles or distortion. ONE portrait, 1024x1536, SAME figure scale and pose as input, TRUE TRANSPARENT ALPHA BACKGROUND. No background, halo, panels, text or props.
Expression: He is seriously concerned and concentrating to help a friend: slight inner brow tension, eyebrows gently draw inward, attentive calm eyes, lips closed and no smile. His jaw remains relaxed; looks thoughtful and dependable, not angry or frightened.

### warm

Use case: identity-preserve. Edit target is the supplied FINAL Cha Siwoo portrait. Preserve this exact recognizable face, tidy short smooth side-swept dark brown haircut with forehead visible (NO SPIKES), healthy warm skin, athletic shoulders, white collared SCHOOL UNIFORM SHIRT with sleeves rolled to elbows, loose blue-gray tie, charcoal school trousers, head tilt, hands, relaxed standing pose, head-to-upper-thigh framing and figure placement. Change ONLY the facial expression. Preserve the polished warm semi-realistic Korean romance manhwa style. Eyes, nose, mouth remain normal size and proportions; no exaggerated eye widening, gaping mouth, cartoon symbols, blush circles or distortion. ONE portrait, 1024x1536, SAME figure scale and pose as input, TRUE TRANSPARENT ALPHA BACKGROUND. No background, halo, panels, text or props.
Expression: A warm bright reassuring smile after helping his friend: cheeks rise, eyes gently soften and crinkle with a genuine happy smile, lips open just enough to show a narrow strip of upper teeth. Natural youthful friendly athlete, cheerful but no big mouth or exaggerated grin.
