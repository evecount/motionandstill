import { describe, expect, it } from "vitest";
import { fractalStage, hilbertPoint, sessionProgress } from "./fractal";

describe("fractal meditation", () => {
  it.each([90, 180, 300])("reaches the dot at exactly %s seconds", (duration) => {
    expect(sessionProgress(0, duration)).toBe(0);
    expect(sessionProgress(duration / 2, duration)).toBe(0.5);
    expect(fractalStage(sessionProgress(duration, duration))).toEqual({ order: 0, blend: 0, scale: 0 });
    expect(sessionProgress(duration + 10, duration)).toBe(1);
  });
  it("simplifies continuously and keeps endless sessions open", () => {
    expect(fractalStage(0).order).toBe(6);
    expect(fractalStage(0.5).order).toBe(3);
    expect(sessionProgress(300, 0)).toBeLessThan(1);
    expect(sessionProgress(600, 0)).toBeGreaterThan(sessionProgress(300, 0));
  });
  it("generates a connected maze with unique points", () => {
    const order = 4;
    const points = Array.from({ length: 4 ** order }, (_, i) => hilbertPoint(order, i));
    expect(new Set(points.map(({ x, y }) => `${x},${y}`)).size).toBe(4 ** order);
    points.forEach((point, i) => {
      const previous = points[i - 1];
      if (previous) expect(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)).toBeCloseTo(1 / (2 ** order - 1));
    });
    expect(hilbertPoint(0, 0)).toEqual({ x: 0, y: 0 });
  });
});