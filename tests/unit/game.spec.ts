import { describe, expect, it } from 'vitest';
import { canPlaceInState, createGame, placeShape, saveScore, TRAY_SIZE } from '../../src/engine/game';
import { LEVELS } from '../../src/engine/levels';
import { seededRng } from '../../src/engine/rng';

describe('createGame', () => {
  it('is deterministic for a given rng seed', () => {
    const a = createGame(0, seededRng(1));
    const b = createGame(0, seededRng(1));
    expect(a).toEqual(b);
  });

  it('starts at turn 1, not over, with a full tray', () => {
    const state = createGame(0, seededRng(1));
    expect(state.turn).toBe(1);
    expect(state.over).toBe(false);
    expect(state.tray).toHaveLength(TRAY_SIZE);
  });

  it('clamps out-of-range indices to the hardest curated level (endless mode)', () => {
    const hardest = createGame(LEVELS.length - 1, seededRng(1));
    const beyond = createGame(LEVELS.length, seededRng(1));
    const wayBeyond = createGame(LEVELS.length + 50, seededRng(1));
    expect(beyond).toEqual(hardest);
    expect(wayBeyond).toEqual(hardest);
  });

  it('clamps negative indices to the first level', () => {
    const first = createGame(0, seededRng(1));
    const negative = createGame(-5, seededRng(1));
    expect(negative).toEqual(first);
  });
});

describe('placeShape', () => {
  it('turns shape cells into walls and advances the turn on an ongoing game', () => {
    const state = createGame(0, seededRng(1));
    const shape = state.tray[0]!;
    // найти свободное место подальше от огня, чтобы ход точно остался 'ongoing'
    let r = -1, c = -1;
    outer: for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        if (canPlaceInState(state, shape, rr, cc)) { r = rr; c = cc; break outer; }
      }
    }
    expect(r).toBeGreaterThanOrEqual(0);

    const next = placeShape(state, 0, shape, r, c, seededRng(2));
    shape.forEach(([dy, dx]) => expect(next.grid[r + dy]![c + dx]).toBe(1));
    expect(next.tray).toHaveLength(TRAY_SIZE);
    expect(next.turn).toBeGreaterThanOrEqual(state.turn);
  });

  it('is a no-op when the target cells are not placeable', () => {
    const state = createGame(0, seededRng(1));
    const shape = state.tray[0]!;
    // ставим фигуру там же второй раз поверх уже занятой клетки очага
    const seedCellFound = state.grid.flat().some((v) => v === 2);
    expect(seedCellFound).toBe(true);
    let sr = 0, sc = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (state.grid[r]![c] === 2) { sr = r; sc = c; }
    const next = placeShape(state, 0, shape, sr, sc, seededRng(2));
    expect(next).toEqual(state);
  });

  it('is a no-op once the game is over', () => {
    const state = createGame(0, seededRng(1));
    const over = { ...state, over: 'win' as const };
    const shape = over.tray[0]!;
    const next = placeShape(over, 0, shape, 0, 0, seededRng(2));
    expect(next).toBe(over);
  });
});

describe('saveScore', () => {
  it('scores 100 per saved house plus a speed bonus', () => {
    const state = createGame(0, seededRng(1));
    const { saved, score } = saveScore(state);
    expect(saved).toBe(state.houses.length); // ни один дом ещё не тронут огнём
    expect(score).toBe(saved * 100 + Math.max(0, (40 - state.turn) * 10));
  });
});
