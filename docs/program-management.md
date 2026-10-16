# Program order and usage guides

The homepage's default order comes from `programs.display_order`. Rows without an
order keep the existing featured/popularity fallback. The admin console can move
whole subject groups and individual programs within their subject, using arrow
buttons or a drag handle. Changes are a draft until **순서 저장** is pressed.

Only an authenticated administrator can call `PUT /api/admin/programs/order`.
The endpoint validates the complete list of current, nondeleted IDs before saving
all positions in one SQL statement. Stale lists return 409 without recreating rows.
The public catalog exposes no write controls. Popularity/view sorts are separate
read-only views.

Descriptions and `usage_steps` are editable in the normal program editor. Each
nonempty line becomes one numbered step on the detail page. Older clients that
omit usageSteps preserve the existing steps.

## One-time content update

The user explicitly requested clearer descriptions and instructions for the nine
public programs on 2026-10-16. `scripts/update-catalog-guides-20261016.mjs` contains
that reviewed copy and the previous text used for an optimistic comparison.
It requires exactly `--apply-guides-20261016` and the production environment.
It updates only matching, already public, nondeleted rows; newer administrator
text wins. Repeating it is harmless. It never inserts or restores a program and
does not change order, counters, resources, attachments, or publication flags.

**Never add this script to package.json build, migrations, regular deployments,
or a registration command.** A normal deployment must preserve current catalog
content, order, and usage instructions.
