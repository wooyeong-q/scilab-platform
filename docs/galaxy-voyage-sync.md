# Galaxy classroom synchronization

Baseline: `a0962f99f293a68c4dbde06e0b3a0105af0c88fe` on `main`, including
the earlier quiz-rally fixes at `438f50e7661323676948128c862f1353b03c35de`.
The catalog changes and `AGENTS.md` added during this work were incorporated
before publishing. Its administrator-owned catalog protections and build workflow
are preserved. Database operations are documented in `docs/performance-operations.md`.

## Actual application boundaries

- `/labs/galaxy-voyage/index.html?experience=milky-way-objects` is the 25-object
  Milky Way exploration. The same HTML also implements the 50-galaxy activity.
- Next.js handlers live under `/api/labs/galaxy-voyage/sessions`.
- `lib/galaxy-voyage.ts` stores sessions, individual players and unique score
  events in the existing Neon PostgreSQL tables `galaxy_voyage_sessions`,
  `galaxy_voyage_players` and `galaxy_voyage_score_events`.
- Exploration, camera movement and NPC UFO animation run in each browser.
  Other student ships, score rankings, attacks, UFO theft/exchanges, start and
  end times are shared. This is not a progress-only classroom.
- Galaxy uses authenticated HTTP polling. It does not use quiz-rally's Worker,
  WebSocket, room checkpoint or physics code. Those files are unchanged.

## Changes

The new `POST /sessions/[code]/sync` authenticates and returns one consistent
database snapshot. Students use this single loop for timing, scores, learning
progress, notifications and peer positions. It replaces the independent flight
and scoreboard loops. Requests never overlap within the loop, pause while the
page is hidden and back off after failures. The active map targets roughly a
1.5-second cadence; waiting/observation screens use 3 seconds. These are settings,
not measured classroom latency or throughput.

Snapshot tokens are derived from committed database row contents. Unchanged
leaderboards and learning arrays are omitted. Peer position deltas are returned
with an ID list so disconnected peers can be removed without replaying a whole
room. Stationary positions use a presence heartbeat instead of rewriting their
coordinates on every poll. Score and flight revisions are separate, so movement
does not trigger another event-history aggregation. The teacher similarly gets
changed students and only changed learning arrays, then keeps its existing DOM
buttons. Ranking ties use the same stable ID tiebreaker in old and new readers.

Other ships interpolate between received poses over the observed update
interval, bounded at the latest server position; local controls remain immediate.
There is no extra remote physics replay or claim of frame-accurate combat over
HTTP. Map HUD updates are bounded at 20 Hz while scene and ship animation still
use requestAnimationFrame. Unchanged rank lists and labels are not rebuilt.

Discoveries, classifications, UFO interactions and attacks use a browser-persisted
FIFO outbox. Retries retain their event reference; the existing unique event key
and atomic score-transfer statements prevent duplicate payment. A replayed UFO
can recover its committed result during cooldown. Old saved discoveries absent
from the server are retried on restoration. Client-generated join credentials
also allow a lost join response to be retried without creating another student
or recovering someone else's name without their key. Delayed sync responses do
not overwrite an intervening local action's score. Unacknowledged learning
actions already present in a server snapshot do not count twice in the display.

Temporary sync failures no longer erase local credentials. Finished classes
remain readable on reload until their existing 14-day server expiry. The explicit
“새 수업 참여” button clears the old browser entry. Notification pagination keeps
the last delivered timestamp and ID (including database microseconds), rather
than dropping messages after a fixed 10-message window by advancing to local time.

## Compatibility and release impact

No new service, paid plan, Worker change, schema alteration or data migration is
required. Existing tables, score rules, content and classroom codes are retained.
Old scoreboard, flight, control and event endpoints remain available for already
open clients. Existing idempotent build scripts are unchanged. Refresh teacher and
student pages to use protocol 2; a new classroom is not required. Browser records
cannot survive the user clearing site storage, and events that reach the server
after a timed class ends remain subject to the existing server deadline.

## Verification

- `node --test tests/galaxy-sync.test.cjs tests/classroom.test.cjs
  tests/quiz-rally-actions.test.cjs tests/quiz-rally-motion.test.cjs`
- `npx tsc --noEmit`
- Optional browser fixture:
  `PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/path/to/chromium
  node tests/galaxy-browser.cjs`

The SQL regressions use isolated PGlite. They verify single-statement sync,
omitted unchanged data, teacher deltas, session isolation/authentication,
heartbeat/disabled/ended movement, paged notifications, lost-response replay,
join idempotence and interpolation. Existing classroom tests include 30 local
database participants; this is not a 30-browser/device production load test.
The browser fixture uses a teacher and two student contexts against real route
handlers and isolated PGlite, covering start, keyboard flight, lost observation
response/reload, classification, teacher progress and ended-class restoration.

Physical classroom Wi-Fi, true concurrent Neon connections, 30 live devices,
mobile devices and production frame rates have not been benchmarked by these
local tests. No performance percentage or simultaneous-player capacity is inferred
from these checks.
