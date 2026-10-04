import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// Topic 页面的 3D 行星
// 从 #sunContainer 的 data-model 属性读取模型路径
// 每个 topicN.html 通过 data-model 指定自己的行星模型
// ============================================================
(function initPlanetScene() {
  const container = document.getElementById('sunContainer');
  if (!container) return;

  // ★ 从 data-model 读取模型路径，默认 models/sun.glb
  const modelPath = container.dataset.model || 'models/sun.glb';

  // ---------- 基础场景 ----------
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  // 初始相机：距离 4，行星看起来正常大小，居中
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // ---------- 灯光 ----------
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0xffaa33, 1.2);
  rimLight.position.set(-6, 2, -4);
  scene.add(rimLight);

  // ---------- 加载模型 ----------
  let planetModel = null;
  let modelLoaded = false;

  // 不同行星模型视觉大小可能差异很大，可在此微调
  const MODEL_SCALE_ADJUST = {
    'sun.glb':      1.00,
    'mercury.glb':  1.00,
    'venus.glb':    1.00,
    'earth.glb':    1.00,
    'moon.glb':     1.00,
    'mars.glb':     1.00,
    'jupiter.glb':  1.00,
    'saturn.glb':   1.40,
    'uranus.glb':   1.50,
    'neptune.glb':  1.00
  };

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      planetModel = gltf.scene;

      // 归一化：居中 + 缩放到半径 ≈ 1
      const box = new THREE.Box3().setFromObject(planetModel);
      const center = box.getCenter(new THREE.Vector3());
      planetModel.position.sub(center);

      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const modelName = modelPath.split('/').pop();
        const extraScale = MODEL_SCALE_ADJUST[modelName] || 1.0;
        const baseScale = 2 / maxDim;
        planetModel.scale.setScalar(baseScale * extraScale);
      }

      scene.add(planetModel);
      modelLoaded = true;

      // 0.6s 后开始镜头动画
      setTimeout(startCameraAnimation, 600);
    },
    (xhr) => {
      if (xhr.total) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        console.log(`加载 ${modelPath}... ${percent}%`);
      }
    },
    (err) => {
      console.error(`${modelPath} 加载失败:`, err);
      // 加载失败也启动镜头动画，避免画面卡住
      setTimeout(startCameraAnimation, 600);
    }
  );

  // ---------- 相机动画 ----------
  // 起点：行星居中，正常大小
  const startPos = new THREE.Vector3(0, 0, 4);
  const startTarget = new THREE.Vector3(0, 0, 0);

  // 终点：拉近 + 右移，行星被推到左侧，只露出右半球
  const endPos = new THREE.Vector3(1.6, 0.15, 2.0);
  const endTarget = new THREE.Vector3(1.6, 0.15, 0);

  let cameraTween = null;

  function startCameraAnimation() {
    cameraTween = {
      fromPos: camera.position.clone(),
      toPos: endPos.clone(),
      fromTarget: startTarget.clone(),
      toTarget: endTarget.clone(),
      start: performance.now(),
      duration: 3200
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ---------- 渲染循环 ----------
  const _currentTarget = new THREE.Vector3();

  function animate(now) {
    requestAnimationFrame(animate);

    // 相机动画
    if (cameraTween) {
      const t = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
      const e = easeInOutCubic(t);

      camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, e);
      _currentTarget.lerpVectors(
        cameraTween.fromTarget,
        cameraTween.toTarget,
        e
      );
      camera.lookAt(_currentTarget);

      if (t >= 1) {
        cameraTween = null;
      }
    }

    // 行星缓慢自转
    if (modelLoaded && planetModel) {
      planetModel.rotation.y += 0.0015;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  // ---------- 窗口缩放 ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();