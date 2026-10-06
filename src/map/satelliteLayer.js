import L from 'leaflet'
import { CATEGORY_COLORS } from '../data/categories.js'
import {
  getWrappedXPositions,
  unwrapWorldXPositions,
} from './worldWrap.js'

const DOT_RADIUS = 2.5
const SELECTED_RING_RADIUS = 6
const HIT_RADIUS = 8 // px for click/hover detection
const RENDER_MARGIN = 10
const TRAIL_BANDS = [
  { from: 0, to: 0.4, opacity: 0.05 },
  { from: 0.4, to: 0.72, opacity: 0.11 },
  { from: 0.72, to: 1, opacity: 0.24 },
]

export function createSatelliteLayer(map, onSelect, onHover) {
  let satellites = []
  let selectedId = null
  let hoveredId = null
  let canvas, ctx
  let width = 0
  let height = 0
  let devicePixelRatio = 1
  let dragging = false

  function resize() {
    const size = map.getSize()
    width = size.x
    height = size.y
    devicePixelRatio = globalThis.devicePixelRatio || 1
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.round(width * devicePixelRatio)
    canvas.height = Math.round(height * devicePixelRatio)
    ctx?.setTransform?.(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  }

  function projectToCanvas(lat, lon) {
    const point = map.latLngToContainerPoint(L.latLng(lat, lon))
    return { x: point.x, y: point.y }
  }

  function getWorldWidth() {
    return map.getPixelWorldBounds?.(map.getZoom())?.getSize().x ?? 0
  }

  function drawSatellite(x, y, color, isSelected, isHovered) {
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

  function drawTrailBand(points, xOffset, color, band, isSelected) {
    const segmentCount = points.length - 1
    const startSegment = Math.floor(segmentCount * band.from)
    const endSegment = Math.max(
      startSegment + 1,
      Math.ceil(segmentCount * band.to)
    )

    ctx.beginPath()
    ctx.moveTo(points[startSegment].x + xOffset, points[startSegment].y)
    for (let segment = startSegment; segment < endSegment; segment++) {
      ctx.lineTo(points[segment + 1].x + xOffset, points[segment + 1].y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = isSelected ? 1.6 : 1
    ctx.globalAlpha = Math.min(1, band.opacity * (isSelected ? 1.8 : 1))
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawTrail(sat, color, isSelected, worldWidth) {
    if (!sat.trail || sat.trail.length < 2 || !sat.position) return

    const trailPoints = [
      ...sat.trail,
      { lat: sat.position.lat, lon: sat.position.lon },
    ].map(point => projectToCanvas(point.lat, point.lon))

    const currentPoint = trailPoints.at(-1)
    const continuousXs = unwrapWorldXPositions(
      trailPoints.map(point => point.x),
      worldWidth
    )
    const continuousPoints = trailPoints.map((point, index) => ({
      x: continuousXs[index],
      y: point.y,
    }))
    const wrappedCurrentXs = getWrappedXPositions(
      currentPoint.x,
      worldWidth,
      width,
      RENDER_MARGIN
    )

    for (const wrappedCurrentX of wrappedCurrentXs) {
      const xOffset = wrappedCurrentX - currentPoint.x
      for (const band of TRAIL_BANDS) {
        drawTrailBand(continuousPoints, xOffset, color, band, isSelected)
      }
    }
  }

  function render() {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    const worldWidth = getWorldWidth()

    for (const sat of satellites) {
      if (!sat.position) continue
      const color = CATEGORY_COLORS[sat.category] ?? CATEGORY_COLORS.other
      drawTrail(sat, color, sat.noradId === selectedId, worldWidth)
    }

    for (const sat of satellites) {
      if (!sat.position) continue
      const { x: baseX, y } = projectToCanvas(sat.position.lat, sat.position.lon)
      if (y < -RENDER_MARGIN || y > height + RENDER_MARGIN) continue

      const color = CATEGORY_COLORS[sat.category] ?? CATEGORY_COLORS.other
      const isSelected = sat.noradId === selectedId
      const isHovered = sat.noradId === hoveredId
      const wrappedXs = getWrappedXPositions(
        baseX,
        worldWidth,
        width,
        RENDER_MARGIN
      )

      for (const x of wrappedXs) {
        drawSatellite(x, y, color, isSelected, isHovered)
      }
    }
  }

  function findSatAt(canvasX, canvasY) {
    let closest = null
    let closestDist = HIT_RADIUS
    const worldWidth = getWorldWidth()

    for (const sat of satellites) {
      if (!sat.position) continue
      const { x: baseX, y } = projectToCanvas(sat.position.lat, sat.position.lon)
      const wrappedXs = getWrappedXPositions(
        baseX,
        worldWidth,
        width,
        HIT_RADIUS
      )

      for (const x of wrappedXs) {
        const dist = Math.hypot(x - canvasX, y - canvasY)
        if (dist < closestDist) {
          closest = sat
          closestDist = dist
        }
      }
    }
    return closest
  }

  function setCursor(value) {
    const mapContainer = map.getContainer()
    if (mapContainer?.style) mapContainer.style.cursor = value
  }

  function clearHover(clientX, clientY) {
    if (hoveredId === null) return
    hoveredId = null
    setCursor('')
    onHover?.(null, clientX, clientY)
    render()
  }

  function getClientPosition(e) {
    const originalEvent = e?.originalEvent
    if (originalEvent && Number.isFinite(originalEvent.clientX) && Number.isFinite(originalEvent.clientY)) {
      return { x: originalEvent.clientX, y: originalEvent.clientY }
    }
    const rect = map.getContainer().getBoundingClientRect?.()
    return {
      x: (rect?.left ?? 0) + (e?.containerPoint?.x ?? 0),
      y: (rect?.top ?? 0) + (e?.containerPoint?.y ?? 0),
    }
  }

  function handleClick(e) {
    if (dragging || !e.containerPoint) return
    const sat = findSatAt(e.containerPoint.x, e.containerPoint.y)
    selectedId = sat ? sat.noradId : null
    onSelect?.(sat ?? null)
    render()
  }

  function handleMouseMove(e) {
    if (dragging || !e.containerPoint) return
    const sat = findSatAt(e.containerPoint.x, e.containerPoint.y)
    const newId = sat ? sat.noradId : null
    if (newId !== hoveredId) {
      hoveredId = newId
      setCursor(sat ? 'pointer' : '')
      const client = getClientPosition(e)
      onHover?.(sat ?? null, client.x, client.y)
      render()
    }
  }

  function handleMouseOut(e) {
    const client = getClientPosition(e)
    clearHover(client.x, client.y)
  }

  function handleDragStart() {
    dragging = true
    clearHover()
  }

  function handleDragEnd() {
    dragging = false
  }

  function handleResize() {
    resize()
    render()
  }

  canvas = document.createElement('canvas')
  canvas.className = 'satellite-layer'
  canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:400;pointer-events:none;'
  map.getContainer().appendChild(canvas)
  ctx = canvas.getContext('2d')
  resize()

  map.on('resize', handleResize)
  map.on('move zoom', render)
  map.on('click', handleClick)
  map.on('mousemove', handleMouseMove)
  map.on('mouseout', handleMouseOut)
  map.on('dragstart', handleDragStart)
  map.on('dragend', handleDragEnd)
  map.on('movestart', () => clearHover())

  return {
    update(newSatellites) {
      satellites = newSatellites ?? []
      if (selectedId !== null && !satellites.some(sat => sat.noradId === selectedId)) {
        selectedId = null
        onSelect?.(null)
      }
      if (hoveredId !== null && !satellites.some(sat => sat.noradId === hoveredId)) {
        clearHover()
      }
      render()
    },
    setSelected(noradId) {
      selectedId = noradId
      render()
    },
    render,
  }
}
