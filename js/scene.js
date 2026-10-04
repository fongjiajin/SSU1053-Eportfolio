import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// 基础场景
// ============================================================
const container = document.getElementById('scene-container');
const statusEl = document.getElementById('status');
const tooltipEl = document.getElementById('planetTooltip');
const tooltipLU = tooltipEl.querySelector('.tooltip-lu');
const tooltipName = tooltipEl.querySelector('.tooltip-name');
const overlayEl = document.getElementById('transitionOverlay');
const aboutLink = document.getElementById('aboutLink');
const topicsLink = document.getElementById('topicsLink');
const meteorLink = document.getElementById('meteorLink');

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

let currentState = 'main';
let spinFactor = 1;
let targetSpinFactor = 1;
let currentModelScale = 1;
let targetModelScale = 1;
let currentSolarScale = 0.75;
let targetSolarScale = 0.75;
let ballCenterGlobal = new THREE.Vector3();
let ballRadiusGlobal = 0.5;
let modelOrigin = new THREE.Vector3();
let pendingCallback = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  2000
);
camera.position.set(3, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = false;

// ============================================================
// 灯光
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.8);
rimLight.position.set(-5, 3, -6);
scene.add(rimLight);

// ============================================================
// 星空纹理
// ============================================================
function createStarTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(200,220,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const starTexture = createStarTexture();

const STAR_PALETTES = {
  cool: [
    { h: [0.55, 0.62], s: [0.4, 0.8], l: [0.7, 1.0] },
    { h: [0.50, 0.55], s: [0.3, 0.7], l: [0.8, 1.0] },
    { h: [0.58, 0.66], s: [0.2, 0.5], l: [0.9, 1.0] }
  ],
  warm: [
    { h: [0.10, 0.15], s: [0.5, 0.9], l: [0.75, 1.0] },
    { h: [0.06, 0.10], s: [0.6, 1.0], l: [0.7, 0.95] },
    { h: [0.00, 0.05], s: [0.5, 0.9], l: [0.7, 0.95] }
  ],
  dreamy: [
    { h: [0.75, 0.82], s: [0.5, 0.9], l: [0.75, 1.0] },
    { h: [0.85, 0.92], s: [0.5, 0.9], l: [0.8, 1.0] },
    { h: [0.90, 0.96], s: [0.4, 0.8], l: [0.85, 1.0] }
  ],
  mixed: null
};

function pickPalette(name) {
  if (name === 'mixed') {
    const all = [
      ...STAR_PALETTES.cool,
      ...STAR_PALETTES.warm,
      ...STAR_PALETTES.dreamy
    ];
    return all[Math.floor(Math.random() * all.length)];
  }
  const arr = STAR_PALETTES[name];
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween([min, max]) {
  return min + Math.random() * (max - min);
}

const starLayers = [];

function addStarLayer({ count, radius, size, opacity = 1, palette = 'mixed' }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = radius * (0.7 + Math.random() * 0.3);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    const p = pickPalette(palette);
    c.setHSL(randBetween(p.h), randBetween(p.s), randBetween(p.l));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size, map: starTexture, vertexColors: true,
    transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true, fog: false
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  starLayers.push(stars);
  return stars;
}

addStarLayer({ count: 9000, radius: 260, size: 1.8, opacity: 0.9, palette: 'mixed' });
addStarLayer({ count: 2500, radius: 180, size: 3.2, opacity: 1, palette: 'cool' });
addStarLayer({ count: 400, radius: 130, size: 6.5, opacity: 1, palette: 'mixed' });

// ============================================================
// 星云
// ============================================================
const nebulaLayers = [];

function createNebulaTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const nebulaTexture = createNebulaTexture();

function addNebulaLayer({
  count, radius, size, opacity = 0.35,
  palettes = [
    { h: 0.58, s: 0.8, l: 0.45 },
    { h: 0.75, s: 0.8, l: 0.5 },
    { h: 0.88, s: 0.8, l: 0.5 },
    { h: 0.5,  s: 0.7, l: 0.45 },
    { h: 0.05, s: 0.7, l: 0.5 }
  ]
}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = radius * (0.75 + Math.random() * 0.25);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    const p = palettes[Math.floor(Math.random() * palettes.length)];
    c.setHSL(
      p.h + (Math.random() - 0.5) * 0.05,
      p.s * (0.8 + Math.random() * 0.3),
      p.l * (0.8 + Math.random() * 0.4)
    );
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size, map: nebulaTexture, vertexColors: true,
    transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true, fog: false
  });

  const nebula = new THREE.Points(geo, mat);
  scene.add(nebula);
  nebulaLayers.push(nebula);
  return nebula;
}

addNebulaLayer({ count: 120, radius: 320, size: 180, opacity: 0.22 });
addNebulaLayer({ count: 80, radius: 240, size: 140, opacity: 0.28 });

// ============================================================
// LU 映射
// ============================================================
const LU_MAP = {
  Sun:      { lu: 'LU 1',  url: 'topic1.html'  },
  Mercury:  { lu: 'LU 2',  url: 'topic2.html'  },
  Venus:    { lu: 'LU 3',  url: 'topic3.html'  },
  Earth:    { lu: 'LU 4',  url: 'topic4.html'  },
  Moon:     { lu: 'LU 5',  url: 'topic5.html'  },
  Mars:     { lu: 'LU 6',  url: 'topic6.html'  },
  Jupiter:  { lu: 'LU 7',  url: 'topic7.html'  },
  Saturn:   { lu: 'LU 8',  url: 'topic8.html'  },
  Uranus:   { lu: 'LU 9',  url: 'topic9.html'  },
  Neptune:  { lu: 'LU 10', url: 'topic10.html' }
};

// ============================================================
// 球体相关
// ============================================================
const ballUniforms = {
  uOpacity:    { value: 1.0 },
  uFacingMin:  { value: 0.35 },
  uFacingMax:  { value: 0.92 }
};

let model = null;
let ball = null;
let ballBackMesh = null;
let ballPivot = null;
let cameraTween = null;
let isNavigating = false;
let ballFrontMaterials = [];

let solarSystem = null;
let solarSun = null;
const solarPlanets = [];
const solarMoons = [];
const clickableBodies = [];

const FOCUSED_OPACITY = 0.05;

let mainCameraPos = new THREE.Vector3();
let mainCameraTarget = new THREE.Vector3();

// ============================================================
// 加载模型
// ============================================================
const loader = new GLTFLoader();
loader.load(
  'models/thinker.glb',
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    model.traverse((obj) => {
      if (ball) return;
      const name = obj.name.toLowerCase();
      if (name.includes('ball') || name.includes('sphere')) {
        ball = obj;
      }
    });

    if (ball) {
      setStatus('Click the sphere');
      prepareBall();
    } else {
      setStatus('sphere not found in model');
    }

    fitCameraToObject(model, 1.6);

    model.getWorldPosition(modelOrigin);

    mainCameraPos.copy(camera.position);
    mainCameraTarget.copy(controls.target);

    // ★ 检查 URL hash，直接跳到对应状态（用于 topic → index 跳转）
    if (ball) {
      applyInitialStateFromHash();
    }
  },
  (xhr) => {
    if (xhr.total) {
      setStatus(`Loading... ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
    }
  },
  (error) => {
    console.error('model load error:', error);
    setStatus('model load failed');
  }
);

// ============================================================
// 球体准备
// ============================================================
function prepareBall() {
  ballFrontMaterials = [];
  const ballMeshes = [];
  ball.traverse((obj) => {
    if (obj.isMesh) ballMeshes.push(obj);
  });
  if (ballMeshes.length === 0) return;

  const mainMesh = ballMeshes[0];
  mainMesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mainMesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const ballCenter = sphere.center.clone();
  const ballRadius = sphere.radius;

  ballCenterGlobal.copy(ballCenter);
  ballRadiusGlobal = ballRadius;

  createSolarSystem(scene, ballCenter, ballRadius * 0.65);

  const origMat = mainMesh.material;
  const frontMat = Array.isArray(origMat)
    ? origMat.map((m) => createFrontMaterial(m))
    : createFrontMaterial(origMat);
  mainMesh.material = frontMat;
  mainMesh.renderOrder = 2;
  const mats = Array.isArray(frontMat) ? frontMat : [frontMat];
  mats.forEach((m) => ballFrontMaterials.push(m));

  const backMat = Array.isArray(origMat)
    ? origMat.map((m) => createBackMaterial(m))
    : createBackMaterial(origMat);
  ballBackMesh = new THREE.Mesh(mainMesh.geometry, backMat);
  ballBackMesh.name = 'Ball_Back';
  ballBackMesh.renderOrder = 1;
  mainMesh.add(ballBackMesh);

  ballPivot = createBallPivot(mainMesh);
}

function createBallPivot(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const worldCenter = sphere.center.clone();
  const parent = mesh.parent;
  parent.updateMatrixWorld(true);
  const pivot = new THREE.Group();
  pivot.name = 'BallPivot';
  parent.add(pivot);
  const localCenter = parent.worldToLocal(worldCenter.clone());
  pivot.position.copy(localCenter);
  const meshWorld = mesh.matrixWorld.clone();
  pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
  const newLocal = new THREE.Matrix4().multiplyMatrices(inv, meshWorld);
  newLocal.decompose(mesh.position, mesh.quaternion, mesh.scale);
  return pivot;
}

// ============================================================
// 太阳系
// ============================================================
function createSolarSystem(scene, centerWorld, radius) {
  const group = new THREE.Group();
  group.name = 'SolarSystem';
  group.position.copy(centerWorld);
  scene.add(group);

  const R = radius;

  const sunR = R * 0.07;
  const sunGeo = new THREE.SphereGeometry(sunR, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  solarSun = new THREE.Mesh(sunGeo, sunMat);
  solarSun.userData.bodyName = 'Sun';
  solarSun.userData.baseColor = new THREE.Color(0xffdd44);
  group.add(solarSun);
  clickableBodies.push(solarSun);

  const glowColors = [0xffcc33, 0xffaa22, 0xff8822, 0xff6611];
  glowColors.forEach((color, i) => {
    const glowGeo = new THREE.SphereGeometry(sunR * (1.5 + i * 0.5), 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color, transparent: true,
      opacity: 0.22 - i * 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.userData.bodyName = 'Sun';
    solarSun.add(glow);
  });

  const planetData = [
    { name: 'Mercury', orbit: 0.16, size: 0.013, speed: 2.2, color: 0xb0b0b0, tilt: 0.02 },
    { name: 'Venus',   orbit: 0.23, size: 0.020, speed: 1.7, color: 0xe8b866, tilt: 0.03 },
    { name: 'Earth',   orbit: 0.31, size: 0.022, speed: 1.3, color: 0x3d8bdd, tilt: 0.04, hasMoon: true },
    { name: 'Mars',    orbit: 0.39, size: 0.017, speed: 1.0, color: 0xcc5533, tilt: 0.05 },
    { name: 'Jupiter', orbit: 0.60, size: 0.052, speed: 0.55, color: 0xd4a066, tilt: 0.02, hasStripes: true },
    { name: 'Saturn',  orbit: 0.72, size: 0.044, speed: 0.40, color: 0xe8cc88, tilt: 0.04, hasRing: true },
    { name: 'Uranus',  orbit: 0.82, size: 0.030, speed: 0.28, color: 0x66dddd, tilt: 0.06, hasRing: true, ringTilted: true },
    { name: 'Neptune', orbit: 0.90, size: 0.029, speed: 0.22, color: 0x4466dd, tilt: 0.04 }
  ];

  planetData.forEach((p) => {
    const orbitR = R * p.orbit;
    const orbitGeo = new THREE.RingGeometry(orbitR - 0.0012, orbitR + 0.0012, 96);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x6688bb, side: THREE.DoubleSide,
      transparent: true, opacity: 0.26, depthWrite: false
    });
    const ring = new THREE.Mesh(orbitGeo, orbitMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  });

  planetData.forEach((p) => {
    const orbitR = R * p.orbit;
    const planetR = R * p.size;

    const orbitPivot = new THREE.Group();
    orbitPivot.rotation.y = p.tilt;
    group.add(orbitPivot);

    const planetPivot = new THREE.Group();
    planetPivot.rotation.y = Math.random() * Math.PI * 2;
    orbitPivot.add(planetPivot);

    const planetGeo = new THREE.SphereGeometry(planetR, 32, 32);
    const planetMat = new THREE.MeshBasicMaterial({ color: p.color });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.position.x = orbitR;
    planet.userData.bodyName = p.name;
    planet.userData.baseColor = new THREE.Color(p.color);
    planetPivot.add(planet);
    clickableBodies.push(planet);

    const haloGeo = new THREE.SphereGeometry(planetR * 1.5, 20, 20);
    const haloMat = new THREE.MeshBasicMaterial({
      color: p.color, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.userData.bodyName = p.name;
    planet.add(halo);

    if (p.hasStripes) {
      const stripeCount = 7;
      for (let i = 0; i < stripeCount; i++) {
        const ratio = (i / (stripeCount - 1) - 0.5) * 1.5;
        const y = ratio * planetR;
        const ringR = planetR * Math.sqrt(Math.max(0, 1 - ratio * ratio));
        if (ringR <= 0.01) continue;
        const stripeGeo = new THREE.TorusGeometry(ringR * 1.01, planetR * 0.055, 8, 48);
        const stripeMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xb07840 : 0xf0d8a8,
          transparent: true, opacity: 0.72, depthWrite: false
        });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = y;
        stripe.rotation.x = Math.PI / 2;
        planet.add(stripe);
      }
    }

    if (p.hasRing) {
      const ringGeo = new THREE.RingGeometry(planetR * 1.35, planetR * 2.25, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: p.name === 'Uranus' ? 0x88dddd : 0xe8d8a8,
        side: THREE.DoubleSide,
        transparent: true, opacity: 0.55, depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      if (p.ringTilted) {
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = Math.PI / 2.2;
        ring.rotation.y = 0.3;
      } else {
        ring.rotation.x = Math.PI / 2 + 0.18;
      }
      planet.add(ring);

      const ring2Geo = new THREE.RingGeometry(planetR * 1.5, planetR * 1.85, 96);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xfff0d8, side: THREE.DoubleSide,
        transparent: true, opacity: 0.35, depthWrite: false
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.copy(ring.rotation);
      planet.add(ring2);
    }

    if (p.hasMoon) {
      const moonPivot = new THREE.Group();
      planet.add(moonPivot);

      const moonR = planetR * 0.45;
      const moonGeo = new THREE.SphereGeometry(moonR, 20, 20);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.x = planetR * 3.0;
      moon.userData.bodyName = 'Moon';
      moon.userData.baseColor = new THREE.Color(0xdddddd);
      moonPivot.add(moon);
      clickableBodies.push(moon);

      const moonHaloGeo = new THREE.SphereGeometry(moonR * 1.6, 12, 12);
      const moonHaloMat = new THREE.MeshBasicMaterial({
        color: 0xaaaacc, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      moon.add(new THREE.Mesh(moonHaloGeo, moonHaloMat));

      solarMoons.push({ pivot: moonPivot, speed: 2.6 });
    }

    solarPlanets.push({ pivot: planetPivot, planet, speed: p.speed });
  });

  solarSystem = group;
}

// ============================================================
// 材质
// ============================================================
function createFrontMaterial(sourceMat) {
  const mat = sourceMat.clone();
  mat.side = THREE.FrontSide;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.userData.originalOpacity = mat.opacity ?? 1;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOpacity   = ballUniforms.uOpacity;
    shader.uniforms.uFacingMin = ballUniforms.uFacingMin;
    shader.uniforms.uFacingMax = ballUniforms.uFacingMax;

    shader.vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
       vWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    shader.fragmentShader = `
      uniform float uOpacity;
      uniform float uFacingMin;
      uniform float uFacingMax;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       vec3 viewDir = normalize(cameraPosition - vWorldPosition);
       float facing = dot(normalize(vWorldNormal), viewDir);
       float transparency = smoothstep(uFacingMin, uFacingMax, facing);
       gl_FragColor.a *= mix(1.0, uOpacity, transparency);`
    );
  };

  mat.needsUpdate = true;
  return mat;
}

function createBackMaterial(sourceMat) {
  const mat = sourceMat.clone();
  mat.side = THREE.BackSide;
  mat.transparent = false;
  mat.depthWrite = true;
  mat.opacity = 1.0;
  mat.needsUpdate = true;
  return mat;
}

// ============================================================
// 自动取景
// ============================================================
function fitCameraToObject(object, padding = 1.5) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance *= padding;
  const dir = new THREE.Vector3(1, 0.6, 1).normalize();
  camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
  controls.target.copy(center);
  controls.update();
}

// ============================================================
// 缓动
// ============================================================
function easeInOutCubic(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// ============================================================
// 计算放大后的球心世界坐标
// ============================================================
function getScaledBallCenter(scale) {
  const offset = ballCenterGlobal.clone().sub(modelOrigin);
  return modelOrigin.clone().add(offset.multiplyScalar(scale));
}

// ============================================================
// 屏幕空间拾取
// ============================================================
const _pickWorldPos = new THREE.Vector3();
const _pickProjected = new THREE.Vector3();
const _pickBox = new THREE.Box3();
const _pickSphere = new THREE.Sphere();

function pickClosestBody(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const clickX = clientX - rect.left;
  const clickY = clientY - rect.top;

  let best = null;
  let bestDist = Infinity;

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const tanHalfFov = Math.tan(fovRad / 2);

  for (const body of clickableBodies) {
    if (!body.visible) continue;

    body.getWorldPosition(_pickWorldPos);

    _pickProjected.copy(_pickWorldPos).project(camera);
    if (_pickProjected.z > 1) continue;

    const screenX = (_pickProjected.x * 0.5 + 0.5) * rect.width;
    const screenY = (-_pickProjected.y * 0.5 + 0.5) * rect.height;

    const dx = clickX - screenX;
    const dy = clickY - screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    _pickBox.setFromObject(body);
    _pickBox.getBoundingSphere(_pickSphere);
    const worldRadius = _pickSphere.radius;

    const distToCam = camera.position.distanceTo(_pickWorldPos);
    if (distToCam < 0.001) continue;
    const worldHeightAtDist = 2 * tanHalfFov * distToCam;
    const screenRadius = (worldRadius / worldHeightAtDist) * rect.height;

    const threshold = Math.max(screenRadius * 1.6, 26);

    if (dist < threshold && dist < bestDist) {
      bestDist = dist;
      best = body;
    }
  }

  return best;
}

// ============================================================
// Main → About
// ============================================================
function goToAbout(onComplete) {
  if (currentState === 'about') {
    if (onComplete) onComplete();
    return;
  }
  if (cameraTween || isNavigating) return;
  if (!ball) return;

  currentState = 'about';

  if (onComplete) pendingCallback = onComplete;

  if (model) model.updateMatrixWorld(true);
  ball.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(ball);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = Math.max(sphere.radius, 0.05);

  const dir = new THREE.Vector3().subVectors(camera.position, center);
  if (dir.lengthSq() < 0.0001) dir.set(0, 0.2, 1);
  dir.normalize();

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = radius / Math.sin(fovRad / 2);
  const distance = fitDistance * 1.25;

  const endPos = center.clone().add(dir.multiplyScalar(distance));
  endPos.y += radius * 0.3;

  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: endPos,
    fromTarget: controls.target.clone(),
    toTarget: center.clone(),
    start: performance.now(),
    duration: 2800
  };

  controls.enabled = false;
  setStatus('camera is flying to the sphere...');

  setTimeout(() => {
    ballUniforms.uOpacity.value = FOCUSED_OPACITY;
  }, 1400);

  setTimeout(() => {
    document.body.dataset.state = 'about';
    setStatus('click the sphere to focus on the solar system');
  }, 2200);
}

// ============================================================
// About → Focus
// ============================================================
function goToFocus(onComplete) {
  pendingCallback = null;

  if (currentState === 'focus') {
    if (onComplete) onComplete();
    return;
  }
  if (cameraTween || isNavigating) return;
  if (!solarSystem) return;

  currentState = 'focus';

  const currentCenter = getScaledBallCenter(1);

  const dirFromCenter = new THREE.Vector3().subVectors(camera.position, currentCenter);
  if (dirFromCenter.lengthSq() < 0.0001) dirFromCenter.set(0, 0.5, 1);
  dirFromCenter.normalize();

  const retreatDistance = ballRadiusGlobal * 500;
  const retreatPos = currentCenter.clone().add(
    dirFromCenter.clone().multiplyScalar(retreatDistance)
  );
  retreatPos.y += ballRadiusGlobal * 1.5;

  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: retreatPos,
    fromTarget: controls.target.clone(),
    toTarget: currentCenter.clone(),
    start: performance.now(),
    duration: 1200
  };

  controls.enabled = false;
  setStatus('pulling back the view...');

  pendingCallback = () => {
    ballUniforms.uOpacity.value = 0.0;

    targetModelScale = 150.0;
    targetSolarScale = 60.0;
    targetSpinFactor = 0.05;

    const solarVisualRadius = ballRadiusGlobal * 0.585 * targetSolarScale;
    const newBallCenter = getScaledBallCenter(targetModelScale);

    const dir = new THREE.Vector3().subVectors(camera.position, newBallCenter);
    if (dir.lengthSq() < 0.0001) dir.set(0, 0.3, 1);
    dir.normalize();

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const fitDistance = solarVisualRadius / Math.sin(fovRad / 2);
    const distance = fitDistance * 1.15;

    const endPos = newBallCenter.clone().add(dir.multiplyScalar(distance));
    endPos.y += solarVisualRadius * 0.1;

    cameraTween = {
      fromPos: camera.position.clone(),
      toPos: endPos,
      fromTarget: controls.target.clone(),
      toTarget: newBallCenter.clone(),
      start: performance.now(),
      duration: 2400
    };

    controls.enabled = false;
    setStatus('zooming in on the solar system...');

    setTimeout(() => {
      document.body.dataset.state = 'focus';
      setStatus('click a planet to enter the corresponding LU');
      if (onComplete) onComplete();
    }, 2000);
  };
}

// ============================================================
// Focus → About
// ============================================================
function goFromFocusToAbout() {
  pendingCallback = null;

  if (currentState !== 'focus' || cameraTween || isNavigating) return;

  currentState = 'about';

  targetModelScale = 1;
  targetSolarScale = 0.75;
  targetSpinFactor = 1.0;

  const center = getScaledBallCenter(1);
  const R = ballRadiusGlobal;

  const dir = new THREE.Vector3().subVectors(camera.position, center);
  if (dir.lengthSq() < 0.0001) dir.set(0, 0.2, 1);
  dir.normalize();

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = R / Math.sin(fovRad / 2);
  const distance = fitDistance * 1.25;

  const endPos = center.clone().add(dir.multiplyScalar(distance));
  endPos.y += R * 0.3;

  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: endPos,
    fromTarget: controls.target.clone(),
    toTarget: center.clone(),
    start: performance.now(),
    duration: 2400
  };

  controls.enabled = false;
  setStatus('returning to the About view...');

  setTimeout(() => {
    document.body.dataset.state = 'about';
    setStatus('click the sphere to focus on the solar system');
  }, 1200);
}

// ============================================================
// Focus / About → Main
// ============================================================
function goToMain() {
  pendingCallback = null;

  if (currentState === 'main' || cameraTween || isNavigating) return;

  const fromState = currentState;
  currentState = 'main';

  ballUniforms.uOpacity.value = 1.0;

  targetModelScale = 1;
  targetSolarScale = 0.75;

  targetSpinFactor = 1.0;

  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: mainCameraPos.clone(),
    fromTarget: controls.target.clone(),
    toTarget: mainCameraTarget.clone(),
    start: performance.now(),
    duration: fromState === 'focus' ? 2600 : 2000
  };

  controls.enabled = false;
  setStatus('returning to the main view...');

  setTimeout(() => {
    document.body.dataset.state = 'main';
    setStatus('Click the sphere');
  }, 700);
}

// ============================================================
// ★ 从 URL hash 直接进入指定状态（用于 topic → index 跳转）
// ============================================================
function applyInitialStateFromHash() {
  const hash = window.location.hash;
  if (!hash) return;

  if (hash === '#about') {
    currentState = 'about';
    document.body.dataset.state = 'about';

    ball.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ball);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center.clone();
    const radius = Math.max(sphere.radius, 0.05);

    const dir = new THREE.Vector3(1, 0.4, 1).normalize();
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const fitDistance = radius / Math.sin(fovRad / 2);
    const distance = fitDistance * 1.25;

    const endPos = center.clone().add(dir.multiplyScalar(distance));
    endPos.y += radius * 0.3;

    camera.position.copy(endPos);
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();

    ballUniforms.uOpacity.value = FOCUSED_OPACITY;

    setStatus('Click the sphere to focus on the solar system');
    console.log('hash: Loading into About state');
    return;
  }

  if (hash === '#topics') {
    currentState = 'focus';
    document.body.dataset.state = 'focus';

    targetModelScale = 150.0;
    targetSolarScale = 60.0;
    targetSpinFactor = 0.05;
    currentModelScale = 150.0;
    currentSolarScale = 60.0;
    spinFactor = 0.05;

    if (model) model.scale.setScalar(currentModelScale);
    if (solarSystem) {
      solarSystem.position.copy(getScaledBallCenter(currentModelScale));
      solarSystem.scale.setScalar(currentSolarScale);
    }

    ballUniforms.uOpacity.value = 0.0;

    const solarVisualRadius = ballRadiusGlobal * 0.585 * targetSolarScale;
    const newBallCenter = getScaledBallCenter(targetModelScale);

    const dir = new THREE.Vector3(0.5, 0.6, 1).normalize();
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const fitDistance = solarVisualRadius / Math.sin(fovRad / 2);
    const distance = fitDistance * 1.15;

    const endPos = newBallCenter.clone().add(dir.multiplyScalar(distance));
    endPos.y += solarVisualRadius * 0.1;

    camera.position.copy(endPos);
    controls.target.copy(newBallCenter);
    camera.lookAt(newBallCenter);
    controls.update();

    setStatus('Click a planet to enter the corresponding LU');
    console.log('hash: Directly entering Focus state');
    return;
  }
}

// ============================================================
// Raycaster
// ============================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let pointerDownPos = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDownPos = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (cameraTween || isNavigating) return;

  if (pointerDownPos) {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (currentState === 'main') {
    if (!ball) return;
    const hits = raycaster.intersectObject(ball, true);
    if (hits.length > 0) goToAbout();
    return;
  }

  if (currentState === 'about') {
    if (!ball) return;
    const hits = raycaster.intersectObject(ball, true);
    if (hits.length > 0) goToFocus();
    return;
  }

  if (currentState === 'focus') {
    const body = pickClosestBody(event.clientX, event.clientY);
    if (body && body.userData.bodyName && LU_MAP[body.userData.bodyName]) {
      flyToBodyAndNavigate(body);
    }
  }
});

// ============================================================
// 鼠标悬浮
// ============================================================
let hoveredBody = null;

renderer.domElement.addEventListener('pointermove', (event) => {
  if (isNavigating) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (currentState === 'main') {
    if (!ball) return;
    const hits = raycaster.intersectObject(ball, true);
    renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    tooltipEl.classList.remove('show');
    unhoverBody();
    return;
  }

  if (currentState === 'about') {
    if (!ball) return;
    const hits = raycaster.intersectObject(ball, true);
    renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    tooltipEl.classList.remove('show');
    unhoverBody();
    return;
  }

  if (currentState === 'focus') {
    const body = pickClosestBody(event.clientX, event.clientY);

    if (body && body.userData.bodyName && LU_MAP[body.userData.bodyName]) {
      const info = LU_MAP[body.userData.bodyName];
      tooltipLU.textContent = info.lu;
      tooltipName.textContent = body.userData.bodyName;
      tooltipEl.style.left = event.clientX + 'px';
      tooltipEl.style.top = event.clientY + 'px';
      tooltipEl.classList.add('show');
      renderer.domElement.style.cursor = 'pointer';

      if (hoveredBody !== body) {
        unhoverBody();
        hoveredBody = body;
        hoverBody(hoveredBody);
      }
      return;
    }

    unhoverBody();
    tooltipEl.classList.remove('show');
    renderer.domElement.style.cursor = 'grab';
  }
});

function hoverBody(obj) {
  obj.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      if (!child.userData.originalColor) {
        child.userData.originalColor = child.material.color.clone();
      }
      child.material.color.lerp(new THREE.Color(0xffffff), 0.55);
    }
  });
}

function unhoverBody() {
  if (!hoveredBody) return;
  hoveredBody.traverse((child) => {
    if (child.isMesh && child.material && child.userData.originalColor) {
      child.material.color.copy(child.userData.originalColor);
    }
  });
  hoveredBody = null;
}

// ============================================================
// 点击行星 → 相机缓慢拉近 → 跳转
// ============================================================
function flyToBodyAndNavigate(body) {
  if (isNavigating) return;
  isNavigating = true;

  const bodyName = body.userData.bodyName;
  const target = LU_MAP[bodyName];
  if (!target) {
    isNavigating = false;
    return;
  }

  body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = Math.max(sphere.radius, 0.04);

  const dir = new THREE.Vector3().subVectors(camera.position, center);
  if (dir.lengthSq() < 0.0001) dir.set(0, 0.4, 1);
  dir.normalize();

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = radius / Math.sin(fovRad / 2);
  const distance = fitDistance * 1.05;

  const endPos = center.clone().add(dir.multiplyScalar(distance));
  endPos.y += radius * 0.1;

  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: endPos,
    fromTarget: controls.target.clone(),
    toTarget: center.clone(),
    start: performance.now(),
    duration: 2600
  };

  controls.enabled = false;
  setStatus(`Currently flying to ${target.lu} · ${bodyName}...`);

  setTimeout(() => {
    overlayEl.classList.add('active');
    setTimeout(() => {
      window.location.href = target.url;
    }, 800);
  }, 2600);
}

// ============================================================
// 顶部导航
// ============================================================
aboutLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (cameraTween || isNavigating) return;

  if (currentState === 'main') {
    goToAbout();
  } else if (currentState === 'focus') {
    goFromFocusToAbout();
  }
});

topicsLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (cameraTween || isNavigating) return;

  if (currentState === 'main') {
    goToAbout(() => {
      goToFocus();
    });
  } else if (currentState === 'about') {
    goToFocus();
  }
});

meteorLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentState !== 'main') {
    goToMain();
  }
});

// ============================================================
// 渲染循环
// ============================================================
function animate(now) {
  requestAnimationFrame(animate);

  if (starLayers[0]) {
    starLayers[0].rotation.y += 0.00004;
    starLayers[0].rotation.x += 0.00001;
  }
  if (starLayers[1]) starLayers[1].rotation.y += 0.00008;
  if (starLayers[2]) starLayers[2].rotation.y += 0.00012;

  if (nebulaLayers[0]) nebulaLayers[0].rotation.y += 0.00002;
  if (nebulaLayers[1]) nebulaLayers[1].rotation.y -= 0.00003;

  spinFactor += (targetSpinFactor - spinFactor) * 0.014;

  if (Math.abs(currentModelScale - targetModelScale) > 0.001) {
    currentModelScale += (targetModelScale - currentModelScale) * 0.025;
  } else {
    currentModelScale = targetModelScale;
  }

  if (Math.abs(currentSolarScale - targetSolarScale) > 0.001) {
    currentSolarScale += (targetSolarScale - currentSolarScale) * 0.025;
  } else {
    currentSolarScale = targetSolarScale;
  }

  if (model) {
    model.scale.setScalar(currentModelScale);
  }

  if (solarSystem) {
    solarSystem.position.copy(getScaledBallCenter(currentModelScale));
    solarSystem.scale.setScalar(currentSolarScale);
  }

  if (ballPivot) {
    ballPivot.rotation.y += 0.0025 * spinFactor;
  }

  if (solarSystem) {
    if (solarSun) solarSun.rotation.y += 0.004 * spinFactor;
    solarPlanets.forEach((p) => {
      p.pivot.rotation.y += p.speed * 0.005 * spinFactor;
      if (p.planet) p.planet.rotation.y += 0.015 * spinFactor;
    });
    solarMoons.forEach((m) => {
      m.pivot.rotation.y += m.speed * 0.008 * spinFactor;
    });
    solarSystem.rotation.y += 0.0004 * spinFactor;
  }

  const current = ballUniforms.uOpacity.value;
  let target = 1.0;
  if (currentState === 'about') target = FOCUSED_OPACITY;
  else if (currentState === 'focus') target = 0.0;

  if (Math.abs(current - target) > 0.002) {
    ballUniforms.uOpacity.value += (target - current) * 0.045;
  } else {
    ballUniforms.uOpacity.value = target;
  }

  if (cameraTween) {
    const t = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
    const e = easeInOutCubic(t);

    camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, e);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, e);
    camera.lookAt(controls.target);

    if (t >= 1) {
      cameraTween = null;
      if (!isNavigating) {
        controls.enabled = true;
        controls.update();
      }

      if (pendingCallback) {
        const cb = pendingCallback;
        pendingCallback = null;
        cb();
      }
    }
  } else {
    if (controls.enabled) controls.update();
  }

  updateNavActive();

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// ============================================================
// 导航高亮
// ============================================================
function updateNavActive() {
  aboutLink.classList.toggle('active', currentState === 'about');
  topicsLink.classList.toggle('active', currentState === 'focus');
}

// ============================================================
// 窗口缩放
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});