// Портировано из style.css :root { --var: ... } — единственное место с цветами для Phaser-слоя.
export const COLORS = {
  night: 0x15100c,
  night2: 0x211811,
  grass: 0x2c2a1e,
  grass2: 0x332f20,
  sand: 0xede2c8,
  sandDim: 0x9c8e72,
  wall: 0x8a6a48,
  fire: 0xe5532b,
  fire2: 0xf2933c,
  ember: 0x7a2a14,
  house: 0x3fb6a0,
  houseLost: 0x5a4a40,
  line: 0x3d3122,
  amber: 0xf2a33c,
  burnt: 0x0b0907,
};

export const BOARD_SIZE = 400;
export const BOARD_PADDING = 8;
export const CELL_GAP = 4;
export const CELL_SIZE = (BOARD_SIZE - BOARD_PADDING * 2 - CELL_GAP * 7) / 8;

export const TRAY_HEIGHT = 128;
export const TRAY_GAP = 10;
export const TRAY_TOP_MARGIN = 20;

export const CANVAS_WIDTH = BOARD_SIZE;
export const CANVAS_HEIGHT = BOARD_SIZE + TRAY_TOP_MARGIN + TRAY_HEIGHT;
