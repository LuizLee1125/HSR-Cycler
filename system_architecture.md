# HSR Cycler — architecture notes

Read this before planning a change. It records the contracts that are not
obvious from the code, and the things that were deliberately *not* done.

## Data pipeline (`npm run data`)

Two generators write into `src/data/generated/`. Nothing in `src/` may hand-edit
those files.

| Generator | Output | Sources |
| --- | --- | --- |
| `scripts/fetch-endgame.mjs` | `endgame.json` | nanoka.cc static CDN |
| `scripts/fetch-characters.mjs` | `characters.json` | prydwen.gg + StarRailRes |
| `scripts/fetch-gear.mjs` | `gear.json` | StarRailRes |

### nanoka

`scripts/lib/nanoka.mjs` resolves the current `dataVersion` by reading it back
out of a live nanoka page, so the pipeline follows patches without a constant to
bump. Enemy stats are resolved with the game's own scaling tables:

```
HP        = HPBase      * HPModifyRatio      * EliteGroup.HPRatio * HardLevelGroup.HPRatio
SPD       = SpeedBase   * SpeedModifyRatio   * HardLevelGroup.SpeedRatio + SpeedModifyValue
DEF       = DefenceBase * DefenceModifyRatio * HardLevelGroup.DefenceRatio
Toughness = (StanceBase * StanceModifyRatio  * HardLevelGroup.StanceRatio) / 3
```

Game text carries `#n` parameter slots, with or without a format hint
(`#1[i]`, `#2[f1]`, or bare `#1`). `renderGameText` handles all three — the bare
form is what Pure Fiction and Apocalyptic Shadow star conditions use, and
missing it is what produced `"Gain #1 points"` in the v0.1 data.

**Which modes let the player pick a buff** — established by reading the raw
season records, not by assumption:

| Mode | Field | Choice? |
| --- | --- | --- |
| Memory of Chaos | `desc` (turbulence) | No |
| Pure Fiction | `option` | **Yes** (`sub_option` stays always-on) |
| Apocalyptic Shadow | `buff_list1..3` | **Yes**, deduped union |
| Anomaly Arbitration | `boss_config.buff_list` | **Yes** |

`season.buffChoices` is empty for the two modes without a choice, and the UI
hides the picker on that basis. Never show a picker off a hardcoded mode list.

Only the highest stage ships for MoC / PF / AS. Anomaly Arbitration keeps all
four, because its three preliminaries are a different fight from its boss stage.

### Seasons

These rotations reset once or twice a patch, so a mode carries several released
seasons (`SEASON_HISTORY = 4`) and the user picks one. `listReleasedSeasons`
excludes beta content two ways, because the sources disagree:

- `version.json` files unreleased seasons under **`"unknown"`** (Anomaly
  Arbitration's season 9 sits there today) — an id absent from the map is beta;
- the mode index ships an unnamed trailing row for the next patch.

**Pure Fiction and Apocalyptic Shadow publish no `version.json`**, and their
`begin`/`end` fields are empty strings, so there is no date to filter on. Their
only released signal is a localised `en` name, and they carry no version label —
`seasonLabel` falls back to the season id.

### Cycle counting

Memory of Chaos and Anomaly Arbitration count from **0**: a clear inside the
first 150 AV is 0 cycles, not 1. The score-based modes have no cycle display and
count from 1. That lives in `CYCLE_MODEL` in `hsrMechanics.ts`, and every call
to `cycleAtAV`/`avForCycles` takes the mode.

> **Open question.** The user reports Anomaly Arbitration counts differently
> from Memory of Chaos beyond both starting at zero. Its records carry no
> `countdown` and no cycle `challenge`, so nanoka publishes nothing to derive
> that from. It currently uses the Memory of Chaos timing; correcting it is one
> row of `CYCLE_MODEL`.

### Starward

Each of MoC / PF / AS ships one extra season row that has **no `name`** and
points back at the hardest normal stage through `pre_id`. That row is the
Starward tier, and v0.1 discarded it as a beta placeholder.

It carries a single `event_id_list` node under its own elite group (Memory of
Chaos: **167** against the normal **164**), a raised countdown (**45** cycles
against 30), harder `challenge` thresholds, and a `challenge_special` on top of
the three stars.

`buildStarwardStage` emits it as a second stage with `starward: true` and
**three nodes** — the base stage's two halves followed by the Starward node,
which is the only reading of `pre_id` that yields three. `stagesFor(mode,
starward)` picks between the two variants and `hasStarward(mode)` drives the
toggle's disabled state; Anomaly Arbitration has no such row.

Two traps in this data:

- `countdown` means cycles in Memory of Chaos but carries a score-scale number
  in Pure Fiction (**45000**). `cycleLimitOf` rejects anything over 100 rather
  than reporting a 45000-cycle budget.
- MoC's third Starward `challenge` has a `#1` slot with **no `param`**
  upstream. `renderGameText` renders an unfilled slot as `?` — "No more than ?
  downed character(s)" — because deleting it produces broken prose and the real
  value is not in the data to substitute.

### Ability multipliers

`scripts/lib/skills.mjs` reads `StarRailRes/index_new/en/character_skills.json`.
Prydwen renders its skill tab client-side, so a scraper cannot read the
percentages off the page; StarRailRes is the same game data Prydwen renders.

Slot mapping is by SRR `type`: `Normal`→basic, `BPSkill`→skill, `Ultra`→
ultimate, `Talent`→talent, `Maze`→technique, `MemospriteSkill`/
`MemospriteTalent`→ the Remembrance rows, `ElationDamage`→elation skill,
`Assist`→assist.

**Memosprite ids are prefixed:** Castorice is `1407`, her memosprite Skill is
`1140701` — a leading `1` plus the owner's id. Everything else is the plain id.

Multipliers and buff grants are both parsed out of the description, which names
the param slot inline (`"DMG equal to #1[i]% of Acheron's ATK"`). Two guards
keep noise out:

1. the clause must mention `DMG` — otherwise heal ratios get read as damage;
2. the param must change between level 1 and max — otherwise stack counts and
   durations, which sit in the same array, get read as multipliers.

Toughness per ability is **derived**, not sourced — neither StarRailRes nor
Prydwen publishes stance damage. `CharacterSkill.toughnessDerived` marks it.

## Predictor (`src/engine/combatPredictor.ts`)

- Enemies are in the Action Value queue alongside allies. Turn order is real.
- An action deals damage only when the ability's parsed `scalings` say it does.
  Supports, healers and shielders contribute zero, and the plan says so.
- Enemy behaviour is rolled through a seeded RNG (`src/engine/rng.ts`), which is
  where the best / typical / worst spread comes from. Same team + stage + buff
  always produces the same branches.
- CRIT stays deterministic (expected value). The branching models enemy
  behaviour, not crit luck.

### Gear (`src/data/gear.ts`, `scripts/lib/gear.mjs`)

A build card's printed stats **already include** every always-on bonus from the
light cone and relic sets. Applying those again double-counts. The split is read
from the data, not guessed:

- `properties` (light cone, per superimposition; relic set, per tier) is the
  always-on stat line → `staticEffects` → **never re-applied**;
- everything else in `desc` is conditional → `conditionalEffects` → applied on
  top by the predictor.

Verified against A Thankless Coronation at S1: `properties` is `CriticalDamageBase
0.36`, and Saber's card reads 211.7% CRIT DMG against 175.5% from gear alone —
175.5 + 36 = 211.5. The remaining clauses (40% ATK on Ultimate, 10% Max Energy,
another 40% ATK) are not on the card, so those are what get applied.

Conditionals are modelled as always active. One that is up for most of a fight
reads close to right; one gated on a rare state reads high. Stated, not silently
averaged.

Two parsing traps, both fixed and both worth remembering:
- **"Follow-Up ATK" and "Basic ATK" name an ability, not the stat.** Without a
  guard, Inert Salsotto's "Follow-Up ATK increases by 15%" reads as an ATK buff
  instead of the DMG bonus it is.
- Relic descriptions carry **literal** numbers; light cone descriptions carry
  `#n[i]%` slots. They need separate passes.

### Build card OCR (`src/parser/imageBuildParser.ts`)

**`Tesseract.recognize()` cannot return word boxes.** Its signature has no output
argument, so `data.blocks` is always `null` and any spatial pass reads *nothing* —
which is why a first attempt returned zero stats on a real card while passing
against a hand-built word list. Word boxes require a worker:

```js
const worker = await createWorker('eng');
const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
```

Cards are a **two-column layout**: label left, value flush right. Tesseract emits
those as separate lines, so any `LABEL[^\d\n]{0,12}(\d+)` regex silently fails —
that is why SPD, CRIT DMG and Energy Regeneration Rate never read. `Energy
Regeneration Rate` also wraps onto two lines.

The parser is therefore **spatial**: find the label's word boxes (as a phrase, so
a wrap is fine), then take the nearest number sharing its horizontal band. A
text-based pass runs as a fallback only. Do not make line matching primary again.

Things learned from real output, each guarding a specific failure:

- OCR sprinkles punctuation *between* a wrapped label's words — the real card
  yields `Energy | , | Regeneration | Rate | 100.0%`. Phrase matching steps over
  any token with no letters.
- **Ability levels are a column**, and taking every small integer in reading
  order also swallows the relic piece counts (`4 Scholar…`, `Salsotto 2`), which
  put Ultimate at 4 and Talent at 2. `findBadgeColumn` clusters candidates by x
  and keeps the tallest left-most group.
- **The superimposition numeral is anchored to the cone name** within a bounded
  radius. Unanchored, the `V` in `Lv.` reads as S5.
- **Light cone titles rarely OCR cleanly.** Exact match, then longest surviving
  word or contiguous fragment, gated on covering ≥50% of the title — without that
  floor "Something Entirely Different" resolves to "Something Irreplaceable" and
  silently applies the wrong effects.
- The pre-pass binarises on **Otsu's threshold and inverts**: cards are light text
  on dark, and Tesseract reads dark-on-light far better.

Unread fields are never silently guessed. Ability levels fall back to the trace
ceiling but stay marked as unread; superimposition falls back to S1 with a
warning; **Eidolon returns null** — a brightness read of the icon strip was tried
and removed because locked icons still show artwork over a gradient, and it
reported E3 for an E0 card.

Card-specific quirks:
- superimposition is a **Roman numeral badge** (`I`…`V`), not `S1`. Match tokens
  made *only* of I and V — stripping other letters reads the V out of "Lv." as 5;
- the relic piece count sits before the set name, the planar count after it;
  planar is identified from the database rather than from where the number sits;
- **Eidolon is not text.** It is six icons, dimmed while locked, so it is read by
  brightness and left editable.

### Known coverage gap — do not paper over this

The damage model prices what the game data states: per-level ability
multipliers, per-level ally buff grants, the selected stage buff, light cone and
relic conditionals, real enemy DEF/RES/toughness. It does **not** price
Eidolons, follow-up attacks, DoT, or stack- and transformation-scaling kits
(Acheron's Slashed Dream, Firefly's enhanced Skill), because those live in prose
that a parser cannot value.

The result is that totals run low and hard nodes often report no clear. That is
surfaced honestly: the prediction shows Prydwen's **measured** average cycles
for the closest recorded team next to the simulated range
(`src/data/telemetry.ts`), clearly labelled as measured rather than modelled.

If you improve this, improve it by pricing more of the real data — not by
adding a calibration constant that makes the numbers look plausible.

## App flow

`stages → team → plan`, plus the `codex` reference view.

The predictor is **gated**. `isTeamReady` requires four slots each holding a
build imported from a card, and where the mode has a buff pool, a chosen buff.
There are no preset teams, no assumed stat lines, and no "typical build"
fallback anywhere — that was removed deliberately in v0.2 and should not come
back. An unread field stays zero and is shown as unfilled.

Import is per slot, inside the Team view. There is no Import page and no
Enka-by-UID fetch: the only input is a build card image
(`src/parser/imageBuildParser.ts`).

Live capture lives inside the prediction view because it only means anything
against a loaded plan. `src/vision/liveGameTracker.ts` reads the cycle counter
and Skill Point numeral by OCR, and charged Ultimates by sampling the portrait
ring's brightness and hue. AV is **derived** from the cycle counter plus the
plan — the game never prints it — and the UI labels it as such.
