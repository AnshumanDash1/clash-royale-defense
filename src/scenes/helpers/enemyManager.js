import {
  ENEMY_BASE_SPEED,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_DISTANCE,
  ENEMY_MAX_HEALTH,
  GOO_SLOW_FACTOR,
  GOO_IGNITE_DAMAGE_PER_SECOND,
} from '../../config/constants.js';

import { igniteGoo } from '../../abilities/goo.js';

export function spawnEnemy(scene, initial = false) {
  if (scene.enemies.countActive(true) > 24) {
    return null;
  }

  const { width, height } = scene.scale;
  const margin = 40;
  const side = Phaser.Math.Between(0, 3);

  let x = Phaser.Math.Between(margin, width - margin);
  let y = Phaser.Math.Between(margin, height - margin);

  if (side === 0) {
    y = margin;
  } else if (side === 1) {
    x = width - margin;
  } else if (side === 2) {
    y = height - margin;
  } else {
    x = margin;
  }

  if (!initial) {
    const jitter = Phaser.Math.Between(-40, 40);
    x += jitter;
    y -= jitter;
  }

  const enemy = scene.enemies.create(x, y, 'enemy');
  enemy.setCircle(22, 10, 10);
  enemy.setDepth(4);
  enemy.health = ENEMY_MAX_HEALTH;
  enemy.maxHealth = ENEMY_MAX_HEALTH;
  enemy.setData('speed', ENEMY_BASE_SPEED + Phaser.Math.Between(-20, 25));
  enemy.setData('strafeDir', Math.random() > 0.5 ? 1 : -1);
  enemy.setData('nextStrafeFlip', scene.time.now + Phaser.Math.Between(1500, 3500));
  enemy.setData('nextAttack', 0);
  return enemy;
}

export function updateEnemies(scene, time, dt) {
  const player = scene.player;
  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }

    const toPlayer = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y);
    const distance = toPlayer.length();
    if (distance > 0) {
      toPlayer.scale(1 / distance);
    }

    let strafeDir = enemy.getData('strafeDir');
    if (time > enemy.getData('nextStrafeFlip')) {
      strafeDir *= -1;
      enemy.setData('strafeDir', strafeDir);
      enemy.setData('nextStrafeFlip', time + Phaser.Math.Between(1200, 2600));
    }

    const tangent = toPlayer.clone().rotate(Math.PI / 2 * strafeDir);
    let desired = toPlayer.clone().scale(distance > 140 ? 1 : 0.3).add(tangent.scale(0.65));
    if (desired.lengthSq() > 0) {
      desired = desired.normalize();
    }

    let speed = enemy.getData('speed');
    const slowFactor = getSlowFactorFromGoo(scene, enemy, dt);
    speed *= slowFactor;

    enemy.setVelocity(desired.x * speed, desired.y * speed);

    if (distance < ENEMY_ATTACK_DISTANCE && time > enemy.getData('nextAttack')) {
      handleEnemyAttack(scene, enemy);
      enemy.setData('nextAttack', time + ENEMY_ATTACK_COOLDOWN);
    }
  });
}

function handleEnemyAttack(scene, enemy) {
  if (!enemy.active) {
    return;
  }

  scene.damagePlayer(8);
  enemy.setTintFill(0xffd54f);
  scene.time.delayedCall(120, () => {
    if (enemy.active) {
      enemy.clearTint();
    }
  });
}

function getSlowFactorFromGoo(scene, enemy, dt) {
  let factor = 1;
  scene.goos.forEach((goo) => {
    if (!goo.active) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, goo.x, goo.y);
    if (distSq <= goo.radiusSq) {
      if (goo.ignited) {
        scene.hurtEnemy(enemy, (GOO_IGNITE_DAMAGE_PER_SECOND * dt) / 2);
        factor = Math.min(factor, GOO_SLOW_FACTOR * 0.5);
      } else {
        factor = Math.min(factor, GOO_SLOW_FACTOR);
      }
    }
  });
  return factor;
}

export function checkFireballGooInteraction(scene, fireball) {
  scene.goos.forEach((goo) => {
    if (!goo.active || goo.ignited) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(fireball.x, fireball.y, goo.x, goo.y);
    const touchRadiusSq = (goo.radius + 18) * (goo.radius + 18);
    if (distSq <= touchRadiusSq) {
      igniteGoo(scene, goo);
    }
  });
}

export function cleanupGoos(scene, now) {
  scene.goos = scene.goos.filter((goo) => {
    if (!goo.active) {
      return false;
    }

    if (now > goo.expiresAt) {
      goo.active = false;
      goo.visual.destroy();
      return false;
    }

    if (goo.ignited && now > goo.igniteExpiresAt) {
      goo.ignited = false;
      goo.visual.setFillStyle(0x64ffda, 0.5);
    }

    return true;
  });
}
