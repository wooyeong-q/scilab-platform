# Cast and scene framing v10

## Requested changes

- Move the previous Yunjae design to Siwoo; keep names, roles and story unchanged.
- Give Yunjae a more defined jaw, brow and shoulders, with four restrained expressions.
- Show Doha's broad smile during gameplay, with worried, sheepish and sincere expressions in their appropriate scenes.
- Keep the desktop background framing stable when dialogue ends and exploration begins.

## Implementation

Yunjae uses separate transparent neutral, nervous, surprised and smiling portraits.
Siwoo's cover and expression atlas are copies of the previous Yunjae assets.
An additional concerned portrait preserves that identity; his amused and warm
cues use the original natural smile frame. The renderer now separates mood names
from atlas indices and supports per-character atlas centering.

Doha's existing smiling cover portrait is now a playable smile expression.
It appears during the opening promise, the shared laugh over the megaphone,
and supportive dialogue after recovering the records. The accident admission
continues to use the corrected worried portrait. Explicit narration reactions
can show the listening character; otherwise narration remains portrait-free.
Seoa's existing smile, shy, surprised and neutral cues remain active.

Desktop dialogue and exploration share the same stage bounds and room camera.
The objective sits over the scene instead of shortening it. Camera expansion is
limited by all interactive objects in the room; touch targets remain 48 pixels
and are separated in viewport coordinates. The portrait-phone composition is
preserved. This resolves the reported desktop shrink without hiding objects.

## Validation

- Syntax check and five focused story/hotspot tests passed.
- Geometry coverage: all six rooms at 1920×808, 1902×740, 1366×658, 1280×550,
  844×306, 2560×900, 390×644 and 320×450 stage sizes.
- Browser at a 1920×918 game viewport: the library world is 1920×1080 at
  left 0, top -78 during dialogue and after it ends. Six classroom target centers
  hit their own buttons; both the clock description and main-file puzzle open.
- Browser P6: new Yunjae surprised/smile portraits, Doha's sheepish-to-bright-smile
  reaction and Siwoo's transferred smiling atlas render in the correct order.
- Browser 390×844: new Yunjae and smiling Doha fit above the dialogue controls;
  all six classroom target centers remain reachable.
- Confession replay: new nervous Yunjae and smiling Seoa display together under
  the cherry tree.
- Proof: `doha-smile-v10.jpg` (game frame), `doha-smile-mobile-v10.jpg` (QA context).

Saved dialogue indices remain compatible: no lines were added or removed.
No database, catalog, lesson-content, scoring or ending-threshold changes.

## Image generation record

Tool mode: built-in image_gen. New Yunjae uses the old portrait as a style,
uniform and framing reference, with a distinct face. Expression edits use the
new base portrait; Siwoo's concern edit uses the original Yunjae portrait.
Outputs are 1024×1536 PNGs with transparent alpha, converted to WebP without
other image modifications. Existing cast/background assets are reused.

### yunjae-v10

Use case: style-transfer. Asset type: transparent character sprite for the existing Korean school first-love visual novel. Input image is a STYLE, UNIFORM and FRAMING reference only: the old boy will become a different friend, so design a distinctly NEW male lead Yunjae. User request: a little more handsome and masculine. Create one exceptionally handsome young Korean male student in polished semi-realistic romance manhwa illustration, youthful and school-appropriate, with a clean defined angular jaw and chin, straighter prominent nose, calm narrower almond-shaped dark brown eyes, naturally thicker straight brows, balanced small lips, a stronger neck and moderately broader athletic shoulders while keeping natural slender student proportions. Shorter tousled black hair, subtle forehead visible, neat sides; distinguish him clearly from the reference's long soft fringe and delicate face. His expression is calm, earnest and quietly warm, lips gently closed, direct gentle eye contact; no smirk or hostile glare. Outfit follows the same school's navy blazer, white shirt, blue-gray tie, charcoal trousers, fully clothed. Natural relaxed standing pose, head almost level, shoulders relaxed, hands naturally at his sides or one hand in pocket. Match reference's refined linework, painterly warm daylight, softly rendered fabric, believable anatomy and romantic atmosphere. Portrait 1024x1536, one complete figure from above all hair to upper thighs, centered with transparent breathing room on both sides, head size appropriate to body, no oversized head, no huge muscles, no beard/stubble, no tattoos, no glasses, no props, no text, no panels. TRUE TRANSPARENT ALPHA BACKGROUND with clean hair edges, absolutely no scenery, vignette, gradient, glow or frame.

### yunjae-nervous-v10

Use case: identity-preserve. Edit target: supplied fictional Korean school romance male character sprite. Preserve EXACT same recognizable handsome face and facial proportions, black hair, thicker eyebrows' natural identity, head angle, masculine defined jaw, neck/shoulders, navy blazer, white shirt, blue-gray tie, trousers, hands, pose, figure size/placement, head-to-upper-thigh framing and polished warm painterly manhwa style. Change ONLY facial expression as requested. Natural subtle acting. Normal almond-shaped eyes and full-sized irises in EVERY expression; no huge round eyes, tiny pupils, gaping mouth, distorted anatomy, caricature, symbols, sweat drops, props, text, panels or scenery. One character, 1024x1536 portrait, TRUE TRANSPARENT ALPHA BACKGROUND with clean hair edges and no halo. Expression: quietly nervous before confessing his feelings, slightly warm cheeks, a tiny inward tension in brows, lips closed with a subtle tension, soft attentive direct eye contact. His appearance remains confident and handsome, with shyness expressed very subtly; no exaggerated blush or smiling.

### yunjae-surprised-v10

Use case: identity-preserve. Edit target: supplied fictional Korean school romance male character sprite. Preserve EXACT same recognizable handsome face and facial proportions, black hair, thicker eyebrows' natural identity, head angle, masculine defined jaw, neck/shoulders, navy blazer, white shirt, blue-gray tie, trousers, hands, pose, figure size/placement, head-to-upper-thigh framing and polished warm painterly manhwa style. Change ONLY facial expression as requested. Natural subtle acting. Normal almond-shaped eyes and full-sized irises in EVERY expression; no huge round eyes, tiny pupils, gaping mouth, distorted anatomy, caricature, symbols, sweat drops, props, text, panels or scenery. One character, 1024x1536 portrait, TRUE TRANSPARENT ALPHA BACKGROUND with clean hair edges and no halo. Expression: mildly surprised and questioning by a friend's silly suggestion. One brow lifts just slightly; eye opening increases only a little while retaining natural almond shape and full irises. Lips barely part as if saying 'really?'. No round staring eyes and no wide open mouth. Handsome natural restrained disbelief, no smile.

### yunjae-smile-v10

Use case: identity-preserve. Edit target: supplied fictional Korean school romance male character sprite. Preserve EXACT same recognizable handsome face and facial proportions, black hair, thicker eyebrows' natural identity, head angle, masculine defined jaw, neck/shoulders, navy blazer, white shirt, blue-gray tie, trousers, hands, pose, figure size/placement, head-to-upper-thigh framing and polished warm painterly manhwa style. Change ONLY facial expression as requested. Natural subtle acting. Normal almond-shaped eyes and full-sized irises in EVERY expression; no huge round eyes, tiny pupils, gaping mouth, distorted anatomy, caricature, symbols, sweat drops, props, text, panels or scenery. One character, 1024x1536 portrait, TRUE TRANSPARENT ALPHA BACKGROUND with clean hair edges and no halo. Expression: a sincere warm restrained closed-mouth smile after finding courage to confess; subtle smile at both mouth corners, eyes soften and meet viewer, faint cheek warmth. Romantic, reassuring and handsome, no huge toothy grin. Keep the new masculine face and all proportions.

### siwoo-concerned-v10

Use case: identity-preserve. This existing black-haired schoolboy portrait is now the friend Siwoo. Preserve this exact original face, delicate facial proportions, long soft black fringe, navy blazer, loose blue-gray tie, white shirt, both hands in pockets, pose and all framing. Change ONLY expression to subtly concerned and thoughtful while helping a friend recover a lost letter: very gentle inner brow tension, soft attentive almond-shaped eyes with normal irises, closed relaxed lips. No panic or gape, no smile, no large eyes. Same polished warm Korean romance manhwa style. One figure from full hair to upper thighs, 1024x1536 portrait, TRUE TRANSPARENT ALPHA background. No scenery, gradients, text, props or extra people.
