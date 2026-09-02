export interface LatestRequestLease {
  /** Apply a completed request only while it is still the latest generation. */
  commit(apply: () => void): boolean;
}

/** Owns the single generation that may commit asynchronous view state. */
export class LatestRequestOwner {
  #generation = 0;

  begin(): LatestRequestLease {
    const generation = ++this.#generation;

    return {
      commit: (apply) => {
        if (generation !== this.#generation) return false;
        apply();
        return true;
      },
    };
  }

  invalidate(): void {
    this.#generation += 1;
  }
}
