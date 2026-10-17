import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, Pause, Menu, X, Orbit, Music, Sparkles, Rocket, Wind, BookOpen, ChevronLeft, ChevronRight, ScanLine, RotateCcw } from "lucide-react";
import { COLLECTIONS, fetchCollection, type CollectionKey } from "@/lib/nasa";
import { playSound, setVolume, type SoundMode } from "@/lib/soundscape";
import { Button } from "@/components/ui/button";
import { FractalMeditation } from "@/components/fractal-meditation";
import { sessionProgress } from "@/lib/fractal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Motion and Still — Fractals & NASA meditation" },
      { name: "description", content: "Meditate with mathematical mazes that unravel into stillness or real NASA skies, with free calming soundscapes and whispered words." },
      { property: "og:title", content: "Motion and Still" },
      { property: "og:description", content: "A fractal maze becomes a single dot over your meditation, or drift beneath real NASA skies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Sound = SoundMode | "drift";
const SOUNDS: { mode: Sound; label: string; Icon: typeof Orbit }[] = [
  { mode: "drift", label: "Drift", Icon: Wind },
  { mode: "cosmos", label: "Cosmos", Icon: Orbit },
  { mode: "nocturne", label: "Nocturne", Icon: Music },
  { mode: "epic", label: "Epic", Icon: Sparkles },
  { mode: "ship", label: "Ship", Icon: Rocket },
];
const DRIFT_ORDER: SoundMode[] = ["cosmos", "nocturne", "epic", "ship"];
const DURATIONS = [
  { label: "1.5 min", s: 90 },
  { label: "3 min", s: 180 },
  { label: "5 min", s: 300 },
  { label: "Endless", s: 0 },
];
const WHISPERS = ["breathe in", "let go", "you are stardust", "slow", "be still", "light travels to you", "soften", "exhale", "here", "vast and quiet", "drift", "nothing to do"];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Index() {
  const [col, setCol] = useState<CollectionKey>("galaxy");
  const [i, setI] = useState(0);
  const [sound, setSound] = useState<Sound>("drift");
  const [vol, setVol] = useState(0.6);
  const [duration, setDuration] = useState(180);
  const [narrate, setNarrate] = useState(false);
  const [whispers, setWhispers] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [visual, setVisual] = useState<"fractal" | "nasa">("fractal");
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const complete = duration > 0 && elapsed >= duration;
  const left = duration === 0 ? Math.floor(elapsed) : Math.ceil(Math.max(0, duration - elapsed));
  const progress = sessionProgress(elapsed, duration);
  const [menu, setMenu] = useState(false);
  const [word, setWord] = useState<{ t: string; k: number } | null>(null);
  const touchX = useRef<number | null>(null);

  const { data = [] } = useQuery({ queryKey: ["nasa", col], queryFn: () => fetchCollection(col), staleTime: Infinity });
  const img = data.length ? data[i % data.length] : undefined;
  useEffect(() => setI(0), [col]);
  const go = (d: number) => data.length && setI((p) => (p + d + data.length) % data.length);

  // Sound while playing
  useEffect(() => {
    if (!playing) { playSound("off"); return undefined; }
    if (sound === "drift") {
      let k = Math.floor(Math.random() * DRIFT_ORDER.length);
        playSound(DRIFT_ORDER[k] ?? "cosmos");
      const id = setInterval(() => { k = (k + 1) % DRIFT_ORDER.length; playSound(DRIFT_ORDER[k] ?? "cosmos"); }, 120000);
      return () => clearInterval(id);
    }
    playSound(sound);
    return undefined;
  }, [playing, sound]);
  useEffect(() => setVolume(vol), [vol]);
  useEffect(() => () => playSound("off"), []);

  // One monotonic clock keeps the artwork and countdown synchronized.
  useEffect(() => {
    if (!playing) return undefined;
    const started = performance.now();
    const initial = elapsedRef.current;
    const id = setInterval(() => {
      const next = initial + (performance.now() - started) / 1000;
      elapsedRef.current = duration === 0 ? next : Math.min(duration, next);
      setElapsed(elapsedRef.current);
      if (duration > 0 && next >= duration) setPlaying(false);
    }, 50);
    return () => clearInterval(id);
  }, [playing, duration]);

  useEffect(() => {
    if (!playing || visual !== "nasa") return undefined;
    const id = setInterval(() => go(1), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visual, data.length]);

  // Whispers
  useEffect(() => {
    if (!playing || !whispers) { setWord(null); return undefined; }
    let k = 0;
    const show = () => setWord({ t: WHISPERS[Math.floor(Math.random() * WHISPERS.length)] ?? "be still", k: k++ });
    const first = setTimeout(show, 2500);
    const id = setInterval(show, 11000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [playing, whispers]);

  // Narration
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const s = window.speechSynthesis;
    s.cancel();
    if (!narrate || !playing || !img || visual !== "nasa") return;
    const u = new SpeechSynthesisUtterance(`${img.title}. ${img.description}`);
    const v = s.getVoices();
    u.voice = v.find((x) => /en-GB/i.test(x.lang)) ?? null;
    u.rate = 0.85; u.pitch = 0.85; u.volume = 0.9;
    s.speak(u);
  }, [narrate, playing, img?.id, img, visual]);

  const reset = () => {
    setPlaying(false);
    elapsedRef.current = 0;
    setElapsed(0);
  };
  const chooseDuration = (seconds: number) => {
    reset();
    setDuration(seconds);
  };

  const toggle = () => {
    if (playing) { setPlaying(false); return; }
    if (complete) { elapsedRef.current = 0; setElapsed(0); }
    setPlaying(true);
  };

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-background text-foreground"
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchX.current == null || menu || visual !== "nasa") return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="absolute inset-0 bg-halo" />
      {visual === "fractal" && <FractalMeditation progress={progress} />}
      {visual === "nasa" && img && (
        <img
          key={img.id}
          src={img.full}
          onError={(e) => { if (e.currentTarget.src !== img.thumb) e.currentTarget.src = img.thumb; }}
          alt={img.title}
          className={`absolute inset-0 h-full w-full animate-fadein animate-drift object-cover transition-opacity duration-[3000ms] ${playing ? "opacity-90" : "opacity-60"}`}
        />
      )}
      {visual === "nasa" && <div className="pointer-events-none absolute inset-0 bg-veil" />}

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-6">
        <a href="/" className="group flex items-center transition-opacity hover:opacity-80">
          <img
            src="./logo.png"
            alt="Motion and Still"
            className="h-10 w-10 object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:h-12 md:w-12"
          />
          <span className="sr-only">Motion and Still</span>
        </a>
        <Button variant="quiet" aria-label="Open menu" onClick={() => setMenu(true)} className="glossy grid h-11 w-11 place-items-center rounded-full">
          <Menu className="h-4 w-4" />
        </Button>
      </header>

      {/* Whisper */}
      {word && (
        <p key={word.k} className="pointer-events-none absolute inset-x-0 top-[24%] z-10 text-center font-display text-2xl italic lowercase text-foreground/80 animate-whisper">
          {word.t}
        </p>
      )}

      {/* Play */}
      <div className={`pointer-events-none absolute z-10 grid place-items-center ${visual === "fractal" ? "inset-x-0 bottom-12" : "inset-0"}`}>
        <div className="flex flex-col items-center gap-6">
          <Button variant="quiet"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            className={`pointer-events-auto glossy grid h-28 w-28 place-items-center rounded-full transition-transform active:scale-95 [&_svg]:size-9 ${playing ? "animate-breathe" : ""}`}
          >
            {playing ? <Pause className="h-9 w-9 fill-current opacity-90" /> : <Play className="ml-1.5 h-9 w-9 fill-current opacity-90" />}
          </Button>
          <p role="timer" aria-label="Session time" className="h-4 text-xs tracking-[0.35em] text-foreground/60">
            {playing || elapsed > 0 ? fmt(left) : DURATIONS.find((d) => d.s === duration)?.label.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Menu */}
      <div inert={!menu} aria-hidden={!menu} className={`absolute inset-0 z-30 transition-opacity duration-500 ${menu ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-background/40" onClick={() => setMenu(false)} />
        <aside className={`glass-sheet absolute inset-x-3 bottom-3 top-16 overflow-y-auto rounded-[2rem] p-6 transition-transform duration-500 md:left-auto md:w-96 ${menu ? "translate-y-0" : "translate-y-8"}`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl italic">Settings</h2>
            <Button variant="quiet" aria-label="Close menu" onClick={() => setMenu(false)} className="glossy grid h-9 w-9 place-items-center rounded-full"><X className="h-4 w-4" /></Button>
          </div>

          <Section title="Visual">
            <div className="grid grid-cols-2 gap-2">
              <Chip on={visual === "fractal"} onClick={() => setVisual("fractal")}><ScanLine className="h-4 w-4" />Fractal</Chip>
              <Chip on={visual === "nasa"} onClick={() => setVisual("nasa")}><Orbit className="h-4 w-4" />NASA skies</Chip>
            </div>
          </Section>

          <Section title="Session">
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => <Chip key={d.s} on={duration === d.s} onClick={() => chooseDuration(d.s)}>{d.label}</Chip>)}
            </div>
            {elapsed > 0 && <Button variant="ghost" onClick={reset} className="mt-3 text-foreground/60"><RotateCcw />Restart session</Button>}
          </Section>

          <Section title="Sound">
            <div className="grid grid-cols-5 gap-2">
              {SOUNDS.map(({ mode, label, Icon }) => (
                <Button variant="quiet" key={mode} onClick={() => setSound(mode)} className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition ${sound === mode ? "glossy text-foreground" : "text-foreground/60"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-foreground/50">Drift slowly blends between all soundscapes.</p>
            <input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(+e.target.value)} className="mt-4 h-1 w-full accent-primary" />
          </Section>

          <Section title="Voice">
            <Toggle label="Whispered words" on={whispers} onClick={() => setWhispers((w) => !w)} />
            {visual === "nasa" && <Toggle label="Narrate the sky" icon={<BookOpen className="h-3.5 w-3.5" />} on={narrate} onClick={() => setNarrate((n) => !n)} />}
          </Section>

          {visual === "nasa" && <Section title="Sky">
            <div className="flex flex-wrap gap-2">
              {COLLECTIONS.map((c) => <Chip key={c.key} on={col === c.key} onClick={() => setCol(c.key)}>{c.label}</Chip>)}
            </div>
            {img && (
              <div className="mt-4 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="quiet" aria-label="Previous image" onClick={() => go(-1)} className="text-foreground/60"><ChevronLeft className="h-4 w-4" /></Button>
                  <p className="flex-1 text-center font-display text-lg leading-tight">{img.title}</p>
                  <Button variant="quiet" aria-label="Next image" onClick={() => go(1)} className="text-foreground/60"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <p className="mt-2 max-h-32 overflow-y-auto text-xs leading-relaxed text-foreground/70">{img.description}</p>
                <p className="mt-2 text-[10px] tracking-wider text-foreground/40">{img.credit} · {img.date}</p>
              </div>
            )}
          </Section>}
          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <img src="./logo.png" alt="Motion and Still" className="h-8 w-8 object-contain opacity-40" />
            <p className="text-center text-[10px] tracking-[0.3em] text-foreground/40">{visual === "nasa" ? "IMAGES COURTESY OF NASA" : "MOTION AND STILL"}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 text-[10px] uppercase tracking-[0.35em] text-foreground/50">{title}</h3>
      {children}
    </section>
  );
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <Button variant="quiet" onClick={onClick} aria-pressed={on} className={`h-auto rounded-full px-3 py-2 text-[11px] tracking-wide transition ${on ? "glossy text-foreground" : "border border-border text-foreground/60"}`}>{children}</Button>;
}
function Toggle({ label, on, onClick, icon }: { label: string; on: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <Button variant="quiet" onClick={onClick} role="switch" aria-checked={on} className="flex h-auto w-full items-center justify-between py-2.5 text-sm text-foreground/85">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? "glossy" : "border border-border"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-foreground transition-all ${on ? "left-6" : "left-1 opacity-50"}`} />
      </span>
    </Button>
  );
}
