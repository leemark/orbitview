# OrbitView

Real-time satellite tracker running entirely in the browser — no backend required.

**[Live demo →](https://leemark.github.io/orbitview/)**

## Features

- **Live satellite map** — 500+ satellites rendered as color-coded dots on a dark Leaflet map, updating in real time via SGP4 propagation
- **Click to inspect** — select any satellite to see its name, NORAD ID, orbit type, lat/lon/altitude, velocity, and TLE data age
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
| Bundler | Vite 5 |
| Language | Vanilla JS (ES modules) |
| Map | Leaflet 1.9 + Canvas overlay |
| Orbital math | satellite.js (SGP4/SDP4) |
| Styling | CSS custom properties, dark theme |
| Tests | Vitest + jsdom |
| Hosting | GitHub Pages |

## Architecture

OrbitView is fully client-side — no server, no API keys. Every satellite position is computed in the browser from publicly available TLE data.

```
src/
  main.js              # Entry point — animation loop, keyboard shortcuts, wiring
  data/
    tleLoader.js       # Fetch TLE data, parse OMM records, localStorage cache
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
    geo.js             # Haversine distance, elevation angle
    format.js          # Altitude, velocity, coordinate, date formatting
```

**Data flow:**
1. Fetch TLE data from [TLE API](https://tle.ivanstanojevic.me/) (CORS-friendly, paginated) — CelesTrak group queries as fallback
2. Parse OMM records → `satellite.js` satrec objects
3. Cache in `localStorage` with 2-hour TTL
4. Each animation frame: propagate all satrec objects to current sim time → lat/lon/alt
5. Render positions on Leaflet Canvas overlay

## Getting Started

```bash
npm install
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
| Primary | [TLE API](https://tle.ivanstanojevic.me/api/tle/) | CORS-friendly, no auth |
| Fallback | [CelesTrak](https://celestrak.org) | Small group queries (stations, visual, weather, GPS, Starlink) |

TLE data is cached in `localStorage` for 2 hours — SGP4 accuracy is sufficient for visualization with TLEs up to a few days old.
