import { N, rndInt } from './shapes';
import type { Grid, Level, Point, Rng } from './types';

export interface GeneratedBoard {
  grid: Grid;
  seeds: Point[];
  houses: Point[];
}

const manhattan = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/**
 * Расставляет очаги огня и дома по правилам уровня.
 * Очаги одного уровня кучкуются на одной стороне (общий side+anchor) → единый фронт.
 * Гарантия «спасти все дома» держится на minDist огонь→дом (см. CLAUDE.md).
 */
export function generateBoard(level: Level, rng: Rng = Math.random): GeneratedBoard {
  const grid: Grid = Array.from({ length: N }, () => Array(N).fill(0));

  const side = rndInt(rng, 4);
  const anchor = 2 + rndInt(rng, N - 4);
  const seeds: Point[] = [];
  let t = 0;
  while (seeds.length < level.seeds && t++ < 200) {
    let r: number, c: number;
    if (level.zone === 'edge') {
      const along = Math.max(1, Math.min(N - 2, anchor + rndInt(rng, 3) - 1)); // ±1 от якоря вдоль края
      const depth = rndInt(rng, 2); // 0–1 клетка от границы
      if (side === 0) { r = depth; c = along; }
      else if (side === 1) { r = N - 1 - depth; c = along; }
      else if (side === 2) { r = along; c = depth; }
      else { r = along; c = N - 1 - depth; }
    } else { // corner
      const e = rndInt(rng, 4);
      if (e === 0) { r = rndInt(rng, 2); c = rndInt(rng, 3); }
      else if (e === 1) { r = N - 1 - rndInt(rng, 2); c = N - 1 - rndInt(rng, 3); }
      else if (e === 2) { r = rndInt(rng, 3); c = N - 1 - rndInt(rng, 2); }
      else { r = N - 1 - rndInt(rng, 3); c = rndInt(rng, 2); }
    }
    if (grid[r]?.[c] !== 0) continue;
    if (seeds.some((s) => manhattan(s, [r, c]) < 1)) continue; // не на одной клетке
    seeds.push([r, c]);
    grid[r]![c] = 2;
  }

  const houses: Point[] = [];
  t = 0;
  while (houses.length < level.houses && t++ < 300) {
    const r = 1 + rndInt(rng, N - 2);
    const c = 1 + rndInt(rng, N - 2);
    if (grid[r]?.[c] !== 0) continue;
    if (houses.some((h) => manhattan(h, [r, c]) < 2)) continue;
    if (seeds.some((s) => manhattan(s, [r, c]) < level.minDist)) continue;
    houses.push([r, c]);
  }

  return { grid, seeds, houses };
}
