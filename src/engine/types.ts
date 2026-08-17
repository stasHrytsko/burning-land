/** 0 трава, 1 стена, 2 огонь, 3 выгоревшее */
export type CellValue = 0 | 1 | 2 | 3;

export type Grid = CellValue[][];

/** Клетка фигуры как смещение [dy, dx] от опорной точки */
export type ShapeCell = [number, number];
export type Shape = ShapeCell[];

export type Point = [number, number];

export type Zone = 'corner' | 'edge';

export interface Level {
  seeds: number;
  houses: number;
  minDist: number;
  zone: Zone;
}

export type GameStatus = false | 'win' | 'lose';

export interface GameState {
  grid: Grid;
  houses: Point[];
  turn: number;
  tray: Shape[];
  sel: number;
  over: GameStatus;
}

/** Источник случайности, инжектируемый для детерминированных тестов. Возвращает [0, 1). */
export type Rng = () => number;
