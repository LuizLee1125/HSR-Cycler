# Execution checklist — v0.3

- [x] 1. `scripts/lib/gear.mjs` + `fetch-gear.mjs` — light cone & relic set database
- [x] 2. `scripts/fetch-endgame.mjs` — season history, PF buff pool, beta exclusion
- [x] 3. `src/types/hsr.ts` — gear, season version, cycle model, card identity
- [x] 4. `npm run data` — regenerate, spot-check A Thankless Coronation + Scholar set
- [x] 5. `src/parser/imageBuildParser.ts` — spatial OCR rewrite
- [x] 6. `src/data/roster.ts` — duplicate + Trailblazer-path guards
- [x] 7. `src/components/TeamBuilder.tsx` — grey out unavailable characters
- [x] 8. `src/components/BuildCardImport.tsx` — identity block, min=0, gear fields
- [x] 9. `src/engine/hsrMechanics.ts` — cycle model, gear conditional effects
- [x] 10. `src/components/Shell.tsx` — season/version selector
- [x] 11. UI bug pass — sticky sidebar, modal escape/backdrop/scroll-lock, wrapping
- [x] 12. `npm run build` + `npm run lint` + browser verification

## Open question for the user

Anomaly Arbitration's cycle rule. Both it and Memory of Chaos start at 0, which is
implemented. The reported difference beyond that is not derivable — AA's records carry
no `countdown` and no cycle `challenge`. It uses MoC timing (150 AV first cycle, 100 AV
after) until confirmed; the fix is one row of `CYCLE_MODEL` in `hsrMechanics.ts`.
