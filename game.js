(() => {
const N = 8;
const $ = id => document.getElementById(id);
const board = $('board');
const rnd = n => Math.random() * n | 0;

// ── Навигация ──
function showPage(n) {
  ['page1', 'page2', 'page3'].forEach((id, i) => {
    $(id).classList.toggle('hidden', i + 1 !== n);
  });
}
$('tolevels').onclick = () => showPage(2);
$('p2back').onclick   = () => showPage(1);
$('gameBack').onclick = () => showPage(2);

// ── Конфиги уровней ──
// seeds=очаги, houses=дома, minDist=мин.дистанция очаг→дом
// zone: 'corner' — огонь в углу (расползается в четверть, легко), 'edge' — широкий фронт у края
const LEVELS = [
  { seeds:1, houses:2, minDist:5, zone:'corner' }, // 1 легко
  { seeds:1, houses:3, minDist:5, zone:'corner' }, // 2
  { seeds:1, houses:3, minDist:4, zone:'corner' }, // 3
  { seeds:1, houses:3, minDist:5, zone:'edge'   }, // 4 средне
  { seeds:2, houses:4, minDist:5, zone:'edge'   }, // 5
  { seeds:2, houses:4, minDist:4, zone:'edge'   }, // 6
  { seeds:2, houses:4, minDist:5, zone:'edge'   }, // 7 сложно
  { seeds:3, houses:5, minDist:5, zone:'edge'   }, // 8
  { seeds:3, houses:5, minDist:4, zone:'edge'   }, // 9
];

// ── Сетка выбора уровней ──
const lvlGrid = $('lvlGrid');
LEVELS.forEach((lv, i) => {
  const row = i / 3 | 0;
  const cls   = row === 0 ? 'easy' : row === 1 ? 'med' : 'hard';
  const label = row === 0 ? 'Легко' : row === 1 ? 'Средне' : 'Сложно';
  const btn = document.createElement('button');
  btn.className = `lvl-btn ${cls}`;
  btn.innerHTML = `<span class="n">${i + 1}</span><span class="d">${label}</span>`;
  btn.addEventListener('pointerdown', () => pickLevel(i));
  lvlGrid.appendChild(btn);
});

function pickLevel(idx) {
  showPage(3);
  start(idx);
}

// ── Фигуры ──
const SHAPES = [
  [[0,0],[0,1]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[0,1],[1,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0]],
  [[0,0],[0,1],[1,1],[1,2]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,0]],
];
function randShape() {
  const pool = Math.random() < .1 ? [SHAPES[7]] : SHAPES.slice(0, 7);
  return pool[rnd(pool.length)].map(p => [...p]);
}
function rotate(cells) {
  const r = cells.map(([y, x]) => [x, -y]);
  const my = Math.min(...r.map(p => p[0])), mx = Math.min(...r.map(p => p[1]));
  return r.map(([y, x]) => [y - my, x - mx]);
}
function centerOffset(shape) {
  const maxY = Math.max(...shape.map(([y]) => y));
  const maxX = Math.max(...shape.map(([, x]) => x));
  return [maxY >> 1, maxX >> 1];
}

// ── Состояние игры ──
let S = null, curLevel = 0;

function start(lvIdx) {
  if (lvIdx != null) curLevel = lvIdx;
  const lv = LEVELS[curLevel];
  $('lvlNum').textContent = curLevel + 1;

  const grid = Array.from({ length: N }, () => Array(N).fill(0));

  // Расставляем очаги
  // для 'edge' выбираем одну сторону и точку на ней — очаги кучкуются в один фронт
  const side = rnd(4);
  const anchor = 2 + rnd(N - 4);
  const seeds = []; let t = 0;
  while (seeds.length < lv.seeds && t++ < 200) {
    let r, c;
    if (lv.zone === 'edge') {
      const along = Math.max(1, Math.min(N - 2, anchor + rnd(3) - 1)); // ±1 от якоря вдоль края
      const depth = rnd(2);                                            // 0–1 клетка от границы
      if      (side === 0) { r = depth;       c = along; }
      else if (side === 1) { r = N-1-depth;   c = along; }
      else if (side === 2) { r = along;       c = depth; }
      else                 { r = along;       c = N-1-depth; }
    } else { // corner
      const e = rnd(4);
      if      (e === 0) { r = rnd(2);     c = rnd(3); }
      else if (e === 1) { r = N-1-rnd(2); c = N-1-rnd(3); }
      else if (e === 2) { r = rnd(3);     c = N-1-rnd(2); }
      else              { r = N-1-rnd(3); c = rnd(2); }
    }
    if (grid[r][c] !== 0) continue;
    if (seeds.some(s => Math.abs(s[0]-r) + Math.abs(s[1]-c) < 1)) continue; // не на одной клетке
    seeds.push([r, c]); grid[r][c] = 2;
  }

  // Расставляем дома
  const houses = []; t = 0;
  while (houses.length < lv.houses && t++ < 300) {
    const r = 1 + rnd(N-2), c = 1 + rnd(N-2);
    if (grid[r][c] !== 0) continue;
    if (houses.some(h => Math.abs(h[0]-r) + Math.abs(h[1]-c) < 2)) continue;
    if (seeds.some(s => Math.abs(s[0]-r) + Math.abs(s[1]-c) < lv.minDist)) continue;
    houses.push([r, c]);
  }

  S = { grid, houses, turn:1, tray:Array.from({length:6}, randShape), sel:0, over:false, ghost:null, dragging:false };
  buildBoard(); renderTray(); render(); hidePopup();
}

// ── Доска ──
function buildBoard() {
  board.innerHTML = '';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const d = document.createElement('div');
    d.className = 'c'; d.dataset.r = r; d.dataset.c = c;
    board.appendChild(d);
  }
}

// ── Перетаскивание блока из трея ──
// Нажал на блок → сразу «поднял» и тащишь: превью едет за пальцем.
// Отпустил над свободной клеткой = поставить, мимо = отмена. Никаких тапов/удержаний.
let press = null; // {i, x, y, el}

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const c = el.closest?.('.c') || el;
  return (c && c.dataset && c.dataset.r != null) ? [+c.dataset.r, +c.dataset.c] : null;
}
function anchorFor(pr, pc) {
  const [oy, ox] = centerOffset(S.tray[S.sel]);
  return [pr - oy, pc - ox];
}
// Обновляет превью под текущей точкой пальца (или прячет, если палец не над доской)
function ghostFromPoint(x, y) {
  const pos = cellFromPoint(x, y);
  if (pos) { const [ar, ac] = anchorFor(pos[0], pos[1]); S.ghost = [S.tray[S.sel], ar, ac]; }
  else S.ghost = null;
  render();
}
function placeAim() {
  const [sh, ar, ac] = S.ghost;
  cellsFor(sh, ar, ac).forEach(([y, x]) => S.grid[y][x] = 1);
  S.tray.splice(S.sel, 1); S.tray.push(randShape());
  S.sel = 0; S.ghost = null; S.dragging = false; spreadFire();
}

function trayDown(e, i, el) {
  if (!S || S.over) return;
  e.preventDefault();
  S.sel = i; S.dragging = true; S.ghost = null;
  renderTray(); render();
  press = { i, x: e.clientX, y: e.clientY, el };
  el.classList.add('lifting');              // блок «поднят» и едет за пальцем
  if (navigator.vibrate) navigator.vibrate(15);
  ghostFromPoint(e.clientX, e.clientY);
  window.addEventListener('pointermove', trayMove);
  window.addEventListener('pointerup', trayUp);
  window.addEventListener('pointercancel', trayUp);
}
function trayMove(e) {
  if (!press) return;
  e.preventDefault();
  press.x = e.clientX; press.y = e.clientY;
  ghostFromPoint(e.clientX, e.clientY);
}
function trayUp() {
  if (!press) return;
  press.el.classList.remove('lifting');
  window.removeEventListener('pointermove', trayMove);
  window.removeEventListener('pointerup', trayUp);
  window.removeEventListener('pointercancel', trayUp);
  press = null;
  if (S.ghost && canPlace(S.ghost[0], S.ghost[1], S.ghost[2])) placeAim();
  else { S.ghost = null; S.dragging = false; render(); } // отпустил мимо/невалидно — отмена
}

const cellAt  = (r, c) => board.children[r * N + c];
const isHouse = (r, c) => S.houses.some(h => h[0] === r && h[1] === c);
function cellsFor(shape, r, c) { return shape.map(([dy, dx]) => [r+dy, c+dx]); }
function canPlace(shape, r, c) {
  return cellsFor(shape, r, c).every(([y, x]) =>
    y >= 0 && y < N && x >= 0 && x < N && S.grid[y][x] === 0 && !isHouse(y, x));
}

// ── Логика огня ──
function win() {
  S.over = 'win'; render(); setTimeout(() => popupWin(), 500);
}
function spreadFire() {
  // Огонь уже заперт — победа сразу, не дожидаясь лишнего хода. Фронт остаётся видимым.
  if (nextBurn().size === 0) { win(); return; }

  const fireCells = [];      // где огонь сейчас → станет выгоревшим
  const addSet = new Set();  // куда фронт перекинется → станет огнём
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (S.grid[r][c] !== 2) continue;
    fireCells.push([r, c]);
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dy, dx]) => {
      const y = r+dy, x = c+dx;
      if (y >= 0 && y < N && x >= 0 && x < N && S.grid[y][x] === 0) addSet.add(y * N + x);
    });
  }
  // старый огонь выгорает (чёрная клетка), новый фронт загорается
  fireCells.forEach(([r, c]) => S.grid[r][c] = 3);
  const add = [...addSet].map(k => [k / N | 0, k % N]);
  add.forEach(([y, x]) => S.grid[y][x] = 2);

  if (S.houses.some(h => S.grid[h[0]][h[1]] === 2)) {
    S.over = 'lose'; render(); setTimeout(() => popupLose(), 500); return;
  }
  // Новый фронт оказался заперт (некуда расползаться) — победа сразу, без лишнего хода.
  if (nextBurn().size === 0) { win(); return; }
  S.turn++; render(); renderTray();
}

function nextBurn() {
  const set = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (S.grid[r][c] !== 2) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dy, dx]) => {
      const y = r+dy, x = c+dx;
      if (y >= 0 && y < N && x >= 0 && x < N && S.grid[y][x] === 0) set.add(y * N + x);
    });
  }
  return set;
}

// ── Рендер доски ──
function render() {
  const burn = nextBurn();
  const ghostCells = new Set(); let ghostOk = true;
  if (S.ghost) {
    const [sh, r, c] = S.ghost;
    ghostOk = canPlace(sh, r, c);
    cellsFor(sh, r, c).forEach(([y, x]) => {
      if (y >= 0 && y < N && x >= 0 && x < N) ghostCells.add(y * N + x);
    });
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const d = cellAt(r, c), v = S.grid[r][c], k = r * N + c;
    let cls = 'c';
    if      (v === 1) cls += ' wall';
    else if (v === 2) cls += ' fire';
    else if (v === 3) cls += ' burnt';
    if (isHouse(r, c) && v === 2) cls += ' house-lost';
    if (!S.over && v === 0 && burn.has(k) && !ghostCells.has(k)) cls += ' willburn';
    if (ghostCells.has(k)) cls += ghostOk ? ' ghost' : ' ghost-bad';
    d.className = cls;
    let ico = '';
    if (isHouse(r, c)) ico = S.grid[r][c] === 2 ? '🔥' : '🏠';
    else if (v === 2)  ico = '🔥';
    d.innerHTML = ico ? `<span class="ico">${ico}</span>` : '';
  }
  $('houses').textContent = S.houses.filter(h => S.grid[h[0]][h[1]] !== 2).length + '/' + S.houses.length;
  $('turn').textContent   = S.turn;
  const threat = S.houses.some(h => [[1,0],[-1,0],[0,1],[0,-1]].some(([dy, dx]) => {
    const y = h[0]+dy, x = h[1]+dx;
    return y >= 0 && y < N && x >= 0 && x < N && S.grid[y][x] === 2;
  }));
  $('warn').textContent = threat ? '⚠ Огонь у дома! Защити его этим ходом' : '';
}

// ── Рендер трея ──
function renderTray() {
  const box = $('pieces'); box.innerHTML = '';
  // показываем только 3 активных блока, очередь скрыта
  S.tray.slice(0, 3).forEach((sh, i) => {
    const p = document.createElement('div');
    p.className = 'piece' + (i === S.sel ? ' sel' : '');
    const maxY = Math.max(...sh.map(c => c[0])), maxX = Math.max(...sh.map(c => c[1]));
    const mini = document.createElement('div'); mini.className = 'mini';
    mini.style.gridTemplateColumns = `repeat(${maxX + 1},18px)`;
    const filled = new Set(sh.map(([y, x]) => y * 10 + x));
    for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) {
      const cell = document.createElement('i');
      if (!filled.has(y * 10 + x)) cell.className = 'e';
      mini.appendChild(cell);
    }
    p.appendChild(mini);
    p.addEventListener('pointerdown', e => { e.stopPropagation(); trayDown(e, i, p); });
    box.appendChild(p);
  });
}

$('rotateBtn').onclick  = () => {
  if (!S || S.over) return;
  S.tray[S.sel] = rotate(S.tray[S.sel]);
  // во время перетаскивания — перерисовываем превью повёрнутой фигуры под пальцем
  if (S.dragging && press) { ghostFromPoint(press.x, press.y); return; }
  renderTray(); render();
};
$('restartBtn').onclick = () => { if (S) start(); };

// ── Попапы ──
function popupWin() {
  const saved = S.houses.filter(h => S.grid[h[0]][h[1]] !== 2).length;
  const score = saved * 100 + Math.max(0, (40 - S.turn) * 10);
  const hasNext = curLevel < 8;
  showPopup(`
    <div class="emoji">🛡</div>
    <h2 class="ok">Поздравляю, прошёл!</h2>
    <p>Домов спасено: <b>${saved}/${S.houses.length}</b> · Ходов: <b>${S.turn}</b></p>
    <div class="score">${score}</div>
    <div class="btns">
      ${hasNext ? `<button class="btn btn-go" id="btnNext">Уровень ${curLevel + 2} →</button>` : ''}
      <button class="btn btn-dim" id="btnAgain">Ещё раз</button>
      <button class="btn btn-dim" id="btnLvls">К уровням</button>
    </div>`);
  if (hasNext) $('btnNext').onclick = () => pickLevel(curLevel + 1);
  $('btnAgain').onclick = () => start();
  $('btnLvls').onclick  = () => { hidePopup(); showPage(2); };
}

function popupLose() {
  const saved = S.houses.filter(h => S.grid[h[0]][h[1]] !== 2).length;
  showPopup(`
    <div class="emoji">🔥</div>
    <h2 class="bad">Дом сгорел</h2>
    <p>Спасено домов: <b>${saved}/${S.houses.length}</b></p>
    <p style="margin-top:6px">Огонь прорвался — где надо было ставить стенку?</p>
    <div class="btns" style="margin-top:20px">
      <button class="btn btn-go"  id="btnAgain">Попробовать снова</button>
      <button class="btn btn-dim" id="btnLvls">К уровням</button>
    </div>`);
  $('btnAgain').onclick = () => start();
  $('btnLvls').onclick  = () => { hidePopup(); showPage(2); };
}

const ovl = $('ovl');
function showPopup(html) { ovl.innerHTML = `<div class="ovl"><div class="card">${html}</div></div>`; }
function hidePopup()     { ovl.innerHTML = ''; }

})();
