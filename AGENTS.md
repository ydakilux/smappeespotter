# AGENTS.md

## What this repo is

A React + TypeScript + Vite frontend with a Node/Express backend. It displays Smappee EV chargers on a Leaflet map, and lets users drop custom pins stored in a local SQLite database.

## Architecture

Two separate processes, one TypeScript project boundary each:

| Layer | Root | TS config | Runtime |
|---|---|---|---|
| Frontend | `src/` | `tsconfig.app.json` | Browser (Vite, `moduleResolution: bundler`) |
| Backend | `server/` | `server/tsconfig.json` | Node (`moduleResolution: NodeNext`) |

- Vite dev server proxies `/api/*` to `http://localhost:3001` (`vite.config.ts`)
- Backend is run directly with `tsx` (no compile step needed during dev)
- SQLite DB lives at `server/pins.db` — auto-created and migrated on first run via `server/db.ts`

## Commands

Run `npm install` first — `node_modules` must exist or `concurrently`/`tsx` won't be found.

```sh
npm run start        # both server (port 3001) + frontend (port 5173) via concurrently
npm run server       # backend only
npm run dev          # frontend only (needs backend running separately)
npm run build        # tsc -b && vite build — type-checks both tsconfigs then bundles
npm run lint         # oxlint
```

`make help` lists all Makefile aliases (they map 1:1 to npm scripts).

## Makefile / Windows

The Makefile works on Windows with GNU Make (e.g. via Scoop). Two Windows-specific targets:

- `clean` — uses `pwsh -Command "Remove-Item ..."` instead of `rm -rf`; safe when paths don't exist
- `help` — uses `@echo` instead of `grep | awk` (no Unix tools assumed)

## Environment

Copy `.env.example` to `.env`. Required keys:

- `SMAPPEE_CLIENT_ID` / `SMAPPEE_CLIENT_SECRET` — Smappee OAuth app credentials (backend only, never exposed to frontend)
- `VITE_OPENWEATHERMAP_API_KEY` — Open Weather Map key (prefixed `VITE_` so Vite exposes it to the browser)

Backend loads `.env` via `import 'dotenv/config'` at the top of `server/index.ts`.

## TypeScript quirks

- Root `tsconfig.json` has no `compilerOptions`; it only references the two sub-configs. Run `tsc -b` (not `tsc`) to build.
- `tsconfig.app.json` sets `noEmit: true` and `moduleResolution: bundler` — do not try to compile `src/` with tsc directly.
- `server/tsconfig.json` uses `moduleResolution: NodeNext` with output to `dist-server/` — but during dev `tsx` runs the source directly without compiling.
- Both configs enforce `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`.

## Linter

Uses **oxlint** (not ESLint). Config: `.oxlintrc.json`. Plugins: `react`, `typescript`, `oxc`. `react/rules-of-hooks` is an error.

## Backend details

- Express 5, runs on port `3001`, bound to `0.0.0.0`
- Auth is in-memory only (`tokenStore` in `server/smappee.ts`) — logging out clears it; restarts reset it
- Charger data is cached in-memory for 10 minutes (`CHARGER_CACHE_TTL_MS`)
- Smappee API calls are throttled with a 200 ms delay per service location to avoid rate limits
- Charger capacity is inferred from serial number ranges (see `inferCapacity` in `server/smappee.ts`) — there is no live kW data from the API

## Frontend details

- `src/api.ts` is the single file for all HTTP calls (both to `/api/*` and external services)
- External services called directly from the browser: Nominatim (geocoding, no key needed), Open-Meteo (weather, no key needed)
- `VITE_OPENWEATHERMAP_API_KEY` is in `.env.example` but weather currently uses Open-Meteo — check `src/components/WeatherPanel.tsx` before assuming OWM is active
- `src/types.ts` holds shared frontend types; `server/smappee.ts` exports `SmappeeCharger` for the backend equivalent
- No test suite exists.

## No tests / no CI

There are no test files and no CI config. Verification is: `npm run lint && npm run build`.
