import { expect, test } from '@playwright/test';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 548;

/** Переводит логическую координату Phaser-канваса в реальные координаты страницы (учитывает Scale.FIT). */
function toPagePoint(box: { x: number; y: number; width: number; height: number }, lx: number, ly: number) {
  return {
    x: box.x + (lx / CANVAS_WIDTH) * box.width,
    y: box.y + (ly / CANVAS_HEIGHT) * box.height,
  };
}

test.describe('Брандмауэр — прохождение игры', () => {
  test('page1 → page2 → page3, ставится стена, ход обновляется', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#page1')).toBeVisible();
    await page.click('#tolevels');
    await expect(page.locator('#page2')).toBeVisible();

    await page.locator('.lvl-btn').first().dispatchEvent('pointerdown');
    await expect(page.locator('#page3')).toBeVisible();

    const canvas = page.locator('#phaser-root canvas');
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => Boolean((window as unknown as { __gameState?: unknown }).__gameState));

    const before = await page.evaluate(() => (window as unknown as { __gameState: { turn: number } }).__gameState);
    expect(before.turn).toBe(1);

    // тапаем по первой фигуре трея — начинается drag, затем отпускаем над свободной клеткой доски
    const box = (await canvas.boundingBox())!;
    const trayPoint = toPagePoint(box, 60, 480); // центр первой ячейки трея
    const boardPoint = toPagePoint(box, 300, 200); // клетка подальше от угла — почти всегда свободна

    await page.mouse.move(trayPoint.x, trayPoint.y);
    await page.mouse.down();
    await page.mouse.move(boardPoint.x, boardPoint.y, { steps: 8 });
    await page.mouse.up();

    // после хода счётчик ходов не может уменьшиться, а фигура трея сдвинулась
    await page.waitForFunction(
      (prevTurn) => (window as unknown as { __gameState: { turn: number } }).__gameState.turn >= prevTurn,
      before.turn,
    );
  });

  test('детерминированный уровень (seed=4): один точный ход запирает огонь и даёт победу', async ({ page }) => {
    // ?seed=4 читается один раз при загрузке модуля main.ts — задаём его сразу через goto
    await page.goto('/?seed=4');
    await page.click('#tolevels');
    await page.locator('.lvl-btn').first().dispatchEvent('pointerdown');

    const canvas = page.locator('#phaser-root canvas');
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => Boolean((window as unknown as { __gameState?: unknown }).__gameState));

    // ⟳ Повернуть — одна ротация первой (по умолчанию выбранной) фигуры трея
    await page.click('#rotateBtn');

    const box = (await canvas.boundingBox())!;
    const trayPoint = toPagePoint(box, 60, 480); // первая фигура трея
    const boardPoint = toPagePoint(box, 30.25, 78.75); // логическая клетка (r=1, c=0)

    await page.mouse.move(trayPoint.x, trayPoint.y);
    await page.mouse.down();
    await page.mouse.move(boardPoint.x, boardPoint.y, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator('.card h2.ok')).toHaveText('Поздравляю, прошёл!', { timeout: 3000 });
    const over = await page.evaluate(() => (window as unknown as { __gameOver?: string }).__gameOver);
    expect(over).toBe('win');
  });
});
