import { generateBoard } from './generate';
import { spreadFire } from './fire';
import { canPlace, cellsFor } from './placement';
import { LEVELS } from './levels';
import { randShape } from './shapes';
import type { GameState, Level, Rng, Shape } from './types';

export const TRAY_SIZE = 6;

/**
 * Уровни за пределами курируемого списка (endless-режим, кнопка «Ещё») переиспользуют
 * конфиг самого сложного уровня — индекс клампится, а не выбрасывает ошибку.
 */
export function resolveLevel(levelIdx: number): Level {
  const clamped = Math.max(0, Math.min(levelIdx, LEVELS.length - 1));
  const level = LEVELS[clamped];
  if (!level) throw new Error('LEVELS is empty');
  return level;
}

export function createGame(levelIdx: number, rng: Rng = Math.random): GameState {
  const level = resolveLevel(levelIdx);
  const { grid, houses } = generateBoard(level, rng);
  return {
    grid,
    houses,
    turn: 1,
    tray: Array.from({ length: TRAY_SIZE }, () => randShape(rng)),
    sel: 0,
    over: false,
  };
}

export function canPlaceInState(state: GameState, shape: Shape, r: number, c: number): boolean {
  return canPlace(state.grid, state.houses, shape, r, c);
}

/**
 * Ставит фигуру, сдвигает трей, запускает ход огня.
 * Ход счётчика (turn++) — только если игра продолжается ('ongoing'); при немедленной
 * победе/поражении текущий ход остаётся видимым, как и в исходной game.js.
 */
export function placeShape(
  state: GameState,
  trayIndex: number,
  shape: Shape,
  r: number,
  c: number,
  rng: Rng = Math.random,
): GameState {
  if (state.over) return state;
  if (!canPlaceInState(state, shape, r, c)) return state;

  const grid = state.grid.map((row) => [...row]) as GameState['grid'];
  cellsFor(shape, r, c).forEach(([y, x]) => { grid[y]![x] = 1; });

  const tray = state.tray.slice();
  tray.splice(trayIndex, 1);
  tray.push(randShape(rng));

  const fire = spreadFire(grid, state.houses);
  const over = fire.status === 'ongoing' ? false : fire.status;

  return {
    grid: fire.grid,
    houses: state.houses,
    turn: fire.status === 'ongoing' ? state.turn + 1 : state.turn,
    tray,
    sel: 0,
    over,
  };
}

export function saveScore(state: GameState): { saved: number; score: number } {
  const saved = state.houses.filter(([r, c]) => state.grid[r]?.[c] !== 2).length;
  const score = saved * 100 + Math.max(0, (40 - state.turn) * 10);
  return { saved, score };
}
