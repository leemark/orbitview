export class Clock {
  #simTime
  #paused = true
  #speed = 1

  constructor() {
    this.#simTime = new Date()
  }

  getTime() {
    return new Date(this.#simTime)
  }

  setTime(date) {
    this.#simTime = new Date(date)
  }

  isPaused() {
    return this.#paused
  }

  getSpeed() {
    return this.#speed
  }

  play() {
    this.#paused = false
  }

  pause() {
    this.#paused = true
  }

  setSpeed(multiplier) {
    this.#speed = multiplier
  }

  resetToNow() {
    this.#simTime = new Date()
  }

  // Call each animation frame with real milliseconds elapsed since last frame.
  // Returns current sim time.
  tick(realDeltaMs) {
    if (!this.#paused) {
      this.#simTime = new Date(this.#simTime.getTime() + realDeltaMs * this.#speed)
    }
    return new Date(this.#simTime)
  }
}
