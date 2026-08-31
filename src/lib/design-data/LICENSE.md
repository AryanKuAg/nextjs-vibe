# Vendored design data

`uupm.json` is derived from **UI UX Pro Max**
(https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT licensed.

Only the fields the Build Brief consumes are kept: product types and their
recommended style, the 192 colour palettes (whose column names already match
shadcn's token set), the 84 style descriptions, and the 74 font pairings.

The upstream skill also ships prose UX guidelines and reasoning rules. Those are
deliberately NOT vendored — a large prose ruleset injected into every prompt is
what made every generated site look alike before, and this data is used as
lookup values, never as instructions.

Regenerate with `python3 scripts/vendor-design-data.py` after downloading the
upstream CSVs.

---
MIT License, Copyright (c) nextlevelbuilder
