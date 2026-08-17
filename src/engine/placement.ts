import { N } from './shapes';
import type { Grid, Point, Shape } from './types';

export const isHouse = (houses: Point[], r: number, c: number): boolean =>
  houses.some((h) => h[0] === r && h[1] === c);

export function cellsFor(shape: Shape, r: number, c: number): Point[] {
  return shape.map(([dy, dx]): Point => [r + dy, c + dx]);
}

export function canPlace(grid: Grid, houses: Point[], shape: Shape, r: number, c: number): boolean {
  return cellsFor(shape, r, c).every(
    ([y, x]) => y >= 0 && y < N && x >= 0 && x < N && grid[y]?.[x] === 0 && !isHouse(houses, y, x),
  );
}
