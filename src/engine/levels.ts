import type { Level } from './types';

// seeds=очаги, houses=дома, minDist=мин.дистанция очаг→дом
// zone: 'corner' — огонь в углу (расползается в четверть, легко), 'edge' — широкий фронт у края
export const LEVELS: Level[] = [
  { seeds: 1, houses: 2, minDist: 5, zone: 'corner' }, // 1 легко
  { seeds: 1, houses: 3, minDist: 5, zone: 'corner' }, // 2
  { seeds: 1, houses: 3, minDist: 4, zone: 'corner' }, // 3
  { seeds: 1, houses: 3, minDist: 5, zone: 'edge' },   // 4 средне
  { seeds: 2, houses: 4, minDist: 5, zone: 'edge' },   // 5
  { seeds: 2, houses: 4, minDist: 4, zone: 'edge' },   // 6
  { seeds: 2, houses: 4, minDist: 5, zone: 'edge' },   // 7 сложно
  { seeds: 3, houses: 5, minDist: 5, zone: 'edge' },   // 8
  { seeds: 3, houses: 5, minDist: 4, zone: 'edge' },   // 9
];
