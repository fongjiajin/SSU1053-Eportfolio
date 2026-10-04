// ============================================================
// Topic 页面脚本
// ============================================================

// ---------- 1. 星空画布 + 流星 ----------
(function initStars() {
  const canvas = document.getElementById('topicStars');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let stars = [];
  let meteors = [];
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // 流星生成计时器
  let nextMeteorTime = 0;
  // 每帧之间的最小 / 最大间隔（毫秒）
  const METEOR_MIN_INTERVAL = 1200;
  const METEOR_MAX_INTERVAL = 3800;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.ceil(W * DPR);
    canvas.height = Math.ceil(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    generateStars();
  }

  function generateStars() {
    stars = [];
    const count = Math.floor((W * H) / 6000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.3,
        speed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.3 ? (Math.random() < 0.5 ? 210 : 30) : 0
      });
    }
  }

  // 创建一颗流星
  function spawnMeteor() {
    // 从屏幕上方 1/4 区域随机位置生成
    const startX = Math.random() * W * 1.4 - W * 0.2;
    const startY = Math.random() * H * 0.4 - H * 0.2;

    // 运动方向：右下（角度 30° ~ 60°）
    const angleDeg = 30 + Math.random() * 30;
    const angle = (angleDeg * Math.PI) / 180;

    // 速度（像素/毫秒）
    const speed = 0.7 + Math.random() * 0.8;

    // 拖尾长度
    const tailLength = 140 + Math.random() * 160;

    // 存活时间
    const lifetime = 1200 + Math.random() * 800;

    // 色调：蓝白为主
    const hueRoll = Math.random();
    let hue;
    if (hueRoll < 0.7)      hue = 210; // 蓝白
    else if (hueRoll < 0.9) hue = 190; // 青白
    else                    hue = 40;  // 淡金

    meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      tailLength,
      hue,
      lifetime,
      age: 0,
      width: 1.2 + Math.random() * 1.2,
      brightness: 0.7 + Math.random() * 0.3
    });
  }

  function drawStars(now) {
    for (const s of stars) {
      const twinkle = Math.sin(now * s.speed + s.phase) * 0.4 + 0.6;
      const alpha = s.baseAlpha * twinkle;

      if (s.hue === 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      } else if (s.hue === 210) {
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 200, 150, ${alpha})`;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMeteors(dt, now) {
    // 根据时间间隔生成新流星
    if (now > nextMeteorTime) {
      spawnMeteor();
      // 偶尔一次生成 2 颗，形成"流星雨"感
      if (Math.random() < 0.25) spawnMeteor();

      const interval = METEOR_MIN_INTERVAL +
        Math.random() * (METEOR_MAX_INTERVAL - METEOR_MIN_INTERVAL);
      nextMeteorTime = now + interval;
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // 生命周期结束后移除
      if (m.age > m.lifetime ||
          m.x > W + 200 ||
          m.y > H + 200) {
        meteors.splice(i, 1);
        continue;
      }

      // 淡入 / 淡出
      const t = m.age / m.lifetime;
      let alpha;
      if (t < 0.15) {
        alpha = t / 0.15;
      } else if (t > 0.7) {
        alpha = Math.max(0, 1 - (t - 0.7) / 0.3);
      } else {
        alpha = 1;
      }
      alpha *= m.brightness;

      // 计算拖尾终点（沿速度反方向）
      const speedMag = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      const nx = -m.vx / speedMag;
      const ny = -m.vy / speedMag;
      const tailX = m.x + nx * m.tailLength;
      const tailY = m.y + ny * m.tailLength;

      // 拖尾渐变
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);

      if (m.hue === 210) {
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.15, `rgba(219, 234, 254, ${alpha * 0.85})`);
        grad.addColorStop(0.5, `rgba(147, 197, 253, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(96, 165, 250, 0)`);
      } else if (m.hue === 190) {
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.15, `rgba(200, 245, 250, ${alpha * 0.85})`);
        grad.addColorStop(0.5, `rgba(120, 220, 240, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(80, 200, 220, 0)`);
      } else {
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.15, `rgba(255, 240, 200, ${alpha * 0.85})`);
        grad.addColorStop(0.5, `rgba(255, 200, 130, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(255, 170, 100, 0)`);
      }

      // 绘制拖尾
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // 绘制发光头部
      const headGrad = ctx.createRadialGradient(
        m.x, m.y, 0,
        m.x, m.y, m.width * 8
      );

      if (m.hue === 210) {
        headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        headGrad.addColorStop(0.3, `rgba(219, 234, 254, ${alpha * 0.7})`);
        headGrad.addColorStop(1, `rgba(96, 165, 250, 0)`);
      } else if (m.hue === 190) {
        headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        headGrad.addColorStop(0.3, `rgba(200, 245, 250, ${alpha * 0.7})`);
        headGrad.addColorStop(1, `rgba(80, 200, 220, 0)`);
      } else {
        headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        headGrad.addColorStop(0.3, `rgba(255, 240, 200, ${alpha * 0.7})`);
        headGrad.addColorStop(1, `rgba(255, 170, 100, 0)`);
      }

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.width * 8, 0, Math.PI * 2);
      ctx.fill();

      // 中心亮核
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.width * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let lastTime = performance.now();

  function draw(now) {
    const dt = Math.min(now - lastTime, 32); // 限制最大 dt，避免页面切换后跳帧
    lastTime = now;

    ctx.clearRect(0, 0, W, H);

    drawStars(now);
    drawMeteors(dt, now);

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();

// ---------- 2. Section 滚动淡入 ----------
(function initReveal() {
  const sections = document.querySelectorAll('.reflection-section');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -80px 0px'
    }
  );

  sections.forEach((el) => observer.observe(el));

  if (!('IntersectionObserver' in window)) {
    sections.forEach((el) => el.classList.add('reveal'));
  }
})();

// ---------- 3. 滚动进度条 ----------
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ---------- 4. 键盘快捷键 ----------
(function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const target = e.key === 'ArrowLeft'
        ? document.querySelector('.pager-home')
        : document.querySelector('.pager-next');
      if (target) {
        e.preventDefault();
        target.click();
      }
    }
  });
})();


// ---------- 5. LU 下拉菜单 ----------
(function initLUMenu() {
  const toggle = document.getElementById('luToggle');
  const menu = document.getElementById('luMenu');
  if (!toggle || !menu) return;

  // 高亮当前页
  const currentFile = window.location.pathname.split('/').pop() || 'topic1.html';
  const items = menu.querySelectorAll('.lu-item');
  items.forEach((item) => {
    if (item.getAttribute('href') === currentFile) {
      item.classList.add('active');
    }
  });

  // 打开 / 关闭
  function openMenu() {
    menu.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  }

  function toggleMenu(e) {
    e.stopPropagation();
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener('click', toggleMenu);

  // 点击菜单内部不关闭
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 点击页面其他位置关闭
  document.addEventListener('click', closeMenu);

  // Esc 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ---------- 6. 跳转黑幕过渡 ----------
(function initTransition() {
  const overlay = document.getElementById('transitionOverlay');
  if (!overlay) return;

  function goWithFade(url) {
    overlay.classList.add('active');
    setTimeout(() => {
      window.location.href = url;
    }, 700);
  }

  // 拦截所有指向 index.html 的链接
  const links = document.querySelectorAll('a[href^="index.html"]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      goWithFade(url);
    });
  });

  // 拦截 LU 菜单项（如果当前不是目标页，也走黑幕）
  const luItems = document.querySelectorAll('.lu-item');
  luItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      // 当前页已高亮，不跳转
      if (item.classList.contains('active')) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const url = item.getAttribute('href');
      goWithFade(url);
    });
  });
})();