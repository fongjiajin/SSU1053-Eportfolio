// ============================================================
// 粒子文字汇聚效果
// ============================================================

const particleCanvas = document.getElementById('particleCanvas');
const pctx = particleCanvas.getContext('2d');

function resizeParticleCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth + 4;
  const h = window.innerHeight + 4;

  particleCanvas.width  = Math.ceil(w * dpr);
  particleCanvas.height = Math.ceil(h * dpr);
  particleCanvas.style.width  = w + 'px';
  particleCanvas.style.height = h + 'px';

  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clearParticleCanvas();
}

function clearParticleCanvas() {
  pctx.save();
  pctx.setTransform(1, 0, 0, 1, 0, 0);
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  pctx.restore();
}

resizeParticleCanvas();
window.addEventListener('resize', resizeParticleCanvas);

const particleSystems = [];

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spawnParticleSystem(el, options = {}) {
  const rect = el.getBoundingClientRect();
  const {
    count = 70,
    flyDuration = 2400,
    delay = 0,
    stayDuration = 2600
  } = options;

  const particles = [];
  const centerX = rect.left + rect.width / 2 + 2;
  const centerY = rect.top + rect.height / 2 + 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 700 + Math.random() * 500;
    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;

    const targetX = rect.left + Math.random() * rect.width + 2;
    const targetY = rect.top + Math.random() * rect.height + 2;

    particles.push({
      startX, startY, targetX, targetY,
      x: startX, y: startY,
      size: 1.2 + Math.random() * 1.8,
      hue: 200 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      wobble: 3 + Math.random() * 6
    });
  }

  particleSystems.push({
    particles,
    startTime: performance.now() + delay,
    flyDuration,
    stayDuration,
    done: false
  });
}

function animateParticleCanvas() {
  const now = performance.now();

  clearParticleCanvas();

  let anyActive = false;

  for (const system of particleSystems) {
    if (system.done) continue;

    const elapsed = now - system.startTime;
    if (elapsed < 0) {
      anyActive = true;
      continue;
    }

    let systemAlpha = 1;
    if (elapsed < system.flyDuration) {
      systemAlpha = Math.min(elapsed / 400, 1);
    } else if (elapsed < system.flyDuration + system.stayDuration) {
      systemAlpha = 1;
    } else {
      const fadeElapsed = elapsed - system.flyDuration - system.stayDuration;
      const fadeDuration = 1200;
      systemAlpha = Math.max(0, 1 - fadeElapsed / fadeDuration);
      if (systemAlpha <= 0) {
        system.done = true;
        continue;
      }
    }

    for (const p of system.particles) {
      const t = Math.min(elapsed / system.flyDuration, 1);
      const e = easeOutCubic(t);

      p.x = p.startX + (p.targetX - p.startX) * e;
      p.y = p.startY + (p.targetY - p.startY) * e;

      if (t >= 0.95) {
        const wobbleTime = (elapsed - system.flyDuration) * 0.002;
        p.x += Math.sin(wobbleTime + p.phase) * p.wobble * 0.25;
        p.y += Math.cos(wobbleTime + p.phase) * p.wobble * 0.25;
      }

      let pAlpha = systemAlpha;
      if (t < 0.1) pAlpha *= t / 0.1;
      if (pAlpha <= 0) continue;

      const gradient = pctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size * 5
      );
      gradient.addColorStop(0, `hsla(${p.hue}, 100%, 95%, ${pAlpha})`);
      gradient.addColorStop(0.3, `hsla(${p.hue}, 100%, 78%, ${pAlpha * 0.75})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);

      pctx.fillStyle = gradient;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
      pctx.fill();
    }

    anyActive = true;
  }

  if (anyActive) {
    requestAnimationFrame(animateParticleCanvas);
  } else {
    clearParticleCanvas();
  }
}

function startParticleIntro() {
  const blocks = document.querySelectorAll('.intro-block[data-particle="true"]');

  blocks.forEach((el, i) => {
    const delay = 400 + i * 500;

    spawnParticleSystem(el, {
      count: 70,
      flyDuration: 2400,
      delay: delay,
      stayDuration: 2600
    });

    setTimeout(() => {
      el.classList.add('reveal');
    }, delay + 1900);
  });

  requestAnimationFrame(animateParticleCanvas);
}

// 兜底：4 秒后强制显示所有 intro-block
setTimeout(() => {
  document.querySelectorAll('.intro-block').forEach((el) => {
    el.classList.add('reveal');
  });
}, 4000);

function bootParticleIntro() {
  requestAnimationFrame(() => {
    startParticleIntro();
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootParticleIntro();
} else {
  document.addEventListener('DOMContentLoaded', bootParticleIntro);
}