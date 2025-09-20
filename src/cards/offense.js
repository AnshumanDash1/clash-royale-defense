/**
 * Offensive card definitions and behaviors.
 * Each card exposes a metadata object along with its cast handler.
 */

import {
  FIREBALL_DAMAGE,
  FIREBALL_SPEED,
  GOO_DURATION,
  GOO_RADIUS,
  CHAIN_LIGHTNING_DAMAGE,
  CHAIN_LIGHTNING_JUMPS,
  CHAIN_LIGHTNING_RANGE,
  CHAIN_LIGHTNING_FALLOFF,
  BARRAGE_ARROW_COUNT,
  BARRAGE_ARROW_DAMAGE,
  BARRAGE_ARROW_SPREAD,
  BARRAGE_ARROW_SPEED,
  BARRAGE_ARROW_LIFESPAN,
  PIERCING_SPEAR_DAMAGE,
  PIERCING_SPEAR_PIERCE,
  PIERCING_SPEAR_SPEED,
  PIERCING_SPEAR_LIFESPAN,
  WHIRLWIND_RADIUS,
  WHIRLWIND_DAMAGE,
  EXPLOSIVE_TRAP_DAMAGE,
  EXPLOSIVE_TRAP_RADIUS,
  EXPLOSIVE_TRAP_ARM_TIME,
  EXPLOSIVE_TRAP_LIFETIME,
  ACID_SPRAY_RADIUS,
  ACID_SPRAY_DURATION,
  ACID_SPRAY_DPS,
} from '../config/constants.js';

function spawnFireball(scene, direction) {
  const origin = new Phaser.Math.Vector2(scene.player.x, scene.player.y)
    .add(direction.clone().scale(48));

  const projectile = scene.projectiles.create(origin.x, origin.y, 'fireball');
  projectile.setCircle(18, 2, 2);
  projectile.setVelocity(direction.x * FIREBALL_SPEED, direction.y * FIREBALL_SPEED);
  projectile.setDepth(4);
  projectile.setDataEnabled();
  projectile.setData({
    type: 'fireball',
    damage: FIREBALL_DAMAGE,
    lifespan: 1500,
    pierce: 0,
    spawnTime: scene.time.now,
  });
}

function findTargetNear(scene, point, radius) {
  let closest = null;
  let closestDistSq = radius * radius;
  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(point.x, point.y, enemy.x, enemy.y);
    if (distSq <= closestDistSq) {
      closestDistSq = distSq;
      closest = enemy;
    }
  });
  return closest;
}

function createLightningEffect(scene, start, end) {
  const gfx = scene.add.graphics({ x: 0, y: 0 }).setDepth(6);
  gfx.lineStyle(3, 0xa7f0ff, 0.9);
  gfx.beginPath();
  gfx.moveTo(start.x, start.y);
  gfx.lineTo(end.x, end.y);
  gfx.strokePath();
  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    duration: 160,
    onComplete: () => gfx.destroy(),
  });
}

function castChainLightning(scene, context) {
  const { pointerWorld, direction } = context;
  const targetPoint = pointerWorld
    ? pointerWorld
    : new Phaser.Math.Vector2(scene.player.x, scene.player.y).add(direction.clone().scale(220));
  const first = findTargetNear(scene, targetPoint, CHAIN_LIGHTNING_RANGE * 0.75);
  if (!first) {
    return false;
  }

  createLightningEffect(scene, { x: scene.player.x, y: scene.player.y }, first);

  const visited = new Set([first]);
  let current = first;
  let damage = CHAIN_LIGHTNING_DAMAGE;

  for (let jump = 0; jump < CHAIN_LIGHTNING_JUMPS; jump += 1) {
    if (current && current.active) {
      scene.hurtEnemy(current, damage);
    }

    const next = findNextChainTarget(scene, current, visited, CHAIN_LIGHTNING_RANGE);
    if (!next) {
      break;
    }
    createLightningEffect(scene, current, next);
    visited.add(next);
    damage *= CHAIN_LIGHTNING_FALLOFF;
    current = next;
  }

  return true;
}

function findNextChainTarget(scene, origin, visited, range) {
  if (!origin) {
    return null;
  }
  let closest = null;
  let closestDistSq = range * range;
  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active || visited.has(enemy)) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(origin.x, origin.y, enemy.x, enemy.y);
    if (distSq <= closestDistSq) {
      closestDistSq = distSq;
      closest = enemy;
    }
  });
  return closest;
}

function spawnArrow(scene, direction, angle) {
  const origin = new Phaser.Math.Vector2(scene.player.x, scene.player.y)
    .add(direction.clone().scale(42));
  const projectile = scene.projectiles.create(origin.x, origin.y, 'arrow');
  projectile.setCircle(10, 6, 6);
  projectile.setRotation(angle);
  projectile.setVelocity(direction.x * BARRAGE_ARROW_SPEED, direction.y * BARRAGE_ARROW_SPEED);
  projectile.setDepth(5);
  projectile.setDataEnabled();
  projectile.setData({
    type: 'arrow',
    damage: BARRAGE_ARROW_DAMAGE,
    lifespan: BARRAGE_ARROW_LIFESPAN,
    spawnTime: scene.time.now,
    pierce: 0,
  });
}

function castBarrage(scene, context) {
  const baseAngle = context.direction.angle();
  const spread = Phaser.Math.DEG_TO_RAD * BARRAGE_ARROW_SPREAD;
  const count = BARRAGE_ARROW_COUNT;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const offset = (t - 0.5) * spread;
    const angle = baseAngle + offset;
    const dir = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    spawnArrow(scene, dir, angle);
  }
}

function castPiercingSpear(scene, context) {
  const { direction } = context;
  const origin = new Phaser.Math.Vector2(scene.player.x, scene.player.y)
    .add(direction.clone().scale(52));
  const projectile = scene.projectiles.create(origin.x, origin.y, 'spear');
  projectile.setSize(18, 12);
  projectile.setOffset(8, 10);
  projectile.setVelocity(direction.x * PIERCING_SPEAR_SPEED, direction.y * PIERCING_SPEAR_SPEED);
  projectile.setDepth(5);
  projectile.setRotation(direction.angle());
  projectile.setDataEnabled();
  projectile.setData({
    type: 'spear',
    damage: PIERCING_SPEAR_DAMAGE,
    lifespan: PIERCING_SPEAR_LIFESPAN,
    spawnTime: scene.time.now,
    pierce: PIERCING_SPEAR_PIERCE,
  });
}

function castWhirlwind(scene) {
  const radiusSq = WHIRLWIND_RADIUS * WHIRLWIND_RADIUS;
  const effect = scene.add.circle(scene.player.x, scene.player.y, WHIRLWIND_RADIUS, 0xfff176, 0.35);
  effect.setDepth(6);
  scene.tweens.add({
    targets: effect,
    scale: 0.4,
    alpha: 0,
    duration: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => effect.destroy(),
  });

  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }
    const distSq = Phaser.Math.Distance.Squared(scene.player.x, scene.player.y, enemy.x, enemy.y);
    if (distSq <= radiusSq) {
      scene.hurtEnemy(enemy, WHIRLWIND_DAMAGE);
      const push = new Phaser.Math.Vector2(enemy.x - scene.player.x, enemy.y - scene.player.y)
        .normalize()
        .scale(300);
      enemy.setVelocity(push.x, push.y);
    }
  });
}

function castExplosiveTrap(scene, context) {
  const { direction } = context;
  const offset = direction.clone().scale(80);
  const sprite = scene.physics.add.sprite(
    scene.player.x + offset.x,
    scene.player.y + offset.y,
    'trap',
  );
  sprite.setDepth(3);
  sprite.body.setAllowGravity(false);
  sprite.setImmovable(true);

  const trap = {
    sprite,
    armedAt: scene.time.now + EXPLOSIVE_TRAP_ARM_TIME,
    expiresAt: scene.time.now + EXPLOSIVE_TRAP_LIFETIME,
    radiusSq: EXPLOSIVE_TRAP_RADIUS * EXPLOSIVE_TRAP_RADIUS,
    damage: EXPLOSIVE_TRAP_DAMAGE,
    overlap: null,
    triggered: false,
  };

  trap.overlap = scene.physics.add.overlap(scene.enemies, sprite, () => {
    if (trap.triggered) {
      return;
    }
    if (scene.time.now >= trap.armedAt) {
      trap.triggered = true;
      scene.detonateTrap(trap);
    }
  });

  scene.traps.push(trap);
}

function castAcidSpray(scene, context) {
  const { direction } = context;
  const offset = direction.clone().scale(90);
  const x = scene.player.x + offset.x;
  const y = scene.player.y + offset.y;
  const visual = scene.add.circle(x, y, ACID_SPRAY_RADIUS, 0x7e57c2, 0.4).setDepth(2);
  const pool = {
    x,
    y,
    radius: ACID_SPRAY_RADIUS,
    radiusSq: ACID_SPRAY_RADIUS * ACID_SPRAY_RADIUS,
    expiresAt: scene.time.now + ACID_SPRAY_DURATION,
    damagePerSecond: ACID_SPRAY_DPS,
    active: true,
    visual,
  };
  scene.acidPools.push(pool);
}

export function igniteGoo(scene, goo) {
  goo.ignited = true;
  goo.igniteExpiresAt = scene.time.now + 2400;
  goo.visual.setFillStyle(0xff7043, 0.7);
}

export const offensiveCards = [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launch a stronger blazing projectile.',
    category: 'offense',
    cost: 2,
    cast(scene, context) {
      const { direction } = context;
      spawnFireball(scene, direction);
    },
  },
  {
    id: 'chain-lightning',
    name: 'Chain Lightning',
    description: 'Zap one foe and arc to nearby enemies.',
    category: 'offense',
    cost: 4,
    cast(scene, context) {
      castChainLightning(scene, context);
    },
  },
  {
    id: 'barrage',
    name: 'Barrage of Arrows',
    description: 'Loose a spread of piercing arrows.',
    category: 'offense',
    cost: 3,
    cast(scene, context) {
      castBarrage(scene, context);
    },
  },
  {
    id: 'piercing-spear',
    name: 'Piercing Spear',
    description: 'Throw a spear that pierces foes.',
    category: 'offense',
    cost: 3,
    cast(scene, context) {
      castPiercingSpear(scene, context);
    },
  },
  {
    id: 'whirlwind',
    name: 'Whirlwind Slash',
    description: 'Spin to cleave surrounding enemies.',
    category: 'offense',
    cost: 3,
    cast(scene) {
      castWhirlwind(scene);
    },
  },
  {
    id: 'explosive-trap',
    name: 'Explosive Trap',
    description: 'Plant a mine that detonates on foes.',
    category: 'offense',
    cost: 2,
    cast(scene, context) {
      castExplosiveTrap(scene, context);
    },
  },
  {
    id: 'acid-spray',
    name: 'Acid Spray',
    description: 'Leave a corrosive field that harms enemies.',
    category: 'offense',
    cost: 3,
    cast(scene, context) {
      castAcidSpray(scene, context);
    },
  },
  {
    id: 'goo',
    name: 'Goo',
    description: 'Slow enemies; ignite with fire.',
    category: 'offense',
    cost: 2,
    cast(scene, context) {
      const { direction } = context;
      const offset = direction.clone().scale(70);
      const x = scene.player.x + offset.x;
      const y = scene.player.y + offset.y;
      const visual = scene.add.circle(x, y, GOO_RADIUS, 0x64ffda, 0.5);
      visual.setDepth(2);

      const goo = {
        x,
        y,
        radius: GOO_RADIUS,
        radiusSq: GOO_RADIUS * GOO_RADIUS,
        visual,
        active: true,
        ignited: false,
        igniteExpiresAt: 0,
        expiresAt: scene.time.now + GOO_DURATION,
      };

      scene.goos.push(goo);
    },
  },
];
