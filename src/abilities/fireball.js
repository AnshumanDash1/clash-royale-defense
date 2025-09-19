import { FIREBALL_SPEED } from '../config/constants.js';

export function castFireball(scene, direction) {
  const origin = new Phaser.Math.Vector2(scene.player.x, scene.player.y)
    .add(direction.clone().scale(48));

  const fireball = scene.fireballs.create(origin.x, origin.y, 'fireball');
  fireball.setCircle(10, 2, 2);
  fireball.setVelocity(direction.x * FIREBALL_SPEED, direction.y * FIREBALL_SPEED);
  fireball.setData('spawnTime', scene.time.now);
  fireball.setData('lifespan', 1500);
  fireball.setDepth(4);
}
