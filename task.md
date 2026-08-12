# Execution checklist

- [ ] 1. `scripts/lib/fetch.mjs` — cached HTTP helper
- [ ] 2. `scripts/lib/nanoka.mjs` — version resolve + stat formula
- [ ] 3. `scripts/fetch-endgame.mjs` — all 4 modes, nodes, waves, enemies
- [ ] 4. `scripts/fetch-characters.mjs` — 90 released characters + Prydwen builds/teams
- [ ] 5. `scripts/build-data.mjs` + `npm run data`
- [ ] 6. `src/types/hsr.ts` — Remembrance/Elation paths, node/wave shape, team telemetry
- [ ] 7. `src/data/characters.ts` / `endgameStages.ts` — typed re-exports
- [ ] 8. `src/engine/*` — consume nodes, real cycle limits, deterministic crit
- [ ] 9. UI overhaul — tokens + all components
- [ ] 10. Delete template leftovers (`App.css`, react/vite svg)
- [ ] 11. `README.md` + `system_architecture.md`
- [ ] 12. `npm run build` + `npm run lint` + spot-check data
