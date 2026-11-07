/**
 * Neon Drive sound — fully synthesized with the Web Audio API.
 * No audio files: zero download weight, nothing to license, and every layer is
 * driven directly by the scroll state.
 *
 *   rain      pink noise → band-limited, thins on the rooftop, muffled in the cabin
 *   drone     detuned saws + a soft pad whose chord moves with the story
 *   engine    EV motor: low saw + whine, pitch follows scroll velocity
 *   regen     charging whine (regen on) or brake hiss (regen off) during the stop
 *   ui        hover tick, click, glitch, ignition sweep — one-shots
 *
 * The AudioContext is only created inside a user gesture (IGNITION / audio toggle).
 */

type Chord = [number, number, number]
// A minor → F → C → G (A2 region), cycled across the story sections
const CHORDS: Chord[] = [
  [110.0, 130.81, 164.81],
  [87.31, 110.0, 130.81],
  [130.81, 164.81, 196.0],
  [98.0, 123.47, 146.83],
]

export interface AudioFrame {
  progress: number
  velocity: number
  sectionIndex: number
  regenOn: boolean
  braking: number
  inCabin: boolean
}

class NeonAudio {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private rainGain!: GainNode
  private rainLP!: BiquadFilterNode
  private rumbleGain!: GainNode
  private droneGain!: GainNode
  private droneLP!: BiquadFilterNode
  private pad: OscillatorNode[] = []
  private padGain!: GainNode
  private engOsc!: OscillatorNode
  private engSub!: OscillatorNode
  private engGain!: GainNode
  private whine!: OscillatorNode
  private whineGain!: GainNode
  private regenOsc!: OscillatorNode
  private regenGain!: GainNode
  private hissGain!: GainNode
  private noise!: AudioBuffer
  private enabled = false
  private chord = -1

  get ready() {
    return !!this.ctx
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(comp).connect(ctx.destination)

    this.noise = this.makePinkNoise(3)

    // ── rain: hiss + low rumble of drops on roofs
    const rain = this.loopNoise()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 700
    this.rainLP = ctx.createBiquadFilter()
    this.rainLP.type = 'lowpass'
    this.rainLP.frequency.value = 7000
    this.rainGain = ctx.createGain()
    this.rainGain.gain.value = 0.32
    rain.connect(hp).connect(this.rainLP).connect(this.rainGain).connect(this.master)

    const rumble = this.loopNoise(1.3)
    const bp = ctx.createBiquadFilter()
    bp.type = 'lowpass'
    bp.frequency.value = 260
    this.rumbleGain = ctx.createGain()
    this.rumbleGain.gain.value = 0.22
    rumble.connect(bp).connect(this.rumbleGain).connect(this.master)

    // ── drone: two detuned saws on A1 + fifth, breathing low-pass
    this.droneLP = ctx.createBiquadFilter()
    this.droneLP.type = 'lowpass'
    this.droneLP.frequency.value = 340
    this.droneLP.Q.value = 4
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.06
    this.droneLP.connect(this.droneGain).connect(this.master)
    for (const [f, d] of [
      [55, -7],
      [55, 7],
      [82.41, 0],
    ]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.detune.value = d
      o.connect(this.droneLP)
      o.start()
    }
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 160
    lfo.connect(lfoAmt).connect(this.droneLP.frequency)
    lfo.start()

    // ── pad: soft triangles that glide between chords
    const padLP = ctx.createBiquadFilter()
    padLP.type = 'lowpass'
    padLP.frequency.value = 1400
    this.padGain = ctx.createGain()
    this.padGain.gain.value = 0.035
    padLP.connect(this.padGain).connect(this.master)
    this.pad = CHORDS[0].map((f) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f * 2
      o.connect(padLP)
      o.start()
      return o
    })

    // ── engine: EV motor (low saw + sub) and inverter whine
    const engLP = ctx.createBiquadFilter()
    engLP.type = 'lowpass'
    engLP.frequency.value = 700
    this.engGain = ctx.createGain()
    this.engGain.gain.value = 0
    engLP.connect(this.engGain).connect(this.master)
    this.engOsc = ctx.createOscillator()
    this.engOsc.type = 'sawtooth'
    this.engOsc.frequency.value = 42
    this.engSub = ctx.createOscillator()
    this.engSub.type = 'square'
    this.engSub.frequency.value = 21
    const subGain = ctx.createGain()
    subGain.gain.value = 0.4
    this.engOsc.connect(engLP)
    this.engSub.connect(subGain).connect(engLP)
    this.engOsc.start()
    this.engSub.start()

    this.whine = ctx.createOscillator()
    this.whine.type = 'sine'
    this.whine.frequency.value = 400
    this.whineGain = ctx.createGain()
    this.whineGain.gain.value = 0
    this.whine.connect(this.whineGain).connect(this.master)
    this.whine.start()

    // ── regen: rising charge tone, or friction-brake hiss
    this.regenOsc = ctx.createOscillator()
    this.regenOsc.type = 'triangle'
    this.regenGain = ctx.createGain()
    this.regenGain.gain.value = 0
    this.regenOsc.connect(this.regenGain).connect(this.master)
    this.regenOsc.start()
    const hiss = this.loopNoise(0.7)
    const hbp = ctx.createBiquadFilter()
    hbp.type = 'bandpass'
    hbp.frequency.value = 2600
    hbp.Q.value = 0.8
    this.hissGain = ctx.createGain()
    this.hissGain.gain.value = 0
    hiss.connect(hbp).connect(this.hissGain).connect(this.master)

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) this.ctx.suspend()
      else if (this.enabled) this.ctx.resume()
    })
  }

  async setEnabled(on: boolean) {
    if (on) this.init()
    const ctx = this.ctx
    if (!ctx) return
    this.enabled = on
    const t = ctx.currentTime
    if (on) {
      await ctx.resume()
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(0.85, t, 0.6)
    } else {
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(0, t, 0.15)
      setTimeout(() => !this.enabled && ctx.suspend(), 900)
    }
  }

  /** Called on every scroll/frame update while enabled. Cheap: only parameter ramps. */
  update(f: AudioFrame) {
    const ctx = this.ctx
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    const ramp = (p: AudioParam, v: number, tc = 0.12) => p.setTargetAtTime(v, t, tc)

    const speed = Math.min(1, Math.abs(f.velocity) * 3.5)
    const driving = f.progress > 0.18 && f.progress < 0.9 ? 1 : 0
    const roof = Math.min(1, Math.max(0, (f.progress - 0.88) / 0.08))

    // rain thins as we climb, and is muffled inside the cabin
    ramp(this.rainGain.gain, 0.32 * (1 - roof * 0.6) * (f.inCabin ? 0.55 : 1), 0.4)
    ramp(this.rainLP.frequency, f.inCabin ? 1300 : 7000, 0.3)
    ramp(this.rumbleGain.gain, 0.22 * (1 - roof * 0.7), 0.4)

    // engine + whine follow scroll speed
    ramp(this.engOsc.frequency, 38 + speed * 75)
    ramp(this.engSub.frequency, 19 + speed * 37)
    ramp(this.engGain.gain, driving * (0.05 + speed * 0.12) * (f.inCabin ? 1.3 : 1), 0.15)
    ramp(this.whine.frequency, 320 + speed * 1500)
    ramp(this.whineGain.gain, driving * speed * 0.016, 0.15)

    // regen stop
    const b = f.braking
    ramp(this.regenOsc.frequency, 380 + b * 900, 0.2)
    ramp(this.regenGain.gain, f.regenOn ? b * 0.05 : 0, 0.1)
    ramp(this.hissGain.gain, f.regenOn ? 0 : b * 0.14, 0.1)

    // the pad's chord moves with the story
    const c = f.sectionIndex % CHORDS.length
    if (c !== this.chord) {
      this.chord = c
      CHORDS[c].forEach((freq, i) => this.pad[i].frequency.setTargetAtTime(freq * 2, t, 1.2))
    }
  }

  // ── one-shots ─────────────────────────────────────────────

  hover() {
    this.blip(1900, 2600, 0.025, 0.05, 'sine')
  }

  click() {
    this.blip(700, 260, 0.05, 0.09, 'square')
    this.burst(0.03, 3200, 0.05)
  }

  glitch() {
    const ctx = this.ctx
    if (!ctx || !this.enabled) return
    for (let i = 0; i < 4; i++) setTimeout(() => this.burst(0.02 + Math.random() * 0.03, 800 + Math.random() * 5000, 0.035), i * 35)
  }

  ignition() {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    // sub thump
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(32, t + 0.5)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + 0.75)
    // power-up sweep
    this.blip(180, 1400, 0.06, 1.1, 'sawtooth', 0.15)
  }

  // ── helpers ───────────────────────────────────────────────

  private blip(f0: number, f1: number, gain: number, dur: number, type: OscillatorType, delay = 0) {
    const ctx = this.ctx
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private burst(dur: number, freq: number, gain: number) {
    const ctx = this.ctx
    if (!ctx || !this.enabled) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = 1.2
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    src.start(t, Math.random() * 2)
    src.stop(t + dur + 0.02)
  }

  private loopNoise(rate = 1) {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.playbackRate.value = rate
    src.start(0, Math.random() * 2)
    return src
  }

  /** Paul Kellet's pink-noise filter over white noise. */
  private makePinkNoise(seconds: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
    // crossfade the loop seam
    const fade = Math.floor(ctx.sampleRate * 0.05)
    for (let i = 0; i < fade; i++) {
      const k = i / fade
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k
    }
    return buf
  }
}

export const audio = new NeonAudio()
