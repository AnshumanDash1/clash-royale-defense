import {
  SUMMON_LIFETIME,
  SUMMON_MAX_HEALTH,
  SUMMON_ATTACK_COOLDOWN,
  SUMMON_ATTACK_DAMAGE,
  SKELETON_HORDE_COUNT,
  SKELETON_HORDE_HEALTH,
  SKELETON_HORDE_DAMAGE,
  SKELETON_HORDE_ATTACK_COOLDOWN,
  SKELETON_HORDE_SPEED,
  GOLEM_MAX_HEALTH,
  GOLEM_ATTACK_DAMAGE,
  GOLEM_ATTACK_COOLDOWN,
  GOLEM_SPEED,
  GOLEM_LIFETIME,
  FALCON_STRIKE_DAMAGE,
  FALCON_STRIKE_RANGE,
  FALCON_STRIKE_RETURN_DAMAGE,
  TURRET_LIFETIME,
  TURRET_FIRE_RATE,
  TURRET_DAMAGE,
  TURRET_RANGE,
} from '../config/constants.js';

function attachHealthBar(scene, summon, width, offsetY = 38, color = 0x6ee7b7) {
  const barBg = scene.add.rectangle(summon.x, summon.y - offsetY, width + 4, 6, 0x0f172a, 0.7).setDepth(7);
  const barFill = scene.add.rectangle(summon.x, summon.y - offsetY, width, 4, color, 1).setDepth(8);
  barBg.setOrigin(0.5, 0.5);
  barFill.setOrigin(0.5, 0.5);
  summon.setData('healthBar', { bg: barBg, fill: barFill, width, height: 4, offsetY });
  summon.once('destroy', () => {
    barBg.destroy();
    barFill.destroy();
  });
}

function createCompanion(scene, options) {
  const {
    direction,
    texture,
    offset = 50,
    radius = 24,
    maxHealth,
    health,
    speed,
    attackDamage,
    attackCooldown,
    attackRange = 46,
    lifetime = SUMMON_LIFETIME,
    barWidth = 34,
    barOffset = 38,
  } = options;

  const placement = direction.clone().normalize().scale(offset);
  const summon = scene.summons.create(
    scene.player.x + placement.x,
    scene.player.y + placement.y,
    texture,
  );

  summon.setDepth(5);
  summon.setCircle(radius, Math.max(0, radius - 24), Math.max(0, radius - 24));
  summon.maxHealth = maxHealth;
  summon.health = health;
  summon.setData('nextAttack', 0);
  summon.setData('attackDamage', attackDamage);
  summon.setData('attackCooldown', attackCooldown);
  summon.setData('attackRange', attackRange);
  summon.setData('speed', speed);

  attachHealthBar(scene, summon, barWidth, barOffset);

  scene.time.delayedCall(lifetime, () => {
    if (summon.active) {
      summon.destroy();
    }
  });

  return summon;
}

function castSummonSkeleton(scene, direction) {
  createCompanion(scene, {
    direction,
    texture: 'summon',
    offset: 50,
    radius: 24,
    maxHealth: SUMMON_MAX_HEALTH,
    health: SUMMON_MAX_HEALTH,
    speed: 200,
    attackDamage: SUMMON_ATTACK_DAMAGE,
    attackCooldown: SUMMON_ATTACK_COOLDOWN,
    attackRange: 46,
    barWidth: 34,
  });
}

function castSkeletonHorde(scene, direction) {
  const angle = direction.angle();
  const spread = Phaser.Math.DEG_TO_RAD * 60;
  for (let i = 0; i < SKELETON_HORDE_COUNT; i += 1) {
    const ratio = SKELETON_HORDE_COUNT === 1 ? 0 : i / (SKELETON_HORDE_COUNT - 1);
    const offsetAngle = angle + spread * (ratio - 0.5);
    const dir = new Phaser.Math.Vector2(Math.cos(offsetAngle), Math.sin(offsetAngle));
    createCompanion(scene, {
      direction: dir,
      texture: 'skeleton',
      offset: 70,
      radius: 18,
      maxHealth: SKELETON_HORDE_HEALTH,
      health: SKELETON_HORDE_HEALTH,
      speed: SKELETON_HORDE_SPEED,
      attackDamage: SKELETON_HORDE_DAMAGE,
      attackCooldown: SKELETON_HORDE_ATTACK_COOLDOWN,
      attackRange: 42,
      lifetime: SUMMON_LIFETIME,
      barWidth: 26,
      barOffset: 32,
    });
  }
}

function castGuardianGolem(scene, direction) {
  const golem = createCompanion(scene, {
    direction,
    texture: 'golem',
    offset: 60,
    radius: 32,
    maxHealth: GOLEM_MAX_HEALTH,
    health: GOLEM_MAX_HEALTH,
    speed: GOLEM_SPEED,
    attackDamage: GOLEM_ATTACK_DAMAGE,
    attackCooldown: GOLEM_ATTACK_COOLDOWN,
    attackRange: 58,
    lifetime: GOLEM_LIFETIME,
    barWidth: 48,
    barOffset: 44,
  });
  golem.setDepth(6);
}

function castFalconStrike(scene, direction) {
  let best = null;
  let bestProjection = FALCON_STRIKE_RANGE;
  const origin = new Phaser.Math.Vector2(scene.player.x, scene.player.y);
  scene.enemies.children.iterate((enemy) => {
    if (!enemy || !enemy.active) {
      return;
    }
    const toEnemy = new Phaser.Math.Vector2(enemy.x - origin.x, enemy.y - origin.y);
    const projection = toEnemy.dot(direction);
    if (projection <= 0 || projection > FALCON_STRIKE_RANGE) {
      return;
    }
    const perpendicularSq = toEnemy.lengthSq() - projection * projection;
    if (perpendicularSq > 60 * 60) {
      return;
    }
    if (projection < bestProjection) {
      bestProjection = projection;
      best = enemy;
    }
  });

  if (!best) {
    return false;
  }

  scene.hurtEnemy(best, FALCON_STRIKE_DAMAGE);
  const strike = scene.add.sprite(best.x, best.y, 'falcon').setDepth(7);
  scene.tweens.add({
    targets: strike,
    alpha: 0,
    y: strike.y - 60,
    duration: 320,
    ease: 'Sine.easeOut',
    onComplete: () => strike.destroy(),
  });

  scene.time.delayedCall(420, () => {
    if (best.active) {
      scene.hurtEnemy(best, FALCON_STRIKE_RETURN_DAMAGE);
    }
  });

  return true;
}

function castTurretDrop(scene, direction) {
  const offset = direction.clone().scale(70);
  const sprite = scene.physics.add.sprite(
    scene.player.x + offset.x,
    scene.player.y + offset.y,
    'turret',
  );
  sprite.setDepth(5);
  sprite.body.setAllowGravity(false);
  sprite.setImmovable(true);
  sprite.setCircle(20, 6, 6);

  const turret = {
    sprite,
    expiresAt: scene.time.now + TURRET_LIFETIME,
    nextFire: scene.time.now + 200,
    fireRate: TURRET_FIRE_RATE,
    damage: TURRET_DAMAGE,
    rangeSq: TURRET_RANGE * TURRET_RANGE,
  };

  scene.turrets.push(turret);
}

export const summonCards = [
  {
    id: 'summon',
    name: 'Summon',
    description: 'Call a skeleton ally with limited vigor.',
    category: 'summon',
    cost: 3,
    cast(scene, context) {
      castSummonSkeleton(scene, context.direction);
    },
  },
  {
    id: 'skeleton-horde',
    name: 'Skeleton Horde',
    description: 'Raise a pack of fragile distractors.',
    category: 'summon',
    cost: 4,
    cast(scene, context) {
      castSkeletonHorde(scene, context.direction);
    },
  },
  {
    id: 'guardian-golem',
    name: 'Guardian Golem',
    description: 'Summon a towering protector.',
    category: 'summon',
    cost: 8,
    cast(scene, context) {
      castGuardianGolem(scene, context.direction);
    },
  },
  {
    id: 'falcon-strike',
    name: 'Falcon Strike',
    description: 'Send a falcon forward to maul a target.',
    category: 'summon',
    cost: 3,
    cast(scene, context) {
      castFalconStrike(scene, context.direction);
    },
  },
  {
    id: 'turret-drop',
    name: 'Turret Drop',
    description: 'Deploy a temporary auto-firing turret.',
    category: 'summon',
    cost: 4,
    cast(scene, context) {
      castTurretDrop(scene, context.direction);
    },
  },
];
