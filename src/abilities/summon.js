import { SUMMON_LIFETIME, SUMMON_MAX_HEALTH } from '../config/constants.js';

export function castSummon(scene, direction) {
  const offset = direction.clone().scale(50);
  const summon = scene.summons.create(
    scene.player.x + offset.x,
    scene.player.y + offset.y,
    'summon',
  );

  summon.setCircle(24, 4, 4);
  summon.setDepth(5);
  summon.maxHealth = SUMMON_MAX_HEALTH;
  summon.health = SUMMON_MAX_HEALTH;
  summon.setData('nextAttack', 0);

  const barBg = scene.add.rectangle(summon.x, summon.y - 38, 38, 6, 0x0f172a, 0.7).setDepth(7);
  const barFill = scene.add.rectangle(summon.x, summon.y - 38, 34, 4, 0x6ee7b7, 1).setDepth(8);
  barBg.setOrigin(0.5, 0.5);
  barFill.setOrigin(0.5, 0.5);
  summon.setData('healthBar', { bg: barBg, fill: barFill, width: 34, height: 4 });
  summon.once('destroy', () => {
    barBg.destroy();
    barFill.destroy();
  });

  scene.time.delayedCall(SUMMON_LIFETIME, () => {
    if (summon.active) {
      summon.destroy();
    }
  });
}
