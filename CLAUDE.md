# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite, localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run deploy     # Build + deploy to GitHub Pages (gh-pages -d dist)
npm test           # Run all tests once (vitest run)
```

Run a single test file:
```bash
npx vitest run tests/calcularHospedaje.test.js
```

## Architecture

This is a single-page React 18 app with no backend. All state lives in the browser.

**Auth**: `LoginGuard` wraps the entire app and checks `sessionStorage` for a hardcoded password (`earthpark2026`). No real auth system.

**State**: A single `ReservasContext` (React `useReducer`) holds `{ reservas, egresos }`. State is persisted to `localStorage` under key `earthpark_v1`. On first load it falls back to seed data in `src/data/seedData.js`.

**Routing**: `HashRouter` with five routes:
- `/nueva` — create a reservation form
- `/reservas` — list/manage reservations
- `/cocina` — kitchen view (shopping list, menu instructions)
- `/hospedaje` — lodging occupancy view
- `/financiero` — financial dashboard with charts

**Config files** (`src/data/`):
- `config.js` — `CONFIG`: pricing, food costs, room capacities, margin benchmarks
- `planesConfig.js` — `PLANES`: the three tour packages (2D1N, 3D2N, visita) with per-item costs and helper functions `calcularCostoOperativoPlan` / `calcularIngresoEsperado`
- `menuConfig.js` — `MENU`: recipes and per-portion costs for hamburguesa, pechuga, desayuno
- `costosConfig.js` — `COSTOS_PRODUCTOS`: product cost reference used in financiero

**Utility functions** (`src/utils/`):
- `calcularInsumos.js` — `calcularIngresos`, `calcularPagos`, `calcularListaCompras`, `calcularMargen`, `alertaSalud`
- `calcularHospedaje.js` — room assignment logic (Mariposa 5-cap → Ancestros 2-cap → external overflow)
- `validarReserva.js` — `validarFormReserva`, `generarReservaId`, `calcularFechaFin`
- `formatCOP.js` — Colombian peso formatter
- `importarCSV.js` / `importarEgresos.js` / `importarUtils.js` — CSV import helpers (PapaParse)

**Key data flow**: When a reservation is created in `NuevaReserva`, all financial figures are derived on the fly from `CONFIG` and `PLANES` — nothing is stored pre-calculated except `costo_operativo_estimado`. `FinancieroPage` re-derives totals from the stored reservas + egresos on each render.

**Deployment**: Deployed to GitHub Pages. `vite.config.js` sets `base: "/earth-park-dashboard/"`, so all asset paths are relative to that subpath. The app uses `HashRouter` to work on static hosting without server-side routing.

**Tests**: Vitest + jsdom, no React Testing Library integration tests — only unit tests for pure utility functions (`tests/`).
