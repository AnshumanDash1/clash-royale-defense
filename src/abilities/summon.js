import { SUMMON_LIFETIME } from '../config/constants.js';

export function castSummon(scene, direction) {
  const offset = direction.clone().scale(50);
  const summon = scene.summons.create(
    scene.player.x + offset.x,
    scene.player.y + offset.y,
    'summon',
  );

  summon.setCircle(24, 4, 4);
  summon.setDepth(5);
  summon.health = 60;
  summon.setData('nextAttack', 0);

  scene.time.delayedCall(SUMMON_LIFETIME, () => {
    if (summon.active) {
      summon.destroy();
    }
  });
}
