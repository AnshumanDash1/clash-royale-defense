import { CARD_DEFS, CARD_LOOKUP } from '../config/cards.js';
import {
  MAX_ELIXIR,
  ELIXIR_PER_SECOND,
  PLAYER_SPEED,
  PLAYER_MAX_HEALTH,
  FIREBALL_DAMAGE,
  SUMMON_ATTACK_DAMAGE,
  SUMMON_ATTACK_COOLDOWN,
  DASH_SPEED,
  DASH_DAMAGE,
  TURRET_PROJECTILE_SPEED,
} from '../config/constants.js';
import { ensureTextures } from './helpers/textureFactory.js';
import {
  spawnEnemy,
  updateEnemies,
  checkFireballGooInteraction,
  cleanupGoos,
} from './helpers/enemyManager.js';
import { updateSummons } from './helpers/summonManager.js';
import { initUI } from '../ui/uiManager.js';
const ACTIVE_SLOT_COUNT = 2;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }

  init() {
    this.elixir = 0;
    this.maxElixir = MAX_ELIXIR;
    this.playerSpeed = PLAYER_SPEED;
    this.playerMaxHealth = PLAYER_MAX_HEALTH;
    this.playerHealth = this.playerMaxHealth;
    this.lastAimVector = new Phaser.Math.Vector2(1, 0);
    this.goos = [];
    this.acidPools = [];
    this.freezeZones = [];
    this.traps = [];
    this.turrets = [];

    this.cardQueue = ['fireball', 'shield', 'summon', 'heal'];
    this.cardLoadout = [...this.cardQueue];

    this.currentWave = 0;
    this.waveInProgress = false;
    this.enemiesToSpawn = 0;
    this.enemiesSpawned = 0;
    this.waveSpawnEvent = null;
    this.manualPause = false;
    this.playerInvulnerableUntil = 0;
    this.reflectBarrierUntil = 0;
    this.playerHiddenUntil = 0;
    this.dashState = null;
  }

  create() {
    ensureTextures(this);
    this.createGroups();
    this.createPlayer();
    this.configureWorldBounds();
    this.buildHUD();
    this.ui = initUI({
      onSlotSelect: (slotIndex) => this.tryPlayCardFromSlot(slotIndex),
      onPauseToggle: () => this.togglePause(),
      onRestart: () => this.restartGame(),
    });
    if (this.ui && typeof this.ui.setPauseState === 'function') {
      this.ui.setPauseState(this.manualPause);
    }
    this.registerInput();
    this.registerColliders();
    this.refreshCardUI();

    if (this.input.mouse && this.input.mouse.disableContextMenu) {
      this.input.mouse.disableContextMenu();
    }

    this.scale.on('resize', this.handleResize, this);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this.startNextWave();
  }

  createGroups() {
    this.projectiles = this.physics.add.group();
    this.fireballs = this.projectiles;
    this.enemies = this.physics.add.group();
    this.shields = this.physics.add.group({ immovable: true, allowGravity: false });
    this.summons = this.physics.add.group();
  }

  createPlayer() {
    const { width, height } = this.scale;
    this.player = this.physics.add.sprite(width / 2, height / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(26, 6, 6);
    this.player.setDepth(5);
    this.player.setPushable(false);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBackgroundColor('#101727');
    this.cameras.main.setBounds(0, 0, width, height);
  }

  configureWorldBounds() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
  }

  buildHUD() {
    this.healthBarWidth = 240;
    const y = 26;

    this.healthBg = this.add.rectangle(0, y, this.healthBarWidth, 16, 0x122019, 0.8)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.healthFill = this.add.rectangle(0, y, this.healthBarWidth, 12, 0x3de16b, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.healthText = this.add.text(0, y, `${this.playerHealth} / ${this.playerMaxHealth}`, {
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#aefce3',
    })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(22);
  }

  registerInput() {
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.button === 0) {
        this.tryPlayCardFromSlot(0);
      } else if (pointer.button === 2) {
        this.tryPlayCardFromSlot(1);
      }
    });
  }

  registerColliders() {
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (fireball, enemy) => this.onFireballHitsEnemy(fireball, enemy),
    );
    this.physics.add.collider(this.enemies, this.shields);
    this.physics.add.overlap(
      this.summons,
      this.enemies,
      (summon, enemy) => this.onSummonHitsEnemy(summon, enemy),
    );
    this.physics.add.collider(this.enemies, this.player);
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (this.manualPause) {
      return;
    }
    this.updatePlayerMovement();
    this.updateDashState(dt);
    this.recoverElixir(dt);
    this.updateUIState();
    this.updateProjectiles();
    cleanupGoos(this, time);
    this.updateAcidPools(time, dt);
    this.updateFreezeZones(time);
    updateEnemies(this, time, dt);
    updateSummons(this, time);
    this.updateShields(time);
    this.updateTraps(time);
    this.updateTurrets(time, dt);
    this.updateStatusEffects();
    this.checkWaveCompletion();
  }

  updatePlayerMovement() {
    const velocity = new Phaser.Math.Vector2(0, 0);
    if (this.keys.W.isDown) velocity.y -= 1;
    if (this.keys.S.isDown) velocity.y += 1;
    if (this.keys.A.isDown) velocity.x -= 1;
    if (this.keys.D.isDown) velocity.x += 1;

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.playerSpeed);
    }

    this.player.setVelocity(velocity.x, velocity.y);
  }

  recoverElixir(dt) {
    this.elixir = Math.min(this.maxElixir, this.elixir + ELIXIR_PER_SECOND * dt);
  }

  updateUIState() {
    if (!this.ui) {
      return;
    }
    this.ui.updateElixir(this.elixir, this.maxElixir);
    this.ui.updateCardAvailability(this.elixir);

    const healthRatio = Phaser.Math.Clamp(this.playerHealth / this.playerMaxHealth, 0, 1);
    this.healthFill.setDisplaySize(this.healthBarWidth * healthRatio, 12);
    this.healthText.setText(`${Math.ceil(this.playerHealth)} / ${this.playerMaxHealth}`);
  }

  updateProjectiles() {
    this.projectiles.children.iterate((projectile) => {
      if (!projectile) {
        return;
      }
      const spawnTime = projectile.getData('spawnTime') ?? 0;
      const lifespan = projectile.getData('lifespan') ?? 1500;
      if (this.time.now - spawnTime > lifespan) {
        projectile.destroy();
        return;
      }
      if (projectile.getData('type') === 'fireball') {
        checkFireballGooInteraction(this, projectile);
      }
    });
  }

  updateDashState(dt) {
    if (!this.dashState) {
      return;
    }
    const now = this.time.now;
    if (now >= this.dashState.endTime) {
      this.dashState = null;
      this.player.setDrag(0);
      return;
    }

    const { direction } = this.dashState;
    this.player.setVelocity(direction.x * DASH_SPEED, direction.y * DASH_SPEED);

    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) {
        return;
      }
      const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distSq <= 3200) {
        const lastHit = enemy.getData('lastDashHit') ?? 0;
        if (now - lastHit > 120) {
          this.hurtEnemy(enemy, DASH_DAMAGE);
          enemy.setData('lastDashHit', now);
        }
        const push = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y);
        if (push.lengthSq() > 0) {
          push.normalize().scale(260);
          enemy.setVelocity(push.x, push.y);
        }
      }
    });
  }

  updateTraps(time) {
    this.traps = this.traps.filter((trap) => {
      const { sprite } = trap;
      if (!sprite || !sprite.active) {
        if (trap.overlap) {
          trap.overlap.destroy();
        }
        return false;
      }
      if (time > trap.expiresAt) {
        this.detonateTrap(trap, false);
        return false;
      }
      return true;
    });
  }

  detonateTrap(trap, triggered = true) {
    const { sprite, overlap, radiusSq, damage } = trap;
    if (overlap) {
      overlap.destroy();
      trap.overlap = null;
    }
    if (!sprite.active) {
      return;
    }

    if (triggered) {
      const explosion = this.add.circle(sprite.x, sprite.y, Math.sqrt(radiusSq), 0xff7043, 0.45).setDepth(4);
      this.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 1.8,
        duration: 260,
        onComplete: () => explosion.destroy(),
      });

      this.enemies.children.iterate((enemy) => {
        if (!enemy || !enemy.active) {
          return;
        }
        const distSq = Phaser.Math.Distance.Squared(sprite.x, sprite.y, enemy.x, enemy.y);
        if (distSq <= radiusSq) {
          this.hurtEnemy(enemy, damage);
          const force = new Phaser.Math.Vector2(enemy.x - sprite.x, enemy.y - sprite.y).normalize().scale(280);
          enemy.setVelocity(force.x, force.y);
        }
      });
    }

    sprite.destroy();

    if (this.traps) {
      this.traps = this.traps.filter((t) => t !== trap);
    }
  }

  updateAcidPools(time, dt) {
    this.acidPools = this.acidPools.filter((pool) => {
      if (!pool.active) {
        pool.visual.destroy();
        return false;
      }
      if (time > pool.expiresAt) {
        pool.active = false;
        pool.visual.destroy();
        return false;
      }

      this.enemies.children.iterate((enemy) => {
        if (!enemy || !enemy.active) {
          return;
        }
        const distSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, pool.x, pool.y);
        if (distSq <= pool.radiusSq) {
          this.hurtEnemy(enemy, pool.damagePerSecond * dt);
        }
      });
      return true;
    });
  }

  updateFreezeZones(time) {
    this.freezeZones = this.freezeZones.filter((zone) => {
      if (!zone.active) {
        if (zone.visual) {
          zone.visual.destroy();
        }
        return false;
      }
      if (time > zone.expiresAt) {
        zone.active = false;
        if (zone.visual) {
          zone.visual.destroy();
        }
        return false;
      }
      return true;
    });
  }

  updateTurrets(time, dt) {
    this.turrets = this.turrets.filter((turret) => {
      const { sprite } = turret;
      if (!sprite || !sprite.active) {
        return false;
      }
      if (time > turret.expiresAt) {
        sprite.destroy();
        return false;
      }

      if (time >= turret.nextFire) {
        const target = this.findNearestEnemyWithin(sprite.x, sprite.y, turret.rangeSq);
        if (target) {
          turret.nextFire = time + turret.fireRate;
          const vector = new Phaser.Math.Vector2(target.x - sprite.x, target.y - sprite.y);
          const distance = vector.length();
          if (distance > 0) {
            vector.scale(1 / distance);
          }
          sprite.setRotation(vector.angle());

          const bullet = this.projectiles.create(sprite.x, sprite.y, 'turret-bullet');
          bullet.setCircle(8, 4, 4);
          bullet.setVelocity(vector.x * TURRET_PROJECTILE_SPEED, vector.y * TURRET_PROJECTILE_SPEED);
          bullet.setDepth(5);
          bullet.setDataEnabled();
          bullet.setData({
            type: 'turret-bullet',
            damage: turret.damage,
            lifespan: 1400,
            spawnTime: time,
            pierce: 0,
          });
        }
      }
      return true;
    });
  }

  findNearestEnemyWithin(x, y, radiusSq) {
    let closest = null;
    let closestDist = radiusSq;
    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) {
        return;
      }
      const distSq = Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y);
      if (distSq <= closestDist) {
        closestDist = distSq;
        closest = enemy;
      }
    });
    return closest;
  }

  updateStatusEffects() {
    if (this.playerHiddenUntil && this.time.now >= this.playerHiddenUntil) {
      this.playerHiddenUntil = 0;
      if (this.player.alpha !== 1) {
        this.player.setAlpha(1);
      }
    }
  }

  updateShields(time) {
    this.shields.children.iterate((shield) => {
      if (!shield || !shield.active) {
        return;
      }
      if (time > shield.getData('expiresAt')) {
        shield.destroy();
      }
    });
  }

  tryPlayCardFromSlot(slotIndex) {
    if (this.manualPause) {
      return false;
    }
    const activeCards = this.getActiveCards();
    const cardId = activeCards[slotIndex];
    if (!cardId) {
      return false;
    }

    const card = CARD_LOOKUP.get(cardId);
    if (!card || this.elixir < card.cost || !this.player.active) {
      return false;
    }

    const direction = this.getAimVector();
    if (!direction) {
      return false;
    }

    this.elixir -= card.cost;

    const pointer = this.input.activePointer;
    const pointerWorld = pointer ? pointer.positionToCamera(this.cameras.main) : null;
    const context = {
      direction,
      pointer,
      pointerWorld,
      slotIndex,
      time: this.time.now,
    };

    let castResult = true;
    try {
      if (typeof card.cast === 'function') {
        castResult = card.cast(this, context);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to cast card ${card.id}:`, error);
      castResult = false;
    }

    if (castResult === false) {
      this.elixir = Math.min(this.maxElixir, this.elixir + card.cost);
      return false;
    }

    if (this.ui) {
      this.ui.pulseSlot(slotIndex);
    }

    this.rotateCardQueue(slotIndex);
    this.refreshCardUI();
    return true;
  }

  getAimVector() {
    const pointer = this.input.activePointer;
    if (!pointer) {
      return this.lastAimVector.clone();
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main);
    const vec = new Phaser.Math.Vector2(worldPoint.x - this.player.x, worldPoint.y - this.player.y);
    if (vec.lengthSq() < 4) {
      return this.lastAimVector.clone();
    }

    vec.normalize();
    this.lastAimVector.copy(vec);
    return vec;
  }

  onFireballHitsEnemy(fireball, enemy) {
    if (!enemy.active || !fireball.active) {
      return;
    }

    const damage = fireball.getData('damage') ?? FIREBALL_DAMAGE;
    this.hurtEnemy(enemy, damage);

    const pierce = fireball.getData('pierce') ?? 0;
    if (pierce > 0) {
      fireball.setData('pierce', pierce - 1);
      return;
    }

    fireball.destroy();
  }

  onSummonHitsEnemy(summon, enemy) {
    if (!summon.active || !enemy.active) {
      return;
    }

    const time = this.time.now;
    if (time > summon.getData('nextAttack')) {
      this.hurtEnemy(enemy, SUMMON_ATTACK_DAMAGE);
      summon.setData('nextAttack', time + SUMMON_ATTACK_COOLDOWN);
      this.damageSummon(summon, 10);
    }
  }

  damagePlayer(amount) {
    if (this.time && this.time.now < this.playerInvulnerableUntil) {
      return;
    }
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.cameras.main.shake(120, 0.003);
    if (this.playerHealth <= 0) {
      this.onPlayerDefeated();
    }
  }

  damageSummon(summon, amount) {
    if (!summon || !summon.active) {
      return;
    }
    summon.health = Math.max(0, summon.health - amount);
    const bar = summon.getData('healthBar');
    if (bar) {
      const ratio = Phaser.Math.Clamp(summon.health / summon.maxHealth, 0, 1);
      if (ratio > 0) {
        bar.fill.setVisible(true);
        bar.fill.setDisplaySize(bar.width * ratio, bar.height);
      } else {
        bar.fill.setVisible(false);
      }
    }
    if (summon.health <= 0) {
      summon.destroy();
    }
  }

  hurtEnemy(enemy, amount) {
    enemy.health -= amount;
    enemy.setTint(0xffaaaa);
    this.time.delayedCall(120, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    const death = this.add.circle(enemy.x, enemy.y, 32, 0xff7043, 0.6);
    death.setDepth(3);
    this.tweens.add({
      targets: death,
      alpha: 0,
      scale: 1.6,
      duration: 260,
      onComplete: () => death.destroy(),
    });
    enemy.destroy();
    this.checkWaveCompletion();
  }

  onPlayerDefeated() {
    if (!this.player.active) {
      return;
    }

    this.player.setTint(0xff4444);
    this.player.setVelocity(0, 0);
    this.player.disableBody(true, false);

    const overlay = this.add.text(this.player.x, this.player.y, 'Defeated', {
      fontSize: 32,
      fontFamily: 'monospace',
      color: '#ff8a80',
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(1500, () => {
      overlay.destroy();
      this.scene.restart();
    });
  }

  refreshCardUI() {
    if (!this.ui) {
      return;
    }
    const active = this.getActiveCards();
    const queue = this.cardQueue.slice(ACTIVE_SLOT_COUNT);
    this.ui.setCardState({ active, queue });
    this.ui.updateCardAvailability(this.elixir);
  }

  getActiveCards() {
    return this.cardQueue.slice(0, ACTIVE_SLOT_COUNT);
  }

  rotateCardQueue(slotIndex) {
    if (slotIndex < 0 || slotIndex >= ACTIVE_SLOT_COUNT) {
      return;
    }
    const [cardId] = this.cardQueue.splice(slotIndex, 1);
    if (cardId) {
      this.cardQueue.push(cardId);
    }
  }

  startNextWave() {
    this.setGamePaused(false);
    if (this.waveSpawnEvent) {
      this.waveSpawnEvent.remove(false);
      this.waveSpawnEvent = null;
    }

    if (this.ui) {
      this.ui.hideWaveOptions();
    }

    this.cardQueue = [...this.cardLoadout];
    this.refreshCardUI();

    this.currentWave += 1;
    this.waveInProgress = true;
    this.enemiesToSpawn = this.calculateWaveEnemyCount(this.currentWave);
    this.enemiesSpawned = 0;

    if (this.enemiesToSpawn <= 0) {
      return;
    }

    this.spawnEnemyForWave();

    if (this.enemiesToSpawn > 1) {
      const delay = Math.max(450, 1200 - this.currentWave * 90);
      this.waveSpawnEvent = this.time.addEvent({
        delay,
        repeat: this.enemiesToSpawn - 1,
        callback: this.spawnEnemyForWave,
        callbackScope: this,
      });
    }
  }

  spawnEnemyForWave() {
    const initial = this.enemiesSpawned === 0;
    const enemy = spawnEnemy(this, initial);
    if (enemy) {
      this.enemiesSpawned += 1;
    }
  }

  calculateWaveEnemyCount(waveNumber) {
    const base = 4;
    const growth = 2;
    return base + (waveNumber - 1) * growth;
  }

  checkWaveCompletion() {
    if (!this.waveInProgress) {
      return;
    }

    if (this.enemiesSpawned < this.enemiesToSpawn) {
      return;
    }

    if (this.enemies.countActive(true) > 0) {
      return;
    }

    this.waveInProgress = false;
    this.setGamePaused(true);

    if (this.ui) {
      this.ui.showWaveOptions(this.currentWave, {
        onContinue: () => this.startNextWave(),
        onChange: () => this.openLoadoutEditor(),
      });
    }
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.healthBg.setPosition(width / 2 - this.healthBarWidth / 2, 26);
    this.healthFill.setPosition(width / 2 - this.healthBarWidth / 2, 26);
    this.healthText.setPosition(width / 2, 26);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);
  }

  setGamePaused(paused) {
    const nextState = !!paused;
    if (this.manualPause === nextState) {
      return;
    }
    this.manualPause = nextState;
    if (this.physics && this.physics.world) {
      this.physics.world.isPaused = nextState;
    }
    if (this.time) {
      this.time.paused = nextState;
    }
    if (nextState && this.player) {
      this.player.setVelocity(0, 0);
    }
    if (this.ui && typeof this.ui.setPauseState === 'function') {
      this.ui.setPauseState(nextState);
    }
  }

  togglePause() {
    this.setGamePaused(!this.manualPause);
  }

  openLoadoutEditor() {
    if (!this.ui) {
      return;
    }

    this.ui.showLoadoutBuilder({
      loadout: [...this.cardLoadout],
      onConfirm: (newLoadout) => {
        const sanitized = [];
        const seen = new Set();
        newLoadout.forEach((id) => {
          if (CARD_LOOKUP.has(id) && !seen.has(id)) {
            sanitized.push(id);
            seen.add(id);
          }
        });
        if (sanitized.length === 4) {
          this.cardLoadout = sanitized;
          this.cardQueue = [...this.cardLoadout];
          this.refreshCardUI();
        }
        if (this.ui) {
          this.ui.showWaveOptions(this.currentWave, {
            onContinue: () => this.startNextWave(),
            onChange: () => this.openLoadoutEditor(),
          });
        }
      },
      onCancel: () => {
        if (this.ui) {
          this.ui.showWaveOptions(this.currentWave, {
            onContinue: () => this.startNextWave(),
            onChange: () => this.openLoadoutEditor(),
          });
        }
      },
    });
  }

  restartGame() {
    this.setGamePaused(false);
    if (this.waveSpawnEvent) {
      this.waveSpawnEvent.remove(false);
      this.waveSpawnEvent = null;
    }
    this.scene.restart();
  }
}
