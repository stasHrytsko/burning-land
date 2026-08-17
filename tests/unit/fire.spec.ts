import { describe, expect, it } from 'vitest';
import { nextBurn, spreadFire } from '../../src/engine/fire';
import { N } from '../../src/engine/shapes';
import type { Grid, Point } from '../../src/engine/types';

const emptyGrid = (): Grid => Array.from({ length: N }, () => Array(N).fill(0)) as Grid;

describe('nextBurn', () => {
  it('is empty on a grid with no fire', () => {
    expect(nextBurn(emptyGrid()).size).toBe(0);
  });

  it('finds the 4-neighbors of a single fire cell in the corner', () => {
    const grid = emptyGrid();
    grid[0]![0] = 2;
    const burn = nextBurn(grid);
    expect(burn).toEqual(new Set([0 * N + 1, 1 * N + 0]));
  });

  it('does not include walls or burnt cells as burnable', () => {
    const grid = emptyGrid();
    grid[3]![3] = 2;
    grid[3]![4] = 1; // wall
    grid[3]![2] = 3; // burnt
    const burn = nextBurn(grid);
    expect(burn.has(3 * N + 4)).toBe(false);
    expect(burn.has(3 * N + 2)).toBe(false);
    expect(burn.has(2 * N + 3)).toBe(true);
    expect(burn.has(4 * N + 3)).toBe(true);
  });
});

describe('spreadFire', () => {
  it('is a no-op win when fire is already fully enclosed', () => {
    const grid = emptyGrid();
    grid[4]![4] = 2;
    grid[3]![4] = 1;
    grid[5]![4] = 1;
    grid[4]![3] = 1;
    grid[4]![5] = 1;
    const result = spreadFire(grid, []);
    expect(result.status).toBe('win');
    expect(result.grid[4]![4]).toBe(2); // фронт остаётся видимым, как в исходной игре
  });

  it('burns the current front and ignites its neighbors', () => {
    const grid = emptyGrid();
    grid[0]![0] = 2;
    const result = spreadFire(grid, []);
    expect(result.status).toBe('ongoing');
    expect(result.grid[0]![0]).toBe(3);
    expect(result.grid[0]![1]).toBe(2);
    expect(result.grid[1]![0]).toBe(2);
  });

  it('does not mutate the input grid', () => {
    const grid = emptyGrid();
    grid[0]![0] = 2;
    spreadFire(grid, []);
    expect(grid[0]![0]).toBe(2);
  });

  it('reports lose when fire reaches a house', () => {
    const grid = emptyGrid();
    grid[2]![2] = 2;
    const house: Point = [2, 3];
    const result = spreadFire(grid, [house]);
    expect(result.status).toBe('lose');
    expect(result.grid[2]![3]).toBe(2);
  });

  it('reports win once fire fills an enclosed pocket with nowhere left to spread', () => {
    // 2x2 огороженный стенами карман, огонь в углу комнаты — несколько ходов, пока не выгорит всё
    const grid = emptyGrid();
    for (let c = 1; c <= 4; c++) { grid[1]![c] = 1; grid[4]![c] = 1; }
    for (let r = 1; r <= 4; r++) { grid[r]![1] = 1; grid[r]![4] = 1; }
    grid[2]![2] = 2;

    let current = grid;
    let status: ReturnType<typeof spreadFire>['status'] = 'ongoing';
    for (let i = 0; i < 10 && status === 'ongoing'; i++) {
      const result = spreadFire(current, []);
      current = result.grid;
      status = result.status;
    }
    expect(status).toBe('win');
    // комната выгорела, последний зажжённый фронт остаётся видимым (как и на первом ходе), стены целы
    expect(current[2]![2]).toBe(3);
    expect(current[2]![3]).toBe(3);
    expect(current[3]![2]).toBe(3);
    expect(current[3]![3]).toBe(2);
    expect(current[1]![1]).toBe(1);
  });
});
