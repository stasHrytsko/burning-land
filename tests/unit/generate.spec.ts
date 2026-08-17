import { describe, expect, it } from 'vitest';
import { generateBoard } from '../../src/engine/generate';
import { LEVELS } from '../../src/engine/levels';
import { N } from '../../src/engine/shapes';
import type { Point } from '../../src/engine/types';
import { seededRng } from '../../src/engine/rng';

const manhattan = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const inBounds = (p: Point) => p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N;

describe('generateBoard', () => {
  it('is deterministic for a given rng seed', () => {
    const a = generateBoard(LEVELS[0]!, seededRng(123));
    const b = generateBoard(LEVELS[0]!, seededRng(123));
    expect(a).toEqual(b);
  });

  it.each(LEVELS.map((level, i) => [i, level] as const))(
    'level %i satisfies seed/house count and distance invariants across seeds',
    (levelIdx, level) => {
      for (let seed = 0; seed < 25; seed++) {
        const { grid, seeds, houses } = generateBoard(level, seededRng(seed * 1000 + levelIdx));

        expect(seeds.length).toBe(level.seeds);
        expect(houses.length).toBe(level.houses);

        seeds.forEach((s) => expect(inBounds(s)).toBe(true));
        houses.forEach((h) => expect(inBounds(h)).toBe(true));

        // очаг→дом дистанция гарантирует «можно спасти все дома» (см. CLAUDE.md)
        for (const h of houses) {
          for (const s of seeds) {
            expect(manhattan(h, s)).toBeGreaterThanOrEqual(level.minDist);
          }
        }

        // дома не слипаются друг с другом
        for (let i = 0; i < houses.length; i++) {
          for (let j = i + 1; j < houses.length; j++) {
            expect(manhattan(houses[i]!, houses[j]!)).toBeGreaterThanOrEqual(2);
          }
        }

        // очаги не занимают одну и ту же клетку
        for (let i = 0; i < seeds.length; i++) {
          for (let j = i + 1; j < seeds.length; j++) {
            expect(manhattan(seeds[i]!, seeds[j]!)).toBeGreaterThanOrEqual(1);
          }
        }

        // каждый очаг помечен на сетке как огонь (2), дома остаются травой (0) до старта игры
        seeds.forEach(([r, c]) => expect(grid[r]![c]).toBe(2));
        houses.forEach(([r, c]) => expect(grid[r]![c]).toBe(0));
      }
    },
  );

  it('corner levels keep seeds away from the board center', () => {
    const cornerLevel = LEVELS[0]!;
    expect(cornerLevel.zone).toBe('corner');
    for (let seed = 0; seed < 25; seed++) {
      const { seeds } = generateBoard(cornerLevel, seededRng(seed));
      for (const [r, c] of seeds) {
        const nearCorner = (r <= 2 || r >= N - 3) && (c <= 2 || c >= N - 3);
        expect(nearCorner).toBe(true);
      }
    }
  });
});
