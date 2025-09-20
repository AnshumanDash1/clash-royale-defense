import { SHIELD_DURATION } from '../config/constants.js';

export function castShield(scene, direction) {
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
