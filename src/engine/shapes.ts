import type { Rng, Shape } from './types';

export const N = 8;

export const SHAPES: Shape[] = [
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0]],
];

export const rndInt = (rng: Rng, n: number) => (rng() * n) | 0;

/** Случайная фигура из трея: 10% шанс на моно-клетку, иначе один из 7 базовых блоков. */
export function randShape(rng: Rng = Math.random): Shape {
  const shape = SHAPES[7];
  if (shape === undefined) throw new Error('SHAPES[7] missing');
  const pool = rng() < 0.1 ? [shape] : SHAPES.slice(0, 7);
  const picked = pool[rndInt(rng, pool.length)];
  if (picked === undefined) throw new Error('empty shape pool');
  return picked.map(([y, x]) => [y, x]);
}

/** Поворот на 90° с нормализацией координат к неотрицательным значениям. */
export function rotate(cells: Shape): Shape {
  const r = cells.map(([y, x]): ShapeCellTuple => [x, -y]);
  const my = Math.min(...r.map((p) => p[0]));
  const mx = Math.min(...r.map((p) => p[1]));
  return r.map(([y, x]) => [y - my, x - mx]);
}

type ShapeCellTuple = [number, number];

export function centerOffset(shape: Shape): [number, number] {
  const maxY = Math.max(...shape.map(([y]) => y));
  const maxX = Math.max(...shape.map(([, x]) => x));
  return [maxY >> 1, maxX >> 1];
}
