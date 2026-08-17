import Phaser from 'phaser';
import { canPlaceInState, createGame, placeShape } from '../engine/game';
import { nextBurn } from '../engine/fire';
import { cellsFor, isHouse } from '../engine/placement';
import { N, centerOffset, rotate } from '../engine/shapes';
import type { GameState, Rng, Shape } from '../engine/types';
import {
  BOARD_PADDING,
  BOARD_SIZE,
  CELL_GAP,
  CELL_SIZE,
  COLORS,
  TRAY_GAP,
  TRAY_HEIGHT,
  TRAY_TOP_MARGIN,
} from './theme';

export interface GameSceneCallbacks {
  onStateChange: (state: GameState, warn: boolean) => void;
  onGameOver: (status: 'win' | 'lose', state: GameState) => void;
}

export interface GameSceneData {
  levelIdx: number;
  callbacks: GameSceneCallbacks;
  /** Инжектируемый источник случайности — используется в dev/e2e для детерминированных прогонов (?seed=). */
  rng?: Rng;
}

interface Ghost {
  shape: Shape;
  r: number;
  c: number;
  ok: boolean;
}

const CELL_RADIUS = 6;
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

export class GameScene extends Phaser.Scene {
  private levelIdx = 0;
  private callbacks!: GameSceneCallbacks;
  private state!: GameState;
  private selectedIndex = 0;
  private ghost: Ghost | null = null;
  private dragging = false;
  private pointerPos: { x: number; y: number } | null = null;

  private boardGfx!: Phaser.GameObjects.Graphics;
  private cellIcons: Phaser.GameObjects.Text[][] = [];
  private trayContainer!: Phaser.GameObjects.Container;
  private rng: Rng = Math.random;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData) {
    this.levelIdx = data.levelIdx;
    this.callbacks = data.callbacks;
    this.rng = data.rng ?? Math.random;
    this.state = createGame(this.levelIdx, this.rng);
    this.selectedIndex = 0;
    this.ghost = null;
    this.dragging = false;
    this.pointerPos = null;
  }

  create() {
    this.boardGfx = this.add.graphics();

    this.cellIcons = [];
    for (let r = 0; r < N; r++) {
      const row: Phaser.GameObjects.Text[] = [];
      for (let c = 0; c < N; c++) {
        const { x, y } = this.cellCenter(r, c);
        const t = this.add
          .text(x, y, '', { fontSize: `${Math.round(CELL_SIZE * 0.55)}px` })
          .setOrigin(0.5);
        row.push(t);
      }
      this.cellIcons.push(row);
    }

    this.trayContainer = this.add.container(0, BOARD_SIZE + TRAY_TOP_MARGIN);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.handlePointerMove(p));
    this.input.on('pointerup', () => this.handlePointerUp());

    this.renderTray();
    this.renderIcons();
    this.notifyState();
  }

  override update(time: number) {
    this.drawBoard(time);
  }

  // ── публичный API для DOM-кнопок (Заново / Повернуть) ──
  rotateSelected() {
    const shape = this.state.tray[this.selectedIndex];
    if (!shape) return;
    this.state.tray[this.selectedIndex] = rotate(shape);
    if (this.dragging && this.pointerPos) this.updateGhostFromPointer(this.pointerPos.x, this.pointerPos.y);
    this.renderTray();
  }

  restart() {
    this.scene.restart({ levelIdx: this.levelIdx, callbacks: this.callbacks } satisfies GameSceneData);
  }

  loadLevel(levelIdx: number) {
    this.scene.restart({ levelIdx, callbacks: this.callbacks } satisfies GameSceneData);
  }

  // ── геометрия ──
  private cellCenter(r: number, c: number) {
    const x = BOARD_PADDING + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const y = BOARD_PADDING + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    return { x, y };
  }

  private cellFromLocal(x: number, y: number): [number, number] | null {
    const gx = x - BOARD_PADDING;
    const gy = y - BOARD_PADDING;
    const step = CELL_SIZE + CELL_GAP;
    const c = Math.floor(gx / step);
    const r = Math.floor(gy / step);
    if (r < 0 || r >= N || c < 0 || c >= N) return null;
    if (gx - c * step > CELL_SIZE || gy - r * step > CELL_SIZE) return null; // палец в зазоре между клетками
    return [r, c];
  }

  private anchorFor(pr: number, pc: number, shape: Shape): [number, number] {
    const [oy, ox] = centerOffset(shape);
    return [pr - oy, pc - ox];
  }

  // ── drag-and-drop из трея ──
  private beginDrag(index: number, pointer: Phaser.Input.Pointer) {
    if (this.state.over) return;
    this.selectedIndex = index;
    this.dragging = true;
    this.pointerPos = { x: pointer.x, y: pointer.y };
    this.renderTray();
    this.updateGhostFromPointer(pointer.x, pointer.y);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragging) return;
    this.pointerPos = { x: pointer.x, y: pointer.y };
    this.updateGhostFromPointer(pointer.x, pointer.y);
  }

  private updateGhostFromPointer(x: number, y: number) {
    const shape = this.state.tray[this.selectedIndex];
    if (!shape) { this.ghost = null; return; }
    const cell = this.cellFromLocal(x, y);
    if (!cell) { this.ghost = null; return; }
    const [ar, ac] = this.anchorFor(cell[0], cell[1], shape);
    this.ghost = { shape, r: ar, c: ac, ok: canPlaceInState(this.state, shape, ar, ac) };
  }

  private handlePointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    const ghost = this.ghost;
    this.ghost = null;
    this.pointerPos = null;
    this.renderTray();
    if (ghost && ghost.ok) this.commitPlacement(ghost);
  }

  private commitPlacement(ghost: Ghost) {
    const wasOver = this.state.over;
    this.state = placeShape(this.state, this.selectedIndex, ghost.shape, ghost.r, ghost.c, this.rng);
    this.selectedIndex = 0;
    this.renderTray();
    this.renderIcons();
    this.notifyState();
    if (!wasOver && this.state.over) {
      const status = this.state.over;
      const finalState = this.state;
      this.time.delayedCall(500, () => this.callbacks.onGameOver(status, finalState));
    }
  }

  private notifyState() {
    const warn = this.state.houses.some(([hr, hc]) =>
      NEIGHBORS.some(([dy, dx]) => {
        const y = hr + dy, x = hc + dx;
        return y >= 0 && y < N && x >= 0 && x < N && this.state.grid[y]?.[x] === 2;
      }));
    this.callbacks.onStateChange(this.state, warn);
  }

  // ── иконки: обновляются только при изменении состояния, не каждый кадр ──
  private renderIcons() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = this.state.grid[r]![c];
        const house = isHouse(this.state.houses, r, c);
        let icon = '';
        if (house) icon = v === 2 ? '🔥' : '🏠';
        else if (v === 2) icon = '🔥';
        this.cellIcons[r]![c]!.setText(icon);
      }
    }
  }

  // ── трей: мини-превью фигур + hit zones для drag ──
  private renderTray() {
    this.trayContainer.removeAll(true);
    const visible = this.state.tray.slice(0, 3);
    const pieceW = (BOARD_SIZE - TRAY_GAP * 2) / 3;

    visible.forEach((shape, i) => {
      const x = i * (pieceW + TRAY_GAP);
      const selected = i === this.selectedIndex;

      const box = this.add.graphics();
      box.fillStyle(selected ? 0x2a2114 : COLORS.night2, 1);
      box.fillRoundedRect(x, 0, pieceW, TRAY_HEIGHT, 14);
      box.lineStyle(2, selected ? COLORS.amber : COLORS.line, 1);
      box.strokeRoundedRect(x, 0, pieceW, TRAY_HEIGHT, 14);
      this.trayContainer.add(box);

      const maxY = Math.max(...shape.map(([y]) => y));
      const maxX = Math.max(...shape.map(([, sx]) => sx));
      const cell = 18, gap = 3;
      const gw = (maxX + 1) * cell + maxX * gap;
      const gh = (maxY + 1) * cell + maxY * gap;
      const ox = x + (pieceW - gw) / 2;
      const oy = (TRAY_HEIGHT - gh) / 2;
      const filled = new Set(shape.map(([y, sx]) => y * 10 + sx));
      const mini = this.add.graphics();
      mini.fillStyle(COLORS.wall, 1);
      for (let y = 0; y <= maxY; y++) {
        for (let sx = 0; sx <= maxX; sx++) {
          if (!filled.has(y * 10 + sx)) continue;
          mini.fillRoundedRect(ox + sx * (cell + gap), oy + y * (cell + gap), cell, cell, 3);
        }
      }
      this.trayContainer.add(mini);

      const hit = this.add.zone(x, 0, pieceW, TRAY_HEIGHT).setOrigin(0, 0).setInteractive();
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => this.beginDrag(i, p));
      this.trayContainer.add(hit);
    });
  }

  // ── доска: вызывается каждый кадр — здесь живут анимации огня и точки-превью ──
  private drawBoard(time: number) {
    const gfx = this.boardGfx;
    gfx.clear();

    gfx.fillStyle(COLORS.night2, 1);
    gfx.fillRoundedRect(0, 0, BOARD_SIZE, BOARD_SIZE, 12);

    const burn = this.state.over ? new Set<number>() : nextBurn(this.state.grid);
    const ghostCells = new Set<number>();
    if (this.ghost) {
      cellsFor(this.ghost.shape, this.ghost.r, this.ghost.c).forEach(([y, x]) => {
        if (y >= 0 && y < N && x >= 0 && x < N) ghostCells.add(y * N + x);
      });
    }

    const flicker = (Math.sin(time / 260) + 1) / 2; // аналог CSS keyframes flick
    const pulsePhase = (Math.sin(time / 660) + 1) / 2; // аналог CSS keyframes pulse
    const fireColor = lerpColor(COLORS.fire, COLORS.fire2, flicker);

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = this.state.grid[r]![c];
        const k = r * N + c;
        const { x, y } = this.cellCenter(r, c);
        const left = x - CELL_SIZE / 2;
        const top = y - CELL_SIZE / 2;
        const house = isHouse(this.state.houses, r, c);

        let bg = k % 2 === 1 ? COLORS.grass2 : COLORS.grass;
        if (v === 1) bg = COLORS.wall;
        else if (v === 3) bg = COLORS.burnt;
        if (house && v === 2) bg = COLORS.houseLost;

        gfx.fillStyle(bg, 1);
        gfx.fillRoundedRect(left, top, CELL_SIZE, CELL_SIZE, CELL_RADIUS);

        if (v === 2) {
          gfx.fillStyle(fireColor, house ? 0.55 : 1);
          gfx.fillRoundedRect(left, top, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        }

        if (!this.state.over && v === 0 && burn.has(k) && !ghostCells.has(k)) {
          const dotR = (CELL_SIZE * (0.16 + 0.09 * pulsePhase)) / 2;
          gfx.fillStyle(COLORS.fire, 0.28 + 0.32 * pulsePhase);
          gfx.fillCircle(x, y, dotR);
        }
      }
    }

    if (this.ghost) {
      const ok = this.ghost.ok;
      cellsFor(this.ghost.shape, this.ghost.r, this.ghost.c).forEach(([y, x]) => {
        if (y < 0 || y >= N || x < 0 || x >= N) return;
        const { x: cx, y: cy } = this.cellCenter(y, x);
        const left = cx - CELL_SIZE / 2;
        const top = cy - CELL_SIZE / 2;
        gfx.fillStyle(ok ? 0x4a4326 : 0x46291f, 1);
        gfx.fillRoundedRect(left, top, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        gfx.lineStyle(2, ok ? COLORS.amber : COLORS.fire, 1);
        gfx.strokeRoundedRect(left, top, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
      });
    }
  }
}
