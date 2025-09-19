import { CARD_DEFS } from '../config/cards.js';
import {
  MAX_ELIXIR,
  ELIXIR_PER_SECOND,
  PLAYER_SPEED,
  PLAYER_MAX_HEALTH,
  FIREBALL_DAMAGE,
  SUMMON_ATTACK_DAMAGE,
  SUMMON_ATTACK_COOLDOWN,
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
import { castFireball, castShield, castSummon, castGoo } from '../abilities/index.js';

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

    this.cardQueue = CARD_DEFS.map((card) => card.id);

    this.currentWave = 0;
    this.waveInProgress = false;
    this.enemiesToSpawn = 0;
    this.enemiesSpawned = 0;
    this.waveSpawnEvent = null;
  }

  create() {
    ensureTextures(this);
    this.createGroups();
    this.createPlayer();
    this.buildHUD();
    this.ui = initUI((slotIndex) => this.tryPlayCardFromSlot(slotIndex));
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
    this.fireballs = this.physics.add.group();
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

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBackgroundColor('#101727');
    this.cameras.main.setBounds(0, 0, width, height);
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
      this.fireballs,
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
    this.updatePlayerMovement();
    this.recoverElixir(dt);
    this.updateUIState();
    this.updateFireballs();
    cleanupGoos(this, time);
    updateEnemies(this, time, dt);
    updateSummons(this, time);
    this.updateShields(time);
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

  updateFireballs() {
    this.fireballs.children.iterate((fireball) => {
      if (!fireball) {
        return;
      }
      if (this.time.now - fireball.getData('spawnTime') > fireball.getData('lifespan')) {
        fireball.destroy();
        return;
      }
      checkFireballGooInteraction(this, fireball);
    });
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
    const activeCards = this.getActiveCards();
    const cardId = activeCards[slotIndex];
    if (!cardId) {
      return false;
    }

    const card = CARD_DEFS.find((def) => def.id === cardId);
    if (!card || this.elixir < card.cost || !this.player.active) {
      return false;
    }

    const direction = this.getAimVector();
    if (!direction) {
      return false;
    }

    this.elixir -= card.cost;

    switch (card.id) {
      case 'fireball':
        castFireball(this, direction);
        break;
      case 'shield':
        castShield(this, direction);
        break;
      case 'summon':
        castSummon(this, direction);
        break;
      case 'goo':
        castGoo(this, direction);
        break;
      default:
        break;
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
    if (!enemy.active) {
      return;
    }
    this.hurtEnemy(enemy, FIREBALL_DAMAGE);
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
    }
  }

  damagePlayer(amount) {
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.cameras.main.shake(120, 0.003);
    if (this.playerHealth <= 0) {
      this.onPlayerDefeated();
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
    if (this.waveSpawnEvent) {
      this.waveSpawnEvent.remove(false);
      this.waveSpawnEvent = null;
    }

    if (this.ui) {
      this.ui.hideWaveOptions();
    }

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

    if (this.ui) {
      this.ui.showWaveOptions(this.currentWave, {
        onContinue: () => this.startNextWave(),
        onChange: () => {},
      });
    }
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.healthBg.setPosition(width / 2 - this.healthBarWidth / 2, 26);
    this.healthFill.setPosition(width / 2 - this.healthBarWidth / 2, 26);
    this.healthText.setPosition(width / 2, 26);
    this.cameras.main.setBounds(0, 0, width, height);
  }
}
