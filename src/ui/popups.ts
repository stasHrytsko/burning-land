import { saveScore } from '../engine/game';
import { LEVELS } from '../engine/levels';
import type { GameState } from '../engine/types';

const ovl = () => {
  const el = document.getElementById('ovl');
  if (!el) throw new Error('#ovl not found');
  return el;
};

export function hidePopup() {
  ovl().innerHTML = '';
}

function showPopup(html: string) {
  ovl().innerHTML = `<div class="ovl"><div class="card">${html}</div></div>`;
}

export interface PopupHandlers {
  onNext?: () => void;
  onAgain: () => void;
  onLevels: () => void;
}

export function popupWin(state: GameState, curLevel: number, handlers: PopupHandlers) {
  const { saved, score } = saveScore(state);
  const hasNext = curLevel < LEVELS.length - 1;
  showPopup(`
    <div class="emoji">🛡</div>
    <h2 class="ok">Поздравляю, прошёл!</h2>
    <p>Домов спасено: <b>${saved}/${state.houses.length}</b> · Ходов: <b>${state.turn}</b></p>
    <div class="score">${score}</div>
    <div class="btns">
      ${hasNext ? `<button class="btn btn-go" id="btnNext">Уровень ${curLevel + 2} →</button>` : ''}
      <button class="btn btn-dim" id="btnAgain">Ещё раз</button>
      <button class="btn btn-dim" id="btnLvls">К уровням</button>
    </div>`);
  if (hasNext) {
    document.getElementById('btnNext')?.addEventListener('click', () => handlers.onNext?.());
  }
  document.getElementById('btnAgain')?.addEventListener('click', handlers.onAgain);
  document.getElementById('btnLvls')?.addEventListener('click', handlers.onLevels);
}

export function popupLose(state: GameState, handlers: PopupHandlers) {
  const { saved } = saveScore(state);
  showPopup(`
    <div class="emoji">🔥</div>
    <h2 class="bad">Дом сгорел</h2>
    <p>Спасено домов: <b>${saved}/${state.houses.length}</b></p>
    <p style="margin-top:6px">Огонь прорвался — где надо было ставить стенку?</p>
    <div class="btns" style="margin-top:20px">
      <button class="btn btn-go"  id="btnAgain">Попробовать снова</button>
      <button class="btn btn-dim" id="btnLvls">К уровням</button>
    </div>`);
  document.getElementById('btnAgain')?.addEventListener('click', handlers.onAgain);
  document.getElementById('btnLvls')?.addEventListener('click', handlers.onLevels);
}
