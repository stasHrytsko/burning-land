// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../../src/engine/levels';
import type { GameState } from '../../src/engine/types';
import { popupLose, popupWin } from '../../src/ui/popups';

function fakeState(overrides: Partial<GameState> = {}): GameState {
  return {
    grid: Array.from({ length: 8 }, () => Array(8).fill(0)) as GameState['grid'],
    houses: [[3, 3], [4, 4]],
    turn: 5,
    tray: [],
    sel: 0,
    over: false,
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="ovl"></div>';
});

describe('popupWin', () => {
  it('shows a "next level" button while there is a curated level left', () => {
    const onNext = vi.fn();
    popupWin(fakeState(), 0, { onNext, onAgain: vi.fn(), onLevels: vi.fn() });
    const btn = document.getElementById('btnNext')!;
    expect(btn.textContent).toBe('Уровень 2 →');
    btn.click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('switches to "Ещё →" once the last curated level is won', () => {
    const onNext = vi.fn();
    popupWin(fakeState(), LEVELS.length - 1, { onNext, onAgain: vi.fn(), onLevels: vi.fn() });
    const btn = document.getElementById('btnNext')!;
    expect(btn.textContent).toBe('Ещё →');
    btn.click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('keeps showing "Ещё →" for every further endless round', () => {
    popupWin(fakeState(), LEVELS.length, { onNext: vi.fn(), onAgain: vi.fn(), onLevels: vi.fn() });
    expect(document.getElementById('btnNext')!.textContent).toBe('Ещё →');

    popupWin(fakeState(), LEVELS.length + 12, { onNext: vi.fn(), onAgain: vi.fn(), onLevels: vi.fn() });
    expect(document.getElementById('btnNext')!.textContent).toBe('Ещё →');
  });

  it('wires "Ещё раз" and "К уровням" regardless of curated/endless state', () => {
    const onAgain = vi.fn();
    const onLevels = vi.fn();
    popupWin(fakeState(), LEVELS.length - 1, { onNext: vi.fn(), onAgain, onLevels });
    document.getElementById('btnAgain')!.click();
    document.getElementById('btnLvls')!.click();
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onLevels).toHaveBeenCalledTimes(1);
  });
});

describe('popupLose', () => {
  it('wires "Попробовать снова" and "К уровням"', () => {
    const onAgain = vi.fn();
    const onLevels = vi.fn();
    popupLose(fakeState({ over: 'lose' }), { onAgain, onLevels });
    document.getElementById('btnAgain')!.click();
    document.getElementById('btnLvls')!.click();
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onLevels).toHaveBeenCalledTimes(1);
  });
});
