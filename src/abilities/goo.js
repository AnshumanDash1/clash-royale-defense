import { GOO_DURATION, GOO_RADIUS } from '../config/constants.js';

export function castGoo(scene, direction) {
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
  return goo;
}

export function igniteGoo(scene, goo) {
  goo.ignited = true;
  goo.igniteExpiresAt = scene.time.now + 2400;
  goo.visual.setFillStyle(0xff7043, 0.7);
}
