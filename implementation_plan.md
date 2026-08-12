# HSR Cycler — v0.3: card reading, light cones, season history, cycle model

Supersedes the v0.2 plan. Nine fixes, driven by four real build cards (Saber, Huohuo,
Trailblazer • Remembrance, Gilgamesh) supplied as reference.

---

## Verified findings (silent phase)

### Why the card reader fails (req 2)

The cards are a **two-column layout**: the stat label sits on the left, its value flush right,
with a rule between them. Tesseract emits those as separate lines, so every regex of the form
`LABEL[^\d\n]{0,12}(\d+)` fails the moment the value lands on its own line. That is the single
root cause behind SPD, CRIT DMG and Energy Regeneration Rate.

Two aggravating factors:

- `Energy Regeneration Rate` **wraps onto two lines** on the card, so even a same-line match
  cannot see it — `[^\d\n]` forbids the newline between `Energy` and `Regeneration Rate`.
- SPD reads `126.03` — two decimals. The pattern allowed `\.\d` only.

Fix: stop matching on lines. Tesseract exposes word boxes; match a label's box to the nearest
numeric box on the **same horizontal band**, which is exactly how a human reads the card.

### What the cards actually carry (req 3, 4)

| Field | On the card | How |
| --- | --- | --- |
| Character name | `Saber` | text |
| Level | `Lv. 80/80` | text |
| Ability levels | `6 · 10 · 10 · 10` badges | isolated numerals in a left column |
| Eidolon | six icons, dimmed when locked | **no text** — brightness only |
| Light Cone | `A Thankless Coronation` | text |
| Superimposition | `I`, `V` in a circle | **Roman numeral**, not `S1` |
| Relic set | `4 Scholar Lost in Erudition` | count precedes the name |
| Planar set | `Inert Salsotto 2` | count follows the name |

The current name matcher only knows sets and cones that appear in some character's Prydwen
recommendations, so anything off-meta is invisible. StarRailRes ships the full lists:
`light_cones.json` (165), `light_cone_ranks.json` (165), `relic_sets.json` (60).

### Light cone effects — what is already in the card and what is not (req 4)

Verified against the user's Saber example. `light_cone_ranks.json` for **A Thankless Coronation**:

```
desc:   "Increases the wearer's CRIT DMG by #1[i]%. When using Ultimate, increases the wearer's
         ATK by #6[i]%, and if Max Energy >= #3[i], regenerates Energy equal to #5[i]% of Max
         Energy and once again increases ATK by #2[i]%, lasting #4[i] turns."
params[0] (S1): [0.36, 0.4, 300, 2, 0.1, 0.4]
properties[0]:  [{ type: "CriticalDamageBase", value: 0.36 }]
```

That matches the report exactly: Saber's card shows **211.7%** CRIT DMG, her gear alone is
**175.5%**, and 175.5 + 36 = 211.5 — the `properties` entry is baked into the card, the
conditional ATK and Energy clauses are not.

**So `properties` is the discriminator**, and it is data rather than a guess:

- `properties[superimposition - 1]` — always-on stat, **already in the card's numbers**, never
  re-applied.
- everything in `desc` that is not one of those properties — conditional, **applied on top**.

Relic sets follow the identical shape: `desc[0]`/`properties[0]` are the 2-piece effect,
`desc[1]`/`properties[1]` the 4-piece. Same rule.

### Seasons and versions (req 5)

`en/maze/version.json` and `en/peak/version.json` map game version → season ids, and versions
really do carry more than one: `"2.2": [1014, 1015]`, `"1.4": [1004, 1005, 1006]`.

Beta content is identifiable and must be excluded:
- `version.json` files the unreleased season under **`"unknown"`** — Anomaly Arbitration season
  `9` "Return of the Legion" sits there today;
- the mode index ships an unnamed trailing row (`maze` `1035`, `en: ""`).

**Pure Fiction and Apocalyptic Shadow have no `version.json`**, and their `begin`/`end` fields
are empty strings, so there is no date to filter on. For those two the only reliable released
signal is a non-empty `en` name, and they are labelled by season id rather than a version.

### Pure Fiction buffs (req 6)

v0.2 read `option` as always-on season mechanics. That was wrong — the user confirms Pure
Fiction presents a buff choice, and `option` has the same three-entry shape as Apocalyptic
Shadow's `buff_list*`. `option` becomes the choosable pool; `sub_option` stays as always-on
mechanics.

### Cycles (req 8)

Memory of Chaos counts from **0** — a clear inside the first 150 AV is 0 cycles, not 1.
`cycleAtAV` returns 1 there today, so every MoC figure is off by one.

Anomaly Arbitration also starts at 0 but counts differently. **Its records carry no `countdown`
and no cycle `challenge` at all**, so nanoka has nothing to derive the difference from. The
cycle model becomes a per-mode table so the AA rule is one value to correct, and the open
question is put to the user rather than guessed.

---

## Plan

### 1. Import guards `[MODIFY]`

- `[NEW] src/data/roster.ts` — `slotConflict(team, character, slot)` returning a reason string:
  same character already placed, or a second Trailblazer on a different Path (they are one unit).
- `[MODIFY] src/components/TeamBuilder.tsx` — conflicted entries render dimmed and
  non-clickable, with the reason as the tooltip.

### 2. Card identity check `[MODIFY]`

`BuildCardImport` already warns on a mismatch. Promote it to a **block**: when the card resolves
to a different character, "Use this build" is disabled and the panel offers *Import a different
card* or *Switch this slot to \<the character on the card\>*.

### 3. OCR rewrite `[REWRITE]`

`[REWRITE] src/parser/imageBuildParser.ts`

- Ask Tesseract for word boxes; build a spatial index.
- `valueRightOf(label)` — nearest numeric token whose vertical centre sits in the label's band.
- Multi-word labels matched as phrases, so `Energy Regeneration Rate` works across its wrap.
- Numbers accept two decimals and thousands separators.
- Ability levels: the isolated small numerals in the left badge column, read top to bottom.
- Eidolon: brightness of the six-icon strip, flagged as a visual read.
- Relic sets: piece count on either side of the name; matched against the full set list.
- Light cone: full cone list; superimposition from the Roman numeral badge.

### 4. Light cone + relic set database `[NEW]`

- `[NEW] scripts/lib/gear.mjs` + generator output `src/data/generated/gear.json` — every light
  cone and relic set with per-superimposition/per-piece `params`, `properties` and parsed
  conditional effects.
- `[MODIFY] src/engine/hsrMechanics.ts` — apply conditional gear effects on top of the card
  stats; never re-apply anything in `properties`.

### 5. Season history + version picker `[MODIFY]`

- `[MODIFY] scripts/fetch-endgame.mjs` — emit the last 4 released seasons per mode, each with
  `gameVersion` where a `version.json` exists. Skip `unknown`/`static` and unnamed rows.
- `[MODIFY] src/components/Shell.tsx` — a season selector beside the mode tabs.

### 6. Pure Fiction buffs `[MODIFY]`

`option` → `buffChoices` for Pure Fiction; `sub_option` stays in `modifiers`.

### 7. Negative stat inputs `[MODIFY]`

`min={0}` plus a clamp in the change handler on every numeric field in `BuildCardImport`.

### 8. Cycle model `[MODIFY]`

`[NEW] CYCLE_MODEL: Record<EndgameMode, { firstCycleAV, cycleAV, startsAtZero }>` in
`hsrMechanics.ts`; `cycleAtAV(av, mode)` everywhere. MoC and AA count from 0.

### 9. UI fixes `[MODIFY]`

- sidebar sticky and full height — it currently scrolls away (1204px against a 910px viewport);
- modals close on Escape and on backdrop click, and lock background scroll;
- node tabs wrap at three nodes;
- metric tiles lose their stray right border when the grid wraps.

### Verify

`npm run data`, `npm run build`, `npm run lint`, and a browser pass over the whole flow.
