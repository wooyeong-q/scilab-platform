# SciLab repository instructions

## Homepage catalog is administrator-owned

The production database is the source of truth for the homepage program catalog.
Changing a program's code or deploying this repository does not authorize adding,
restoring, publishing, or seeding any homepage entry.

- Always start from the latest main and preserve its catalog deletion protections.
- A normal build is schema validation/migration plus next build. Never append
  registration, seed, catalog synchronization, retirement, or content-reset scripts.
- Keep deleted_at markers and program IDs after administrator deletion. Do not
  hard-delete these marker rows, clear deleted_at, or republish deleted programs.
- Program JSON files and public/labs folders are application assets, not a list
  that should be synchronized into production programs.
- Never use development seed data as a production or database-error fallback.
- Registration is a separate, explicitly requested operation for one named
  program. Existing manual commands are catalog:register:matter-zoom and
  catalog:register:quiz-rally; their CLI entrypoints require --register.
- Preserve administrator edits, publication choices, counters, and attachments.
  Existing registrations use ON CONFLICT DO NOTHING and metadata updates must
  continue to exclude rows whose deleted_at is set.
- Do not restore a deleted program under a new ID or alias without an explicit request.
- atom-explorer is retired. Do not register or restore it.
- Use a branch-head lease when publishing a change so parallel program work
  cannot be overwritten by an older checkout.

When changing catalog behavior, run the database, catalog deletion, and catalog
build workflow regression tests. Check the public homepage after deployment to
confirm that no deleted programs have reappeared.
