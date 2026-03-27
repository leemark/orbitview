# OrbitView MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based real-time satellite tracker that fetches TLE data from CelesTrak, propagates positions client-side with satellite.js, and renders 500+ satellites on an interactive Leaflet map at 60fps.

**Architecture:** Fully client-side SPA — no backend. TLE data is fetched from CelesTrak GP JSON API, cached in localStorage (2h TTL), propagated per frame via SGP4 in satellite.js, and rendered as Canvas dots on a Leaflet dark-theme map. Vanilla JS + Vite; no framework.

**Tech Stack:** Vite 5, satellite.js, Leaflet 1.9, Vitest, jsdom, CSS custom properties

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Single HTML entry; map container, top bar, info panel, bottom bar DOM skeleton |
| `vite.config.js` | Vite config with base `/orbitview/` for GitHub Pages; Vitest jsdom environment |
| `package.json` | Dependencies: satellite.js, leaflet; devDeps: vite, vitest, jsdom |
| `src/main.js` | App entry — fetches TLEs, wires modules, starts animation loop |
| `src/data/tleLoader.js` | Fetches CelesTrak GP JSON, parses OMM records, caches in localStorage |
| `src/data/categories.js` | Classifies satellites by name/NORAD ID; `classifySatellite()`, `getOrbitRegime()` |
| `src/engine/propagator.js` | Wraps satellite.js: `createSatrec()`, `propagatePosition(satrec, date)` → `{lat,lon,alt,velocity}` |
| `src/engine/clock.js` | Simulation clock: `play/pause`, `setSpeed(n)`, `getTime()`, `resetToNow()` |
| `src/map/mapManager.js` | Leaflet map init, CartoDB Dark Matter tiles, exposes `map` instance |
| `src/map/satelliteLayer.js` | Canvas overlay: draws dots, hit-tests clicks/hover, emits `select`/`hover` events |
| `src/map/groundTrack.js` | Computes + renders ground track polyline for selected satellite |
| `src/ui/searchBar.js` | Search input; substring match on name + NORAD ID; emits filtered satellite list |
| `src/ui/filterPanel.js` | Category + orbit regime toggle buttons; emits active filter set |
| `src/ui/infoPanel.js` | Slide-out right panel; renders selected satellite details |
| `src/ui/timeControls.js` | Play/pause button, speed selector — binds to Clock instance |
| `src/utils/geo.js` | `toRadians`, `toDegrees`, `haversineDistance`, `calculateElevation` |
| `src/utils/format.js` | `formatAlt`, `formatVelocity`, `formatCoord`, `formatTLEAge` |
| `src/styles/main.css` | Dark theme, CSS custom properties, layout, transitions |
| `tests/engine/propagator.test.js` | Unit tests for propagator |
| `tests/engine/clock.test.js` | Unit tests for clock |
| `tests/data/tleLoader.test.js` | Unit tests for TLE parser |
| `tests/data/categories.test.js` | Unit tests for satellite classification |
| `tests/utils/geo.test.js` | Unit tests for geo math |
| `tests/utils/format.test.js` | Unit tests for format helpers |

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/styles/main.css`

- [ ] **Step 1: Initialize Vite project**

Run inside `/home/mark/code_projects/orbitview`:
```bash
npm create vite@latest . -- --template vanilla
```
When prompted "Current directory is not empty. Remove existing files and continue?" — choose **Yes** (only the `.docx` and `docs/` exist).

Expected: Creates `index.html`, `package.json`, `src/main.js`, `src/style.css`, `public/`, `vite.config.js`.

- [ ] **Step 2: Install dependencies**

```bash
npm install satellite.js leaflet
npm install -D vitest jsdom @vitest/ui
```

Expected: `node_modules/` created, `package.json` updated with deps.

- [ ] **Step 3: Configure Vite with GitHub Pages base and Vitest**

Replace `vite.config.js` entirely:
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/orbitview/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Replace index.html with app skeleton**

Overwrite `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OrbitView — Real-Time Satellite Tracker</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="app">
    <header id="top-bar">
      <div class="brand">OrbitView</div>
      <div id="search-container"></div>
      <div id="filter-container"></div>
      <span id="sat-count">— satellites</span>
      <div id="time-controls-container"></div>
    </header>

    <main id="map-container">
      <div id="map"></div>
    </main>

    <aside id="info-panel" class="hidden" aria-label="Satellite details"></aside>

    <footer id="bottom-bar">
      <span id="sim-time"></span>
      <span id="playback-speed"></span>
      <span id="data-freshness"></span>
    </footer>
  </div>

  <div id="tooltip" class="tooltip hidden"></div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Create CSS with dark theme custom properties**

Delete `src/style.css`. Create `src/styles/main.css`:
```css
:root {
  --bg-deep: #0a0e1a;
  --bg-panel: rgba(12, 17, 30, 0.92);
  --bg-panel-border: rgba(74, 144, 217, 0.2);
  --color-accent: #4a90d9;
  --color-geo: #d4a843;
  --color-success: #4caf50;
  --color-danger: #e74c3c;
  --color-text: #c8d6e5;
  --color-text-muted: #6a7f99;
  --color-mono: 'Courier New', monospace;
  --radius: 6px;
  --panel-width: 320px;
  --top-bar-height: 48px;
  --bottom-bar-height: 36px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-deep);
  color: var(--color-text);
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 13px;
  overflow: hidden;
  height: 100vh;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: var(--top-bar-height);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--bg-panel-border);
  z-index: 1000;
  flex-shrink: 0;
}

.brand {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

#sat-count {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
  margin-left: auto;
}

#map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#map {
  width: 100%;
  height: 100%;
}

.satellite-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 400;
}

#info-panel {
  position: absolute;
  top: var(--top-bar-height);
  right: 0;
  width: var(--panel-width);
  height: calc(100vh - var(--top-bar-height) - var(--bottom-bar-height));
  background: var(--bg-panel);
  border-left: 1px solid var(--bg-panel-border);
  z-index: 900;
  overflow-y: auto;
  padding: 16px;
  transition: transform 0.2s ease;
}

#info-panel.hidden {
  transform: translateX(100%);
}

#bottom-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: var(--bottom-bar-height);
  background: var(--bg-panel);
  border-top: 1px solid var(--bg-panel-border);
  font-family: var(--color-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  z-index: 1000;
  flex-shrink: 0;
}

.tooltip {
  position: fixed;
  background: var(--bg-panel);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 11px;
  pointer-events: none;
  z-index: 2000;
  white-space: nowrap;
}

.hidden { display: none !important; }

/* Leaflet dark overrides */
.leaflet-container { background: var(--bg-deep); }
.leaflet-control-zoom a {
  background: var(--bg-panel) !important;
  color: var(--color-text) !important;
  border-color: var(--bg-panel-border) !important;
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server starts, browser shows dark page with "OrbitView" in top bar.

- [ ] **Step 8: Commit scaffolding**

```bash
git init
git add index.html vite.config.js package.json package-lock.json src/styles/main.css
git commit -m "chore: initialize Vite project with OrbitView skeleton"
```

---

### Task 2: Utility Functions

**Files:**
- Create: `src/utils/geo.js`
- Create: `src/utils/format.js`
- Create: `tests/utils/geo.test.js`
- Create: `tests/utils/format.test.js`

- [ ] **Step 1: Write geo.js tests**

Create `tests/utils/geo.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { toRadians, toDegrees, haversineDistance, calculateElevation } from '../../src/utils/geo.js'

describe('toRadians / toDegrees', () => {
  it('converts 180° to π', () => expect(toRadians(180)).toBeCloseTo(Math.PI))
  it('converts π to 180°', () => expect(toDegrees(Math.PI)).toBeCloseTo(180))
  it('round-trips', () => expect(toDegrees(toRadians(45))).toBeCloseTo(45))
})

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0)
  })
  it('New York to London ≈ 5570 km', () => {
    const d = haversineDistance(40.7128, -74.006, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(5500)
    expect(d).toBeLessThan(5700)
  })
})

describe('calculateElevation', () => {
  it('returns near 90° for satellite directly overhead', () => {
    const el = calculateElevation(0, 0, 0, 0, 400)
    expect(el).toBeGreaterThan(85)
  })
  it('returns negative for satellite below horizon', () => {
    const el = calculateElevation(0, 0, 89, 0, 400)
    expect(el).toBeLessThan(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `../../src/utils/geo.js` not found.

- [ ] **Step 3: Implement geo.js**

Create `src/utils/geo.js`:
```javascript
const EARTH_RADIUS_KM = 6371

export function toRadians(deg) {
  return (deg * Math.PI) / 180
}

export function toDegrees(rad) {
  return (rad * 180) / Math.PI
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Returns elevation angle in degrees from observer to satellite.
// observerLat/Lon in degrees, satLat/Lon in degrees, satAlt in km.
export function calculateElevation(observerLat, observerLon, satLat, satLon, satAlt) {
  const d = haversineDistance(observerLat, observerLon, satLat, satLon)
  const earthAngle = d / EARTH_RADIUS_KM // radians
  // Slant range from observer to satellite
  const slant = Math.sqrt(
    EARTH_RADIUS_KM ** 2 + (EARTH_RADIUS_KM + satAlt) ** 2 -
    2 * EARTH_RADIUS_KM * (EARTH_RADIUS_KM + satAlt) * Math.cos(earthAngle)
  )
  // Elevation angle via law of sines
  const sinEl = ((EARTH_RADIUS_KM + satAlt) * Math.sin(earthAngle)) / slant - Math.sin(earthAngle)
  return toDegrees(Math.asin(
    ((EARTH_RADIUS_KM + satAlt) * Math.cos(earthAngle) - EARTH_RADIUS_KM) / slant
  ))
}
```

- [ ] **Step 4: Write format.js tests**

Create `tests/utils/format.test.js`:
```javascript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../../src/utils/format.js'

describe('formatAlt', () => {
  it('formats km with one decimal', () => expect(formatAlt(408.5)).toBe('408.5 km'))
  it('rounds correctly', () => expect(formatAlt(408.567)).toBe('408.6 km'))
})

describe('formatVelocity', () => {
  it('formats km/s with two decimals', () => expect(formatVelocity(7.66)).toBe('7.66 km/s'))
})

describe('formatCoord', () => {
  it('formats positive lat as N', () => expect(formatCoord(45.1, 'lat')).toBe('45.10°N'))
  it('formats negative lat as S', () => expect(formatCoord(-33.4, 'lat')).toBe('33.40°S'))
  it('formats positive lon as E', () => expect(formatCoord(90.5, 'lon')).toBe('90.50°E'))
  it('formats negative lon as W', () => expect(formatCoord(-74.0, 'lon')).toBe('74.00°W'))
})

describe('formatTLEAge', () => {
  it('shows hours when less than 48h old', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatTLEAge(twoHoursAgo)).toBe('2h old')
  })
  it('shows days when 2+ days old', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000)
    expect(formatTLEAge(threeDaysAgo)).toBe('3d old')
  })
})
```

- [ ] **Step 5: Implement format.js**

Create `src/utils/format.js`:
```javascript
export function formatAlt(km) {
  return `${km.toFixed(1)} km`
}

export function formatVelocity(kms) {
  return `${kms.toFixed(2)} km/s`
}

export function formatCoord(value, type) {
  const abs = Math.abs(value).toFixed(2)
  if (type === 'lat') return `${abs}°${value >= 0 ? 'N' : 'S'}`
  return `${abs}°${value >= 0 ? 'E' : 'W'}`
}

export function formatTLEAge(epoch) {
  const ageMs = Date.now() - epoch.getTime()
  const hours = Math.floor(ageMs / (3600 * 1000))
  if (hours < 48) return `${hours}h old`
  const days = Math.floor(hours / 24)
  return `${days}d old`
}

export function formatDate(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}
```

- [ ] **Step 6: Run tests to confirm all pass**

```bash
npm test
```
Expected: All geo + format tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/ tests/utils/
git commit -m "feat: add geo and format utility functions with tests"
```

---

### Task 3: Satellite Categories

**Files:**
- Create: `src/data/categories.js`
- Create: `tests/data/categories.test.js`

- [ ] **Step 1: Write categories tests**

Create `tests/data/categories.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { classifySatellite, getOrbitRegime, CATEGORY_COLORS, CATEGORIES } from '../../src/data/categories.js'

describe('classifySatellite', () => {
  it('classifies ISS as stations', () => {
    expect(classifySatellite({ name: 'ISS (ZARYA)', noradId: 25544 })).toBe('stations')
  })
  it('classifies Tiangong as stations', () => {
    expect(classifySatellite({ name: 'CSS (TIANHE)', noradId: 48274 })).toBe('stations')
  })
  it('classifies Starlink as starlink', () => {
    expect(classifySatellite({ name: 'STARLINK-1234', noradId: 44235 })).toBe('starlink')
  })
  it('classifies NOAA as weather', () => {
    expect(classifySatellite({ name: 'NOAA 19', noradId: 33591 })).toBe('weather')
  })
  it('classifies GOES as weather', () => {
    expect(classifySatellite({ name: 'GOES 18', noradId: 51850 })).toBe('weather')
  })
  it('classifies GPS satellite as navigation', () => {
    expect(classifySatellite({ name: 'GPS BIIF-1  (PRN 25)', noradId: 36585 })).toBe('navigation')
  })
  it('classifies GLONASS as navigation', () => {
    expect(classifySatellite({ name: 'GLONASS-M 756', noradId: 32276 })).toBe('navigation')
  })
  it('classifies debris', () => {
    expect(classifySatellite({ name: 'FENGYUN 1C DEB', noradId: 29228 })).toBe('debris')
  })
  it('classifies rocket body as debris', () => {
    expect(classifySatellite({ name: 'CZ-3B R/B', noradId: 40938 })).toBe('debris')
  })
  it('defaults unknown to other', () => {
    expect(classifySatellite({ name: 'MYSTERY SAT 1', noradId: 99999 })).toBe('other')
  })
})

describe('getOrbitRegime', () => {
  it('LEO below 2000km', () => expect(getOrbitRegime(400)).toBe('LEO'))
  it('MEO between 2000–35000km', () => expect(getOrbitRegime(20200)).toBe('MEO'))
  it('GEO near 35786km', () => expect(getOrbitRegime(35786)).toBe('GEO'))
  it('HEO above 36000km', () => expect(getOrbitRegime(50000)).toBe('HEO'))
})

describe('CATEGORY_COLORS', () => {
  it('has a color for every category', () => {
    CATEGORIES.forEach(cat => {
      expect(CATEGORY_COLORS[cat]).toBeDefined()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `../../src/data/categories.js` not found.

- [ ] **Step 3: Implement categories.js**

Create `src/data/categories.js`:
```javascript
export const CATEGORIES = ['stations', 'weather', 'navigation', 'starlink', 'communications', 'science', 'debris', 'other']

export const CATEGORY_COLORS = {
  stations:       '#ffffff',
  weather:        '#4caf50',
  navigation:     '#4a90d9',
  starlink:       '#9c27b0',
  communications: '#ff9800',
  science:        '#00bcd4',
  debris:         '#555e6e',
  other:          '#4a90d9',
}

export const CATEGORY_LABELS = {
  stations:       'Stations',
  weather:        'Weather',
  navigation:     'Navigation',
  starlink:       'Starlink',
  communications: 'Comms',
  science:        'Science',
  debris:         'Debris',
  other:          'Other',
}

export function classifySatellite({ name, noradId }) {
  const n = name.toUpperCase()

  if (noradId === 25544 || noradId === 48274 || n.includes('ISS') || n.includes('TIANHE') || n.includes('CSS (')) {
    return 'stations'
  }
  if (n.includes('STARLINK')) return 'starlink'
  if (n.includes('DEB') || n.includes('DEBRIS') || n.includes('R/B') || n.includes('ROCKET BODY')) {
    return 'debris'
  }
  if (
    n.includes('NOAA') || n.includes('GOES') || n.includes('METEOSAT') ||
    n.includes('METEOR-') || n.includes('FENGYUN') || n.includes('HIMAWARI') ||
    n.includes('DMSP') || n.includes('ELECTRO-')
  ) return 'weather'
  if (
    n.includes('GPS') || n.includes('NAVSTAR') || n.includes('GLONASS') ||
    n.includes('GALILEO') || n.includes('BEIDOU') || n.includes('IRNSS') ||
    n.includes('QZSS')
  ) return 'navigation'
  if (
    n.includes('INTELSAT') || n.includes('SES-') || n.includes('EUTELSAT') ||
    n.includes('IRIDIUM') || n.includes('GLOBALSTAR') || n.includes('INMARSAT') ||
    n.includes('VIASAT') || n.includes('HUGHES')
  ) return 'communications'
  if (
    n.includes('TERRA') || n.includes('AQUA') || n.includes('AURA') ||
    n.includes('HUBBLE') || n.includes('CHANDRA') || n.includes('SWIFT') ||
    n.includes('SENTINEL') || n.includes('LANDSAT') || n.includes('ICESat')
  ) return 'science'

  return 'other'
}

// altKm: current altitude in km
export function getOrbitRegime(altKm) {
  if (altKm < 2000) return 'LEO'
  if (altKm < 35000) return 'MEO'
  if (altKm < 36500) return 'GEO'
  return 'HEO'
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test
```
Expected: All category tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/categories.js tests/data/categories.test.js
git commit -m "feat: add satellite classification by name/NORAD ID"
```

---

### Task 4: Propagator

**Files:**
- Create: `src/engine/propagator.js`
- Create: `tests/engine/propagator.test.js`

- [ ] **Step 1: Write propagator tests**

Create `tests/engine/propagator.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { createSatrec, propagatePosition } from '../../src/engine/propagator.js'

// ISS TLE (approximate — valid for testing SGP4 math)
const TLE1 = '1 25544U 98067A   26084.50000000  .00010000  00000-0  17000-3 0  9999'
const TLE2 = '2 25544  51.6400 100.0000 0002000  90.0000 270.0000 15.48000000000000'

describe('createSatrec', () => {
  it('returns satrec with no error for valid TLE', () => {
    const satrec = createSatrec(TLE1, TLE2)
    expect(satrec).toBeDefined()
    expect(satrec.error).toBe(0)
  })
})

describe('propagatePosition', () => {
  it('returns lat/lon/alt/velocity for valid satrec', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const result = propagatePosition(satrec, new Date('2026-03-26T12:00:00Z'))
    expect(result).not.toBeNull()
    expect(result.lat).toBeGreaterThanOrEqual(-90)
    expect(result.lat).toBeLessThanOrEqual(90)
    expect(result.lon).toBeGreaterThanOrEqual(-180)
    expect(result.lon).toBeLessThanOrEqual(180)
    expect(result.alt).toBeGreaterThan(200)
    expect(result.alt).toBeLessThan(500)
    expect(result.velocity).toBeGreaterThan(7)
    expect(result.velocity).toBeLessThan(8)
  })

  it('returns null when satrec has error flag set', () => {
    const satrec = createSatrec(TLE1, TLE2)
    satrec.error = 1
    expect(propagatePosition(satrec, new Date())).toBeNull()
  })

  it('two propagations at different times yield different positions', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const t1 = new Date('2026-03-26T12:00:00Z')
    const t2 = new Date('2026-03-26T12:30:00Z') // 30 min later
    const p1 = propagatePosition(satrec, t1)
    const p2 = propagatePosition(satrec, t2)
    expect(p1.lat).not.toBeCloseTo(p2.lat, 1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `../../src/engine/propagator.js` not found.

- [ ] **Step 3: Implement propagator.js**

Create `src/engine/propagator.js`:
```javascript
import * as satellite from 'satellite.js'

export function createSatrec(tleLine1, tleLine2) {
  return satellite.twoline2satrec(tleLine1, tleLine2)
}

// Returns { lat, lon, alt, velocity } or null if propagation fails.
// lat/lon in degrees, alt in km, velocity in km/s.
export function propagatePosition(satrec, date) {
  if (satrec.error !== 0) return null

  const pv = satellite.propagate(satrec, date)
  if (!pv || !pv.position || typeof pv.position !== 'object') return null

  const gmst = satellite.gstime(date)
  const geo = satellite.eciToGeodetic(pv.position, gmst)

  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    alt: geo.height,
    velocity: Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2),
  }
}

// Returns array of {lat, lon} for ground track over one full orbit.
// numPoints: number of sample points around the orbit.
export function computeGroundTrack(satrec, referenceDate, numPoints = 180) {
  // ISS period ≈ 92 min; use minutes-per-rev from satrec
  const periodMin = (2 * Math.PI) / satrec.no  // satrec.no is rad/min
  const stepMs = (periodMin * 60 * 1000) / numPoints
  const points = []

  for (let i = 0; i <= numPoints; i++) {
    const date = new Date(referenceDate.getTime() - (numPoints / 2 - i) * stepMs)
    const pos = propagatePosition(satrec, date)
    if (pos) points.push({ lat: pos.lat, lon: pos.lon, future: i > numPoints / 2 })
  }

  return points
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test
```
Expected: All propagator tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/propagator.js tests/engine/propagator.test.js
git commit -m "feat: add SGP4 propagator wrapper with ground track computation"
```

---

### Task 5: Simulation Clock

**Files:**
- Create: `src/engine/clock.js`
- Create: `tests/engine/clock.test.js`

- [ ] **Step 1: Write clock tests**

Create `tests/engine/clock.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { Clock } from '../../src/engine/clock.js'

describe('Clock', () => {
  let clock

  beforeEach(() => {
    clock = new Clock()
  })

  it('initializes paused', () => {
    expect(clock.isPaused()).toBe(true)
  })

  it('initializes near current real time', () => {
    const delta = Math.abs(clock.getTime().getTime() - Date.now())
    expect(delta).toBeLessThan(500)
  })

  it('defaults to speed 1', () => {
    expect(clock.getSpeed()).toBe(1)
  })

  it('play/pause toggles paused state', () => {
    clock.play()
    expect(clock.isPaused()).toBe(false)
    clock.pause()
    expect(clock.isPaused()).toBe(true)
  })

  it('setSpeed updates speed', () => {
    clock.setSpeed(100)
    expect(clock.getSpeed()).toBe(100)
  })

  it('resetToNow sets time close to real time', () => {
    clock.setTime(new Date('2020-01-01'))
    clock.resetToNow()
    const delta = Math.abs(clock.getTime().getTime() - Date.now())
    expect(delta).toBeLessThan(500)
  })

  it('setTime overrides current time', () => {
    const t = new Date('2025-06-15T00:00:00Z')
    clock.setTime(t)
    expect(clock.getTime().toISOString()).toBe(t.toISOString())
  })

  it('tick advances sim time by speed * realDeltaMs', () => {
    clock.setSpeed(10)
    clock.play()
    const t0 = clock.getTime().getTime()
    clock.tick(1000) // simulate 1000ms real time elapsed
    const t1 = clock.getTime().getTime()
    expect(t1 - t0).toBeCloseTo(10000, -1) // 10x speed → 10000ms sim time
  })

  it('tick does nothing when paused', () => {
    const t0 = clock.getTime().getTime()
    clock.tick(1000)
    expect(clock.getTime().getTime()).toBe(t0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `../../src/engine/clock.js` not found.

- [ ] **Step 3: Implement clock.js**

Create `src/engine/clock.js`:
```javascript
export class Clock {
  #simTime    // current simulation Date
  #paused = true
  #speed = 1  // multiplier
  #lastReal   // real timestamp of last tick call

  constructor() {
    this.#simTime = new Date()
    this.#lastReal = performance.now()
  }

  getTime() {
    return new Date(this.#simTime)
  }

  setTime(date) {
    this.#simTime = new Date(date)
    this.#lastReal = performance.now()
  }

  isPaused() {
    return this.#paused
  }

  getSpeed() {
    return this.#speed
  }

  play() {
    this.#paused = false
    this.#lastReal = performance.now()
  }

  pause() {
    this.#paused = true
  }

  setSpeed(multiplier) {
    this.#speed = multiplier
  }

  resetToNow() {
    this.#simTime = new Date()
    this.#lastReal = performance.now()
  }

  // Call each animation frame with current real timestamp (performance.now()).
  // Returns current sim time.
  tick(realDeltaMs) {
    if (!this.#paused) {
      this.#simTime = new Date(this.#simTime.getTime() + realDeltaMs * this.#speed)
    }
    return new Date(this.#simTime)
  }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test
```
Expected: All clock tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/clock.js tests/engine/clock.test.js
git commit -m "feat: add simulation clock with speed multiplier and play/pause"
```

---

### Task 6: TLE Loader

**Files:**
- Create: `src/data/tleLoader.js`
- Create: `tests/data/tleLoader.test.js`

- [ ] **Step 1: Write tleLoader tests**

Create `tests/data/tleLoader.test.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseTLEData, CACHE_KEY } from '../../src/data/tleLoader.js'

const SAMPLE_OMM = [
  {
    OBJECT_NAME: 'ISS (ZARYA)',
    NORAD_CAT_ID: '25544',
    EPOCH: '2026-03-24T12:00:00.000000',
    TLE_LINE1: '1 25544U 98067A   26084.50000000  .00010000  00000-0  17000-3 0  9999',
    TLE_LINE2: '2 25544  51.6400 100.0000 0002000  90.0000 270.0000 15.48000000000000',
  }
]

describe('parseTLEData', () => {
  it('converts OMM records to satellite objects', () => {
    const result = parseTLEData(SAMPLE_OMM)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ISS (ZARYA)')
    expect(result[0].noradId).toBe(25544)
    expect(result[0].satrec).toBeDefined()
    expect(result[0].satrec.error).toBe(0)
    expect(result[0].epoch).toBeInstanceOf(Date)
    expect(result[0].category).toBe('stations')
  })

  it('skips records with invalid TLE lines', () => {
    const badData = [{
      OBJECT_NAME: 'BAD SAT',
      NORAD_CAT_ID: '00001',
      EPOCH: '2026-03-24T12:00:00.000000',
      TLE_LINE1: 'not a tle line 1',
      TLE_LINE2: 'not a tle line 2',
    }]
    const result = parseTLEData(badData)
    expect(result).toHaveLength(0)
  })

  it('skips records missing TLE lines', () => {
    const noLines = [{
      OBJECT_NAME: 'PARTIAL SAT',
      NORAD_CAT_ID: '00002',
      EPOCH: '2026-03-24T12:00:00.000000',
    }]
    expect(parseTLEData(noLines)).toHaveLength(0)
  })
})

describe('CACHE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof CACHE_KEY).toBe('string')
    expect(CACHE_KEY.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `../../src/data/tleLoader.js` not found.

- [ ] **Step 3: Implement tleLoader.js**

Create `src/data/tleLoader.js`:
```javascript
import { createSatrec } from '../engine/propagator.js'
import { classifySatellite } from './categories.js'

export const CACHE_KEY = 'orbitview_tle_v1'
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const SOURCES = [
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
  'https://api.keeptrack.space/v2/sats',
]

export function parseTLEData(rawRecords) {
  const results = []
  for (const rec of rawRecords) {
    const line1 = rec.TLE_LINE1
    const line2 = rec.TLE_LINE2
    if (!line1 || !line2) continue

    const satrec = createSatrec(line1.trim(), line2.trim())
    if (satrec.error !== 0) continue

    const noradId = parseInt(rec.NORAD_CAT_ID, 10)
    const sat = {
      name: rec.OBJECT_NAME,
      noradId,
      satrec,
      epoch: new Date(rec.EPOCH),
      category: classifySatellite({ name: rec.OBJECT_NAME, noradId }),
    }
    results.push(sat)
  }
  return results
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function saveToCache(rawRecords) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rawRecords, timestamp: Date.now() }))
  } catch {
    // localStorage quota exceeded — skip caching
  }
}

async function fetchFromSource(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Returns parsed satellite array. Throws if all sources fail.
export async function fetchTLEs(onProgress) {
  const cached = loadFromCache()
  if (cached) {
    onProgress?.('cache')
    return parseTLEData(cached)
  }

  let lastError
  for (const url of SOURCES) {
    try {
      onProgress?.('fetching')
      const raw = await fetchFromSource(url)
      saveToCache(raw)
      onProgress?.('parsing')
      return parseTLEData(raw)
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`All TLE sources failed: ${lastError?.message}`)
}

export function getCacheAge() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { timestamp } = JSON.parse(raw)
    return new Date(timestamp)
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test
```
Expected: All tleLoader tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/tleLoader.js tests/data/tleLoader.test.js
git commit -m "feat: add TLE loader with CelesTrak fetch, OMM parsing, localStorage cache"
```

---

### Task 7: Map Manager

**Files:**
- Create: `src/map/mapManager.js`

No unit tests for this file — it creates a Leaflet DOM element. Visual verification in browser.

- [ ] **Step 1: Create mapManager.js**

Create `src/map/mapManager.js`:
```javascript
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export function initMap(containerId) {
  const map = L.map(containerId, {
    center: [20, 0],
    zoom: 2,
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
  })

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 18,
    minZoom: 1,
  }).addTo(map)

  return map
}
```

- [ ] **Step 2: Delete the Vite template main.js and replace with map smoke test**

Replace `src/main.js` entirely:
```javascript
import { initMap } from './map/mapManager.js'

const map = initMap('map')
console.log('Map initialized', map)
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Dark Leaflet map visible in the browser, centered on the Atlantic, with CARTO dark tiles.

- [ ] **Step 4: Commit**

```bash
git add src/map/mapManager.js src/main.js
git commit -m "feat: add Leaflet map with CartoDB dark theme"
```

---

### Task 8: Satellite Canvas Layer

**Files:**
- Create: `src/map/satelliteLayer.js`

No unit tests — Canvas/Leaflet DOM integration. Verified visually + through integration in Task 9.

- [ ] **Step 1: Create satelliteLayer.js**

Create `src/map/satelliteLayer.js`:
```javascript
import L from 'leaflet'
import { CATEGORY_COLORS } from '../data/categories.js'

const DOT_RADIUS = 2.5
const SELECTED_RING_RADIUS = 6
const HIT_RADIUS = 8 // px radius for click/hover detection

export function createSatelliteLayer(map, onSelect, onHover) {
  let satellites = []        // array of sat objects with .position
  let selectedId = null
  let hoveredId = null
  let canvas, ctx

  function resize() {
    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y
  }

  function projectToCanvas(lat, lon) {
    const point = map.latLngToContainerPoint(L.latLng(lat, lon))
    return { x: point.x, y: point.y }
  }

  function render() {
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const sat of satellites) {
      if (!sat.position) continue
      const { x, y } = projectToCanvas(sat.position.lat, sat.position.lon)

      // Skip dots outside canvas bounds + small buffer
      if (x < -10 || x > canvas.width + 10 || y < -10 || y > canvas.height + 10) continue

      const color = CATEGORY_COLORS[sat.category] ?? CATEGORY_COLORS.other
      const isSelected = sat.noradId === selectedId
      const isHovered = sat.noradId === hoveredId

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(x, y, SELECTED_RING_RADIUS, 0, 2 * Math.PI)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(x, y, isHovered ? DOT_RADIUS + 1 : DOT_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.globalAlpha = isHovered || isSelected ? 1 : 0.8
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  function findSatAt(canvasX, canvasY) {
    let closest = null
    let closestDist = HIT_RADIUS

    for (const sat of satellites) {
      if (!sat.position) continue
      const { x, y } = projectToCanvas(sat.position.lat, sat.position.lon)
      const dist = Math.hypot(x - canvasX, y - canvasY)
      if (dist < closestDist) {
        closest = sat
        closestDist = dist
      }
    }
    return closest
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect()
    const sat = findSatAt(e.clientX - rect.left, e.clientY - rect.top)
    selectedId = sat ? sat.noradId : null
    onSelect?.(sat ?? null)
    render()
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect()
    const sat = findSatAt(e.clientX - rect.left, e.clientY - rect.top)
    const newId = sat ? sat.noradId : null
    if (newId !== hoveredId) {
      hoveredId = newId
      canvas.style.cursor = sat ? 'pointer' : ''
      onHover?.(sat ?? null, e.clientX, e.clientY)
      render()
    }
  }

  // Leaflet layer object
  const layer = {
    add() {
      canvas = document.createElement('canvas')
      canvas.className = 'satellite-layer'
      canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:400;'
      map.getContainer().appendChild(canvas)
      ctx = canvas.getContext('2d')
      resize()

      map.on('resize', resize)
      map.on('move zoom', render)
      canvas.addEventListener('click', handleClick)
      canvas.addEventListener('mousemove', handleMouseMove)
    },
    remove() {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousemove', handleMouseMove)
      map.off('resize', resize)
      map.off('move zoom', render)
      canvas.remove()
    },
    update(newSatellites) {
      satellites = newSatellites
      render()
    },
    setSelected(noradId) {
      selectedId = noradId
      render()
    },
    render,
  }

  layer.add()
  return layer
}
```

- [ ] **Step 2: Commit**

```bash
git add src/map/satelliteLayer.js
git commit -m "feat: add Canvas satellite layer with hit-testing and selection ring"
```

---

### Task 9: Phase 1 Bootstrap — App Entry Point

**Files:**
- Modify: `src/main.js`

This wires everything together for the first working version: fetch TLEs, render on map, animate.

- [ ] **Step 1: Write main.js**

Replace `src/main.js`:
```javascript
import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { fetchTLEs, getCacheAge } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { formatTLEAge, formatDate } from './utils/format.js'

const map = initMap('map')
const clock = new Clock()
let satellites = []
let satLayer = null

const satCountEl = document.getElementById('sat-count')
const simTimeEl = document.getElementById('sim-time')
const freshnessEl = document.getElementById('data-freshness')

function updateStatus() {
  const visible = satellites.filter(s => s.position).length
  satCountEl.textContent = `${visible.toLocaleString()} satellites`

  const cacheAge = getCacheAge()
  freshnessEl.textContent = cacheAge ? `TLE data: ${formatTLEAge(cacheAge)}` : ''
}

let lastRaf = performance.now()
function animate(now) {
  const delta = now - lastRaf
  lastRaf = now

  const simTime = clock.tick(delta)
  simTimeEl.textContent = formatDate(simTime)

  // Propagate all satellite positions to current sim time
  for (const sat of satellites) {
    sat.position = propagatePosition(sat.satrec, simTime)
  }

  satLayer?.update(satellites)
  requestAnimationFrame(animate)
}

async function init() {
  satCountEl.textContent = 'Loading TLEs…'
  try {
    satellites = await fetchTLEs((status) => {
      if (status === 'fetching') satCountEl.textContent = 'Fetching TLEs…'
      if (status === 'parsing') satCountEl.textContent = 'Parsing…'
      if (status === 'cache')   satCountEl.textContent = 'Loading from cache…'
    })

    satLayer = createSatelliteLayer(map, null, null)
    updateStatus()
    clock.play()
    requestAnimationFrame(animate)
  } catch (err) {
    satCountEl.textContent = 'Failed to load TLEs'
    console.error(err)
  }
}

init()
```

- [ ] **Step 2: Run dev server and verify Phase 1**

```bash
npm run dev
```
Expected:
- Page loads, "Fetching TLEs…" appears in header
- After fetch completes, dots appear on the dark map
- Satellite count shows in header
- Bottom bar shows advancing UTC time
- Dots move in real time

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: Phase 1 complete — live satellite map with TLE fetch and animation"
```

---

## Phase 2: Interaction + UI

### Task 10: Info Panel + Satellite Selection

**Files:**
- Create: `src/ui/infoPanel.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create infoPanel.js**

Create `src/ui/infoPanel.js`:
```javascript
import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../utils/format.js'
import { getOrbitRegime } from '../data/categories.js'

const panel = document.getElementById('info-panel')

export function showInfoPanel(sat, position) {
  if (!sat || !position) {
    hideInfoPanel()
    return
  }

  const regime = getOrbitRegime(position.alt)
  const ageText = formatTLEAge(sat.epoch)
  const ageWarning = (Date.now() - sat.epoch.getTime()) > 3 * 24 * 3600 * 1000
    ? '<span class="age-warning">⚠ Stale TLE</span>'
    : ''

  panel.innerHTML = `
    <div class="info-header">
      <h2 class="sat-name">${sat.name}</h2>
      <button id="close-panel" aria-label="Close panel">✕</button>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">NORAD ID</span>
        <span class="value mono">${sat.noradId}</span>
      </div>
      <div class="info-row">
        <span class="label">Category</span>
        <span class="value">${sat.category}</span>
      </div>
      <div class="info-row">
        <span class="label">Orbit</span>
        <span class="value">${regime}</span>
      </div>
    </div>
    <div class="info-section">
      <h3>Current Position</h3>
      <div class="info-row">
        <span class="label">Latitude</span>
        <span class="value mono">${formatCoord(position.lat, 'lat')}</span>
      </div>
      <div class="info-row">
        <span class="label">Longitude</span>
        <span class="value mono">${formatCoord(position.lon, 'lon')}</span>
      </div>
      <div class="info-row">
        <span class="label">Altitude</span>
        <span class="value mono">${formatAlt(position.alt)}</span>
      </div>
      <div class="info-row">
        <span class="label">Velocity</span>
        <span class="value mono">${formatVelocity(position.velocity)}</span>
      </div>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">TLE Age</span>
        <span class="value mono">${ageText} ${ageWarning}</span>
      </div>
    </div>
  `

  document.getElementById('close-panel')?.addEventListener('click', () => {
    hideInfoPanel()
    window.orbitview?.onDeselect?.()
  })

  panel.classList.remove('hidden')
}

export function hideInfoPanel() {
  panel.classList.add('hidden')
  panel.innerHTML = ''
}

export function updateInfoPanel(sat, position) {
  if (panel.classList.contains('hidden')) return
  showInfoPanel(sat, position)
}
```

- [ ] **Step 2: Add info panel CSS to main.css**

Append to `src/styles/main.css`:
```css
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.sat-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  line-height: 1.3;
  flex: 1;
}

#close-panel {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 0 0 8px;
}
#close-panel:hover { color: var(--color-text); }

.info-section {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--bg-panel-border);
  padding-bottom: 12px;
}

.info-section:last-child { border-bottom: none; }

.info-section h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.info-row .label { color: var(--color-text-muted); font-size: 12px; }
.info-row .value { font-size: 12px; }
.info-row .mono { font-family: 'Courier New', monospace; }

.age-warning { color: var(--color-danger); font-size: 11px; }
```

- [ ] **Step 3: Wire info panel into main.js**

Replace the `import` section and `init()` function in `src/main.js`:
```javascript
import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { fetchTLEs, getCacheAge } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { formatTLEAge, formatDate } from './utils/format.js'
import { showInfoPanel, hideInfoPanel, updateInfoPanel } from './ui/infoPanel.js'

const map = initMap('map')
const clock = new Clock()
let satellites = []
let satLayer = null
let selectedSat = null

const satCountEl = document.getElementById('sat-count')
const simTimeEl = document.getElementById('sim-time')
const freshnessEl = document.getElementById('data-freshness')

// Expose deselect callback for close button in info panel
window.orbitview = {
  onDeselect: () => {
    selectedSat = null
    satLayer?.setSelected(null)
  }
}

function updateStatus() {
  const visible = satellites.filter(s => s.position).length
  satCountEl.textContent = `${visible.toLocaleString()} satellites`
  const cacheAge = getCacheAge()
  freshnessEl.textContent = cacheAge ? `TLE data: ${formatTLEAge(cacheAge)}` : ''
}

function handleSelect(sat) {
  selectedSat = sat
  if (sat) {
    showInfoPanel(sat, sat.position)
  } else {
    hideInfoPanel()
  }
}

let lastRaf = performance.now()
function animate(now) {
  const delta = now - lastRaf
  lastRaf = now
  const simTime = clock.tick(delta)
  simTimeEl.textContent = formatDate(simTime)

  for (const sat of satellites) {
    sat.position = propagatePosition(sat.satrec, simTime)
  }

  if (selectedSat) updateInfoPanel(selectedSat, selectedSat.position)
  satLayer?.update(satellites)
  requestAnimationFrame(animate)
}

async function init() {
  satCountEl.textContent = 'Loading TLEs…'
  try {
    satellites = await fetchTLEs((status) => {
      if (status === 'fetching') satCountEl.textContent = 'Fetching TLEs…'
      if (status === 'parsing') satCountEl.textContent = 'Parsing…'
      if (status === 'cache')   satCountEl.textContent = 'Loading from cache…'
    })

    satLayer = createSatelliteLayer(map, handleSelect, null)
    updateStatus()
    clock.play()
    requestAnimationFrame(animate)
  } catch (err) {
    satCountEl.textContent = 'Failed to load TLEs'
    console.error(err)
  }
}

init()
```

- [ ] **Step 4: Verify in browser**

Click a satellite dot → info panel slides in from the right with name, NORAD ID, orbit regime, position, altitude, velocity, TLE age. Click ✕ → panel closes.

- [ ] **Step 5: Commit**

```bash
git add src/ui/infoPanel.js src/main.js src/styles/main.css
git commit -m "feat: add satellite info panel with click selection"
```

---

### Task 11: Ground Track

**Files:**
- Create: `src/map/groundTrack.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create groundTrack.js**

Create `src/map/groundTrack.js`:
```javascript
import L from 'leaflet'
import { computeGroundTrack } from '../engine/propagator.js'

let pastLine = null
let futureLine = null

const PAST_STYLE = { color: '#4a90d9', weight: 1.2, opacity: 0.5, dashArray: null }
const FUTURE_STYLE = { color: '#4a90d9', weight: 1.2, opacity: 0.35, dashArray: '4 4' }

function splitAtAntimeridian(points) {
  // Split track into segments where longitude jumps > 180° (antimeridian crossing)
  const segments = []
  let current = []
  for (let i = 0; i < points.length; i++) {
    current.push(points[i])
    if (i < points.length - 1) {
      const lonDiff = Math.abs(points[i + 1].lon - points[i].lon)
      if (lonDiff > 180) {
        segments.push(current)
        current = []
      }
    }
  }
  if (current.length) segments.push(current)
  return segments
}

export function renderGroundTrack(map, sat, simTime) {
  clearGroundTrack(map)
  const trackPoints = computeGroundTrack(sat.satrec, simTime)

  const past = trackPoints.filter(p => !p.future)
  const future = trackPoints.filter(p => p.future)

  function segmentsToLatLng(points) {
    return splitAtAntimeridian(points).map(seg =>
      seg.map(p => [p.lat, p.lon])
    )
  }

  const pastSegments = segmentsToLatLng(past)
  const futureSegments = segmentsToLatLng(future)

  // Use L.polyline with an array of arrays for multi-segment lines
  pastLine = L.polyline(pastSegments, PAST_STYLE).addTo(map)
  futureLine = L.polyline(futureSegments, FUTURE_STYLE).addTo(map)
}

export function clearGroundTrack(map) {
  pastLine?.remove()
  futureLine?.remove()
  pastLine = null
  futureLine = null
}
```

- [ ] **Step 2: Wire ground track into main.js**

Add the import at the top of `src/main.js`:
```javascript
import { renderGroundTrack, clearGroundTrack } from './map/groundTrack.js'
```

Update `handleSelect`:
```javascript
function handleSelect(sat) {
  selectedSat = sat
  if (sat) {
    showInfoPanel(sat, sat.position)
    renderGroundTrack(map, sat, clock.getTime())
  } else {
    hideInfoPanel()
    clearGroundTrack(map)
  }
}
```

Update `window.orbitview.onDeselect`:
```javascript
window.orbitview = {
  onDeselect: () => {
    selectedSat = null
    satLayer?.setSelected(null)
    clearGroundTrack(map)
  }
}
```

Add ground track re-render in `animate` when clock speed > 1 (so track stays accurate during time-warp):
```javascript
// Inside animate(), after simTime is computed:
if (selectedSat && clock.getSpeed() > 1) {
  renderGroundTrack(map, selectedSat, simTime)
}
```

- [ ] **Step 3: Verify in browser**

Click a satellite → blue ground track appears (solid past, dashed future). Track wraps around the antimeridian without zigzag artifacts.

- [ ] **Step 4: Commit**

```bash
git add src/map/groundTrack.js src/main.js
git commit -m "feat: add orbital ground track with past/future styling and antimeridian handling"
```

---

### Task 12: Hover Tooltip

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Wire tooltip into main.js**

The `#tooltip` div is already in `index.html`. Add the hover handler in `init()` when creating the satellite layer:

Replace the `createSatelliteLayer` call in `init()`:
```javascript
const tooltip = document.getElementById('tooltip')

satLayer = createSatelliteLayer(map, handleSelect, (sat, clientX, clientY) => {
  if (sat) {
    const alt = sat.position ? ` · ${sat.position.alt.toFixed(0)} km` : ''
    tooltip.textContent = `${sat.name}${alt}`
    tooltip.style.left = `${clientX + 14}px`
    tooltip.style.top = `${clientY - 8}px`
    tooltip.classList.remove('hidden')
  } else {
    tooltip.classList.add('hidden')
  }
})
```

- [ ] **Step 2: Verify in browser**

Hover over a satellite dot → tooltip appears with name and altitude. Mouse off → tooltip disappears.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add hover tooltip showing satellite name and altitude"
```

---

### Task 13: Search Bar

**Files:**
- Create: `src/ui/searchBar.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create searchBar.js**

Create `src/ui/searchBar.js`:
```javascript
export function createSearchBar(container, onSearch) {
  container.innerHTML = `
    <div class="search-wrap">
      <input
        id="sat-search"
        type="search"
        placeholder="Search satellites…"
        aria-label="Search satellites by name or NORAD ID"
        autocomplete="off"
      />
    </div>
  `

  const input = container.querySelector('#sat-search')

  input.addEventListener('input', () => {
    onSearch(input.value.trim().toLowerCase())
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = ''
      onSearch('')
      input.blur()
    }
  })

  return {
    focus: () => input.focus(),
    getValue: () => input.value,
  }
}

// Returns satellites matching query string (case-insensitive substring on name or NORAD ID).
export function filterSatellites(satellites, query) {
  if (!query) return satellites
  return satellites.filter(sat =>
    sat.name.toLowerCase().includes(query) ||
    sat.noradId.toString().includes(query)
  )
}
```

- [ ] **Step 2: Add search bar CSS to main.css**

Append to `src/styles/main.css`:
```css
.search-wrap {
  position: relative;
  flex: 1;
  max-width: 260px;
}

#sat-search {
  width: 100%;
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 12px;
  padding: 5px 10px;
  outline: none;
}
#sat-search::placeholder { color: var(--color-text-muted); }
#sat-search:focus { border-color: var(--color-accent); }
#sat-search::-webkit-search-cancel-button { display: none; }
```

- [ ] **Step 3: Wire search into main.js**

Add import:
```javascript
import { createSearchBar, filterSatellites } from './ui/searchBar.js'
```

Add state variable:
```javascript
let searchQuery = ''
```

In `init()` after satellites are loaded, add:
```javascript
const searchBar = createSearchBar(
  document.getElementById('search-container'),
  (query) => {
    searchQuery = query
  }
)
```

Update `animate()` to pass filtered satellites to the layer:
```javascript
// Replace: satLayer?.update(satellites)
const visible = searchQuery
  ? filterSatellites(satellites, searchQuery)
  : satellites
satLayer?.update(visible)
```

Update `updateStatus` to show filtered count:
```javascript
function updateStatus() {
  const total = satellites.filter(s => s.position).length
  satCountEl.textContent = searchQuery
    ? `${filterSatellites(satellites, searchQuery).length} / ${total.toLocaleString()}`
    : `${total.toLocaleString()} satellites`
  const cacheAge = getCacheAge()
  freshnessEl.textContent = cacheAge ? `TLE data: ${formatTLEAge(cacheAge)}` : ''
}
```

- [ ] **Step 4: Verify in browser**

Type "ISS" in search → only ISS-related satellites visible on map. Type "25544" → narrows to ISS. Clear → all satellites return.

- [ ] **Step 5: Commit**

```bash
git add src/ui/searchBar.js src/main.js src/styles/main.css
git commit -m "feat: add search bar with substring match on name and NORAD ID"
```

---

## Phase 3: Filtering + Time Controls

### Task 14: Filter Panel

**Files:**
- Create: `src/ui/filterPanel.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create filterPanel.js**

Create `src/ui/filterPanel.js`:
```javascript
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/categories.js'

export function createFilterPanel(container, onFilterChange) {
  const activeCategories = new Set(CATEGORIES)

  container.innerHTML = `
    <div class="filter-wrap">
      ${CATEGORIES.map(cat => `
        <button
          class="filter-btn active"
          data-category="${cat}"
          title="${CATEGORY_LABELS[cat]}"
          style="--cat-color: ${CATEGORY_COLORS[cat]}"
        >${CATEGORY_LABELS[cat]}</button>
      `).join('')}
    </div>
  `

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn')
    if (!btn) return

    const cat = btn.dataset.category
    if (activeCategories.has(cat)) {
      activeCategories.delete(cat)
      btn.classList.remove('active')
    } else {
      activeCategories.add(cat)
      btn.classList.add('active')
    }
    onFilterChange(new Set(activeCategories))
  })

  return {
    getActiveCategories: () => new Set(activeCategories),
  }
}

export function applyFilters(satellites, activeCategories) {
  if (activeCategories.size === CATEGORIES.length) return satellites
  return satellites.filter(sat => activeCategories.has(sat.category))
}
```

- [ ] **Step 2: Add filter CSS to main.css**

Append to `src/styles/main.css`:
```css
.filter-wrap {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 3px;
  color: var(--color-text-muted);
  font-size: 10px;
  padding: 3px 7px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s;
}

.filter-btn.active {
  border-color: var(--cat-color);
  color: var(--cat-color);
  background: rgba(255,255,255,0.04);
}

.filter-btn:hover {
  background: rgba(255,255,255,0.1);
}
```

- [ ] **Step 3: Wire filter panel into main.js**

Add import:
```javascript
import { createFilterPanel, applyFilters } from './ui/filterPanel.js'
import { CATEGORIES } from './data/categories.js'
```

Add state:
```javascript
let activeCategories = new Set(CATEGORIES)
```

In `init()` after satellites are loaded:
```javascript
createFilterPanel(
  document.getElementById('filter-container'),
  (newActive) => { activeCategories = newActive }
)
```

Update `animate()` to apply both search and category filters:
```javascript
const filtered = applyFilters(
  searchQuery ? filterSatellites(satellites, searchQuery) : satellites,
  activeCategories
)
satLayer?.update(filtered)
```

- [ ] **Step 4: Verify in browser**

Toggle "Starlink" off → all Starlink dots disappear from map. Toggle "Debris" off → debris disappears. Re-enable → returns.

- [ ] **Step 5: Commit**

```bash
git add src/ui/filterPanel.js src/main.js src/styles/main.css
git commit -m "feat: add category filter panel with per-category toggle"
```

---

### Task 15: Time Controls UI

**Files:**
- Create: `src/ui/timeControls.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create timeControls.js**

Create `src/ui/timeControls.js`:
```javascript
const SPEEDS = [1, 10, 100, 1000]

export function createTimeControls(container, clock) {
  container.innerHTML = `
    <div class="time-controls">
      <button id="play-pause" class="tc-btn" title="Play/Pause (Space)">⏸</button>
      <div class="speed-wrap">
        ${SPEEDS.map(s => `
          <button class="speed-btn${s === 1 ? ' active' : ''}" data-speed="${s}">${s}×</button>
        `).join('')}
      </div>
      <button id="reset-now" class="tc-btn" title="Reset to now">⟳</button>
    </div>
  `

  const playPauseBtn = container.querySelector('#play-pause')
  const speedBtns = container.querySelectorAll('.speed-btn')
  const resetBtn = container.querySelector('#reset-now')

  function syncPlayPause() {
    playPauseBtn.textContent = clock.isPaused() ? '▶' : '⏸'
  }

  playPauseBtn.addEventListener('click', () => {
    if (clock.isPaused()) clock.play()
    else clock.pause()
    syncPlayPause()
  })

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      clock.setSpeed(parseInt(btn.dataset.speed, 10))
      document.getElementById('playback-speed').textContent = `${btn.dataset.speed}×`
    })
  })

  resetBtn.addEventListener('click', () => {
    clock.resetToNow()
    clock.play()
    syncPlayPause()
  })

  syncPlayPause()

  return { syncPlayPause }
}
```

- [ ] **Step 2: Add time controls CSS to main.css**

Append to `src/styles/main.css`:
```css
.time-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tc-btn {
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 13px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tc-btn:hover { background: rgba(255,255,255,0.14); }

.speed-wrap { display: flex; gap: 2px; }

.speed-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: 3px;
  color: var(--color-text-muted);
  font-size: 10px;
  padding: 3px 6px;
  cursor: pointer;
}
.speed-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
```

- [ ] **Step 3: Wire time controls into main.js**

Add import:
```javascript
import { createTimeControls } from './ui/timeControls.js'
```

In `init()` after satellites are loaded:
```javascript
createTimeControls(document.getElementById('time-controls-container'), clock)
document.getElementById('playback-speed').textContent = '1×'
```

- [ ] **Step 4: Verify in browser**

Click ▶/⏸ → satellites stop/resume moving. Click 100× → satellites zoom around the globe. Click ⟳ → time resets to now.

- [ ] **Step 5: Commit**

```bash
git add src/ui/timeControls.js src/main.js src/styles/main.css
git commit -m "feat: add time controls with play/pause, speed selector, and reset-to-now"
```

---

### Task 16: Keyboard Shortcuts

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add keyboard handler in main.js**

Add this function in `src/main.js` (call it from `init()` after creating all components):

```javascript
function setupKeyboardShortcuts(searchBar, timeControlsRef) {
  document.addEventListener('keydown', (e) => {
    // Don't capture if typing in an input
    if (e.target.tagName === 'INPUT') return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        if (clock.isPaused()) clock.play()
        else clock.pause()
        timeControlsRef.syncPlayPause()
        break
      case '+':
      case '=': {
        const speeds = [1, 10, 100, 1000]
        const idx = speeds.indexOf(clock.getSpeed())
        if (idx < speeds.length - 1) clock.setSpeed(speeds[idx + 1])
        break
      }
      case '-': {
        const speeds = [1, 10, 100, 1000]
        const idx = speeds.indexOf(clock.getSpeed())
        if (idx > 0) clock.setSpeed(speeds[idx - 1])
        break
      }
      case 'Escape':
        selectedSat = null
        satLayer?.setSelected(null)
        hideInfoPanel()
        clearGroundTrack(map)
        break
      case '/':
        e.preventDefault()
        searchBar.focus()
        break
    }
  })
}
```

In `init()`, after creating `searchBar` and `createTimeControls`, add:
```javascript
const timeControlsRef = createTimeControls(document.getElementById('time-controls-container'), clock)
setupKeyboardShortcuts(searchBar, timeControlsRef)
```

- [ ] **Step 2: Verify in browser**

- `Space` → toggles play/pause
- `+` / `-` → cycles speed up/down
- `Escape` → deselects satellite, closes panel
- `/` → focuses search bar

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add keyboard shortcuts (Space, +/-, Escape, /)"
```

---

## Phase 4: Observer + Polish

### Task 17: Observer Location

**Files:**
- Modify: `src/main.js`
- Modify: `src/ui/infoPanel.js`

- [ ] **Step 1: Add observer state and marker in main.js**

Add at top of `src/main.js` with other state:
```javascript
let observer = null  // { lat, lon } or null
let observerMarker = null
```

Add this function:
```javascript
function setObserver(lat, lon) {
  observer = { lat, lon }

  if (observerMarker) observerMarker.remove()
  const icon = L.divIcon({
    className: '',
    html: '<div class="observer-dot"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
  observerMarker = L.marker([lat, lon], { icon }).addTo(map)
  observerMarker.bindTooltip('Your location', { permanent: false })
}

function requestGeolocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => setObserver(pos.coords.latitude, pos.coords.longitude),
    () => {} // silently fail if denied
  )
}
```

In `init()`, after map creation:
```javascript
requestGeolocation()
```

- [ ] **Step 2: Add observer dot CSS to main.css**

Append to `src/styles/main.css`:
```css
.observer-dot {
  width: 10px;
  height: 10px;
  background: var(--color-success);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 6px var(--color-success);
}
```

- [ ] **Step 3: Add "Visible Now" indicator to info panel**

In `src/ui/infoPanel.js`, update `showInfoPanel` to accept an optional `observerData` parameter:

```javascript
import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../utils/format.js'
import { getOrbitRegime } from '../data/categories.js'

const panel = document.getElementById('info-panel')

export function showInfoPanel(sat, position, observerData) {
  if (!sat || !position) { hideInfoPanel(); return }

  const regime = getOrbitRegime(position.alt)
  const ageText = formatTLEAge(sat.epoch)
  const ageWarning = (Date.now() - sat.epoch.getTime()) > 3 * 24 * 3600 * 1000
    ? '<span class="age-warning">⚠ Stale TLE</span>' : ''

  let visibleRow = ''
  if (observerData !== undefined) {
    const visLabel = observerData
      ? `<span class="vis-yes">✓ Visible (${observerData.elevation.toFixed(1)}°)</span>`
      : '<span class="vis-no">Below horizon</span>'
    visibleRow = `
      <div class="info-row">
        <span class="label">From your location</span>
        <span class="value">${visLabel}</span>
      </div>`
  }

  panel.innerHTML = `
    <div class="info-header">
      <h2 class="sat-name">${sat.name}</h2>
      <button id="close-panel" aria-label="Close panel">✕</button>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">NORAD ID</span>
        <span class="value mono">${sat.noradId}</span>
      </div>
      <div class="info-row">
        <span class="label">Category</span>
        <span class="value">${sat.category}</span>
      </div>
      <div class="info-row">
        <span class="label">Orbit</span>
        <span class="value">${regime}</span>
      </div>
      ${visibleRow}
    </div>
    <div class="info-section">
      <h3>Current Position</h3>
      <div class="info-row">
        <span class="label">Latitude</span>
        <span class="value mono">${formatCoord(position.lat, 'lat')}</span>
      </div>
      <div class="info-row">
        <span class="label">Longitude</span>
        <span class="value mono">${formatCoord(position.lon, 'lon')}</span>
      </div>
      <div class="info-row">
        <span class="label">Altitude</span>
        <span class="value mono">${formatAlt(position.alt)}</span>
      </div>
      <div class="info-row">
        <span class="label">Velocity</span>
        <span class="value mono">${formatVelocity(position.velocity)}</span>
      </div>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">TLE Age</span>
        <span class="value mono">${ageText} ${ageWarning}</span>
      </div>
    </div>
  `

  document.getElementById('close-panel')?.addEventListener('click', () => {
    hideInfoPanel()
    window.orbitview?.onDeselect?.()
  })

  panel.classList.remove('hidden')
}

export function updateInfoPanel(sat, position, observerData) {
  if (panel.classList.contains('hidden')) return
  showInfoPanel(sat, position, observerData)
}

export function hideInfoPanel() {
  panel.classList.add('hidden')
  panel.innerHTML = ''
}
```

- [ ] **Step 4: Pass observer data in main.js**

Add import:
```javascript
import { calculateElevation } from './utils/geo.js'
```

Update `handleSelect` to pass observer info:
```javascript
function handleSelect(sat) {
  selectedSat = sat
  if (sat) {
    const obsData = getObserverData(sat)
    showInfoPanel(sat, sat.position, obsData)
    renderGroundTrack(map, sat, clock.getTime())
  } else {
    hideInfoPanel()
    clearGroundTrack(map)
  }
}

function getObserverData(sat) {
  if (!observer || !sat.position) return undefined
  const el = calculateElevation(observer.lat, observer.lon, sat.position.lat, sat.position.lon, sat.position.alt)
  return el > 0 ? { elevation: el } : null
}
```

Update `animate()` — replace `updateInfoPanel(selectedSat, selectedSat.position)` with:
```javascript
if (selectedSat) updateInfoPanel(selectedSat, selectedSat.position, getObserverData(selectedSat))
```

- [ ] **Step 5: Add visibility styles to main.css**

Append to `src/styles/main.css`:
```css
.vis-yes { color: var(--color-success); font-size: 11px; }
.vis-no  { color: var(--color-text-muted); font-size: 11px; }
```

- [ ] **Step 6: Verify in browser**

Allow location → green dot appears at your location on the map. Select a visible satellite → "✓ Visible (45.2°)" in info panel. Select a below-horizon satellite → "Below horizon".

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/ui/infoPanel.js src/styles/main.css
git commit -m "feat: add observer location with geolocation and visibility indicator"
```

---

### Task 18: Performance Optimization + GitHub Pages Deployment

**Files:**
- Modify: `vite.config.js`
- Create: `.github/workflows/deploy.yml`
- Modify: `src/map/satelliteLayer.js` (viewport culling already in place from Task 8)

- [ ] **Step 1: Benchmark current performance**

```bash
npm run dev
```
Open browser DevTools → Performance tab → Record 5 seconds. Verify: frame time < 16ms with 500+ satellites.

If frame time exceeds 16ms, add Web Worker propagation (see Step 2 note below). If under 16ms, proceed to Step 3.

> **If optimization needed:** Move the propagation loop in `animate()` to a Web Worker. In `src/engine/propagationWorker.js`, receive `{ satellites (satrec-serializable form), simTime }` via `postMessage`, compute positions, return results. Then replace the `for` loop in `animate()` with worker messaging. This is only needed if 500+ sats cannot hit 30fps.

- [ ] **Step 2: Verify Lighthouse score**

```bash
npm run build && npm run preview
```
Run Lighthouse audit (DevTools → Lighthouse → Mobile). Check:
- Performance ≥ 90
- Accessibility ≥ 90

Common fix if accessibility is low: ensure `<button>` elements have labels, inputs have `aria-label`, color contrast passes.

- [ ] **Step 3: Confirm vite.config.js base path**

`vite.config.js` should already have `base: '/orbitview/'`. Verify it's there:
```javascript
import { defineConfig } from 'vite'
export default defineConfig({
  base: '/orbitview/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Create GitHub Actions deploy workflow**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 5: Run full test suite before final commit**

```bash
npm test
```
Expected: All unit tests PASS. Fix any failures before proceeding.

- [ ] **Step 6: Final commit**

```bash
git add vite.config.js .github/
git commit -m "chore: add GitHub Pages deployment workflow"
```

- [ ] **Step 7: Push to GitHub and verify deployment**

```bash
git remote add origin https://github.com/leemark/orbitview.git
git push -u origin main
```

Check GitHub Actions tab for the deploy workflow. On success, app is live at `https://leemark.github.io/orbitview/`.

---

## Self-Review: Spec Coverage Checklist

| PRD Requirement | Task |
|----------------|------|
| Live satellite map, dark theme | Tasks 1, 7 |
| Colored dots by category | Task 3, 8 |
| 60fps animation loop | Task 9 |
| Time controls: play/pause, speed, reset | Task 15 |
| Click selection + info panel | Task 10 |
| Ground track with future/past | Task 11 |
| Hover tooltip | Task 12 |
| Search by name / NORAD ID | Task 13 |
| Category filter toggles | Task 14 |
| Orbit regime filter | Task 14 (activeCategories covers regime via classifySatellite — LEO/MEO/GEO orbit regime UI toggle is **not yet covered**) |
| Observer location + geolocation | Task 17 |
| "Visible now" indicator | Task 17 |
| Keyboard shortcuts | Task 16 |
| TLE age warning (> 3 days) | Task 10 |
| 2-hour TLE cache refresh | Task 6 |
| CelesTrak → KeepTrack fallback | Task 6 |
| GitHub Pages deployment | Task 18 |
| Lighthouse 90+ | Task 18 |

**Gap identified:** The PRD specifies an orbit regime filter (LEO/MEO/GEO/HEO toggles) separate from the category filter. Task 14 only covers category filters. Add orbit regime toggles to `filterPanel.js` using `getOrbitRegime()` on `sat.position?.alt`.

- [ ] **Step: Add orbit regime filter to filterPanel.js**

Extend `filterPanel.js` to add a second row of regime toggles:

```javascript
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, getOrbitRegime } from '../data/categories.js'

const REGIMES = ['LEO', 'MEO', 'GEO', 'HEO']

export function createFilterPanel(container, onFilterChange) {
  const activeCategories = new Set(CATEGORIES)
  const activeRegimes = new Set(REGIMES)

  container.innerHTML = `
    <div class="filter-group">
      <div class="filter-wrap">
        ${CATEGORIES.map(cat => `
          <button class="filter-btn active" data-type="cat" data-value="${cat}"
            title="${CATEGORY_LABELS[cat]}" style="--cat-color: ${CATEGORY_COLORS[cat]}">
            ${CATEGORY_LABELS[cat]}
          </button>`).join('')}
      </div>
      <div class="filter-wrap">
        ${REGIMES.map(r => `
          <button class="filter-btn active regime-btn" data-type="regime" data-value="${r}"
            style="--cat-color: var(--color-accent)">${r}
          </button>`).join('')}
      </div>
    </div>
  `

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn')
    if (!btn) return
    const { type, value } = btn.dataset
    const set = type === 'cat' ? activeCategories : activeRegimes
    if (set.has(value)) { set.delete(value); btn.classList.remove('active') }
    else                { set.add(value);    btn.classList.add('active') }
    onFilterChange({ categories: new Set(activeCategories), regimes: new Set(activeRegimes) })
  })

  return { getActiveCategories: () => new Set(activeCategories), getActiveRegimes: () => new Set(activeRegimes) }
}

export function applyFilters(satellites, { categories, regimes }) {
  return satellites.filter(sat => {
    if (!categories.has(sat.category)) return false
    if (sat.position) {
      const regime = getOrbitRegime(sat.position.alt)
      if (!regimes.has(regime)) return false
    }
    return true
  })
}
```

Update `src/main.js` — change `activeCategories` state:
```javascript
let activeFilters = { categories: new Set(CATEGORIES), regimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']) }
```

Change the `createFilterPanel` call:
```javascript
createFilterPanel(document.getElementById('filter-container'), (newFilters) => {
  activeFilters = newFilters
})
```

Change the filter line in `animate()`:
```javascript
const filtered = applyFilters(
  searchQuery ? filterSatellites(satellites, searchQuery) : satellites,
  activeFilters
)
```

- [ ] **Commit the orbit regime filter**

```bash
git add src/ui/filterPanel.js src/main.js
git commit -m "feat: add orbit regime filter (LEO/MEO/GEO/HEO) to filter panel"
```

---

*Plan end. All PRD Phase 1–4 MVP requirements are covered.*
