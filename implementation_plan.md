# HSR Cycler — Data Accuracy + UI Overhaul (v0.1)

Goal: replace invented data with live Prydwen + nanoka.cc data for HSR **4.4**, add the full
released roster, add every endgame node/wave/enemy with real HP/SPD/toughness, and give the UI a
real visual identity instead of the generic dark-slate-plus-cyan look.

---

## Verified findings (silent phase)

**nanoka.cc** is a SvelteKit app; the real data lives on an open static CDN:

```
https://static.nanoka.cc/hsr/<dataVersion>/...
```

Current `dataVersion` = `4.4.55`, live game version = `4.4`. Files confirmed reachable via plain
`curl` (no UA trick needed):

| File | Purpose |
| --- | --- |
| `maze.json` / `en/maze/{id}.json` | Memory of Chaos seasons + stages |
| `maze_extra.json` / `en/story/{id}.json` | Pure Fiction |
| `maze_boss.json` / `en/boss/{id}.json` | Apocalyptic Shadow |
| `maze_peak.json` / `en/peak/{id}.json` | Anomaly Arbitration |
| `monster.json` | enemy metadata (name, rank, weaknesses, icon) |
| `monstervalue.json` | enemy base stats + per-variant modify ratios |
| `EliteGroup.json`, `HardLevelGroup.json` | stat multipliers |
| `character.json`, `lightcone.json` | roster metadata |

Stage records give `event_id_list1` / `event_id_list2` (the two halves), each with `level`,
`elite_group`, `hard_level_group`, and `monster_list` (one entry per **wave**).

**Enemy stat formula — verified against nanoka's own rendered numbers:**

```
HP        = HPBase      * HPModifyRatio     * EliteGroup.HPRatio * HardLevelGroup.HPRatio
SPD       = SpeedBase   * SpeedModifyRatio  * HardLevelGroup.SpeedRatio + SpeedModifyValue
DEF       = DefenceBase * DefenceModifyRatio* HardLevelGroup.DefenceRatio
Toughness = StanceBase  * StanceModifyRatio * HardLevelGroup.StanceRatio
```

Spot check, MoC 12 (Stormcleanse XII, level 95, elite 164):
Frigid Prowler `HP 2,723,431 / SPD 132` and Stellaron Hunter: Sam `HP 11,347,629` — exact match
with nanoka's page. Element name `Thunder` in the raw data maps to in-game `Lightning`.

**Prydwen** returns full server-rendered HTML to `curl` with a desktop User-Agent (follow the
`308` to the no-trailing-slash URL). Character pages contain Best Relic Sets (with DPS %), Best
Planar Sets, Best Light Cones, Best Stats (per slot), and a Teams block carrying real meta
telemetry — rank, appearance rate, average cycles, per endgame mode.

Roster: **92 listed, 2 flagged `4.X` (Aventurine Waveflair, Robin Summeretto) → excluded as
unreleased.** 90 released characters ship.

**Season selection rule:** newest season whose English name is non-empty. Unnamed entries
(`maze` 1035) are unreleased data shipped ahead of the patch, so they are skipped. That yields
MoC `1034 Stormcleanse`, PF `2026 Domain Genesis`, AS `3020 Celestial Lupine`, AA `8 (4.4)`.

---

## Current state problems

- `src/data/characters.ts` — 9 characters, all stats invented, several kits wrong.
- `src/data/endgameStages.ts` — 5 stages, every enemy/HP/toughness/turbulence fabricated
  (e.g. "Aether Sovereign Dominicus" is not a real enemy).
- `src/types/hsr.ts` — `PathType` missing `Remembrance` and `Elation`.
- `src/App.css` — untouched Vite template, dead code.
- `README.md` — untouched Vite template.
- UI is the default LLM dark dashboard: `slate-950` + `cyan-400` accent, gradient-border logo
  tile, `animate-pulse` on nav, uppercase mono labels everywhere, no type hierarchy.

---

## Plan

### 1. Data pipeline `[NEW]`

- `[NEW] scripts/lib/fetch.mjs` — cached HTTP with desktop UA + on-disk cache in `.cache/`.
- `[NEW] scripts/lib/nanoka.mjs` — resolve current `dataVersion` by reading a nanoka page's
  `data-sveltekit-fetched` URL (so it self-updates), plus the stat formula above.
- `[NEW] scripts/fetch-endgame.mjs` — emit `src/data/generated/endgame.json`: all four modes,
  every stage, both halves, every wave, every enemy with real HP/SPD/DEF/toughness/weaknesses/
  rank/icon, turbulence text with `#n[i]` params substituted, and star conditions.
- `[NEW] scripts/fetch-characters.mjs` — emit `src/data/generated/characters.json`: 90 released
  characters, element/path/rarity/base stats/energy from nanoka, builds + teams from Prydwen.
- `[NEW] scripts/build-data.mjs` — runs both; wired as `npm run data`.

### 2. Types `[MODIFY]`

- `src/types/hsr.ts` — add `Remembrance` and `Elation` to `PathType`; add `EnemyRank`;
  extend `EndgameStage` with `nodes` (half 1 / half 2), `starConditions`, `seasonName`,
  `gameVersion`; extend `PrydwenBuildInfo` with per-mode team telemetry.

### 3. Data modules `[MODIFY]`

- `src/data/characters.ts` — becomes a thin typed re-export over the generated JSON, keeping
  `RELIC_SETS_DATABASE` (also regenerated from Prydwen relic pages).
- `src/data/endgameStages.ts` — thin typed re-export over generated endgame JSON.

### 4. Engine `[MODIFY]`

- `src/engine/combatPredictor.ts` — consume the node/wave shape; derive the cycle limit from the
  stage's real star conditions instead of the hardcoded `450 / 1050`; drop the `Math.random()`
  crit roll in favour of expected-value crit so results are reproducible.
- `src/engine/hsrMechanics.ts` — level-correct break base damage instead of the level-80
  constant; toughness in raw stance units.

### 5. UI overhaul `[MODIFY]`

Direction: move off the stock dark-slate/cyan dashboard to a typographic, high-contrast
"combat readout" identity — warm ink background, a single restrained accent, element colours
doing the semantic work, real type scale, and density that suits tabular combat data.

- `[MODIFY] src/index.css` — design tokens (colour, type scale, spacing, element palette).
- `[MODIFY] src/components/Header.tsx` — replace gradient tile + `animate-pulse` nav.
- `[MODIFY] src/components/*.tsx` — apply the token system; rebuild the character grid, stage
  browser, and instruction timeline around the richer data.
- `[DELETE] src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg` — template leftovers.

### 6. Docs `[MODIFY]`

- `README.md` — real project README: what it does, data sources, `npm run data`.
- `[NEW] system_architecture.md` — data-pipeline contract for future sessions.

### 7. Verify

- `npm run build` (`tsc -b && vite build`) must pass.
- `npm run lint`.
- Spot-check three generated enemies against nanoka pages and three characters against Prydwen.
