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

      const speed = summon.getData('speed') ?? SUMMON_SPEED;
      summon.setVelocity(vector.x * speed, vector.y * speed);

      const attackRange = summon.getData('attackRange') ?? 46;
      const attackDamage = summon.getData('attackDamage') ?? SUMMON_ATTACK_DAMAGE;
      const attackCooldown = summon.getData('attackCooldown') ?? SUMMON_ATTACK_COOLDOWN;

      if (distance < attackRange && time > summon.getData('nextAttack')) {
        scene.hurtEnemy(target, attackDamage);
        summon.setData('nextAttack', time + attackCooldown);
      }
    } else {
      summon.setVelocity(0, 0);
    }

    const bar = summon.getData('healthBar');
    if (bar) {
      const offsetY = bar.offsetY ?? 38;
      const ratio = Phaser.Math.Clamp(summon.health / summon.maxHealth, 0, 1);
      bar.bg.setPosition(summon.x, summon.y - offsetY);
      bar.fill.setPosition(summon.x, summon.y - offsetY);
      if (ratio > 0) {
        bar.fill.setVisible(true);
        bar.fill.setDisplaySize(bar.width * ratio, bar.height);
      } else {
        bar.fill.setVisible(false);
      }
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
