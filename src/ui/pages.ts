import { LEVELS } from '../engine/levels';

const $ = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
};

export function showPage(n: 1 | 2 | 3) {
  (['page1', 'page2', 'page3'] as const).forEach((id, i) => {
    $(id).classList.toggle('hidden', i + 1 !== n);
  });
}

/** Навигация между страницами + сетка выбора уровня. onPickLevel запускает игру на странице 3. */
export function setupNavigation(onPickLevel: (levelIdx: number) => void) {
  $('tolevels').addEventListener('click', () => showPage(2));
  $('p2back').addEventListener('click', () => showPage(1));
  $('gameBack').addEventListener('click', () => showPage(2));

  const lvlGrid = $('lvlGrid');
  LEVELS.forEach((_, i) => {
    const row = (i / 3) | 0;
    const cls = row === 0 ? 'easy' : row === 1 ? 'med' : 'hard';
    const label = row === 0 ? 'Легко' : row === 1 ? 'Средне' : 'Сложно';
    const btn = document.createElement('button');
    btn.className = `lvl-btn ${cls}`;
    btn.innerHTML = `<span class="n">${i + 1}</span><span class="d">${label}</span>`;
    btn.addEventListener('pointerdown', () => {
      showPage(3);
      onPickLevel(i);
    });
    lvlGrid.appendChild(btn);
  });
}
