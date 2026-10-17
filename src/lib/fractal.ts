export type Point = { x: number; y: number };

// Hilbert's recursive space-filling curve: adjacent samples stay connected.
export function hilbertPoint(order: number, index: number): Point {
  const size = 2 ** order;
  let x = 0;
  let y = 0;
  let t = index;
  for (let s = 1; s < size; s *= 2) {
    const rx = 1 & Math.floor(t / 2);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      [x, y] = [y, x];
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return size === 1 ? { x: 0, y: 0 } : { x: x / (size - 1) - 0.5, y: y / (size - 1) - 0.5 };
}

export function sessionProgress(elapsed: number, duration: number): number {
  const seconds = Math.max(0, elapsed);
  // Open-ended sessions approach stillness without a deadline or a visual reset.
  return duration === 0 ? seconds / (seconds + 180) : Math.min(1, seconds / duration);
}

export function fractalStage(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const level = (1 - p) * 6;
  const order = Math.ceil(level);
  const fraction = order - level;
  return { order, blend: fraction * fraction * (3 - 2 * fraction), scale: (1 - p) ** 0.65 };
}