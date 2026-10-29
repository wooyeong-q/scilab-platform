# Cross-subject cooperative puzzles (TODAY-TO-YOU-2)

The former stage-specific mechanics often exposed enough textbook information to solve without the private clues. V2 separates public answer cards from private observations. Each stage P1–P8 chooses a one-card choice, four-card order, or four-card classification. The exploration layout, story progression, endings and final cabinet sequence remain shared.

## Authoring contract

- All answer cards have owner 0 and identical visibility and placement for every role.
- One private clue per role contains one or two short facts. The teacher may use any subject; neither the validator nor the engine assumes numerical parity or science concepts.
- `모둠단서!검증조건` encodes exactly the choices, order relations or classification constraints implied by that clue. No JavaScript is evaluated.
- The finite answer space is 5–6 choices, 24 permutations, or up to 256 classifications. All four rules must yield one answer, matching the declared key. Removing each rule must leave at least two answers.
- Classification permits repeated destinations. There is no one-to-one elimination shortcut for the last student's information.
- Formal checks cannot prove the meaning of natural language, curriculum correctness, or that public knowledge does not reconstruct a supposedly private fact. The prompt and teacher screen require that independent review.
- Prompt limits: task 48, reference 80, private clue 90, card text 36, card label 12, target label 18, hint 60 characters. Long original texts must be studied first or carefully excerpted, not squeezed into a puzzle.

## Student interface

`desk-ui.mjs` renders a bounded work surface, common card board, role tabs, explicit text pages and a large detail panel. Small portrait screens offer a prominent clue expansion button. No private information is sent just to hide it in CSS: the server removes all other roles' clues and every grading rule before serializing player content.

All three formats use tap controls. Classification and ordering preserve the original card board after placement, showing the same short card badges in destination slots. Choice requires one final selection. Hints and long legacy material open in the same bounded detail panel instead of extending the puzzle.

P10 retains physical mark discovery, rotation, a complete visited-drawer sequence (including start and repetitions), and whole-answer grading. Its collected notes use role tabs and pages. V2 P9 gives role four a clock photo using the existing classroom object; v1 still requires the original three photos.

## Compatibility

`TODAY-TO-YOU-1`, its original downloadable workbook and existing classroom snapshots remain valid. Existing independent clues cannot be made essential just by relabeling the schema: regenerate using the new template. The teacher upload result makes that explicit.

Old full candidate/reason submissions remain accepted. The current UI uses one selected candidate, reducing the legacy P8 interaction burden. The server preserves draft-version checks, role ownership, submission receipts, duplicate counting and ending freeze.

New solo progress has its own storage key. The old solo key and its original sample lesson have a separate resume control. Existing classroom data, catalog entries and database schema are not reset or seeded.

## Verification

- `node --test tests/first-love*.test.cjs`: 27 passing tests, including v1/v2 workbook round trips, invalid-rule rejection, answer uniqueness, each role's necessity, privacy, 1–4 player service completion, stale drafts, reconnection, P9 ownership and P10 sequence behavior.
- `tsc --noEmit`: passed.
- New XLSX created through artifact-tool, rendered for all six sheets and re-imported through the actual game importer.
- Vercel preview build completed with the normal `db:migrate && db:check && next build` chain.
- Browser: uploaded both v2 and v1 workbooks through the real import endpoint; confirmed validation/compatibility messages. Checked private role preview, shared card visibility, classification with repeated destinations, wrong-answer persistence, hints, correct choice/order submissions, and full P10 discovery/rotation/repeated-drawer submission.
- Layout checks used actual same-origin app frames at 1363×936, 768×1024, 375×667, 320×568 and 844×390. Bounded clue/detail panels and short-screen final-cabinet layouts replace scrolling; no blanket small-font scaling is used. Large legacy paragraphs remain accessible through explicit pages.
- `tests/fixtures/first-love-viewport.html` is a manual browser fixture. Preview deployments temporarily serve a copy beside the app; production does not expose the fixture under public/.

The sample demonstrates the mechanism using words, numbers and observations. It is not a finished eight-question lesson for every subject, nor a redesign of the playable character roster.
