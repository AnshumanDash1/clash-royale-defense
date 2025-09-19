import { SUMMON_SPEED, SUMMON_ATTACK_COOLDOWN, SUMMON_ATTACK_DAMAGE } from '../../config/constants.js';

export function updateSummons(scene, time) {
  scene.summons.children.iterate((summon) => {
    if (!summon || !summon.active) {
      return;
    }

    const target = findNearestEnemy(scene, summon.x, summon.y);
    if (target) {
      const vector = new Phaser.Math.Vector2(target.x - summon.x, target.y - summon.y);
      const distance = vector.length();

      if (distance > 0) {
        vector.scale(1 / distance);
      }

      summon.setVelocity(vector.x * SUMMON_SPEED, vector.y * SUMMON_SPEED);

      if (distance < 46 && time > summon.getData('nextAttack')) {
        scene.hurtEnemy(target, SUMMON_ATTACK_DAMAGE);
        summon.setData('nextAttack', time + SUMMON_ATTACK_COOLDOWN);
      }
    } else {
      summon.setVelocity(0, 0);
    }
  });
}

function findNearestEnemy(scene, x, y) {
  let closest = null;
  let closestDistSq = Number.POSITIVE_INFINITY;
  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y);
    if (distSq < closestDistSq) {
      closest = enemy;
      closestDistSq = distSq;
    }
  });
  return closest;
}
