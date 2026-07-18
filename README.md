# OrbitView

Browser-based satellite prediction map — no backend required.

**[Live demo →](https://leemark.github.io/orbitview/)**

## Features

- **Predicted satellite map** — satellites rendered as color-coded dots on a dark Leaflet map using SGP4 propagation
- **Catalog selection** — choose a curated overview or explicit stations, visible, weather, navigation, active-sample, and Starlink-sample datasets
- **Click to inspect** — see the satellite's position, velocity, orbital-element source, format, epoch, age, and freshness
- **Ground track** — orbital path rendered for selected satellite (solid past, dashed future)
- **Hover tooltips** — satellite name and altitude on mouseover
- **Search** — filter satellites by name or NORAD ID
- **Category filters** — toggle Stations, Weather, Navigation, Starlink, Comms, Science, Debris, Other
- **Orbit regime filters** — toggle LEO / MEO / GEO / HEO
- **Time controls** — play/pause, speed multiplier (1× / 10× / 100× / 1000×), reset to now
- **Observer location** — grant browser location permission to see which satellites are currently overhead
- **Keyboard shortcuts** — see table below

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `+` / `=` | Increase simulation speed |
| `-` | Decrease simulation speed |
| `Escape` | Deselect satellite |
| `/` | Focus search bar |

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
    mapManager.js      # Leaflet init (CartoDB dark tiles)
    satelliteLayer.js  # Canvas overlay — dot rendering + click/hover hit-testing
    groundTrack.js     # Orbital ground track polylines
  ui/
    infoPanel.js       # Slide-out satellite detail panel
    searchBar.js       # Search input + satellite filtering
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

Orbital data is cached in `localStorage` for 2 hours. The UI reports feed-check time separately from the median, oldest, and per-satellite element ages, and marks elements older than three days as stale.
