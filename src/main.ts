import './style.css';
import { getGameScene, mountGame, startLevel } from './game/boot';
import { setupNavigation, showPage } from './ui/pages';
import { hidePopup, popupLose, popupWin } from './ui/popups';
import { seededRng } from './engine/rng';
import type { GameState, Rng } from './engine/types';

let curLevel = 0;

// dev/e2e-хук: ?seed=N делает генерацию поля и трея воспроизводимой (см. tests/e2e).
const devSeed = import.meta.env.DEV ? new URLSearchParams(location.search).get('seed') : null;
const devRng: Rng | undefined = devSeed !== null ? seededRng(Number(devSeed)) : undefined;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

function updateStats(state: GameState, warn: boolean) {
  const saved = state.houses.filter(([r, c]) => state.grid[r]?.[c] !== 2).length;
  $('houses').textContent = `${saved}/${state.houses.length}`;
  $('turn').textContent = String(state.turn);
  $('warn').textContent = warn ? '⚠ Огонь у дома! Защити его этим ходом' : '';
  if (import.meta.env.DEV) (window as unknown as { __gameState?: GameState }).__gameState = state;
}

function startGame(levelIdx: number) {
  curLevel = levelIdx;
  $('lvlNum').textContent = String(levelIdx + 1);
  hidePopup();
  mountGame('phaser-root');
  startLevel(
    levelIdx,
    {
      onStateChange: updateStats,
      onGameOver: (status, state) => {
        if (import.meta.env.DEV) (window as unknown as { __gameOver?: string }).__gameOver = status;
        if (status === 'win') {
          popupWin(state, curLevel, {
            onNext: () => startGame(curLevel + 1),
            onAgain: () => startGame(curLevel),
            onLevels: () => { hidePopup(); showPage(2); },
          });
        } else {
          popupLose(state, {
            onAgain: () => startGame(curLevel),
            onLevels: () => { hidePopup(); showPage(2); },
          });
        }
      },
    },
    devRng,
  );
}

setupNavigation((levelIdx) => startGame(levelIdx));

$('rotateBtn').addEventListener('click', () => getGameScene()?.rotateSelected());
$('restartBtn').addEventListener('click', () => getGameScene()?.restart());

if (import.meta.env.DEV) {
  (window as unknown as { __pickLevel?: (i: number) => void }).__pickLevel = (i: number) => {
    showPage(3);
    startGame(i);
  };
}
