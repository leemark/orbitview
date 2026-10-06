# OrbitView

Browser-based satellite prediction map — no backend required.

**[Live demo →](https://leemark.github.io/orbitview/)**

## Features

- **Predicted satellite map** — satellites rendered as color-coded dots on a dark Leaflet map using SGP4 propagation
- **Catalog selection** — choose a curated overview or explicit stations, visible, weather, navigation, active-sample, and Starlink-sample datasets
- **Click to inspect** — see the satellite's position, velocity, orbital-element source, format, epoch, age, and freshness
- **Ground track** — orbital path rendered for selected satellite (solid past, dashed future)
- **Hover tooltips** — satellite name and altitude on mouseover
- **Satellite browser** — search by name or NORAD ID, select a result by touch or keyboard, and center its predicted position on the map
- **Category filters** — toggle Stations, Weather, Navigation, Starlink, Comms, Science, Debris, Other
- **Altitude filters** — toggle LEO / MEO / GEO / HEO altitude bands, with explicit pressed states and a Show all reset
- **Time controls** — play/pause, speed multiplier (1× / 10× / 100× / 1000×), explicit Now/Paused/Simulation state; Now returns to the present at 1×
- **Observer location** — opt in with the location button to check a selected satellite's elevation above your horizon
- **Responsive layout** — a satellite sidebar on desktop and a collapsible results list on phones, with scrollable details and an exploration guide
- **Feed recovery** — loading and error feedback, retry, bounded network requests, corrupted-cache recovery, and explicit partial-feed coverage
- **Keyboard shortcuts** — see table below

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `+` / `=` | Increase simulation speed |
| `-` | Decrease simulation speed |
| `Escape` | Deselect satellite |
| `/` | Focus search bar |
| `↓` / `Enter` in search | Focus the first satellite result |
| `↑` / `↓` in results | Move between satellites |
| `Enter` / `Space` on a result | Select the satellite |

Shortcuts respect focused form controls. When the map has focus, arrow keys pan and `+` / `-` zoom it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 8 |
| Language | Vanilla JS (ES modules) |
| Map | Leaflet 1.9 + Canvas overlay |
| Orbital math | satellite.js (SGP4/SDP4) |
| Styling | CSS custom properties, dark theme |
| Tests | Vitest + jsdom |
| Hosting | GitHub Pages |

## Architecture

OrbitView is fully client-side — no server, no API keys. Every satellite position is an SGP4 prediction computed in the browser from publicly available TLE or OMM orbital elements; it is not live telemetry.

```
src/
  main.js              # Entry point — animation loop, keyboard shortcuts, wiring
  data/
    catalogs.js        # Explicit, bounded catalog definitions
    tleLoader.js       # Fetch and parse OMM/TLE records, localStorage cache
    categories.js      # Satellite classification (name + NORAD ID patterns)
  engine/
    propagator.js      # satellite.js wrapper — SGP4 → lat/lon/alt/velocity
    clock.js           # Simulation clock with speed multiplier
  map/
    mapManager.js      # Leaflet init (OpenStreetMap tiles, styled dark)
    satelliteLayer.js  # Canvas overlay — dot rendering + click/hover hit-testing
    groundTrack.js     # Orbital ground track polylines
  ui/
    infoPanel.js       # Slide-out satellite detail panel
    searchBar.js       # Search input + satellite filtering
    satelliteList.js   # Accessible, paginated satellite results
    filterPanel.js     # Category + orbit regime toggles
    timeControls.js    # Play/pause, speed, reset buttons
  utils/
    geo.js             # Distance and WGS-84 observer look angles
    format.js          # Altitude, velocity, coordinate, date formatting
```

**Data flow:**
1. Fetch the selected, explicitly labeled [CelesTrak](https://celestrak.org/) OMM catalog — a bounded TLE API sample is the overview fallback
2. Parse OMM or TLE records → `satellite.js` satrec objects
3. Cache in `localStorage` with 2-hour TTL
4. On a bounded update interval: propagate satrec objects to current sim time → lat/lon/alt
5. Render positions on Leaflet Canvas overlay

## Getting Started

Requires Node.js `20.19+`, `22.13+`, or `24+`, matching the supported
runtime ranges in `package.json`.

```bash
npm ci
npm run dev       # Dev server at http://localhost:5173
npm test          # Run unit tests
npm run build     # Production build → dist/
```

## Deployment

Pushes to `main` automatically build and deploy via GitHub Actions:

```
push to main → npm test → npm run build → deploy dist/ → GitHub Pages
```

Live at: `https://leemark.github.io/orbitview/`

## Data Sources

| Priority | Source | Notes |
|----------|--------|-------|
| Primary | [CelesTrak](https://celestrak.org) | Selected OMM JSON group catalog |
| Overview fallback | [TLE API](https://tle.ivanstanojevic.me/api/tle/) | CORS-friendly sample of up to 500 records |

Orbital data is cached in `localStorage` for 2 hours. The data-details dialog reports feed-check time separately from median and oldest element ages; each satellite's details include its source and epoch. Elements older than three days are marked stale. OMM epochs without an offset are treated as UTC, and TLE ages use the epoch encoded in the elements.

Map tiles use [OpenStreetMap's standard service](https://operations.osmfoundation.org/policies/tiles/) with visible attribution and normal browser caching. There is no tile prefetch or offline download. Satellite positions and observer look angles are computed locally; location is requested only after the location button is selected.
