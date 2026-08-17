import { N } from './shapes';
import type { Grid, Point } from './types';

const NEIGHBORS: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Клетки, которые загорятся следующим ходом (ключ = r*N+c). Пусто = огонь заперт. */
export function nextBurn(grid: Grid): Set<number> {
  const set = new Set<number>();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r]?.[c] !== 2) continue;
      for (const [dy, dx] of NEIGHBORS) {
        const y = r + dy;
        const x = c + dx;
        if (y >= 0 && y < N && x >= 0 && x < N && grid[y]?.[x] === 0) set.add(y * N + x);
      }
    }
  }
  return set;
}

export type FireStatus = 'ongoing' | 'win' | 'lose';

export interface FireResult {
  grid: Grid;
  status: FireStatus;
}

/**
 * Один ход огня: текущий фронт (2) выгорает в 3, соседи-трава (0) загораются в 2.
 * 'win' — огню больше некуда расти (до или после хода), 'lose' — огонь дошёл до дома.
 */
export function spreadFire(grid: Grid, houses: Point[]): FireResult {
  const g = grid.map((row) => [...row]) as Grid;

  if (nextBurn(g).size === 0) return { grid: g, status: 'win' };

  const fireCells: Point[] = [];
  const addSet = new Set<number>();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (g[r]?.[c] !== 2) continue;
      fireCells.push([r, c]);
      for (const [dy, dx] of NEIGHBORS) {
        const y = r + dy;
        const x = c + dx;
        if (y >= 0 && y < N && x >= 0 && x < N && g[y]?.[x] === 0) addSet.add(y * N + x);
      }
    }
  }

  fireCells.forEach(([r, c]) => { g[r]![c] = 3; });
  for (const key of addSet) {
    const y = (key / N) | 0;
    const x = key % N;
    g[y]![x] = 2;
  }

  if (houses.some((h) => g[h[0]!]?.[h[1]!] === 2)) return { grid: g, status: 'lose' };
  if (nextBurn(g).size === 0) return { grid: g, status: 'win' };
  return { grid: g, status: 'ongoing' };
}
