import {
  SHIELD_DURATION,
  HEAL_PERCENT,
  SHIELD_WALL_DURATION,
  DASH_DURATION,
  REFLECT_BARRIER_DURATION,
  GRAVITY_PULSE_RADIUS,
  GRAVITY_PULSE_FORCE,
  GRAVITY_PULSE_DAMAGE,
  FREEZE_ZONE_RADIUS,
  FREEZE_ZONE_DURATION,
  FREEZE_ZONE_SLOW,
  CLOAK_DURATION,
} from '../config/constants.js';

function castShield(scene, direction) {
  const offset = direction.clone().scale(60);
  const shield = scene.physics.add.sprite(
    scene.player.x + offset.x,
    scene.player.y + offset.y,
    'shield',
  );

  shield.setDisplaySize(36, 96);
  shield.setImmovable(true);
  shield.body.allowGravity = false;
  shield.refreshBody();
  shield.setDepth(6);

  const angleDeg = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x));
  shield.setAngle(angleDeg + 90);
  shield.setData('expiresAt', scene.time.now + SHIELD_DURATION);

  scene.shields.add(shield);

  scene.tweens.add({
    targets: shield,
    alpha: 0.3,
    duration: SHIELD_DURATION,
    ease: 'Sine.easeIn',
    onComplete: () => {
      if (shield.active) {
        shield.destroy();
      }
    },
  });
}

function castHeal(scene) {
  const healAmount = scene.playerMaxHealth * HEAL_PERCENT;
  const previousHealth = scene.playerHealth;
  scene.playerHealth = Math.min(scene.playerMaxHealth, scene.playerHealth + healAmount);

  const gained = scene.playerHealth - previousHealth;
  const burst = scene.add.circle(scene.player.x, scene.player.y, 28, 0x65ffb9, 0.35);
  burst.setDepth(4);

  scene.tweens.add({
    targets: burst,
    scale: 3.2,
    alpha: 0,
    duration: 360,
    ease: 'Cubic.easeOut',
    onComplete: () => burst.destroy(),
  });

  if (gained > 0) {
    const floating = scene.add.text(scene.player.x, scene.player.y - 40, `+${Math.round(gained)}`, {
      fontSize: 14,
      fontFamily: 'monospace',
      color: '#8dffcd',
    }).setOrigin(0.5).setDepth(50);

    scene.tweens.add({
      targets: floating,
      y: floating.y - 24,
      alpha: 0,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => floating.destroy(),
    });
  }
}

function castShieldWall(scene) {
  const until = scene.time.now + SHIELD_WALL_DURATION;
  scene.playerInvulnerableUntil = Math.max(scene.playerInvulnerableUntil, until);
  const aura = scene.add.circle(scene.player.x, scene.player.y, 64, 0x89cff0, 0.35).setDepth(6);
  const tracker = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (aura.active) {
        aura.setPosition(scene.player.x, scene.player.y);
      }
    },
  });
  scene.tweens.add({
    targets: aura,
    scale: 1.4,
    alpha: 0,
    duration: SHIELD_WALL_DURATION,
    onComplete: () => {
      aura.destroy();
      tracker.remove();
    },
  });
}

function castDash(scene, direction) {
  const normalized = direction.clone().normalize();
  const endTime = scene.time.now + DASH_DURATION;
  scene.dashState = {
    direction: normalized,
    endTime,
  };
  scene.playerInvulnerableUntil = Math.max(scene.playerInvulnerableUntil, endTime);
}

function castReflectBarrier(scene) {
  const until = scene.time.now + REFLECT_BARRIER_DURATION;
  scene.reflectBarrierUntil = Math.max(scene.reflectBarrierUntil, until);
  const halo = scene.add.circle(scene.player.x, scene.player.y, 58, 0xfff59d, 0.45).setDepth(6);
  const tracker = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (halo.active) {
        halo.setPosition(scene.player.x, scene.player.y);
      }
    },
  });
  scene.tweens.add({
    targets: halo,
    alpha: 0,
    scale: 1.3,
    duration: REFLECT_BARRIER_DURATION,
    onComplete: () => {
      halo.destroy();
      tracker.remove();
    },
  });
}

function castGravityPulse(scene) {
  const radiusSq = GRAVITY_PULSE_RADIUS * GRAVITY_PULSE_RADIUS;
  const pulse = scene.add.circle(scene.player.x, scene.player.y, GRAVITY_PULSE_RADIUS, 0xb39ddb, 0.35).setDepth(6);
  scene.tweens.add({
    targets: pulse,
    scale: 1.8,
    alpha: 0,
    duration: 320,
    ease: 'Cubic.easeOut',
    onComplete: () => pulse.destroy(),
  });

  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(scene.player.x, scene.player.y, enemy.x, enemy.y);
    if (distSq <= radiusSq) {
      scene.hurtEnemy(enemy, GRAVITY_PULSE_DAMAGE);
      const vector = new Phaser.Math.Vector2(enemy.x - scene.player.x, enemy.y - scene.player.y)
        .normalize()
        .scale(GRAVITY_PULSE_FORCE);
      enemy.setVelocity(vector.x, vector.y);
    }
  });
}

function castFreezeZone(scene, direction) {
  const offset = direction.clone().scale(90);
  const x = scene.player.x + offset.x;
  const y = scene.player.y + offset.y;
  const visual = scene.add.circle(x, y, FREEZE_ZONE_RADIUS, 0x90caf9, 0.35).setDepth(3);
  const zone = {
    x,
    y,
    radius: FREEZE_ZONE_RADIUS,
    radiusSq: FREEZE_ZONE_RADIUS * FREEZE_ZONE_RADIUS,
    slowFactor: FREEZE_ZONE_SLOW,
    expiresAt: scene.time.now + FREEZE_ZONE_DURATION,
    active: true,
    visual,
  };
  scene.freezeZones.push(zone);
}

function castCamouflage(scene) {
  const until = scene.time.now + CLOAK_DURATION;
  scene.playerHiddenUntil = Math.max(scene.playerHiddenUntil, until);
  scene.player.setAlpha(0.35);
  scene.time.delayedCall(CLOAK_DURATION, () => {
    if (!scene.player) {
      return;
    }
    if (scene.time.now >= scene.playerHiddenUntil) {
      scene.playerHiddenUntil = 0;
      scene.player.setAlpha(1);
    }
  });
}

export const defensiveCards = [
  {
    id: 'shield',
    name: 'Shield',
    description: 'Place a larger temporary barrier.',
    category: 'defense',
    cost: 2,
    cast(scene, context) {
      castShield(scene, context.direction);
    },
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restore 25% of your health instantly.',
    category: 'defense',
    cost: 4,
    cast(scene) {
      castHeal(scene);
    },
  },
  {
    id: 'shield-wall',
    name: 'Shield Wall',
    description: 'Become invulnerable for a short duration.',
    category: 'defense',
    cost: 4,
    cast(scene) {
      castShieldWall(scene);
    },
  },
  {
    id: 'dash',
    name: 'Dash',
    description: 'Burst forward and harm enemies you pass.',
    category: 'defense',
    cost: 2,
    cast(scene, context) {
      castDash(scene, context.direction);
    },
  },
  {
    id: 'reflect-barrier',
    name: 'Reflect Barrier',
    description: 'Reflect melee attackers for a few seconds.',
    category: 'defense',
    cost: 3,
    cast(scene) {
      castReflectBarrier(scene);
    },
  },
  {
    id: 'gravity-pulse',
    name: 'Gravity Pulse',
    description: 'Shockwave pushes and damages nearby enemies.',
    category: 'defense',
    cost: 3,
    cast(scene) {
      castGravityPulse(scene);
    },
  },
  {
    id: 'freeze-zone',
    name: 'Freeze Zone',
    description: 'Deploy a field that slows enemies.',
    category: 'defense',
    cost: 3,
    cast(scene, context) {
      castFreezeZone(scene, context.direction);
    },
  },
  {
    id: 'camouflage',
    name: 'Camouflage Cloak',
    description: 'Become unseen; enemies ignore you briefly.',
    category: 'defense',
    cost: 2,
    cast(scene) {
      castCamouflage(scene);
    },
  },
];
