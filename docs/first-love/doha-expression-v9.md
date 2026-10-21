# Doha expression correction

The reported library line, “...이름만큼은 잘 지었다고 생각했는데.”,
used an exaggerated panic frame with round eyes and an open mouth. Two
individual transparent portraits now preserve Doha's original facial proportions:

- `doha-sheepish-v9.webp`: restrained embarrassed smile for the library joke
  and the megaphone explanation.
- `doha-worried-v9.webp`: closed lips and gently concerned eyebrows for the
  two lines admitting the bag accident. Replaces every remaining use of the
  exaggerated panic frame, including resumed dialogue.

The renderer supports optional individual expression assets before falling back
to the existing atlas. Other characters and Doha's neutral, excited and sincere
frames are unchanged. Saved dialogue positions remain valid. App and story
module URLs are versioned to load the corrected images on returning devices.

## Image generation

The first portrait references the existing `doha-v2.webp`. The second references
the newly generated sheepish portrait. Imagegen edits preserve hair, facial
identity, clothing, hands, pose and head-to-upper-thigh framing. Output is
1024×1536 with alpha, converted to WebP without other pixel edits.

Sheepish prompt: preserve the supplied fictional Korean school-romance manhwa
boy, handsome face and proportions, warm brown tousled hair, navy V-neck sweater
vest, rolled white sleeves and loosened blue-gray tie. Change only the expression
to restrained natural embarrassment after a well-intentioned mistake, as he says
“I thought at least the name was good.” Gently raised inner eyebrows, relaxed
almond-shaped eyes and normal irises, subtle cheek warmth, nearly closed lips
with a tiny hesitant asymmetric smile. No bulging eyes, shrunken pupils, distorted
jaw, gaping mouth, scream, symbols, text or extra objects. One figure, transparent
background, same pose and framing.

Worried prompt: preserve exactly the same recognizable face, proportions, hair,
clothing and pose from the first edit. Change only eyebrows and mouth to quietly
worried and apologetic, admitting he knocked over his friend's bag. Normal-sized
almond eyes, natural irises, steady gaze, inner brows gently upward and together,
softly closed neutral-to-downturned lips and subtle cheek warmth. No smile,
smirk, gaping mouth, caricature, extra objects or background. True transparent
alpha with clean natural figure edges, 1024×1536.

## Verification

- `node --check public/labs/first-love/app.mjs` passed.
- Existing story and hotspot regression tests: 4 passed.
- Browser: solved P3 with all eight cards through the normal controls; verified
  the exact reported line at 3/5 loads the new sheepish portrait. Its natural
  dimensions are 1024×1536 and it composites cleanly against the library.
- Browser: at 390×844, P6 line 3/6 renders the same new portrait without clipping
  the face or blocking the dialogue controls.
- Screenshots: `doha-expression-v9.jpg`, `doha-mobile-v9.jpg`.

No database, catalog registration, teacher content or ending criteria changes.
