export type SoundMode = "off" | "cosmos" | "nocturne" | "epic" | "ship";

type Engine = { stop: () => void };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: Engine | null = null;

function getCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return { ctx, master: master! };
}

function noiseBuffer(ac: AudioContext, kind: "white" | "brown" | "pink") {
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.3;
      else if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; }
    }
  }
  return buf;
}

function fadeBus(ac: AudioContext, out: AudioNode) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(1, ac.currentTime + 8);
  g.connect(out);
  return g;
}

function reverb(ac: AudioContext, seconds = 4) {
  const conv = ac.createConvolver();
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  conv.buffer = buf;
  return conv;
}

function cosmos(ac: AudioContext, out: AudioNode): Engine {
  const bus = fadeBus(ac, out);
  const rv = reverb(ac, 6); rv.connect(bus);
  const nodes: AudioScheduledSourceNode[] = [];
  [110, 164.81, 220.5, 277.18, 329.6].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = (i - 2) * 4;
    const g = ac.createGain(); g.gain.value = 0.05;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.03 + i * 0.017;
    const lg = ac.createGain(); lg.gain.value = 0.04; lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(rv); g.connect(bus);
    o.start(); lfo.start(); nodes.push(o, lfo);
  });
  const n = ac.createBufferSource(); n.buffer = noiseBuffer(ac, "pink"); n.loop = true;
  const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 0.6;
  const ng = ac.createGain(); ng.gain.value = 0.08;
  n.connect(f).connect(ng).connect(bus); n.start(); nodes.push(n);
  return { stop: () => { bus.gain.linearRampToValueAtTime(0, ac.currentTime + 8); setTimeout(() => nodes.forEach((x) => x.stop()), 8200); } };
}

function nocturne(ac: AudioContext, out: AudioNode): Engine {
  const bus = fadeBus(ac, out);
  const rv = reverb(ac, 5); const wet = ac.createGain(); wet.gain.value = 0.6; rv.connect(wet).connect(bus);
  // Gentle progression in D major: I - vi - IV - V
  const chords = [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]];
  const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  let step = 0; let alive = true;
  const note = (m: number, t: number, vel: number, dur = 3) => {
    const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = midi(m);
    const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = midi(m) * 2;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ac.createGain(); g2.gain.value = 0.2;
    o.connect(g); o2.connect(g2).connect(g); g.connect(bus); g.connect(rv);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
  };
  const tick = () => {
    if (!alive) return;
    const ch = chords[Math.floor(step / 8) % chords.length]!;
    const t = ac.currentTime + 0.05;
    if (step % 8 === 0) note(ch[0]! - 12, t, 0.12, 5);
    const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
    const m = ch[pattern[step % 8]!]! + (Math.random() < 0.15 ? 12 : 0);
    note(m, t, 0.06 + Math.random() * 0.03);
    step++;
  };
  const id = setInterval(tick, 460);
  return { stop: () => { setTimeout(() => { alive = false; clearInterval(id); }, 8000); bus.gain.linearRampToValueAtTime(0, ac.currentTime + 8); } };
}

function epic(ac: AudioContext, out: AudioNode): Engine {
  const bus = fadeBus(ac, out);
  const rv = reverb(ac, 7); rv.connect(bus);
  const nodes: AudioScheduledSourceNode[] = [];
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500; lp.Q.value = 2;
  const swell = ac.createGain(); swell.gain.value = 0.25;
  const slfo = ac.createOscillator(); slfo.frequency.value = 0.05;
  const sg = ac.createGain(); sg.gain.value = 0.2; slfo.connect(sg).connect(swell.gain);
  const flfo = ac.createGain(); flfo.gain.value = 350; slfo.connect(flfo).connect(lp.frequency);
  lp.connect(swell).connect(rv); swell.connect(bus);
  // Organ-like stacked fifths in A minor
  [55, 82.41, 110, 164.81, 220, 261.63].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = i < 2 ? "sawtooth" : "square"; o.frequency.value = f; o.detune.value = Math.random() * 6 - 3;
    const g = ac.createGain(); g.gain.value = 0.06 / (1 + i * 0.4);
    o.connect(g).connect(lp); o.start(); nodes.push(o);
  });
  slfo.start(); nodes.push(slfo);
  // The ticking clock
  let alive = true;
  const id = setInterval(() => {
    if (!alive) return;
    const t = ac.currentTime + 0.02;
    const n = ac.createBufferSource(); n.buffer = noiseBuffer(ac, "white");
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    n.connect(hp).connect(g).connect(bus); n.start(t); n.stop(t + 0.05);
  }, 1250);
  return { stop: () => { setTimeout(() => { alive = false; clearInterval(id); }, 8000); bus.gain.linearRampToValueAtTime(0, ac.currentTime + 8); setTimeout(() => nodes.forEach((x) => x.stop()), 8200); } };
}

function ship(ac: AudioContext, out: AudioNode): Engine {
  const bus = fadeBus(ac, out);
  const nodes: AudioScheduledSourceNode[] = [];
  const n = ac.createBufferSource(); n.buffer = noiseBuffer(ac, "brown"); n.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
  const ng = ac.createGain(); ng.gain.value = 0.5;
  n.connect(lp).connect(ng).connect(bus); n.start(); nodes.push(n);
  [50, 100, 150].forEach((f, i) => {
    const o = ac.createOscillator(); o.frequency.value = f;
    const g = ac.createGain(); g.gain.value = 0.03 / (i + 1);
    o.connect(g).connect(bus); o.start(); nodes.push(o);
  });
  const vent = ac.createBufferSource(); vent.buffer = noiseBuffer(ac, "white"); vent.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.4;
  const vg = ac.createGain(); vg.gain.value = 0.04;
  vent.connect(bp).connect(vg).connect(bus); vent.start(); nodes.push(vent);
  return { stop: () => { bus.gain.linearRampToValueAtTime(0, ac.currentTime + 8); setTimeout(() => nodes.forEach((x) => x.stop()), 8200); } };
}

export function playSound(mode: SoundMode) {
  current?.stop();
  current = null;
  if (mode === "off") return;
  const { ctx: ac, master: out } = getCtx();
  current = { cosmos, nocturne, epic, ship }[mode](ac, out);
}

export function setVolume(v: number) {
  if (master && ctx) master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.2);
}
