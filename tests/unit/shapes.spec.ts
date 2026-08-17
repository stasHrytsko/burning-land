import { describe, expect, it } from 'vitest';
import { SHAPES, centerOffset, randShape, rotate } from '../../src/engine/shapes';
import { seededRng } from '../../src/engine/rng';

const cellSet = (shape: readonly (readonly [number, number])[]) =>
  new Set(shape.map(([y, x]) => `${y},${x}`));

describe('rotate', () => {
  it('normalizes coordinates to start at 0,0', () => {
    for (const shape of SHAPES) {
      const rotated = rotate(shape);
      const minY = Math.min(...rotated.map(([y]) => y));
      const minX = Math.min(...rotated.map(([, x]) => x));
      expect(minY).toBe(0);
      expect(minX).toBe(0);
    }
  });

  it('preserves the number of cells', () => {
    for (const shape of SHAPES) {
      expect(rotate(shape).length).toBe(shape.length);
    }
  });

  it('returns to the original shape after 4 rotations', () => {
    for (const shape of SHAPES) {
      let rotated = shape;
      for (let i = 0; i < 4; i++) rotated = rotate(rotated);
      expect(cellSet(rotated)).toEqual(cellSet(shape));
    }
  });
});

describe('centerOffset', () => {
  it('is [0,0] for a single cell', () => {
    expect(centerOffset([[0, 0]])).toEqual([0, 0]);
  });

  it('floors the midpoint of the bounding box', () => {
    // I-piece 0,0 0,1 0,2 → maxY=0, maxX=2 → offset [0, 1]
    expect(centerOffset([[0, 0], [0, 1], [0, 2]])).toEqual([0, 1]);
  });
});

describe('randShape', () => {
  it('is deterministic for a given rng sequence', () => {
    const a = randShape(seededRng(42));
    const b = randShape(seededRng(42));
    expect(cellSet(a)).toEqual(cellSet(b));
  });

  it('only ever returns cells present in the SHAPES catalog', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 200; i++) {
      const shape = randShape(rng);
      const matches = SHAPES.some((s) => cellSet(s).size === cellSet(shape).size &&
        [...cellSet(shape)].every((k) => cellSet(s).has(k)));
      expect(matches).toBe(true);
    }
  });
});
