# WattMap

A React + TypeScript + Vite frontend with a Node/Express backend. It displays Smappee EV chargers on a Leaflet map and lets users drop custom pins stored in a local SQLite database.

## Architecture

The project is structured into two separate layers, each with its own TypeScript configuration boundary:

| Layer | Root | TypeScript Config | Runtime |
|---|---|---|---|
| **Frontend** | `src/` | `tsconfig.app.json` | Browser (Vite dev server on port `5173`) |
| **Backend** | `server/` | `server/tsconfig.json` | Node.js (via `tsx` on port `3001`) |

- **API Proxy**: The Vite dev server proxies all `/api/*` requests to `http://localhost:3001` (configured in `vite.config.ts`).
- **Database**: Local SQLite database stored at `server/pins.db`. It is automatically initialized and migrated on the first backend run.
- **Caching**: Smappee charger data is cached in-memory for 10 minutes, and requests are throttled (200ms delay per location) to prevent rate limits.

---

## Getting Started

### 1. Install Dependencies
Run the installation in the root folder to install all frontend and backend dependencies:
```sh
npm install
```

### 2. Environment Configuration
Copy the template `.env.example` file to `.env`:
```sh
copy .env.example .env
```
Open `.env` and fill in the required keys:
- `SMAPPEE_CLIENT_ID` / `SMAPPEE_CLIENT_SECRET`: Smappee API credentials (used only on the backend).
- `VITE_OPENWEATHERMAP_API_KEY`: OpenWeatherMap API Key (used on the frontend for weather map layers).

---

## Available Commands

Use the following scripts to run, lint, or build the application:

```sh
npm run start        # Runs both the server (port 3001) and frontend (port 5173) concurrently
npm run server       # Starts the Express backend only
npm run dev          # Starts the Vite development server for the frontend only
npm run build        # Type-checks both configurations (tsc -b) and compiles Vite production assets
npm run lint         # Runs the Oxlint linter
```

### Makefile Aliases
If you have `make` installed (e.g. GNU Make via Scoop on Windows), you can run aliases mapping to the npm scripts:
- `make start` -> `npm run start`
- `make clean` -> Cleans workspace output directories (runs a PowerShell script safe for Windows)
- `make help` -> Displays all available make targets
