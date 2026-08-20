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

// Keeps a chronological path continuous across the antimeridian by shifting
// older points into the same repeated world as the point that follows them.
export function unwrapWorldXPositions(baseXs, worldWidth) {
  if (!Number.isFinite(worldWidth) || worldWidth <= 0 || baseXs.length < 2) {
    return [...baseXs]
  }

  const positions = [...baseXs]
  for (let index = positions.length - 2; index >= 0; index--) {
    const nextX = positions[index + 1]
    while (positions[index] - nextX > worldWidth / 2) {
      positions[index] -= worldWidth
    }
    while (positions[index] - nextX < -worldWidth / 2) {
      positions[index] += worldWidth
    }
  }
  return positions
}
