const SPEEDS = [1, 10, 100, 1000]

export function createTimeControls(container, clock, onChange) {
  container.innerHTML = `
    <div class="time-controls">
      <button id="play-pause" class="tc-btn play-btn" type="button" aria-label="Play">Play</button>
      <div class="speed-wrap" role="group" aria-label="Playback speed">
        ${SPEEDS.map(s => `
          <button class="speed-btn${s === 1 ? ' active' : ''}" type="button"
            data-speed="${s}" aria-pressed="${s === 1}">${s}×</button>
        `).join('')}
      </div>
      <button id="reset-now" class="tc-btn reset-btn" type="button" aria-label="Reset to now">Now</button>
    </div>
  `

  const playPauseBtn = container.querySelector('#play-pause')
  const speedBtns    = container.querySelectorAll('.speed-btn')
  const resetBtn     = container.querySelector('#reset-now')
  const speedDisplay = document.getElementById('playback-speed')

  function sync() {
    const paused = clock.isPaused()
    const speed = clock.getSpeed()
    const action = paused ? 'Play' : 'Pause'

    playPauseBtn.textContent = action
    playPauseBtn.setAttribute('aria-label', action)
    playPauseBtn.setAttribute('aria-pressed', String(!paused))

    speedBtns.forEach(btn => {
      const isActive = Number(btn.dataset.speed) === speed
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    })

    if (speedDisplay) speedDisplay.textContent = `${speed}×`
  }

  function notifyChange() {
    sync()
    onChange?.()
  }

  function toggle() {
    if (clock.isPaused()) clock.play()
    else clock.pause()
    notifyChange()
  }

  function setSpeed(speed) {
    const multiplier = Number(speed)
    if (!SPEEDS.includes(multiplier)) return
    clock.setSpeed(multiplier)
    notifyChange()
  }

  function reset() {
    clock.resetToNow()
    clock.setSpeed(1)
    clock.play()
    notifyChange()
  }

  playPauseBtn.addEventListener('click', toggle)

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setSpeed(btn.dataset.speed)
    })
  })

  resetBtn.addEventListener('click', reset)

  sync()

  return { sync, syncPlayPause: sync, toggle, setSpeed, reset }
}
