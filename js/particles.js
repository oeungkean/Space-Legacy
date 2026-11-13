// A pool of soft round sprites used for smoke and fire. They are reused again and again.
// Used by the launch cinematic and by the mission replays.

import * as THREE from "three";

function makeSoftTexture(r, g, b) {
  const drawing = document.createElement("canvas");
  drawing.width = 64;
  drawing.height = 64;
  const ctx = drawing.getContext("2d");

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)");
  gradient.addColorStop(0.5, "rgba(" + r + "," + g + "," + b + ",0.5)");
  gradient.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createParticleSystem(scene, maxParticles) {
  const smokeTexture = makeSoftTexture(215, 217, 225);
  const fireTexture = makeSoftTexture(255, 150, 40);

  const pool = [];
  let next = 0;

  for (let i = 0; i < maxParticles; i++) {
    const material = new THREE.SpriteMaterial({
      map: smokeTexture, transparent: true, depthWrite: false, opacity: 0
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 4;
    scene.add(sprite);

    pool.push({
      sprite: sprite, material: material, active: false, isFire: false,
      age: 0, life: 1, drag: 0, velocity: new THREE.Vector3(),
      startSize: 0, endSize: 0, startOpacity: 0
    });
  }

  // When every sprite is busy, reuse the smoke puff that is closest to the end of its life (it is
  // almost transparent by then, so nobody sees it go). Fire is never taken this way, so the engine
  // plume does not flicker or drop out when the smoke is thick.
  function oldestSmoke() {
    let best = null;
    let bestAge = -1;
    for (let i = 0; i < maxParticles; i++) {
      const particle = pool[i];
      if (particle.isFire) continue;
      const u = particle.age / particle.life;
      if (u > bestAge) {
        bestAge = u;
        best = particle;
      }
    }
    return best;
  }

  // Starts one puff. isFire = glowing fire (adds light). tint = optional color. drag = slows it down.
  function emit(isFire, position, velocity, startSize, endSize, life, opacity, tint, drag) {
    let particle = null;
    for (let i = 0; i < maxParticles; i++) {
      const index = (next + i) % maxParticles;
      if (pool[index].active) continue;
      particle = pool[index];
      next = (index + 1) % maxParticles;
      break;
    }
    if (!particle) particle = oldestSmoke();
    if (!particle) return;

    if (particle.isFire !== isFire) {
      particle.isFire = isFire;
      particle.material.map = isFire ? fireTexture : smokeTexture;
      particle.material.blending = isFire ? THREE.AdditiveBlending : THREE.NormalBlending;
      // fire is light, so filmic tone mapping should not dim it; smoke is lit like everything else
      particle.material.toneMapped = !isFire;
      // fire is drawn after the smoke, so the engines' glow shows through the steam (as in launch footage)
      particle.sprite.renderOrder = isFire ? 5 : 4;
      particle.material.needsUpdate = true;
    }

    particle.material.color.set(tint !== undefined ? tint : 0xffffff);
    particle.active = true;
    particle.age = 0;
    particle.life = life;
    particle.drag = drag || 0;
    particle.velocity.copy(velocity);
    particle.startSize = startSize;
    particle.endSize = endSize;
    particle.startOpacity = opacity;
    particle.sprite.position.copy(position);
    particle.sprite.scale.setScalar(startSize);
    particle.material.opacity = 0;
    particle.sprite.visible = true;
  }

  // Optional: the camera that watches the particles. Puffs of smoke that drift so close to it that they
  // would fill the whole view fade out first, so a camera standing in the smoke cloud does not turn white.
  let viewer = null;
  function setCamera(camera) {
    viewer = camera || null;
  }

  function update(delta) {
    const eye = viewer ? viewer.position : null;
    pool.forEach(function (particle) {
      if (!particle.active) return;

      particle.age += delta;
      if (particle.age >= particle.life) {
        particle.active = false;
        particle.sprite.visible = false;
        return;
      }

      const u = particle.age / particle.life;
      if (particle.drag > 0) particle.velocity.multiplyScalar(Math.exp(-particle.drag * delta));
      particle.sprite.position.addScaledVector(particle.velocity, delta);
      particle.sprite.scale.setScalar(THREE.MathUtils.lerp(particle.startSize, particle.endSize, u));

      const fadeIn = u < 0.1 ? u / 0.1 : 1;
      let near = 1;
      if (eye && !particle.isFire) {
        // fully faded when the camera is inside the puff, fully visible once it is 1.5 puff-sizes away
        const size = particle.sprite.scale.x;
        const distance = particle.sprite.position.distanceTo(eye);
        near = THREE.MathUtils.clamp((distance - size * 0.5) / size, 0, 1);
      }
      particle.material.opacity = particle.startOpacity * fadeIn * (1 - u) * near;
    });
  }

  function clear() {
    pool.forEach(function (particle) {
      particle.active = false;
      particle.sprite.visible = false;
    });
  }

  return { emit: emit, update: update, clear: clear, setCamera: setCamera };
}