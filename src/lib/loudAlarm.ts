/**
 * Decides when the Voice Level "too loud" sound should play.
 *  - Only after the room has stayed in the red zone for `delayMs` (a cough or dropped book won't trigger it).
 *  - At most once per `cooldownMs`.
 *  - Ignores the microphone for `ignoreMs` after an alert, because the mic hears the alert itself.
 */
export interface LoudAlarmOptions {
  delayMs: number;
  cooldownMs: number;
  ignoreMs?: number;
}

export class LoudAlarm {
  private redSince: number | null = null;
  private lastAlertAt = -Infinity;
  constructor(public opts: LoudAlarmOptions) {}

  /** Feed one reading. Returns true when the alert should play now. */
  update(isRed: boolean, now: number): boolean {
    const ignoreMs = this.opts.ignoreMs ?? 2500;
    if (now - this.lastAlertAt < ignoreMs) {
      this.redSince = null; // what the mic hears now is (partly) our own alert
      return false;
    }
    if (!isRed) {
      this.redSince = null;
      return false;
    }
    if (this.redSince == null) this.redSince = now;
    if (now - this.redSince >= this.opts.delayMs && now - this.lastAlertAt >= this.opts.cooldownMs) {
      this.lastAlertAt = now;
      this.redSince = null;
      return true;
    }
    return false;
  }

  reset() {
    this.redSince = null;
    this.lastAlertAt = -Infinity;
  }
}
