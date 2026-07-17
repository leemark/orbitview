export function getWrappedXPositions(baseX, worldWidth, viewportWidth, margin = 0) {
  const minX = -margin
  const maxX = viewportWidth + margin

  if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
    return baseX >= minX && baseX <= maxX ? [baseX] : []
  }

  const firstWorld = Math.ceil((minX - baseX) / worldWidth)
  const lastWorld = Math.floor((maxX - baseX) / worldWidth)
  const positions = []

  for (let world = firstWorld; world <= lastWorld; world++) {
    positions.push(baseX + world * worldWidth)
  }

  return positions
}
