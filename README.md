# HSR Cycler

An endgame planner for Honkai: Star Rail. It carries the full released roster with current
Prydwen builds and teams, the live Memory of Chaos / Pure Fiction / Apocalyptic Shadow / Anomaly
Arbitration rotation with real enemy stats, and a predictor that works out turn order, Skill Point
economy and a cycle range against a chosen node.

It plans from **your** account, not a template. Pick a stage, pick the stage buff where the mode
offers one, fill four slots and import a build card into each — an Enka.network card or a Fribbels
export. Until all four are imported the predictor stays locked, because it has nothing real to
work from.

The **Starward** toggle in the header switches to the bonus tier: three nodes instead of two,
harder enemy scaling, a raised star threshold and an extra clear condition. It covers Memory of
Chaos, Pure Fiction and Apocalyptic Shadow — Anomaly Arbitration has no Starward tier, so the
toggle is disabled there rather than hidden.

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
| `scripts/fetch-gear.mjs` | `src/data/generated/gear.json` | StarRailRes |

Both cache HTTP responses in `.cache/` for 12 hours, so re-running is cheap and does not hammer
either site. The generators track the live game version by themselves — the nanoka data build is
read back out of the site's own markup, and unreleased characters and beta seasons are filtered
out — so a new patch only needs `npm run data`.

See `system_architecture.md` for the data contract and the enemy stat formula.

## What the predictor does and does not model

**Accurate.** Turn order, Action Values and Skill Point balance, computed from the stage's real
enemy stats and your imported builds. Enemies act on the same Action Value timeline as your team,
so the plan shows their turns and the delays they land. Damage uses each character's own ability
multipliers at the levels read off the build card, plus the per-level buffs their kit grants the
team, plus the stage buff you selected.

Cycles are a **range**, not a single figure: enemy attacks and delays are rolled through a seeded
RNG across 25 branches, and the best, typical and worst are reported. Same team and stage always
produce the same branches.

Light cone and relic set effects are handled in two halves, because a build card only shows one
of them. The always-on stat line — A Thankless Coronation's +36% CRIT DMG, a 2-piece +8% CRIT
Rate — is **already in the card's numbers**, so it is never applied twice. The conditional half
that the card cannot show — the same cone's post-Ultimate ATK, a 4-piece DMG proc — is applied on
top. Conditionals are treated as active, which reads about right for ones that are up most of a
fight and high for ones gated on a rare state.

**Not modelled.** Eidolons, follow-up attacks, DoT, and kits whose damage scales with stacks or a
transformed state. Those live in prose that no parser can price. Totals therefore run low, and
hard nodes often report no clear.

Rather than hide that behind a fudge factor, the prediction shows Prydwen's **measured** average
cycles for the closest recorded team alongside the simulated range. One is modelled, one came out
of real clears, and both are labelled.

## Live capture

The prediction view can read the game window directly. It OCRs the cycle counter and the Skill
Point numeral, and detects charged Ultimates from the portrait ring's brightness and hue. Action
Value is derived — the game never prints it as a number — from the cycle counter against the
loaded plan, and the UI says so.
