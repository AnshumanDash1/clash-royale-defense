import { HEAL_PERCENT } from '../config/constants.js';

export function castHeal(scene) {
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
