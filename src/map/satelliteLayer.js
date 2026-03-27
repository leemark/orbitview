import L from 'leaflet'
import { CATEGORY_COLORS } from '../data/categories.js'

const DOT_RADIUS = 2.5
const SELECTED_RING_RADIUS = 6
const HIT_RADIUS = 8 // px for click/hover detection

export function createSatelliteLayer(map, onSelect, onHover) {
  let satellites = []
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

  return {
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
}
