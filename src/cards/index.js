import { offensiveCards, igniteGoo } from './offense.js';
import { defensiveCards } from './defense.js';
import { summonCards } from './summons.js';

export const CARD_DEFS = [
  ...offensiveCards,
  ...defensiveCards,
  ...summonCards,
];

export const CARD_LOOKUP = new Map(CARD_DEFS.map((card) => [card.id, card]));

export { igniteGoo };

