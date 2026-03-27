const SPEEDS = [1, 10, 100, 1000]

export function createTimeControls(container, clock) {
  container.innerHTML = `
    <div class="time-controls">
      <button id="play-pause" class="tc-btn" aria-label="Play/Pause">⏸</button>
      <div class="speed-wrap">
        ${SPEEDS.map(s => `
          <button class="speed-btn${s === 1 ? ' active' : ''}" data-speed="${s}">${s}×</button>
        `).join('')}
      </div>
      <button id="reset-now" class="tc-btn" aria-label="Reset to now">⟳</button>
    </div>
  `

  const playPauseBtn = container.querySelector('#play-pause')
  const speedBtns    = container.querySelectorAll('.speed-btn')
  const resetBtn     = container.querySelector('#reset-now')
  const speedDisplay = document.getElementById('playback-speed')

  function syncPlayPause() {
    playPauseBtn.textContent = clock.isPaused() ? '▶' : '⏸'
    playPauseBtn.setAttribute('aria-label', clock.isPaused() ? 'Play' : 'Pause')
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
      const speed = parseInt(btn.dataset.speed, 10)
      clock.setSpeed(speed)
      if (speedDisplay) speedDisplay.textContent = `${speed}×`
    })
  })

  resetBtn.addEventListener('click', () => {
    clock.resetToNow()
    clock.play()
    syncPlayPause()
  })

  syncPlayPause()
  if (speedDisplay) speedDisplay.textContent = '1×'

  return { syncPlayPause }
}
