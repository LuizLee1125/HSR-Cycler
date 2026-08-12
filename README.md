# HSR Cycler

An endgame planner for Honkai: Star Rail. It carries the full released roster with current
Prydwen builds and teams, every stage of the live Memory of Chaos / Pure Fiction / Apocalyptic
Shadow / Anomaly Arbitration rotation with real enemy stats, and a rotation planner that works out
turn order, Skill Point economy and weakness-break timing against a chosen node.

Built with React 19, Tailwind 4, Vite and Tauri 2.

## Running it

```bash
npm install
npm run dev
```

`npm run build` type-checks and bundles. `npm run lint` runs oxlint.

## Data

Nothing in `src/data/generated/` is written by hand. Refresh it with:

```bash
npm run data
```

That runs two generators:

| Generator | Output | Source |
| --- | --- | --- |
| `scripts/fetch-endgame.mjs` | `src/data/generated/endgame.json` | nanoka.cc's data CDN |
| `scripts/fetch-characters.mjs` | `src/data/generated/characters.json` | prydwen.gg + StarRailRes |

Both cache HTTP responses in `.cache/` for 12 hours, so re-running is cheap and does not hammer
either site. The generators track the live game version by themselves — the nanoka data build is
read back out of the site's own markup, and unreleased characters and beta seasons are filtered
out — so a new patch only needs `npm run data`.

See `system_architecture.md` for the data contract and the enemy stat formula.

## What the planner does and does not model

Turn order, Action Values, Skill Point balance, weakness coverage and break timing are computed
from the real stage data and are accurate.

Damage is a **kit-agnostic estimate**. The generators can read builds and teams, but no public
source exposes per-character skill multipliers, buff values, follow-up attacks or memosprite
behaviour in a machine-readable form. The predictor therefore uses generic per-role multipliers,
which read low against real clears. Use it to compare builds against each other, not to predict a
clear.
