export function ensureTextures(scene) {
  if (scene.textures.exists('player')) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  graphics.fillStyle(0x4fc3f7, 1);
  graphics.fillCircle(32, 32, 26);
  graphics.fillStyle(0x0a192d, 1);
  graphics.fillCircle(32, 32, 12);
  graphics.generateTexture('player', 64, 64);
  graphics.clear();

  graphics.fillStyle(0xd84315, 1);
  graphics.fillCircle(20, 20, 18);
  graphics.fillStyle(0xffab91, 0.85);
  graphics.fillCircle(17, 17, 9);
  graphics.generateTexture('fireball', 40, 40);
  graphics.clear();

  graphics.fillStyle(0xf5d76e, 1);
  graphics.fillTriangle(6, 18, 34, 8, 34, 28);
  graphics.generateTexture('arrow', 40, 36);
  graphics.clear();

  graphics.fillStyle(0xb39ddb, 1);
  graphics.fillRoundedRect(0, 8, 48, 12, 6);
  graphics.fillStyle(0x5e35b1, 1);
  graphics.fillRoundedRect(30, 10, 18, 8, 4);
  graphics.generateTexture('spear', 48, 28);
  graphics.clear();

  graphics.fillStyle(0x9a3030, 1);
  graphics.fillCircle(32, 32, 26);
  graphics.lineStyle(4, 0x5c1111, 1);
  graphics.strokeCircle(32, 32, 22);
  graphics.generateTexture('enemy', 64, 64);
  graphics.clear();

  graphics.fillStyle(0xd2d2d2, 1);
  graphics.fillRoundedRect(0, 0, 24, 60, 8);
  graphics.fillStyle(0x7f8c8d, 1);
  graphics.fillRoundedRect(5, 14, 14, 32, 6);
  graphics.generateTexture('shield', 24, 60);
  graphics.clear();

  graphics.fillStyle(0xcfebd6, 1);
  graphics.fillCircle(28, 28, 24);
  graphics.strokeCircle(28, 28, 20);
  graphics.fillStyle(0x3e6655, 1);
  graphics.fillTriangle(28, 10, 16, 38, 40, 38);
  graphics.generateTexture('summon', 56, 56);
  graphics.clear();

  graphics.fillStyle(0xe0f2f1, 1);
  graphics.fillCircle(18, 18, 16);
  graphics.fillStyle(0x455a64, 1);
  graphics.fillCircle(18, 14, 6);
  graphics.fillRect(14, 18, 8, 8);
  graphics.generateTexture('skeleton', 36, 36);
  graphics.clear();

  graphics.fillStyle(0xa1887f, 1);
  graphics.fillCircle(34, 34, 30);
  graphics.fillStyle(0x4e342e, 1);
  graphics.fillCircle(34, 34, 16);
  graphics.generateTexture('golem', 68, 68);
  graphics.clear();

  graphics.fillStyle(0xffab40, 1);
  graphics.fillTriangle(24, 4, 4, 44, 44, 44);
  graphics.fillStyle(0xff8f00, 1);
  graphics.fillTriangle(24, 12, 12, 40, 36, 40);
  graphics.generateTexture('falcon', 48, 48);
  graphics.clear();

  graphics.fillStyle(0x455a64, 1);
  graphics.fillRoundedRect(0, 0, 44, 44, 6);
  graphics.fillStyle(0x90caf9, 1);
  graphics.fillRoundedRect(10, 10, 24, 24, 4);
  graphics.generateTexture('turret', 44, 44);
  graphics.clear();

  graphics.fillStyle(0x90caf9, 1);
  graphics.fillCircle(8, 8, 8);
  graphics.generateTexture('turret-bullet', 16, 16);
  graphics.clear();

  graphics.fillStyle(0x64ffda, 0.5);
  graphics.fillCircle(28, 28, 28);
  graphics.generateTexture('goo', 56, 56);
  graphics.destroy();
}
