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

  graphics.fillStyle(0x64ffda, 0.5);
  graphics.fillCircle(28, 28, 28);
  graphics.generateTexture('goo', 56, 56);
  graphics.destroy();
}
