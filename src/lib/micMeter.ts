/**
 * Live microphone level meter (Web Audio API + AnalyserNode).
 * Audio is analysed locally, frame by frame. Nothing is recorded, stored, transcribed or uploaded.
 * Levels are RELATIVE (0–100), not calibrated decibels.
 */

export type MicState = "off" | "starting" | "on" | "error";

export interface MicError {
  code: "denied" | "no-device" | "unsupported" | "in-use" | "unknown";
  message: string;
}

export function describeMicError(e: unknown): MicError {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError")
    return { code: "denied", message: "Microphone permission was blocked. Allow the microphone for this site in your browser settings, then try again." };
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError")
    return { code: "no-device", message: "No microphone was found. Plug one in or check your device settings." };
  if (name === "NotReadableError" || name === "TrackStartError")
    return { code: "in-use", message: "The microphone is busy or unavailable. Close other apps using it and try again." };
  if (name === "Unsupported")
    return { code: "unsupported", message: "This browser can't use the microphone here. It needs a secure (https) page or localhost." };
  return { code: "unknown", message: "The microphone couldn't start. Please try again." };
}

/** Map an RMS amplitude (0..1) to a relative 0..100 level. */
export function rmsToLevel(rms: number, sensitivity = 1): number {
  const v = Math.max(1e-6, rms * sensitivity);
  const db = 20 * Math.log10(v); // dBFS, roughly -70 (quiet room) .. 0 (clipping)
  return Math.max(0, Math.min(100, ((db + 65) / 55) * 100));
}

export function computeRms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export class MicMeter {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private smoothed = 0;
  private buf: Float32Array<ArrayBuffer> | null = null;
  sensitivity = 1;
  state: MicState = "off";
  onLevel: (level: number) => void = () => {};
  onState: (s: MicState, err?: MicError) => void = () => {};

  async start(): Promise<void> {
    if (this.state === "on" || this.state === "starting") return;
    this.setState("starting");
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("unsupported"), { name: "Unsupported" });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if ((this.state as MicState) !== "starting") {
        // stop() was called while waiting for permission
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser); // NOT connected to destination: no playback, no recording.
      this.buf = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      this.setState("on");
      this.loop();
    } catch (e) {
      this.cleanup();
      this.setState("error", describeMicError(e));
    }
  }

  private loop = () => {
    if (!this.analyser || !this.buf) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    const level = rmsToLevel(computeRms(this.buf), this.sensitivity);
    // Fast attack, slower release, for a smooth but responsive needle.
    const k = level > this.smoothed ? 0.35 : 0.08;
    this.smoothed += (level - this.smoothed) * k;
    this.onLevel(this.smoothed);
    this.raf = requestAnimationFrame(this.loop);
  };

  private setState(s: MicState, err?: MicError) {
    this.state = s;
    this.onState(s, err);
  }

  private cleanup() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop()); // releases the microphone (browser indicator turns off)
    this.stream = null;
    try {
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.source = null;
    this.analyser = null;
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close().catch(() => {});
    this.ctx = null;
    this.smoothed = 0;
  }

  stop() {
    const wasActive = this.state !== "off";
    this.cleanup();
    if (wasActive) this.setState("off");
    this.onLevel(0);
  }

  get active() {
    return this.state === "on";
  }
}
