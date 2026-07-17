export class IntervalScheduler {
  #intervalMs
  #lastRunAt = null

  constructor(intervalMs) {
    if (!Number.isFinite(intervalMs) || intervalMs < 0) {
      throw new RangeError('intervalMs must be a non-negative finite number')
    }
    this.#intervalMs = intervalMs
  }

  shouldRun(now) {
    if (this.#lastRunAt !== null && now - this.#lastRunAt < this.#intervalMs) {
      return false
    }
    this.#lastRunAt = now
    return true
  }

  mark(now) {
    this.#lastRunAt = now
  }

  reset() {
    this.#lastRunAt = null
  }
}
