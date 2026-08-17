import Phaser from 'phaser';
import type { Rng } from '../engine/types';
import { GameScene, type GameSceneCallbacks } from './GameScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS } from './theme';

let game: Phaser.Game | null = null;

/** Создаёт Phaser.Game (один раз) и регистрирует GameScene без автостарта. */
export function mountGame(parentId: string): Phaser.Game {
  if (game) return game;
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: parentId,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: COLORS.night,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    input: { windowEvents: true },
  });
  game.scene.add('GameScene', GameScene, false);
  return game;
}

/** Запускает (или перезапускает) уровень — передаёт начальные данные явно, без гонки с автостартом. */
export function startLevel(levelIdx: number, callbacks: GameSceneCallbacks, rng?: Rng) {
  if (!game) throw new Error('Game not mounted — call mountGame() first');
  game.scene.start('GameScene', { levelIdx, callbacks, rng });
}

export function getGameScene(): GameScene | null {
  if (!game) return null;
  return (game.scene.getScene('GameScene') as GameScene | null) ?? null;
}
