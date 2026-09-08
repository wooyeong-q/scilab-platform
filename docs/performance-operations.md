# Catalog caching and database maintenance

Public catalog pages (`/`, `/programs/[id]`, `/run/[id]`) use 60-second ISR and a
60-second tagged Data Cache. Published program IDs are prerendered at build time;
new IDs are generated on demand. The components, URLs and iframe runner are unchanged.

Admin edits, deletions and submission approvals expire the `programs` tag and the
three page patterns. Counters still use the live interaction API; cached catalog
counter displays refresh on revalidation. Classroom state, hints, scores, timers,
roles and admin data are not cached. Failed catalog reads throw after an 8-second
request deadline. ISR can keep the last successful page during a database outage;
no production seed fallback is used.

## Database operations

- `npm run db:check` checks all required tables and columns with read-only
  `SELECT ... LIMIT 0` queries. It runs before every production build so a missing
  schema prevents promotion of an incompatible deployment.
- `npm run db:migrate` is an additive setup step. The production build runs it
  before the read-only check so an existing database that predates a newly required
  column is upgraded before the new deployment is promoted. It can also be run as
  an explicit operator command by supplying `DATABASE_URL` in the process
  environment. It applies only the existing `CREATE ... IF NOT EXISTS` and `ADD
  COLUMN IF NOT EXISTS` statements in one transaction.
- Do not run migrations from a request handler. Runtime `ensure*Database`
  functions now only check connection configuration.
- The migration does not seed, overwrite program metadata, reset student records,
  drop tables, or delete data. No migration is needed for the already initialized
  production database for this change.

## Escape-room resources

Audio paths, bytes, levels, playback rates, loops and the 700ms scene-transition
gap are unchanged. Media elements use `preload='none'`. A tiny inline silent WAV
unlocks unused elements on a user gesture for mobile playback; their remote source
is attached only when their existing mix requires it.

Scene 1 already layers `selpan` with `delirium` as its dread sound. Both must remain
audible. `goats` is first requested for scene 2. This reduces the remote BGM files
started in scene 1 from 22,256,386 to 15,467,594 bytes (30.5%). These are source-file
sizes, not a claim that browsers download every byte immediately. Downloads can be
streamed in ranges. Four small supplied effects total 232,578 bytes and keep their
existing preload, volume and timing.

Images are rendered on demand by the existing scene markup. No `new Image` or
all-scene image preload was found in the escape-room scripts. Scene JS/CSS totals
about 105KB with gzip; its global event wiring is left intact. Static labs continue
to be served from `public/labs` by the CDN with the existing revalidation headers.

## Verification

`npm test` uses an isolated PostgreSQL-compatible PGlite database and media test
doubles. It covers migration idempotence, SELECT-only catalog reads, cache
invalidation, admin auth/edit/approval, counters, unpublished programs, 30 catalog
callers, 30 galaxy players/scoreboards, map points, escape roles and all 14 answers,
four stage transitions, hints, time expiry, and audio selection/mix timing.

Physical classroom Wi-Fi throughput, Safari/iOS media behavior and a simultaneous
30-device class still require checks on those devices. Test doubles and a local
browser do not establish those network/device properties.

Rollback baseline: `f48330c24bb394238432365c7c37dcc02537a6e9`.
