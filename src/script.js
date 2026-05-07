import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import siteData from './data/siteData.json';
import earthDayTexture from '/images/earth_daymap.jpg';
import earthNightTexture from '/images/earth_nightmap.jpg';
import earthNormalTexture from '/images/earth_normalmap.jpg';
import earthSpecularTexture from '/images/earth_specularmap.jpg';
import earthAtmosphereTexture from '/images/earth_atmosphere.jpg';
import sunTexture from '/images/sun.jpg';
import marsTexture from '/images/marsmap.jpg';
import neptuneTexture from '/images/neptune.jpg';
import saturnTexture from '/images/saturnmap.jpg';
import saturnRingTexture from '/images/saturn_ring.png';
import venusTexture from '/images/venusmap.jpg';
import cairPosterPdf from '../images/CAIR Research Poster.pptx - Google Slides.pdf';
import researchPosterPdf from '../images/Research Template - Google Slides.pdf';
import conferenceImage1 from '../images/conferenceimage1.jpg';
import conferenceImage2 from '../images/conferenceimage2.jpg';
import conferenceImage3 from '../images/conferenceimage3.jpg';
import identityDriftNotebook from '../notebooks/qml_identity_drift_notebook.ipynb?url';
import quantumCnnNotebook from '../notebooks/QuantumCNN.ipynb?url';

const canvasHost = document.querySelector('#scene-root');
const labelsHost = document.querySelector('#cluster-labels');
const quantumLabelsHost = document.querySelector('#quantum-labels');
const navHost = document.querySelector('#cluster-nav');
const nameEl = document.querySelector('[data-person-name]');
const titleEl = document.querySelector('[data-person-title]');
const taglineEl = document.querySelector('[data-person-tagline]');
const sectionKickerEl = document.querySelector('[data-section-kicker]');
const sectionHeadingEl = document.querySelector('[data-section-heading]');
const sectionTextEl = document.querySelector('[data-section-text]');
const sectionActionEl = document.querySelector('[data-section-action]');
const researchArchiveEl = document.querySelector('[data-research-archive]');
const researchCloseEl = document.querySelector('[data-research-close]');
const researchKickerEl = document.querySelector('[data-research-kicker]');
const researchHeadingEl = document.querySelector('[data-research-heading]');
const researchIntroEl = document.querySelector('[data-research-intro]');
const researchListEl = document.querySelector('[data-research-list]');
const researchNodeDockEl = document.querySelector('[data-research-node-dock]');
const quantumReturnEl = document.querySelector('[data-quantum-return]');
const quantumNodePanelEl = document.querySelector('[data-quantum-node-panel]');
const spaceTourPanelEl = document.querySelector('[data-space-tour-panel]');
const spaceTourKickerEl = document.querySelector('[data-space-tour-kicker]');
const spaceTourHeadingEl = document.querySelector('[data-space-tour-heading]');
const spaceTourProgressEl = document.querySelector('[data-space-tour-progress]');
const spaceTourTextEl = document.querySelector('[data-space-tour-text]');
const spaceTourExitEl = document.querySelector('[data-space-tour-exit]');
const soundToggle = document.querySelector('[data-sound-toggle]');
const sunModeToggle = document.querySelector('[data-sun-mode-toggle]');

nameEl.textContent = siteData.person.name;
titleEl.textContent = siteData.person.title;
taglineEl.textContent = siteData.person.tagline;
if (soundToggle && !siteData.audio?.enabled) {
  soundToggle.hidden = true;
}

const sections = siteData.sections ?? siteData.clusters;
const researchSectionIndex = sections.findIndex((section) => section.id === 'research' && section.detail?.entries?.length);
const firstSignalSectionIndex = sections.findIndex((section) => section.id === 'first-signal');
const spaceTourConfig = siteData.visual?.spaceTour ?? {};

function getResearchEntries() {
  return researchSectionIndex >= 0 ? sections[researchSectionIndex].detail?.entries ?? [] : [];
}

function isQuantumResearchEntry(index) {
  const entry = getResearchEntries()[index];
  return entry?.visual === 'blackHole' || /quantum/i.test(entry?.title ?? '');
}

function getNavLabel(section) {
  const labels = {
    home: 'Home',
    'big-ideas': 'Ideas',
    'first-signal': 'Space',
    research: 'Research',
    projects: 'Projects',
    systems: 'Systems',
    contact: 'Signal'
  };
  return labels[section.id] ?? section.label;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030716, 0.018);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 900);
const initialCluster = sections[0];
camera.position.fromArray(initialCluster.camera.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
canvasHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.enableZoom = false;
controls.rotateSpeed = 0.28;
controls.target.fromArray(initialCluster.camera.target);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.82, 0.86, 0.08);
composer.addPass(bloomPass);

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.55;
const pointer = new THREE.Vector2();
const clusterTargets = [];
const clusterLabels = new Map();
const quantumLabels = [];
const notebookLabels = [];
let activeClusterIndex = 0;
let hoveredCluster = null;
let scrollProgress = 0;
let scrollTarget = 0;
let textTransitionTimer = null;
let audioContext = null;
let audioNodes = null;
let audioElement = null;
let soundEnabled = false;
let youtubePlayer = null;
let youtubeApiPromise = null;
let youtubeReadyPromise = null;
let sunPrank = null;
let sunReturnBoostUntil = 0;
let detailArchiveIndex = null;
let activeResearchEntryIndex = 0;
let researchExploreIndex = null;
let quantumMode = false;
let quantumModeEntryIndex = null;
let quantumNodeFocusIndex = null;
let quantumDiveStartedAt = 0;
let routeJumpTimer = null;
let spaceTour = null;
let spaceTourMomentIndex = -1;

const palette = {
  star: new THREE.Color(0xd7f1ff),
  hotStar: new THREE.Color(0xffffff),
  cyan: new THREE.Color(0x91e7ff),
  amber: new THREE.Color(0xffd493),
  line: new THREE.Color(0x89b8ff)
};

const planetTextures = {
  mars: marsTexture,
  neptune: neptuneTexture,
  saturn: saturnTexture,
  venus: venusTexture
};

const assetUrls = {
  cairPosterPdf,
  researchPosterPdf,
  conferenceImage1,
  conferenceImage2,
  conferenceImage3,
  identityDriftNotebook,
  quantumCnnNotebook
};

function toColor(value, fallback = '#9de8ff') {
  return new THREE.Color(value ?? fallback);
}

function loadColorTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

const EARTH_RADIUS = 2.18;

scene.add(new THREE.AmbientLight(0x31406b, 1));

const sunLight = new THREE.PointLight(0xffe0aa, 720, 260, 1.45);
sunLight.position.set(-42, 16, -68);
scene.add(sunLight);

function createStarTexture() {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.22, 'rgba(184, 230, 255, 0.95)');
  gradient.addColorStop(0.48, 'rgba(94, 168, 255, 0.28)');
  gradient.addColorStop(1, 'rgba(94, 168, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const starTexture = createStarTexture();

function createNebulaTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
  glow.addColorStop(0.16, 'rgba(135, 220, 255, 0.42)');
  glow.addColorStop(0.38, 'rgba(122, 96, 255, 0.2)');
  glow.addColorStop(0.68, 'rgba(255, 112, 186, 0.1)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const nebulaTexture = createNebulaTexture();

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function addBackgroundStars() {
  const rand = seededRandom(1847);
  const count = siteData.visual?.backgroundStarCount ?? 10000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const webPoints = [];
  const radius = 360;

  for (let i = 0; i < count; i += 1) {
    const r = radius * Math.cbrt(rand());
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const i3 = i * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.56;
    positions[i3 + 2] = r * Math.cos(phi) - 80;

    const color = rand() > 0.82 ? palette.amber : palette.star;
    const brightness = 0.36 + rand() * 0.64;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;

    const webStep = siteData.visual?.constellationWebStep ?? 31;
    if (i % webStep === 0 && webPoints.length < 520) {
      webPoints.push(new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: count > 50000 ? 0.07 : 0.14,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.7,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const field = new THREE.Group();
  const stars = new THREE.Points(geometry, material);
  stars.name = `${count.toLocaleString()} star catalogue`;
  field.add(stars);

  const webVertices = [];
  for (let i = 0; i < webPoints.length - 2; i += 2) {
    webVertices.push(webPoints[i], webPoints[i + 1]);
    if (i % 6 === 0) {
      webVertices.push(webPoints[i], webPoints[i + 2]);
    }
  }

  const webGeometry = new THREE.BufferGeometry().setFromPoints(webVertices);
  const webMaterial = new THREE.LineBasicMaterial({
    color: 0x85c8ff,
    transparent: true,
    opacity: siteData.visual?.constellationWebOpacity ?? 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  webMaterial.userData.baseOpacity = webMaterial.opacity;
  const web = new THREE.LineSegments(webGeometry, webMaterial);
  web.name = 'distant constellation web';
  field.add(web);

  scene.add(field);
  return { field, web };
}

const background = addBackgroundStars();

function createCelestialAnchors() {
  const earthGroup = new THREE.Group();
  earthGroup.name = 'Textured Earth anchor';

  const earthMaterial = new THREE.MeshPhongMaterial({
    map: loadColorTexture(earthDayTexture),
    normalMap: textureLoader.load(earthNormalTexture),
    normalScale: new THREE.Vector2(0.45, 0.45),
    specularMap: textureLoader.load(earthSpecularTexture),
    specular: new THREE.Color(0x6f93a9),
    shininess: 18,
    transparent: true,
    opacity: 1
  });
  earthMaterial.userData.baseOpacity = earthMaterial.opacity;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 64), earthMaterial);
  earth.rotation.z = -0.32;
  earthGroup.add(earth);

  const nightMaterial = new THREE.MeshBasicMaterial({
    map: loadColorTexture(earthNightTexture),
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  nightMaterial.userData.baseOpacity = nightMaterial.opacity;
  const night = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.005, 96, 64), nightMaterial);
  night.rotation.z = -0.32;
  earthGroup.add(night);

  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    map: loadColorTexture(earthAtmosphereTexture),
    color: 0x93dcff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  atmosphereMaterial.userData.baseOpacity = atmosphereMaterial.opacity;
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.1, 96, 64), atmosphereMaterial);
  earthGroup.add(atmosphere);
  scene.add(earthGroup);

  const sunMaterial = new THREE.MeshBasicMaterial({
    map: loadColorTexture(sunTexture),
    color: 0xffddb0,
    transparent: true,
    opacity: 1
  });
  sunMaterial.userData.baseOpacity = sunMaterial.opacity;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(7.5, 96, 64), sunMaterial);
  sun.position.copy(sunLight.position);
  scene.add(sun);

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(13.5, 64, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffb86a,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  sunGlow.material.userData.baseOpacity = sunGlow.material.opacity;
  sunGlow.position.copy(sun.position);
  scene.add(sunGlow);

  return { earthGroup, earth, night, atmosphere, sun, sunGlow };
}

const celestial = createCelestialAnchors();

function createGalaxy() {
  const config = siteData.visual?.galaxy ?? {};
  const rand = seededRandom(91821);
  const galaxy = new THREE.Group();
  galaxy.name = 'Big Ideas galaxy';
  galaxy.position.fromArray(config.center ?? [0, 0, -44]);
  galaxy.rotation.x = -0.38;
  galaxy.rotation.z = 0.18;

  const starCount = config.starCount ?? 62000;
  const dustCount = config.dustCount ?? 26000;
  const radius = config.radius ?? 34;
  const arms = config.arms ?? 5;
  const nebulaCount = config.nebulaCount ?? 7;

  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    const arm = i % arms;
    const armAngle = (arm / arms) * Math.PI * 2;
    const distance = Math.pow(rand(), 1.65) * radius;
    const spin = distance * 0.34;
    const scatter = (1 - distance / radius) * 0.38 + 0.05;
    const angle = armAngle + spin + (rand() - 0.5) * scatter;
    const diskNoise = Math.pow(rand(), 2.2) * (rand() > 0.5 ? 1 : -1);

    starPositions[i3] = Math.cos(angle) * distance + (rand() - 0.5) * 1.2;
    starPositions[i3 + 1] = diskNoise * (0.42 + distance * 0.035);
    starPositions[i3 + 2] = Math.sin(angle) * distance + (rand() - 0.5) * 1.2;

    const coreInfluence = 1 - Math.min(distance / radius, 1);
    const blue = new THREE.Color(0x82d7ff);
    const violet = new THREE.Color(0xb99cff);
    const rose = new THREE.Color(0xff9fcf);
    const gold = new THREE.Color(0xffd6a0);
    const white = new THREE.Color(0xffffff);
    let color;
    if (coreInfluence > 0.68) {
      color = gold.lerp(white, rand() * 0.38);
    } else if (arm % 3 === 0) {
      color = blue.lerp(violet, rand() * 0.42);
    } else if (arm % 3 === 1) {
      color = violet.lerp(rose, rand() * 0.32);
    } else {
      color = blue.lerp(white, rand() * 0.2);
    }
    const brightness = 0.34 + rand() * 0.56;
    starColors[i3] = color.r * brightness;
    starColors[i3 + 1] = color.g * brightness;
    starColors[i3 + 2] = color.b * brightness;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.98,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  starMaterial.userData.baseOpacity = starMaterial.opacity;
  galaxy.add(new THREE.Points(starGeometry, starMaterial));

  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    const i3 = i * 3;
    const distance = Math.pow(rand(), 1.28) * radius * 1.08;
    const angle = rand() * Math.PI * 2 + distance * 0.16;
    dustPositions[i3] = Math.cos(angle) * distance;
    dustPositions[i3 + 1] = (rand() - 0.5) * (2.4 + distance * 0.045);
    dustPositions[i3 + 2] = Math.sin(angle) * distance;

    const color = rand() > 0.5 ? new THREE.Color(0x6aaee8) : new THREE.Color(0x8a6dcb);
    const brightness = 0.08 + rand() * 0.12;
    dustColors[i3] = color.r * brightness;
    dustColors[i3 + 1] = color.g * brightness;
    dustColors[i3 + 2] = color.b * brightness;
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
  const dustMaterial = new THREE.PointsMaterial({
    size: 0.44,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.2,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  dustMaterial.userData.baseOpacity = dustMaterial.opacity;
  galaxy.add(new THREE.Points(dustGeometry, dustMaterial));

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd9b4,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  coreMaterial.userData.baseOpacity = coreMaterial.opacity;
  const core = new THREE.Mesh(new THREE.SphereGeometry(3.2, 48, 32), coreMaterial);
  galaxy.add(core);

  for (let i = 0; i < nebulaCount; i += 1) {
    const distance = radius * (0.16 + rand() * 0.72);
    const angle = rand() * Math.PI * 2;
    const material = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: i % 3 === 0 ? 0x78cfff : i % 3 === 1 ? 0xb8a1ff : 0xffa6cf,
      transparent: true,
      opacity: 0.07 + rand() * 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    material.userData.baseOpacity = material.opacity;

    const sprite = new THREE.Sprite(material);
    sprite.position.set(
      Math.cos(angle) * distance,
      (rand() - 0.5) * 5,
      Math.sin(angle) * distance
    );
    const scale = radius * (0.38 + rand() * 0.3);
    sprite.scale.set(scale, scale * (0.28 + rand() * 0.18), 1);
    galaxy.add(sprite);
  }

  const haloMaterial = new THREE.SpriteMaterial({
    map: nebulaTexture,
    color: 0x8bd7ff,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  haloMaterial.userData.baseOpacity = haloMaterial.opacity;
  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.set(radius * 1.8, radius * 0.54, 1);
  galaxy.add(halo);

  scene.add(galaxy);
  return galaxy;
}

const galaxy = createGalaxy();

function createCometField() {
  const rand = seededRandom(7077);
  const group = new THREE.Group();
  group.name = 'Cinematic drifting sparks';

  for (let i = 0; i < 18; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: starTexture,
      color: i % 3 === 0 ? 0xffb7da : i % 3 === 1 ? 0xa8ffe8 : 0xc8b2ff,
      transparent: true,
      opacity: 0.14 + rand() * 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    material.userData.baseOpacity = material.opacity;
    const comet = new THREE.Sprite(material);
    const scale = 0.38 + rand() * 0.7;
    comet.scale.set(scale * 1.7, scale, 1);
    comet.position.set((rand() - 0.5) * 95, (rand() - 0.5) * 32, -25 - rand() * 92);
    comet.userData.speed = 0.045 + rand() * 0.1;
    comet.userData.wrap = 46 + rand() * 28;
    comet.userData.drift = (rand() - 0.5) * 0.008;
    group.add(comet);
  }

  scene.add(group);
  return group;
}

const cometField = createCometField();

function setRotationFromArray(object, rotation = [0, 0, 0]) {
  object.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
}

function createStarStream(asset, index) {
  const rand = seededRandom(9200 + index * 503);
  const count = asset.count ?? 12000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorA = toColor(asset.colorA, '#79ecff');
  const colorB = toColor(asset.colorB, '#ff92d8');
  const length = asset.length ?? 70;
  const width = asset.width ?? 18;
  const height = asset.height ?? 8;

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const depth = (rand() - 0.5) * length;
    const ribbon = Math.sin(depth * 0.12 + rand() * 0.9);
    const lane = Math.sin(depth * 0.035) * width * 0.22;
    positions[i3] = lane + ribbon * width * 0.18 + (rand() - 0.5) * width;
    positions[i3 + 1] = Math.cos(depth * 0.08) * height * 0.18 + (rand() - 0.5) * height;
    positions[i3 + 2] = depth;

    const blend = 0.18 + rand() * 0.82;
    const color = colorA.clone().lerp(colorB, blend);
    const brightness = 0.28 + rand() * 0.72;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: asset.size ?? 0.1,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: asset.opacity ?? 0.75,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  material.userData.baseOpacity = material.opacity;
  return new THREE.Points(geometry, material);
}

function createConstellationGate(asset, index) {
  const rand = seededRandom(10400 + index * 641);
  const group = new THREE.Group();
  const starCount = asset.starCount ?? 700;
  const radius = asset.radius ?? 8;
  const depth = asset.depth ?? 4;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const color = toColor(asset.color, '#b9f7ff');
  const accent = toColor(asset.accent, '#ffb0e9');

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    const angle = rand() * Math.PI * 2;
    const ringRadius = radius * (0.72 + rand() * 0.34);
    positions[i3] = Math.cos(angle) * ringRadius + (rand() - 0.5) * 0.8;
    positions[i3 + 1] = Math.sin(angle) * ringRadius * 0.58 + (rand() - 0.5) * 0.8;
    positions[i3 + 2] = (rand() - 0.5) * depth;

    const mixed = color.clone().lerp(accent, rand() * 0.45);
    const brightness = 0.42 + rand() * 0.58;
    colors[i3] = mixed.r * brightness;
    colors[i3 + 1] = mixed.g * brightness;
    colors[i3 + 2] = mixed.b * brightness;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pointMaterial = new THREE.PointsMaterial({
    size: 0.16,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: asset.opacity ?? 0.72,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  pointMaterial.userData.baseOpacity = pointMaterial.opacity;
  group.add(new THREE.Points(pointGeometry, pointMaterial));

  const nodes = asset.nodes ?? 18;
  const nodePoints = [];
  for (let i = 0; i < nodes; i += 1) {
    const angle = (i / nodes) * Math.PI * 2;
    nodePoints.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.58,
      Math.sin(angle * 3) * depth * 0.22
    ));
  }

  const lineVertices = [];
  for (let i = 0; i < nodePoints.length; i += 1) {
    lineVertices.push(nodePoints[i], nodePoints[(i + 1) % nodePoints.length]);
    if (i % 2 === 0) {
      lineVertices.push(nodePoints[i], nodePoints[(i + 5) % nodePoints.length]);
    }
  }
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: (asset.opacity ?? 0.72) * 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  lineMaterial.userData.baseOpacity = lineMaterial.opacity;
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineVertices), lineMaterial));

  return group;
}

function createNebulaVeil(asset, index) {
  const group = new THREE.Group();
  const layers = asset.layers ?? 5;
  const baseScale = asset.scale ?? [50, 18, 1];

  for (let i = 0; i < layers; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: i % 2 === 0 ? toColor(asset.color, '#856dff') : toColor(asset.accent, '#ff8bd5'),
      transparent: true,
      opacity: (asset.opacity ?? 0.18) * (0.22 + i / layers * 0.16),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    material.userData.baseOpacity = material.opacity;
    const sprite = new THREE.Sprite(material);
    sprite.position.set((i - layers / 2) * 4.2, Math.sin(i * 1.7) * 1.8, (i - layers / 2) * -0.8);
    sprite.scale.set(baseScale[0] * (0.62 + i * 0.07), baseScale[1] * (0.56 + i * 0.05), 1);
    group.add(sprite);
  }

  return group;
}

function createDistantBody(asset) {
  const group = new THREE.Group();
  const color = toColor(asset.color, '#d9f4ff');
  const glowColor = toColor(asset.glow, '#6edcff');
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: glowColor,
    emissiveIntensity: 0.08,
    roughness: 0.82,
    metalness: 0.02,
    transparent: true,
    opacity: asset.opacity ?? 0.4
  });
  material.userData.baseOpacity = material.opacity;
  const body = new THREE.Mesh(new THREE.SphereGeometry(asset.radius ?? 2, 64, 40), material);
  group.add(body);

  const glowMaterial = new THREE.SpriteMaterial({
    map: nebulaTexture,
    color: glowColor,
    transparent: true,
    opacity: (asset.opacity ?? 0.4) * 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  glowMaterial.userData.baseOpacity = glowMaterial.opacity;
  const glow = new THREE.Sprite(glowMaterial);
  const glowSize = (asset.radius ?? 2) * 6;
  glow.scale.set(glowSize, glowSize, 1);
  group.add(glow);

  return group;
}

function createSignalLattice(asset) {
  const columns = asset.columns ?? 12;
  const rows = asset.rows ?? 4;
  const width = asset.width ?? 30;
  const height = asset.height ?? 12;
  const color = toColor(asset.color, '#8fffe4');
  const accent = toColor(asset.accent, '#ffd28d');
  const points = [];
  const lineVertices = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column / (columns - 1) - 0.5) * width;
      const y = (row / (rows - 1) - 0.5) * height + Math.sin(column * 0.9) * 0.5;
      const z = Math.sin(column * 0.7 + row) * 2.2;
      points.push(new THREE.Vector3(x, y, z));
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const current = points[row * columns + column];
      if (column < columns - 1) lineVertices.push(current, points[row * columns + column + 1]);
      if (row < rows - 1) lineVertices.push(current, points[(row + 1) * columns + column]);
      if (row < rows - 1 && column < columns - 1 && (row + column) % 2 === 0) {
        lineVertices.push(current, points[(row + 1) * columns + column + 1]);
      }
    }
  }

  const group = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: asset.opacity ?? 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  lineMaterial.userData.baseOpacity = lineMaterial.opacity;
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineVertices), lineMaterial));

  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const colors = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    const mixed = color.clone().lerp(accent, (i % columns) / columns);
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const nodeMaterial = new THREE.PointsMaterial({
    size: 0.32,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: (asset.opacity ?? 0.4) * 1.3,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  nodeMaterial.userData.baseOpacity = nodeMaterial.opacity;
  group.add(new THREE.Points(nodeGeometry, nodeMaterial));

  return group;
}

function createStarBloom(asset, index) {
  const rand = seededRandom(14000 + index * 613);
  const count = asset.count ?? 2400;
  const radius = asset.radius ?? 14;
  const burst = asset.burst ?? 9;
  const colorA = toColor(asset.colorA, '#dffaff');
  const colorB = toColor(asset.colorB, '#ffc9ef');
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const arm = (i % burst) / burst * Math.PI * 2;
    const spread = Math.pow(rand(), 0.55) * radius;
    const swirl = arm + spread * 0.14 + rand() * 0.5;
    positions[i3] = Math.cos(swirl) * spread + (rand() - 0.5) * 1.8;
    positions[i3 + 1] = Math.sin(swirl) * spread * 0.48 + (rand() - 0.5) * 1.8;
    positions[i3 + 2] = (rand() - 0.5) * (asset.depth ?? 8);

    const color = colorA.clone().lerp(colorB, rand() * 0.6);
    const brightness = 0.25 + rand() * 0.75;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pointMaterial = new THREE.PointsMaterial({
    size: asset.size ?? 0.11,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: asset.opacity ?? 0.88,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  pointMaterial.userData.baseOpacity = pointMaterial.opacity;

  const group = new THREE.Group();
  group.add(new THREE.Points(pointGeometry, pointMaterial));

  const ringMaterial = new THREE.SpriteMaterial({
    map: nebulaTexture,
    color: colorA.clone().lerp(colorB, 0.35),
    transparent: true,
    opacity: (asset.opacity ?? 0.82) * 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ringMaterial.userData.baseOpacity = ringMaterial.opacity;
  const halo = new THREE.Sprite(ringMaterial);
  halo.scale.set(radius * 1.8, radius * 0.9, 1);
  group.add(halo);

  return group;
}

function createPrismCloud(asset, index) {
  const rand = seededRandom(18800 + index * 941);
  const group = new THREE.Group();
  const count = asset.count ?? 3200;
  const spread = asset.spread ?? [20, 11, 12];
  const cores = asset.cores ?? 4;
  const colorA = toColor(asset.colorA, '#90fff2');
  const colorB = toColor(asset.colorB, '#ff96d5');
  const colorC = toColor(asset.colorC, '#ffd56f');
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const anchors = [];
  for (let i = 0; i < cores; i += 1) {
    const angle = (i / cores) * Math.PI * 2 + rand() * 0.4;
    anchors.push(new THREE.Vector3(
      Math.cos(angle) * spread[0] * (0.25 + rand() * 0.2),
      (rand() - 0.5) * spread[1] * 0.6,
      Math.sin(angle) * spread[2] * (0.25 + rand() * 0.2)
    ));
  }

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const anchor = anchors[i % anchors.length];
    const shell = Math.pow(rand(), 0.72);
    positions[i3] = anchor.x + (rand() - 0.5) * spread[0] * shell;
    positions[i3 + 1] = anchor.y + (rand() - 0.5) * spread[1] * shell * 0.9;
    positions[i3 + 2] = anchor.z + (rand() - 0.5) * spread[2] * shell;

    const mix = rand();
    const color = mix < 0.38
      ? colorA.clone().lerp(colorB, mix / 0.38)
      : mix < 0.76
        ? colorB.clone().lerp(colorC, (mix - 0.38) / 0.38)
        : colorC.clone().lerp(colorA, (mix - 0.76) / 0.24);
    const brightness = 0.24 + rand() * 0.76;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: asset.size ?? 0.12,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: asset.opacity ?? 0.84,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  material.userData.baseOpacity = material.opacity;
  group.add(new THREE.Points(geometry, material));

  anchors.forEach((anchor, anchorIndex) => {
    const pearlMaterial = new THREE.SpriteMaterial({
      map: starTexture,
      color: [colorA, colorB, colorC][anchorIndex % 3],
      transparent: true,
      opacity: (asset.opacity ?? 0.84) * 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    pearlMaterial.userData.baseOpacity = pearlMaterial.opacity;
    const pearl = new THREE.Sprite(pearlMaterial);
    pearl.position.copy(anchor);
    const scale = 2.8 + rand() * 1.8;
    pearl.scale.set(scale, scale, 1);
    group.add(pearl);
  });

  return group;
}

function createOrbitNest(asset, index) {
  const rand = seededRandom(15600 + index * 719);
  const group = new THREE.Group();
  const rings = asset.rings ?? 6;
  const baseRadius = asset.radius ?? 12;
  const colorA = toColor(asset.colorA, '#e5fbff');
  const colorB = toColor(asset.colorB, '#ffd8ef');

  for (let ringIndex = 0; ringIndex < rings; ringIndex += 1) {
    const radiusX = baseRadius * (0.52 + ringIndex / rings * 0.76);
    const radiusY = radiusX * (0.24 + rand() * 0.38);
    const segments = 120;
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radiusX,
        Math.sin(angle) * radiusY,
        Math.sin(angle * 2 + ringIndex) * 0.9
      ));
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: colorA.clone().lerp(colorB, ringIndex / Math.max(1, rings - 1)),
      transparent: true,
      opacity: (asset.opacity ?? 0.6) * (0.4 + ringIndex / rings * 0.4),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    lineMaterial.userData.baseOpacity = lineMaterial.opacity;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
    line.rotation.z = rand() * Math.PI;
    line.rotation.x = (rand() - 0.5) * 0.8;
    group.add(line);
  }

  const stars = asset.starCount ?? 900;
  const positions = new Float32Array(stars * 3);
  const colors = new Float32Array(stars * 3);
  for (let i = 0; i < stars; i += 1) {
    const i3 = i * 3;
    const angle = rand() * Math.PI * 2;
    const r = baseRadius * (0.28 + rand() * 0.86);
    positions[i3] = Math.cos(angle) * r;
    positions[i3 + 1] = Math.sin(angle) * r * (0.22 + rand() * 0.4);
    positions[i3 + 2] = (rand() - 0.5) * 5.5;
    const color = colorA.clone().lerp(colorB, rand() * 0.5);
    const brightness = 0.28 + rand() * 0.72;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pointMaterial = new THREE.PointsMaterial({
    size: asset.size ?? 0.14,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: asset.opacity ?? 0.6,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  pointMaterial.userData.baseOpacity = pointMaterial.opacity;
  group.add(new THREE.Points(pointGeometry, pointMaterial));

  return group;
}

function createCometFan(asset, index) {
  const rand = seededRandom(17100 + index * 887);
  const group = new THREE.Group();
  const streaks = asset.streaks ?? 28;
  const spread = asset.spread ?? 20;
  const length = asset.length ?? 22;
  const colorA = toColor(asset.colorA, '#dffaff');
  const colorB = toColor(asset.colorB, '#9fe7ff');

  for (let i = 0; i < streaks; i += 1) {
    const x = (rand() - 0.5) * spread;
    const y = (rand() - 0.5) * spread * 0.42;
    const z = (rand() - 0.5) * 6;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x - length * (0.72 + rand() * 0.28), y + (rand() - 0.5) * 2.2, z - length * 0.34)
      ]),
      new THREE.LineBasicMaterial({
        color: colorA.clone().lerp(colorB, rand() * 0.55),
        transparent: true,
        opacity: (asset.opacity ?? 0.42) * (0.5 + rand() * 0.5),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    line.material.userData.baseOpacity = line.material.opacity;
    group.add(line);
  }

  return group;
}

function createScenicAsset(asset, index) {
  if (asset.type === 'starStream') return createStarStream(asset, index);
  if (asset.type === 'constellationGate') return createConstellationGate(asset, index);
  if (asset.type === 'nebulaVeil') return createNebulaVeil(asset, index);
  if (asset.type === 'distantBody') return createDistantBody(asset, index);
  if (asset.type === 'signalLattice') return createSignalLattice(asset, index);
  if (asset.type === 'starBloom') return createStarBloom(asset, index);
  if (asset.type === 'prismCloud') return createPrismCloud(asset, index);
  if (asset.type === 'orbitNest') return createOrbitNest(asset, index);
  if (asset.type === 'cometFan') return createCometFan(asset, index);
  return null;
}

function createPositionedScenicAsset(asset, index, name) {
  const object = createScenicAsset(asset, index);
  if (!object) return null;
  const group = new THREE.Group();
  group.name = name ?? asset.id ?? `scenic asset ${index}`;
  group.position.fromArray(asset.position ?? [0, 0, -60]);
  setRotationFromArray(group, asset.rotation);
  group.add(object);
  scene.add(group);
  return {
    group,
    speed: asset.speed ?? 0.01,
    progressRange: asset.progressRange ?? [1, sections.length - 1],
    type: asset.type
  };
}

function createJourneyAssets() {
  const assets = siteData.visual?.journeyAssets ?? [];
  const systems = [];

  assets.forEach((asset, index) => {
    const system = createPositionedScenicAsset(asset, index, asset.id ?? `journey asset ${index}`);
    if (!system) return;
    systems.push({
      ...system,
      progressRange: asset.progressRange ?? [1, sections.length - 1]
    });
  });

  return systems;
}

const journeyAssets = createJourneyAssets();

function createSpaceTourAssets() {
  const systems = [];
  const moments = spaceTourConfig.moments ?? [];

  moments.forEach((moment, momentIndex) => {
    moment.assets?.forEach((asset, assetIndex) => {
      const scenicIndex = 39000 + momentIndex * 719 + assetIndex;
      const system = createPositionedScenicAsset(
        asset,
        scenicIndex,
        `space tour ${moment.id ?? momentIndex} ${assetIndex}`
      );
      if (!system) return;
      systems.push({
        ...system,
        momentIndex
      });
    });
  });

  return systems;
}

const spaceTourAssets = createSpaceTourAssets();

function createProceduralSatellite(color) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9e8ee,
    metalness: 0.72,
    roughness: 0.28,
    transparent: true,
    opacity: 1
  });
  bodyMaterial.userData.baseOpacity = bodyMaterial.opacity;
  const panelMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.14,
    metalness: 0.2,
    roughness: 0.34,
    transparent: true,
    opacity: 1
  });
  panelMaterial.userData.baseOpacity = panelMaterial.opacity;
  const accentMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  accentMaterial.userData.baseOpacity = accentMaterial.opacity;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), bodyMaterial);
  group.add(body);

  const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.025, 0.34), panelMaterial);
  leftPanel.position.x = -0.72;
  group.add(leftPanel);

  const rightPanel = leftPanel.clone();
  rightPanel.position.x = 0.72;
  group.add(rightPanel);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 12), accentMaterial);
  mast.rotation.z = Math.PI / 2;
  group.add(mast);

  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 28, 1, true), accentMaterial);
  dish.position.set(0, 0.06, 0.28);
  dish.rotation.x = Math.PI / 2;
  group.add(dish);

  return group;
}

function fitModelToSize(model, targetSize) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  model.position.sub(center);
  model.scale.setScalar(targetSize / maxDimension);
}

function createSatelliteFleet() {
  const satellites = siteData.visual?.satellites ?? [];
  const systems = [];
  const modelCache = new Map();

  satellites.forEach((satellite, index) => {
    const color = toColor(satellite.color, '#9de8ff');
    const pivot = new THREE.Group();
    pivot.name = `${satellite.label} orbit`;
    pivot.position.fromArray(satellite.orbitCenter ?? [0, 0, 0]);
    pivot.rotation.x = satellite.inclination ?? 0;

    const holder = new THREE.Group();
    holder.position.x = satellite.orbitRadius ?? 3;
    pivot.add(holder);

    const fallback = createProceduralSatellite(color);
    fallback.scale.setScalar(satellite.scale ?? 0.7);
    holder.add(fallback);

    const orbitMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: satellite.orbitOpacity ?? 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    orbitMaterial.userData.baseOpacity = orbitMaterial.opacity;
    const orbitCurve = new THREE.EllipseCurve(0, 0, satellite.orbitRadius ?? 3, (satellite.orbitRadius ?? 3) * 0.58, 0, Math.PI * 2);
    const orbitPoints = orbitCurve.getPoints(180).map((point) => new THREE.Vector3(point.x, 0, point.y));
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPoints), orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    pivot.add(orbit);

    const sourceSectionIndex = Math.max(0, sections.findIndex((section) => section.id === satellite.section));
    scene.add(pivot);

    const system = {
      id: satellite.id,
      pivot,
      holder,
      fallback,
      orbit,
      sourceSectionIndex,
      speed: satellite.speed ?? 0.18,
      phase: satellite.phase ?? index,
      scale: satellite.scale ?? 0.7,
      maxOpacity: satellite.maxOpacity ?? 1,
      modelUrl: satellite.model
    };
    systems.push(system);

    if (!satellite.model) return;
    if (modelCache.has(satellite.model)) {
      const model = modelCache.get(satellite.model).clone(true);
      fitModelToSize(model, system.scale);
      holder.remove(fallback);
      holder.add(model);
      return;
    }

    gltfLoader.load(
      satellite.model,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (!child.material) return;
          child.material.transparent = true;
          child.material.userData.baseOpacity = child.material.opacity ?? 1;
          if ('metalness' in child.material) child.material.metalness = Math.max(child.material.metalness, 0.48);
          if ('roughness' in child.material) child.material.roughness = Math.min(child.material.roughness, 0.42);
        });
        modelCache.set(satellite.model, model);
        const instance = model.clone(true);
        fitModelToSize(instance, system.scale);
        holder.remove(fallback);
        holder.add(instance);
      },
      undefined,
      () => {
        fallback.name = `${satellite.label} procedural fallback`;
      }
    );
  });

  return systems;
}

const satelliteSystems = createSatelliteFleet();

function addRouteLines() {
  const points = sections.map((cluster) => new THREE.Vector3().fromArray(cluster.position));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x4d79a9,
    transparent: true,
    opacity: 0.18
  });
  material.userData.baseOpacity = material.opacity;
  const route = new THREE.Line(geometry, material);
  scene.add(route);
  return route;
}

function createCluster(cluster, index) {
  const rand = seededRandom(3200 + index * 219);
  const group = new THREE.Group();
  group.position.fromArray(cluster.position);
  group.userData.cluster = cluster;
  group.userData.index = index;

  const starCount = cluster.constellation?.starCount ?? cluster.starCount ?? 1000;
  if (starCount <= 0) {
    scene.add(group);
    return group;
  }

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const connectionPoints = [];

  for (let i = 0; i < starCount; i += 1) {
    const spiral = i / starCount;
    const angle = rand() * Math.PI * 2 + spiral * Math.PI * 5.5;
    const radius = 0.2 + Math.pow(rand(), 2.4) * 3.5 + spiral * 0.95;
    const height = (rand() - 0.5) * (1.1 + spiral * 1.3);
    const i3 = i * 3;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius;

    const color = i % 17 === 0 ? palette.hotStar : palette.cyan;
    const brightness = 0.36 + rand() * 0.64;
    colors[i3] = color.r * brightness;
    colors[i3 + 1] = color.g * brightness;
    colors[i3 + 2] = color.b * brightness;

    if (i < 34 && i % 2 === 0) {
      connectionPoints.push(new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]));
    }
  }

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    size: index === 0 ? 0.1 : 0.18,
    map: starTexture,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  pointsMaterial.userData.baseOpacity = pointsMaterial.opacity;
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  points.userData.cluster = cluster;
  points.userData.index = index;
  group.add(points);
  clusterTargets.push(points);

  const lineVertices = [];
  for (let i = 0; i < connectionPoints.length - 1; i += 1) {
    lineVertices.push(connectionPoints[i], connectionPoints[i + 1]);
    if (i + 2 < connectionPoints.length && i % 2 === 0) {
      lineVertices.push(connectionPoints[i], connectionPoints[i + 2]);
    }
    if (i + 4 < connectionPoints.length && i % 5 === 0) {
      lineVertices.push(connectionPoints[i], connectionPoints[i + 4]);
    }
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(lineVertices);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: toColor(cluster.color, '#7fdcff'),
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  lineMaterial.userData.baseOpacity = lineMaterial.opacity;
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  group.add(lines);

  const glowGeometry = new THREE.SphereGeometry(0.34, 24, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: toColor(cluster.color, '#7fdcff'),
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  glowMaterial.userData.baseOpacity = glowMaterial.opacity;
  const core = new THREE.Mesh(glowGeometry, glowMaterial);
  core.userData.cluster = cluster;
  core.userData.index = index;
  group.add(core);
  clusterTargets.push(core);

  scene.add(group);
  return group;
}

const clusterGroups = sections.map(createCluster);
function createPortfolioPlanets() {
  const planetSystems = [];

  sections.forEach((section, index) => {
    if (!section.planet) return;

    const planetConfig = section.planet;
    const texturePath = planetTextures[planetConfig.texture];
    const radius = planetConfig.radius ?? 1.2;
    const color = toColor(planetConfig.glow ?? section.color, '#9de8ff');
    const isResearchPlanet = section.id === 'research';
    const group = new THREE.Group();
    group.name = `${section.label} planet`;
    group.position.fromArray(section.position);
    group.userData.index = index;

    const planetMaterial = new THREE.MeshStandardMaterial({
      map: texturePath ? loadColorTexture(texturePath) : null,
      color: texturePath ? 0xffffff : color,
      emissive: color,
      emissiveIntensity: 0.012,
      roughness: 0.88,
      metalness: 0.01,
      transparent: true,
      opacity: 1
    });
    planetMaterial.userData.baseOpacity = planetMaterial.opacity;

    const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), planetMaterial);
    planet.rotation.z = planetConfig.tilt ?? -0.18;
    planet.userData.index = index;
    group.add(planet);
    clusterTargets.push(planet);

    const rimMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isResearchPlanet ? 0.055 : 0.13,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    rimMaterial.userData.baseOpacity = rimMaterial.opacity;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.07, 64, 40), rimMaterial);
    group.add(rim);

    const auraMaterial = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color,
      transparent: true,
      opacity: isResearchPlanet ? 0.03 : 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    auraMaterial.userData.baseOpacity = auraMaterial.opacity;
    const aura = new THREE.Sprite(auraMaterial);
    aura.scale.set(radius * 3.1, radius * 3.1, 1);
    group.add(aura);

    if (planetConfig.ring) {
      const ringTexture = loadColorTexture(saturnRingTexture);
      const ringMaterial = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      ringMaterial.userData.baseOpacity = ringMaterial.opacity;

      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.45, radius * 2.25, 160), ringMaterial);
      ring.rotation.x = Math.PI / 2.35;
      ring.rotation.y = -0.22;
      group.add(ring);
    }

    const orbitMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: isResearchPlanet ? 0.032 : 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    orbitMaterial.userData.baseOpacity = orbitMaterial.opacity;
    const orbitCurve = new THREE.EllipseCurve(0, 0, radius * 2.7, radius * 1.45, 0, Math.PI * 2);
    const orbitPoints = orbitCurve.getPoints(150).map((point) => new THREE.Vector3(point.x, 0, point.y));
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPoints), orbitMaterial);
    orbit.rotation.x = Math.PI / 2.1;
    orbit.rotation.z = 0.32;
    group.add(orbit);

    const dustCount = planetConfig.dustCount ?? (isResearchPlanet ? 130 : 220);
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const rand = seededRandom(15000 + index * 887);
    for (let i = 0; i < dustCount; i += 1) {
      const i3 = i * 3;
      const angle = rand() * Math.PI * 2;
      const band = radius * (1.7 + rand() * 2.1);
      const lift = (rand() - 0.5) * radius * 1.4;
      dustPositions[i3] = Math.cos(angle) * band;
      dustPositions[i3 + 1] = lift;
      dustPositions[i3 + 2] = Math.sin(angle) * band * (0.55 + rand() * 0.25);

      const mixed = color.clone().lerp(palette.hotStar, rand() * 0.22);
      const brightness = 0.2 + rand() * 0.34;
      dustColors[i3] = mixed.r * brightness;
      dustColors[i3 + 1] = mixed.g * brightness;
      dustColors[i3 + 2] = mixed.b * brightness;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.07,
      sizeAttenuation: true,
      map: starTexture,
      transparent: true,
      opacity: 0.42,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    dustMaterial.userData.baseOpacity = dustMaterial.opacity;
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.rotation.x = Math.PI / 2.6;
    group.add(dust);

    scene.add(group);
    planetSystems.push({
      group,
      planet,
      aura,
      orbit,
      dust,
      sectionIndex: index,
      rotationSpeed: planetConfig.rotationSpeed ?? 0.0025
    });
  });

  return planetSystems;
}

function createResearchStarSystem() {
  const sectionIndex = researchSectionIndex;
  if (sectionIndex < 0) return null;

  const section = sections[sectionIndex];
  const entries = section.detail.entries;
  const rand = seededRandom(28880);
  const group = new THREE.Group();
  group.name = 'Research entry stars';
  group.position.fromArray(section.position);
  group.userData.index = sectionIndex;

  const ribbonCount = 5200;
  const ribbonPositions = new Float32Array(ribbonCount * 3);
  const ribbonColors = new Float32Array(ribbonCount * 3);
  const ribbonA = new THREE.Color(0x78dcff);
  const ribbonB = new THREE.Color(0xffb8e8);
  for (let i = 0; i < ribbonCount; i += 1) {
    const i3 = i * 3;
    const t = i / (ribbonCount - 1);
    const sweep = (t - 0.5) * 9.4;
    const lane = (rand() - 0.5) * 1.25;
    const wave = Math.sin(t * Math.PI * 3.2) * 0.72;
    ribbonPositions[i3] = sweep + lane;
    ribbonPositions[i3 + 1] = wave + (rand() - 0.5) * 1.8;
    ribbonPositions[i3 + 2] = -1.5 + Math.cos(t * Math.PI * 2.4) * 0.62 + (rand() - 0.5) * 1.8;

    const color = ribbonA.clone().lerp(ribbonB, Math.sin(t * Math.PI) * 0.42 + rand() * 0.18);
    const brightness = 0.16 + rand() * 0.52;
    ribbonColors[i3] = color.r * brightness;
    ribbonColors[i3 + 1] = color.g * brightness;
    ribbonColors[i3 + 2] = color.b * brightness;
  }
  const ribbonGeometry = new THREE.BufferGeometry();
  ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3));
  ribbonGeometry.setAttribute('color', new THREE.BufferAttribute(ribbonColors, 3));
  const ribbonMaterial = new THREE.PointsMaterial({
    size: 0.035,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.68,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ribbonMaterial.userData.baseOpacity = ribbonMaterial.opacity;
  const ribbon = new THREE.Points(ribbonGeometry, ribbonMaterial);
  ribbon.rotation.set(-0.08, -0.18, 0.12);
  group.add(ribbon);

  const veilMaterial = new THREE.SpriteMaterial({
    map: nebulaTexture,
    color: 0x84dfff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  veilMaterial.userData.baseOpacity = veilMaterial.opacity;
  const veil = new THREE.Sprite(veilMaterial);
  veil.position.set(-0.6, 0.2, -2.4);
  veil.scale.set(8.2, 3.7, 1);
  group.add(veil);

  const blackHole = new THREE.Group();
  blackHole.name = 'Quantum black hole focus';
  blackHole.position.set(0.18, 0.05, 1.18);
  blackHole.rotation.set(0.34, -0.22, 0.1);

  const eventHorizonMaterial = new THREE.MeshBasicMaterial({
    color: 0x000006,
    transparent: true,
    opacity: 0.98,
    depthWrite: false
  });
  eventHorizonMaterial.userData.baseOpacity = eventHorizonMaterial.opacity;
  const eventHorizon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 64, 36), eventHorizonMaterial);
  blackHole.add(eventHorizon);

  const photonRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xf5fbff,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  photonRingMaterial.userData.baseOpacity = photonRingMaterial.opacity;
  const photonRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.01, 10, 220), photonRingMaterial);
  photonRing.rotation.x = Math.PI / 2.18;
  blackHole.add(photonRing);

  const accretionInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0xcdf7ff,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  accretionInnerMaterial.userData.baseOpacity = accretionInnerMaterial.opacity;
  const accretionInner = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.012, 8, 190), accretionInnerMaterial);
  accretionInner.rotation.x = Math.PI / 2.3;
  blackHole.add(accretionInner);

  const accretionOuterMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc7ec,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  accretionOuterMaterial.userData.baseOpacity = accretionOuterMaterial.opacity;
  const accretionOuter = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.008, 8, 230), accretionOuterMaterial);
  accretionOuter.rotation.x = Math.PI / 2.66;
  accretionOuter.rotation.z = -0.18;
  blackHole.add(accretionOuter);

  const diskParticleCount = 6200;
  const diskPositions = new Float32Array(diskParticleCount * 3);
  const diskColors = new Float32Array(diskParticleCount * 3);
  const diskBlue = new THREE.Color(0x91f4ff);
  const diskViolet = new THREE.Color(0xa993ff);
  const diskRose = new THREE.Color(0xffb6e5);
  for (let i = 0; i < diskParticleCount; i += 1) {
    const i3 = i * 3;
    const angle = rand() * Math.PI * 2;
    const radius = 0.58 + Math.pow(rand(), 0.58) * 1.52;
    const side = Math.cos(angle) > 0 ? 1 : 0;
    diskPositions[i3] = Math.cos(angle) * radius;
    diskPositions[i3 + 1] = (rand() - 0.5) * 0.045;
    diskPositions[i3 + 2] = Math.sin(angle) * radius * 0.34 + (rand() - 0.5) * 0.12;

    const color = diskBlue.clone().lerp(diskViolet, rand() * 0.48).lerp(diskRose, side * 0.42);
    const brightness = 0.16 + rand() * 0.8 * (1.8 - radius * 0.38);
    diskColors[i3] = color.r * brightness;
    diskColors[i3 + 1] = color.g * brightness;
    diskColors[i3 + 2] = color.b * brightness;
  }
  const diskGeometry = new THREE.BufferGeometry();
  diskGeometry.setAttribute('position', new THREE.BufferAttribute(diskPositions, 3));
  diskGeometry.setAttribute('color', new THREE.BufferAttribute(diskColors, 3));
  const diskMaterial = new THREE.PointsMaterial({
    size: 0.026,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.82,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  diskMaterial.userData.baseOpacity = diskMaterial.opacity;
  const accretionDisk = new THREE.Points(diskGeometry, diskMaterial);
  accretionDisk.rotation.x = Math.PI / 2.52;
  accretionDisk.rotation.z = -0.12;
  blackHole.add(accretionDisk);

  const lensMaterial = new THREE.LineBasicMaterial({
    color: 0x6bdcff,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  lensMaterial.userData.baseOpacity = lensMaterial.opacity;
  const lensCurve = new THREE.EllipseCurve(0, 0, 1.42, 0.46, 0, Math.PI * 2);
  const lens = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(lensCurve.getPoints(160).map((point) => new THREE.Vector3(point.x, point.y, 0))),
    lensMaterial
  );
  lens.rotation.x = Math.PI / 2.1;
  lens.rotation.z = 0.08;
  blackHole.add(lens);
  group.add(blackHole);

  const quantumGalaxy = new THREE.Group();
  quantumGalaxy.name = 'Quantum micro-galaxy';
  quantumGalaxy.position.set(0.18, 0.05, 6.15);
  quantumGalaxy.rotation.set(-0.22, 0.32, 0.08);

  const quantumStarCount = 14000;
  const quantumPositions = new Float32Array(quantumStarCount * 3);
  const quantumColors = new Float32Array(quantumStarCount * 3);
  const quantumA = new THREE.Color(0x83f2ff);
  const quantumB = new THREE.Color(0xc3a7ff);
  const quantumC = new THREE.Color(0xffd4ef);
  for (let i = 0; i < quantumStarCount; i += 1) {
    const i3 = i * 3;
    const t = i / quantumStarCount;
    const arm = (i % 4) / 4;
    const angle = t * Math.PI * 22 + arm * Math.PI * 2 + rand() * 0.28;
    const radius = Math.pow(rand(), 0.54) * 5.1;
    const thickness = (rand() - 0.5) * (0.26 + radius * 0.1);
    quantumPositions[i3] = Math.cos(angle) * radius + (rand() - 0.5) * 0.42;
    quantumPositions[i3 + 1] = thickness;
    quantumPositions[i3 + 2] = Math.sin(angle) * radius * 0.56 + (rand() - 0.5) * 0.5;

    const color = quantumA.clone().lerp(quantumB, rand() * 0.72).lerp(quantumC, rand() * 0.18);
    const brightness = 0.2 + rand() * 0.78;
    quantumColors[i3] = color.r * brightness;
    quantumColors[i3 + 1] = color.g * brightness;
    quantumColors[i3 + 2] = color.b * brightness;
  }
  const quantumGeometry = new THREE.BufferGeometry();
  quantumGeometry.setAttribute('position', new THREE.BufferAttribute(quantumPositions, 3));
  quantumGeometry.setAttribute('color', new THREE.BufferAttribute(quantumColors, 3));
  const quantumMaterial = new THREE.PointsMaterial({
    size: 0.036,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.88,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  quantumMaterial.userData.baseOpacity = quantumMaterial.opacity;
  const quantumField = new THREE.Points(quantumGeometry, quantumMaterial);
  quantumGalaxy.add(quantumField);

  const quantumNodeData = section.detail.quantumGalaxy?.nodes ?? [];
  const quantumNodes = quantumNodeData.map((node, nodeIndex) => {
    const nodeColor = [0x9df6ff, 0xd5c2ff, 0xffd8f3, 0xfff0b7, 0xace8ff][nodeIndex % 5];
    const anchor = new THREE.Group();
    anchor.position.fromArray(node.position ?? [
      Math.cos(nodeIndex) * 2.2,
      (nodeIndex % 2 ? -0.7 : 0.7),
      Math.sin(nodeIndex) * 1.2
    ]);

    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: nodeColor,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    nodeMaterial.userData.baseOpacity = nodeMaterial.opacity;
    const nodeCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12), nodeMaterial);
    anchor.add(nodeCore);

    const nodeGlowMaterial = new THREE.SpriteMaterial({
      map: starTexture,
      color: nodeColor,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    nodeGlowMaterial.userData.baseOpacity = nodeGlowMaterial.opacity;
    const nodeGlow = new THREE.Sprite(nodeGlowMaterial);
    nodeGlow.scale.set(0.48, 0.48, 1);
    anchor.add(nodeGlow);

    const hitMaterial = new THREE.MeshBasicMaterial({
      color: nodeColor,
      transparent: true,
      opacity: 0.004,
      depthWrite: false
    });
    hitMaterial.userData.baseOpacity = hitMaterial.opacity;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(node.zoom === 'deep' ? 0.92 : 0.72, 24, 14), hitMaterial);
    hit.userData.isQuantumNode = true;
    hit.userData.quantumNodeIndex = nodeIndex;
    anchor.add(hit);
    clusterTargets.push(hit);

    quantumGalaxy.add(anchor);

    const label = document.createElement('div');
    label.className = 'quantum-label';
    label.dataset.quantumNode = String(nodeIndex);
    label.innerHTML = `<strong>${node.label}</strong><span>${node.text ?? ''}</span>`;
    label.addEventListener('click', () => focusQuantumNode(nodeIndex));
    quantumLabelsHost?.appendChild(label);
    quantumLabels.push({ label, anchor, nodeIndex });

    const notebooks = node.detail?.notebooks ?? [];
    const notebookNodes = notebooks.map((notebook, notebookIndex) => {
      const notebookColor = [0xf8fdff, 0x9df6ff, 0xd5c2ff, 0xffd8f3][notebookIndex % 4];
      const notebookAnchor = new THREE.Group();
      const orbitAngle = (notebookIndex / Math.max(1, notebooks.length)) * Math.PI * 2 - Math.PI / 5;
      const orbitRadius = node.zoom === 'deep' ? 0.82 : 0.52;
      notebookAnchor.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        Math.sin(orbitAngle) * 0.42,
        Math.sin(orbitAngle) * orbitRadius * 0.26
      );

      const notebookMaterial = new THREE.MeshBasicMaterial({
        color: notebookColor,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      notebookMaterial.userData.baseOpacity = notebookMaterial.opacity;
      const notebookCore = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 10), notebookMaterial);
      notebookAnchor.add(notebookCore);

      const notebookGlowMaterial = new THREE.SpriteMaterial({
        map: starTexture,
        color: notebookColor,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      notebookGlowMaterial.userData.baseOpacity = notebookGlowMaterial.opacity;
      const notebookGlow = new THREE.Sprite(notebookGlowMaterial);
      notebookGlow.scale.set(0.28, 0.28, 1);
      notebookAnchor.add(notebookGlow);

      const notebookHitMaterial = new THREE.MeshBasicMaterial({
        color: notebookColor,
        transparent: true,
        opacity: 0.003,
        depthWrite: false
      });
      notebookHitMaterial.userData.baseOpacity = notebookHitMaterial.opacity;
      const notebookHit = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 10), notebookHitMaterial);
      notebookHit.userData.isQuantumNotebook = true;
      notebookHit.userData.quantumNodeIndex = nodeIndex;
      notebookHit.userData.quantumNotebookIndex = notebookIndex;
      notebookAnchor.add(notebookHit);
      clusterTargets.push(notebookHit);

      anchor.add(notebookAnchor);

      const notebookLabel = document.createElement('div');
      notebookLabel.className = 'quantum-label quantum-label--notebook';
      notebookLabel.dataset.quantumNode = String(nodeIndex);
      notebookLabel.dataset.quantumNotebook = String(notebookIndex);
      notebookLabel.innerHTML = `<strong>${notebook.label ?? String(notebookIndex + 1).padStart(2, '0')}</strong><span>${notebook.date ?? ''}</span>`;
      notebookLabel.addEventListener('click', () => focusQuantumNotebook(nodeIndex, notebookIndex));
      quantumLabelsHost?.appendChild(notebookLabel);
      notebookLabels.push({ label: notebookLabel, anchor: notebookAnchor, nodeIndex, notebookIndex });

      return {
        anchor: notebookAnchor,
        core: notebookCore,
        glow: notebookGlow,
        data: notebook,
        phase: rand() * Math.PI * 2
      };
    });

    return { anchor, nodeCore, nodeGlow, hit, notebookNodes, data: node, phase: rand() * Math.PI * 2 };
  });

  const quantumBackMaterial = new THREE.SpriteMaterial({
    map: nebulaTexture,
    color: 0x756dff,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  quantumBackMaterial.userData.baseOpacity = quantumBackMaterial.opacity;
  const quantumVeil = new THREE.Sprite(quantumBackMaterial);
  quantumVeil.scale.set(9.6, 4.2, 1);
  quantumGalaxy.add(quantumVeil);
  group.add(quantumGalaxy);

  const linePoints = [];
  const stars = entries.map((entry, entryIndex) => {
    const color = toColor(entry.color ?? section.color, '#9de8ff');
    const anchor = new THREE.Group();
    anchor.name = `${entry.title} star`;
    anchor.position.fromArray(entry.starPosition ?? [
      Math.cos((entryIndex / entries.length) * Math.PI * 2) * 1.8,
      Math.sin((entryIndex / entries.length) * Math.PI * 2) * 1.2,
      (entryIndex - entries.length / 2) * 0.35
    ]);

    linePoints.push(anchor.position.clone());

    const starWhite = palette.hotStar.clone().lerp(color, 0.34);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: starWhite,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    coreMaterial.userData.baseOpacity = coreMaterial.opacity;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 16), coreMaterial);
    core.userData.index = sectionIndex;
    core.userData.researchEntryIndex = entryIndex;
    core.userData.isResearchStar = true;
    anchor.add(core);

    const glowMaterial = new THREE.SpriteMaterial({
      map: starTexture,
      color: starWhite,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    glowMaterial.userData.baseOpacity = glowMaterial.opacity;
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(0.38, 0.38, 1);
    glow.userData.index = sectionIndex;
    glow.userData.researchEntryIndex = entryIndex;
    glow.userData.isResearchStar = true;
    anchor.add(glow);

    const glintMaterial = new THREE.LineBasicMaterial({
      color: starWhite,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    glintMaterial.userData.baseOpacity = glintMaterial.opacity;
    const glintGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.22, 0, 0),
      new THREE.Vector3(0.22, 0, 0),
      new THREE.Vector3(0, -0.13, 0),
      new THREE.Vector3(0, 0.13, 0)
    ]);
    const glint = new THREE.LineSegments(glintGeometry, glintMaterial);
    glint.rotation.z = rand() * Math.PI;
    anchor.add(glint);

    const hitMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.006,
      depthWrite: false
    });
    hitMaterial.userData.baseOpacity = hitMaterial.opacity;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 12), hitMaterial);
    hit.userData.index = sectionIndex;
    hit.userData.researchEntryIndex = entryIndex;
    hit.userData.isResearchStar = true;
    anchor.add(hit);
    clusterTargets.push(hit);

    group.add(anchor);
    return {
      anchor,
      core,
      glow,
      glint,
      hit,
      color,
      phase: rand() * Math.PI * 2
    };
  });

  if (linePoints.length > 1) {
    const constellationPoints = [];
    for (let i = 0; i < linePoints.length; i += 1) {
      constellationPoints.push(linePoints[i], linePoints[(i + 1) % linePoints.length]);
      if (i + 2 < linePoints.length) {
        constellationPoints.push(linePoints[i], linePoints[i + 2]);
      }
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(constellationPoints);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x9fdcff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    lineMaterial.userData.baseOpacity = lineMaterial.opacity;
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);
  }

  const dustCount = entries.length * 260;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  entries.forEach((entry, entryIndex) => {
    const base = new THREE.Vector3().fromArray(entry.starPosition ?? [0, 0, 0]);
    const color = toColor(entry.color ?? section.color, '#9de8ff');
    for (let i = 0; i < 260; i += 1) {
      const index = entryIndex * 260 + i;
      const i3 = index * 3;
      const angle = rand() * Math.PI * 2;
      const radius = Math.pow(rand(), 2.2) * (0.38 + rand() * 0.8);
      const lift = (rand() - 0.5) * 0.46;
      dustPositions[i3] = base.x + Math.cos(angle) * radius;
      dustPositions[i3 + 1] = base.y + lift;
      dustPositions[i3 + 2] = base.z + Math.sin(angle) * radius * 0.52;

      const mixed = color.clone().lerp(palette.hotStar, rand() * 0.24);
      const brightness = 0.16 + rand() * 0.46;
      dustColors[i3] = mixed.r * brightness;
      dustColors[i3 + 1] = mixed.g * brightness;
      dustColors[i3 + 2] = mixed.b * brightness;
    }
  });
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
  const dustMaterial = new THREE.PointsMaterial({
    size: 0.032,
    sizeAttenuation: true,
    map: starTexture,
    transparent: true,
    opacity: 0.48,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  dustMaterial.userData.baseOpacity = dustMaterial.opacity;
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  group.add(dust);

  scene.add(group);
  return {
    group,
    stars,
    dust,
    ribbon,
    veil,
    blackHole,
    eventHorizon,
    photonRing,
    accretionInner,
    accretionOuter,
    accretionDisk,
    lens,
    quantumGalaxy,
    quantumField,
    quantumNodes,
    quantumVeil,
    sectionIndex
  };
}

const planetSystems = createPortfolioPlanets();
const researchStarSystem = createResearchStarSystem();
const routeLine = addRouteLines();
clusterGroups.forEach((group) => fadeObject(group, 0, 1));
planetSystems.forEach(({ group }) => fadeObject(group, 0, 1));
if (researchStarSystem) fadeObject(researchStarSystem.group, 0, 1);
if (researchStarSystem) fadeObject(researchStarSystem.blackHole, 0, 1);
if (researchStarSystem) fadeObject(researchStarSystem.quantumGalaxy, 0, 1);
satelliteSystems.forEach(({ pivot }) => fadeObject(pivot, 0, 1));
journeyAssets.forEach(({ group }) => fadeObject(group, 0, 1));
spaceTourAssets.forEach(({ group }) => fadeObject(group, 0, 1));
fadeObject(galaxy, 0, 1);
fadeMaterial(routeLine.material, 0, 1);
fadeMaterial(background.web.material, 0, 1);
fadeObject(celestial.sun, 0, 1);
fadeObject(celestial.sunGlow, 0, 1);

sections.forEach((cluster, index) => {
  if (cluster.visualOnly) return;
  const button = document.createElement('button');
  button.className = 'nav-dot';
  button.type = 'button';
  button.dataset.index = String(index);
  button.setAttribute('aria-label', cluster.label);
  button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${getNavLabel(cluster)}`;
  button.addEventListener('click', () => jumpToCluster(index));
  navHost.appendChild(button);
});

function setRouteJumping() {
  document.body.classList.add('is-route-jumping');
  window.clearTimeout(routeJumpTimer);
  routeJumpTimer = window.setTimeout(() => {
    document.body.classList.remove('is-route-jumping');
  }, 1250);
}

function jumpToCluster(index) {
  endSpaceTour();
  exitQuantumMode(false);
  closeDetailArchive();
  researchExploreIndex = null;
  setRouteJumping();
  setActiveCluster(index);
}

function enterQuantumMode(entryIndex) {
  if (researchSectionIndex < 0 || !isQuantumResearchEntry(entryIndex)) return;
  endSpaceTour();
  detailArchiveIndex = null;
  researchArchiveEl?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-research-open');
  setActiveCluster(researchSectionIndex);
  activeResearchEntryIndex = entryIndex;
  researchExploreIndex = entryIndex;
  quantumMode = true;
  quantumModeEntryIndex = entryIndex;
  quantumNodeFocusIndex = null;
  quantumDiveStartedAt = performance.now();
  document.body.classList.add('is-quantum-mode');
  quantumReturnEl?.setAttribute('aria-hidden', 'false');
  hideQuantumNodePanel();
  updateResearchNodeDock();
}

function exitQuantumMode(keepResearch = true) {
  if (!quantumMode) return;
  quantumMode = false;
  quantumModeEntryIndex = null;
  quantumNodeFocusIndex = null;
  quantumDiveStartedAt = 0;
  document.body.classList.remove('is-quantum-mode');
  quantumReturnEl?.setAttribute('aria-hidden', 'true');
  hideQuantumNodePanel();
  if (keepResearch) {
    researchExploreIndex = null;
    setActiveCluster(researchSectionIndex);
  }
  updateResearchNodeDock();
}

function hideQuantumNodePanel() {
  if (!quantumNodePanelEl) return;
  quantumNodePanelEl.setAttribute('aria-hidden', 'true');
  quantumNodePanelEl.replaceChildren();
}

function renderQuantumNodePanel(node, notebook = null) {
  if (!quantumNodePanelEl || !node) return;
  const detail = node.detail ?? {};
  const activeNodeIndex = researchStarSystem?.quantumNodes?.findIndex(({ data }) => data === node) ?? -1;
  const content = document.createElement('div');
  content.className = [
    'quantum-node-shell',
    detail.notebooks?.length ? 'quantum-node-shell--notebooks' : '',
    notebook ? 'quantum-node-shell--notebook-detail' : ''
  ].filter(Boolean).join(' ');

  const kicker = document.createElement('p');
  kicker.className = 'quantum-node-kicker';
  kicker.textContent = 'Quantum node';

  const heading = document.createElement('h2');
  heading.textContent = notebook?.title ?? detail.heading ?? node.label;

  const body = document.createElement('p');
  body.className = 'quantum-node-body';
  body.textContent = notebook?.description ?? detail.body ?? detail.overview ?? node.text ?? '';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'quantum-node-close';
  close.textContent = 'Back to field';
  close.addEventListener('click', () => {
    quantumNodeFocusIndex = null;
    hideQuantumNodePanel();
  });

  const header = document.createElement('header');
  header.className = 'quantum-node-header';
  header.append(kicker, heading, body);
  content.appendChild(header);

  if (!notebook && detail.overview) {
    const overview = document.createElement('p');
    overview.className = 'quantum-node-overview';
    overview.textContent = detail.overview;
    content.appendChild(overview);
  }

  if (!notebook && detail.highlights?.length) {
    const highlights = document.createElement('div');
    highlights.className = 'quantum-node-highlights';
    detail.highlights.forEach((highlight) => {
      const item = document.createElement('p');
      item.textContent = highlight;
      highlights.appendChild(item);
    });
    content.appendChild(highlights);
  }

  if (!notebook && detail.conference) {
    const conference = document.createElement('section');
    conference.className = 'quantum-node-conference';

    const media = document.createElement('div');
    media.className = 'quantum-node-media';
    detail.conference.images?.forEach((assetKey) => {
      const imageUrl = assetUrls[assetKey];
      if (!imageUrl) return;
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = detail.conference.imageAlt ?? 'Conference photo';
      image.loading = 'lazy';
      media.appendChild(image);
    });

    const copy = document.createElement('div');
    copy.className = 'quantum-node-conference-copy';
    const conferenceHeading = document.createElement('strong');
    conferenceHeading.textContent = detail.conference.heading ?? 'Conference signal';
    const conferenceBody = document.createElement('span');
    conferenceBody.textContent = detail.conference.body ?? '';
    copy.append(conferenceHeading, conferenceBody);

    const links = document.createElement('div');
    links.className = 'quantum-node-actions';
    detail.conference.links?.forEach((link) => {
      const href = assetUrls[link.assetKey] ?? link.url;
      if (!href) return;
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.textContent = link.label;
      links.appendChild(anchor);
    });

    conference.append(media, copy);
    if (links.childElementCount) conference.appendChild(links);
    content.appendChild(conference);
  }

  if (!notebook && detail.artifacts?.length) {
    const artifacts = document.createElement('section');
    artifacts.className = 'quantum-node-artifacts';

    const artifactHeading = document.createElement('p');
    artifactHeading.className = 'quantum-node-subhead';
    artifactHeading.textContent = detail.artifactsHeading ?? 'Research artifacts';
    artifacts.appendChild(artifactHeading);

    const artifactList = document.createElement('div');
    artifactList.className = 'quantum-node-artifact-list';
    detail.artifacts.forEach((artifact) => {
      const href = assetUrls[artifact.assetKey] ?? artifact.url;
      const card = document.createElement(href ? 'a' : 'div');
      card.className = 'quantum-node-artifact';
      if (href) {
        card.href = href;
        card.target = '_blank';
        card.rel = 'noreferrer';
      }

      const title = document.createElement('strong');
      title.textContent = artifact.title ?? artifact.label ?? 'Artifact';
      const description = document.createElement('span');
      description.textContent = artifact.description ?? '';
      const label = document.createElement('em');
      label.textContent = artifact.label ?? 'Open';
      card.append(title, description, label);
      artifactList.appendChild(card);
    });

    artifacts.appendChild(artifactList);
    content.appendChild(artifacts);
  }

  const entries = notebook ? null : detail.notebooks ?? detail.lessons ?? detail.items;
  if (entries?.length) {
    const listHeading = document.createElement('p');
    listHeading.className = 'quantum-node-subhead';
    listHeading.textContent = detail.notebooks ? 'Notebook nodes' : 'Signals';
    content.appendChild(listHeading);

    const list = document.createElement('ul');
    list.className = 'quantum-node-list';
    entries.forEach((item, itemIndex) => {
      const li = document.createElement('li');
      if (typeof item === 'string') {
        li.textContent = item;
      } else {
        const title = document.createElement('strong');
        title.textContent = item.title;
        const meta = document.createElement('span');
        meta.textContent = [item.date, item.description].filter(Boolean).join(' - ');
        li.append(title, meta);
        if (detail.notebooks && activeNodeIndex >= 0) {
          li.tabIndex = 0;
          li.classList.add('is-clickable');
          li.addEventListener('click', () => focusQuantumNotebook(activeNodeIndex, itemIndex));
          li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              focusQuantumNotebook(activeNodeIndex, itemIndex);
            }
          });
        }
      }
      list.appendChild(li);
    });
    content.appendChild(list);
  }

  if (!notebook && detail.poster) {
    const poster = document.createElement('div');
    poster.className = 'quantum-node-poster';
    const posterTitle = document.createElement('strong');
    posterTitle.textContent = detail.poster.heading ?? 'Poster';
    const posterBody = document.createElement('span');
    posterBody.textContent = detail.poster.body ?? '';
    poster.append(posterTitle, posterBody);
    const posterUrl = assetUrls[detail.poster.assetKey] ?? detail.poster.url;
    if (posterUrl) {
      const posterLink = document.createElement('a');
      posterLink.href = posterUrl;
      posterLink.target = '_blank';
      posterLink.rel = 'noreferrer';
      posterLink.textContent = detail.poster.actionLabel ?? 'Open poster';
      poster.appendChild(posterLink);
    }
    content.appendChild(poster);
  }

  if (detail.note || detail.meta) {
    const note = document.createElement('p');
    note.className = 'quantum-node-note';
    note.textContent = [detail.note, detail.meta].filter(Boolean).join(' ');
    content.appendChild(note);
  }

  const footer = document.createElement('footer');
  footer.className = 'quantum-node-footer';
  footer.appendChild(close);
  content.appendChild(footer);
  quantumNodePanelEl.replaceChildren(content);
  quantumNodePanelEl.setAttribute('aria-hidden', 'false');
}

function focusQuantumNode(nodeIndex) {
  if (!quantumMode || !researchStarSystem?.quantumNodes?.[nodeIndex]) return;
  quantumNodeFocusIndex = nodeIndex;
  renderQuantumNodePanel(researchStarSystem.quantumNodes[nodeIndex].data);
}

function focusQuantumNotebook(nodeIndex, notebookIndex) {
  if (!quantumMode || !researchStarSystem?.quantumNodes?.[nodeIndex]) return;
  const node = researchStarSystem.quantumNodes[nodeIndex];
  quantumNodeFocusIndex = nodeIndex;
  renderQuantumNodePanel(node.data, node.notebookNodes?.[notebookIndex]?.data);
}

function renderResearchNodeDock() {
  if (!researchNodeDockEl || researchSectionIndex < 0) return;
  const entries = sections[researchSectionIndex].detail?.entries ?? [];
  researchNodeDockEl.replaceChildren();

  entries.forEach((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.researchNode = String(index);
    if (isQuantumResearchEntry(index)) button.dataset.quantum = 'true';
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${entry.shortLabel ?? entry.title}`;
    button.addEventListener('click', () => {
      setActiveCluster(researchSectionIndex);
      if (isQuantumResearchEntry(index)) {
        enterQuantumMode(index);
      } else {
        exitQuantumMode(false);
        openDetailArchive(researchSectionIndex, index);
      }
    });
    researchNodeDockEl.appendChild(button);
  });
}

function updateResearchNodeDock() {
  if (!researchNodeDockEl || researchSectionIndex < 0) return;
  const showDock = activeClusterIndex === researchSectionIndex || detailArchiveIndex === researchSectionIndex || researchExploreIndex !== null;
  researchNodeDockEl.setAttribute('aria-hidden', showDock ? 'false' : 'true');
  researchNodeDockEl.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.researchNode) === activeResearchEntryIndex);
  });
  document.body.classList.toggle('is-research-exploring', showDock);
}

renderResearchNodeDock();

function renderSectionText(cluster) {
  const content = cluster.content ?? cluster;
  sectionKickerEl.textContent = content.kicker ?? '';
  sectionHeadingEl.textContent = content.heading ?? '';
  sectionTextEl.textContent = content.text ?? '';
  if (sectionActionEl) {
    sectionActionEl.hidden = !cluster.detail?.actionLabel;
    sectionActionEl.textContent = cluster.detail?.actionLabel ?? '';
  }
}

function getSpaceTourReturnIndex() {
  const configuredIndex = sections.findIndex((section) => section.id === spaceTourConfig.returnSection);
  if (configuredIndex >= 0) return configuredIndex;
  return firstSignalSectionIndex >= 0 ? firstSignalSectionIndex : activeClusterIndex;
}

function updateSpaceTourPanel(progress) {
  if (spaceTourPanelEl) {
    spaceTourPanelEl.setAttribute('aria-hidden', 'true');
  }
  return;
  if (!spaceTourPanelEl) return;
  const moments = spaceTourConfig.moments ?? [];
  if (!moments.length) return;
  const momentIndex = Math.min(moments.length - 1, Math.floor(progress * moments.length));
  const moment = moments[momentIndex];
  const secondsLeft = Math.max(0, Math.ceil((1 - progress) * (spaceTour?.durationMs ?? spaceTourConfig.durationMs ?? 60000) / 1000));

  if (momentIndex !== spaceTourMomentIndex) {
    spaceTourMomentIndex = momentIndex;
    spaceTourPanelEl.classList.remove('is-refreshing');
    void spaceTourPanelEl.offsetWidth;
    spaceTourPanelEl.classList.add('is-refreshing');
    if (spaceTourKickerEl) spaceTourKickerEl.textContent = moment.kicker ?? 'Space tour';
    if (spaceTourHeadingEl) spaceTourHeadingEl.textContent = moment.heading ?? '';
    if (spaceTourTextEl) spaceTourTextEl.textContent = moment.text ?? '';
  }
  if (spaceTourProgressEl) {
    spaceTourProgressEl.textContent = `${String(momentIndex + 1).padStart(2, '0')} / ${String(moments.length).padStart(2, '0')}  ${secondsLeft}s`;
  }
}

function getSpaceTourProgress(now = performance.now()) {
  if (!spaceTour) return 0;
  return THREE.MathUtils.clamp((now - spaceTour.startedAt) / spaceTour.durationMs, 0, 1);
}

function getSpaceTourMomentInfluence(progress, momentIndex) {
  const moments = spaceTourConfig.moments ?? [];
  if (moments.length <= 1) return spaceTour ? 1 : 0;
  const phase = progress * (moments.length - 1);
  const distance = Math.min(Math.abs(phase - momentIndex), 1);
  return easeInOut(1 - distance);
}

function getSpaceTourCamera(progress) {
  const moments = spaceTourConfig.moments ?? [];
  if (!moments.length) return getCameraForProgress(scrollProgress);
  if (moments.length === 1) {
    const cameraData = moments[0].camera;
    return {
      position: new THREE.Vector3().fromArray(cameraData.position),
      target: new THREE.Vector3().fromArray(cameraData.target)
    };
  }

  const phase = progress * (moments.length - 1);
  const fromIndex = Math.min(moments.length - 1, Math.floor(phase));
  const toIndex = Math.min(moments.length - 1, fromIndex + 1);
  const t = easeInOut(phase - fromIndex);
  const fromCamera = moments[fromIndex].camera;
  const toCamera = moments[toIndex].camera;
  const position = new THREE.Vector3().fromArray(fromCamera.position).lerp(
    new THREE.Vector3().fromArray(toCamera.position),
    t
  );
  const target = new THREE.Vector3().fromArray(fromCamera.target).lerp(
    new THREE.Vector3().fromArray(toCamera.target),
    t
  );

  const drift = Math.sin(progress * Math.PI * 8);
  position.x += drift * 0.75;
  position.y += Math.sin(t * Math.PI) * 2.1;
  target.y += Math.cos(progress * Math.PI * 5) * 0.34;

  return { position, target };
}

function startSpaceTour() {
  if (!spaceTourConfig.moments?.length) return;
  exitQuantumMode(false);
  closeDetailArchive();
  const returnIndex = getSpaceTourReturnIndex();
  setActiveCluster(returnIndex, true);
  scrollProgress = returnIndex;
  scrollTarget = returnIndex;
  spaceTour = {
    startedAt: performance.now(),
    durationMs: spaceTourConfig.durationMs ?? 60000,
    returnIndex
  };
  spaceTourMomentIndex = -1;
  if (spaceTourExitEl) spaceTourExitEl.textContent = spaceTourConfig.exitLabel ?? 'Return';
  spaceTourPanelEl?.setAttribute('aria-hidden', 'true');
  spaceTourPanelEl?.classList.remove('is-refreshing');
  document.body.classList.add('is-space-tour');
  document.body.classList.add('has-left-intro');
  updateSpaceTourPanel(0);
}

function endSpaceTour() {
  if (!spaceTour) return;
  const returnIndex = spaceTour.returnIndex;
  spaceTour = null;
  spaceTourMomentIndex = -1;
  spaceTourPanelEl?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-space-tour');
  setActiveCluster(returnIndex, true);
}

function getCopySource(section) {
  if (!section.copyFrom) return section;
  return sections.find((candidate) => candidate.id === section.copyFrom) ?? section;
}

function getCameraForSection(section) {
  return section.camera ?? {
    position: section.cameraPosition,
    target: section.position
  };
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function clampRouteProgress(value) {
  return THREE.MathUtils.clamp(value, 0, sections.length - 1);
}

function getSectionInfluence(index) {
  const distance = Math.min(Math.abs(scrollProgress - index), 1);
  return easeInOut(1 - distance);
}

function getCameraForProgress(progress) {
  const clamped = clampRouteProgress(progress);
  const fromIndex = Math.floor(clamped);
  const toIndex = Math.min(fromIndex + 1, sections.length - 1);
  const t = easeInOut(clamped - fromIndex);
  const fromCamera = getCameraForSection(sections[fromIndex]);
  const toCamera = getCameraForSection(sections[toIndex]);
  const position = new THREE.Vector3().fromArray(fromCamera.position).lerp(
    new THREE.Vector3().fromArray(toCamera.position),
    t
  );
  const target = new THREE.Vector3().fromArray(fromCamera.target).lerp(
    new THREE.Vector3().fromArray(toCamera.target),
    t
  );

  const transitionLift = Math.sin(t * Math.PI);
  position.y += transitionLift * (2.2 + fromIndex * 0.12);
  position.x += Math.sin(t * Math.PI * 2) * 0.7;
  target.y += transitionLift * 0.55;

  return { position, target };
}

function setActiveCluster(index, instant = false, preserveScroll = false) {
  activeClusterIndex = THREE.MathUtils.clamp(index, 0, sections.length - 1);
  const cluster = sections[activeClusterIndex];
  const copyCluster = getCopySource(cluster);
  const previousDisplaySection = document.body.dataset.section;
  const copyChanged = previousDisplaySection !== copyCluster.id;
  document.body.dataset.section = copyCluster.id;

  if (!preserveScroll) {
    scrollTarget = activeClusterIndex;
    if (instant) {
      scrollProgress = scrollTarget;
    }
  }
  if (detailArchiveIndex !== null && detailArchiveIndex !== activeClusterIndex) {
    closeDetailArchive();
  }
  if (activeClusterIndex !== researchSectionIndex) {
    researchExploreIndex = null;
    activeResearchEntryIndex = 0;
    quantumMode = false;
    quantumModeEntryIndex = null;
    quantumDiveStartedAt = 0;
    document.body.classList.remove('is-quantum-mode');
    quantumReturnEl?.setAttribute('aria-hidden', 'true');
  }

  window.clearTimeout(textTransitionTimer);
  if (instant || !copyChanged) {
    renderSectionText(copyCluster);
  } else {
    document.body.classList.add('is-copy-fading');
    textTransitionTimer = window.setTimeout(() => {
      renderSectionText(copyCluster);
      document.body.classList.remove('is-copy-fading');
    }, 360);
  }

  const activeNavIndex = cluster.visualOnly && cluster.copyFrom
    ? sections.findIndex((candidate) => candidate.id === cluster.copyFrom)
    : activeClusterIndex;
  document.querySelectorAll('.nav-dot').forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.index) === activeNavIndex);
  });
  clusterLabels.forEach((label, labelIndex) => {
    label.classList.toggle('is-active', labelIndex === activeClusterIndex);
  });
  updateResearchNodeDock();
}

function createResearchTags(tags = []) {
  const list = document.createElement('ul');
  list.className = 'research-tags';
  tags.forEach((tag) => {
    const item = document.createElement('li');
    item.textContent = tag;
    list.appendChild(item);
  });
  return list;
}

function createResearchLinks(links = []) {
  if (!links.length) return null;
  const container = document.createElement('div');
  container.className = 'research-links';
  links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = link.label;
    container.appendChild(anchor);
  });
  return container;
}

function renderResearchEntry(section, entryIndex = 0) {
  const detail = section.detail;
  const entries = detail.entries ?? [];
  const entry = entries[entryIndex] ?? entries[0];
  if (!entry) return;

  researchKickerEl.textContent = ['Research star', `${entryIndex + 1}/${entries.length}`].join(' / ');
  researchHeadingEl.textContent = entry.shortLabel ?? entry.title ?? detail.heading ?? '';
  researchIntroEl.textContent = entry.cinematicText ?? entry.summary ?? detail.intro ?? '';
  researchListEl.replaceChildren();

  const article = document.createElement('article');
  article.className = 'research-entry';

  const meta = document.createElement('p');
  meta.className = 'research-entry-meta';
  meta.textContent = [entry.title, entry.organization, entry.dates].filter(Boolean).join(' / ');

  const submeta = document.createElement('p');
  submeta.className = 'research-entry-submeta';
  submeta.textContent = entry.meta ?? '';

  article.append(meta, submeta);
  if (entry.tags?.length) article.appendChild(createResearchTags(entry.tags.slice(0, 3)));
  const links = createResearchLinks(entry.links);
  if (links) article.appendChild(links);
  if (entries.length > 1) {
    const nav = document.createElement('div');
    nav.className = 'research-card-nav';

    const openEntry = (nextIndex) => {
      if (isQuantumResearchEntry(nextIndex)) {
        enterQuantumMode(nextIndex);
      } else {
        openDetailArchive(detailArchiveIndex ?? activeClusterIndex, nextIndex);
      }
    };

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.textContent = 'Prev';
    previous.addEventListener('click', () => openEntry((entryIndex - 1 + entries.length) % entries.length));

    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next';
    next.addEventListener('click', () => openEntry((entryIndex + 1) % entries.length));

    nav.append(previous, next);
    article.appendChild(nav);
  }
  researchListEl.appendChild(article);
}

function openDetailArchive(index = activeClusterIndex, entryIndex = 0) {
  const section = sections[index];
  if (!section?.detail || !researchArchiveEl) return;
  if (index === researchSectionIndex && isQuantumResearchEntry(entryIndex)) {
    enterQuantumMode(entryIndex);
    return;
  }

  detailArchiveIndex = index;
  activeResearchEntryIndex = THREE.MathUtils.clamp(entryIndex, 0, Math.max(0, (section.detail.entries?.length ?? 1) - 1));
  researchExploreIndex = activeResearchEntryIndex;
  renderResearchEntry(section, activeResearchEntryIndex);
  researchArchiveEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-research-open');
  updateResearchNodeDock();
}

function closeDetailArchive() {
  if (!researchArchiveEl) return;
  if (detailArchiveIndex === researchSectionIndex) {
    researchExploreIndex = activeResearchEntryIndex;
  }
  detailArchiveIndex = null;
  researchArchiveEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-research-open');
  updateResearchNodeDock();
}

function createNoiseBuffer(context) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.16;
  }
  return buffer;
}

function startSyntheticAmbience() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  audioContext = audioContext ?? new AudioContext();
  const context = audioContext;
  const master = context.createGain();
  master.gain.setValueAtTime(0, context.currentTime);
  master.gain.linearRampToValueAtTime(siteData.audio?.volume ?? 0.2, context.currentTime + 1.2);
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(920, context.currentTime);
  filter.Q.setValueAtTime(0.42, context.currentTime);
  filter.connect(master);

  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.035, context.currentTime);
  lfoGain.gain.setValueAtTime(260, context.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const tones = [55, 82.41, 146.83].map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.detune.setValueAtTime(index * 4 - 5, context.currentTime);
    gain.gain.setValueAtTime(index === 0 ? 0.08 : 0.045, context.currentTime);
    oscillator.connect(gain);
    gain.connect(filter);
    oscillator.start();
    return oscillator;
  });

  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context);
  noise.loop = true;
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.018, context.currentTime);
  noise.connect(noiseGain);
  noiseGain.connect(filter);
  noise.start();

  return { master, tones, lfo, noise };
}

function stopSyntheticAmbience() {
  if (!audioNodes || !audioContext) return;
  const context = audioContext;
  audioNodes.master.gain.cancelScheduledValues(context.currentTime);
  audioNodes.master.gain.setValueAtTime(audioNodes.master.gain.value, context.currentTime);
  audioNodes.master.gain.linearRampToValueAtTime(0, context.currentTime + 0.55);
  window.setTimeout(() => {
    audioNodes.tones.forEach((oscillator) => oscillator.stop());
    audioNodes.lfo.stop();
    audioNodes.noise.stop();
    audioNodes = null;
  }, 650);
}

function getYoutubeVideoId() {
  if (siteData.audio?.youtubeId) return siteData.audio.youtubeId;
  if (!siteData.audio?.youtubeReference) return null;

  try {
    const url = new URL(siteData.audio.youtubeReference);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
    return embedMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      resolve(window.YT);
    };

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

async function getYoutubePlayer() {
  const videoId = getYoutubeVideoId();
  if (!videoId) return null;
  if (youtubePlayer) return youtubePlayer;
  if (youtubeReadyPromise) return youtubeReadyPromise;

  youtubeReadyPromise = loadYoutubeApi().then((YT) => new Promise((resolve, reject) => {
    youtubePlayer = new YT.Player('youtube-audio-player', {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        loop: 1,
        modestbranding: 1,
        playsinline: 1,
        playlist: videoId,
        rel: 0
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(Math.round((siteData.audio?.volume ?? 0.22) * 100));
          resolve(event.target);
        },
        onError: () => reject(new Error('YouTube player could not load this video.'))
      }
    });
  }));

  return youtubeReadyPromise;
}

async function playYoutubeAudio() {
  const player = await getYoutubePlayer();
  if (!player) return false;
  player.setVolume(Math.round((siteData.audio?.volume ?? 0.22) * 100));
  player.playVideo();
  return true;
}

function pauseYoutubeAudio() {
  if (youtubePlayer?.pauseVideo) {
    youtubePlayer.pauseVideo();
  }
}

async function toggleSound() {
  if (!siteData.audio?.enabled) return;
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle('is-on', soundEnabled);
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.textContent = soundEnabled ? 'Sound on' : siteData.audio?.label ?? 'Sound';

  if (soundEnabled) {
    if (siteData.audio.file) {
      audioElement = audioElement ?? new Audio(siteData.audio.file);
      audioElement.loop = true;
      audioElement.volume = siteData.audio.volume ?? 0.22;
      await audioElement.play();
      return;
    }

    if (siteData.audio.provider === 'youtube' || siteData.audio.youtubeReference || siteData.audio.youtubeId) {
      const youtubeStarted = await playYoutubeAudio().catch(() => false);
      if (youtubeStarted) return;
    }

    audioNodes = audioNodes ?? startSyntheticAmbience();
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }
    return;
  }

  if (audioElement) {
    audioElement.pause();
  }
  pauseYoutubeAudio();
  stopSyntheticAmbience();
}

function startSunPrank() {
  if (sunPrank) return;
  endSpaceTour();
  closeDetailArchive();

  sunPrank = {
    startedAt: performance.now(),
    durationMs: 2850,
    savedProgress: scrollProgress,
    savedTarget: scrollTarget,
    savedIndex: activeClusterIndex
  };
  sunModeToggle?.setAttribute('aria-pressed', 'true');
  document.body.classList.add('is-sun-prank');
  document.body.dataset.section = 'sun-prank';
  window.clearTimeout(textTransitionTimer);
  renderSectionText({
    content: {
      kicker: '',
      heading: 'are u serious??',
      text: ''
    }
  });
}

function restoreSunPrank() {
  if (!sunPrank) return;

  const saved = sunPrank;
  sunPrank = null;
  scrollProgress = saved.savedProgress;
  scrollTarget = saved.savedTarget;
  activeClusterIndex = saved.savedIndex;
  sunReturnBoostUntil = performance.now() + 1200;
  sunModeToggle?.setAttribute('aria-pressed', 'false');
  document.body.classList.remove('is-sun-prank');
  setActiveCluster(saved.savedIndex, true, true);
}

function fadeMaterial(material, targetOpacity, speed) {
  const baseOpacity = material.userData.baseOpacity ?? material.opacity;
  material.opacity = THREE.MathUtils.lerp(material.opacity, baseOpacity * targetOpacity, speed);
}

function fadeObject(object, targetOpacity, speed = 0.055) {
  object.traverse((child) => {
    if (!child.material) return;
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => fadeMaterial(material, targetOpacity, speed));
    } else {
      fadeMaterial(child.material, targetOpacity, speed);
    }
  });
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const screenPosition = new THREE.Vector3();

  sections.forEach((cluster, index) => {
    const label = clusterLabels.get(index);
    if (!label) return;
    screenPosition.fromArray(cluster.position);
    screenPosition.project(camera);

    const isBehind = screenPosition.z > 1;
    const x = (screenPosition.x * 0.5 + 0.5) * width;
    const y = (screenPosition.y * -0.5 + 0.5) * height;

    label.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    label.classList.toggle('is-hidden', isBehind);
  });
}

function updateQuantumLabels() {
  if (!quantumLabels.length) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const screenPosition = new THREE.Vector3();

  [...quantumLabels, ...notebookLabels].forEach(({ label, anchor, nodeIndex }) => {
    if (!quantumMode) {
      label.classList.add('is-hidden');
      return;
    }
    const isNotebook = label.classList.contains('quantum-label--notebook');
    if (isNotebook && nodeIndex !== quantumNodeFocusIndex) {
      label.classList.add('is-hidden');
      return;
    }
    anchor.getWorldPosition(screenPosition);
    screenPosition.project(camera);
    const isBehind = screenPosition.z > 1;
    const x = (screenPosition.x * 0.5 + 0.5) * width;
    const y = (screenPosition.y * -0.5 + 0.5) * height;
    label.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    label.classList.toggle('is-hidden', isBehind);
    label.classList.toggle('is-focused', nodeIndex === quantumNodeFocusIndex);
  });
}

function handlePointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function handlePointerDown() {
  if (spaceTour) return;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(clusterTargets);
  if (!intersects.length) return;

  const target = intersects[0].object;
  if (target.userData.isQuantumNotebook) {
    focusQuantumNotebook(target.userData.quantumNodeIndex ?? 0, target.userData.quantumNotebookIndex ?? 0);
    return;
  }
  if (target.userData.isQuantumNode) {
    focusQuantumNode(target.userData.quantumNodeIndex ?? 0);
    return;
  }
  if (target.userData.isResearchStar) {
    const sectionIndex = target.userData.index;
    const visibleEnough = getSectionInfluence(sectionIndex) > 0.12 || detailArchiveIndex === sectionIndex;
    if (!visibleEnough) return;
    const entryIndex = target.userData.researchEntryIndex ?? 0;
    setActiveCluster(sectionIndex);
    if (isQuantumResearchEntry(entryIndex)) {
      enterQuantumMode(entryIndex);
    } else {
      exitQuantumMode(false);
      openDetailArchive(sectionIndex, entryIndex);
    }
    return;
  }
  if (Number.isInteger(target.userData.index)) {
    if (target.userData.index === activeClusterIndex && sections[target.userData.index]?.detail) {
      openDetailArchive(target.userData.index);
      return;
    }
    setActiveCluster(target.userData.index);
  }
}

function handleWheel(event) {
  if (researchArchiveEl?.contains(event.target)) return;
  if (quantumMode) {
    event.preventDefault();
    return;
  }
  if (spaceTour) {
    event.preventDefault();
    return;
  }
  if (sunPrank) return;
  if (Math.abs(event.deltaY) < 4) return;
  event.preventDefault();
  const isJourneyWindow = scrollTarget >= 1 && scrollTarget <= 5.05;
  const speed = (event.deltaMode === 1 ? 0.045 : 0.0018) * (isJourneyWindow ? 0.58 : 1);
  scrollTarget = clampRouteProgress(scrollTarget + event.deltaY * speed);
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const now = performance.now();
  if (spaceTour && now - spaceTour.startedAt > spaceTour.durationMs) {
    endSpaceTour();
  }
  if (sunPrank && now - sunPrank.startedAt > sunPrank.durationMs) {
    restoreSunPrank();
  }
  const isSunPrank = Boolean(sunPrank);
  const isSpaceTour = Boolean(spaceTour);

  if (!isSunPrank && !isSpaceTour) {
    scrollProgress = THREE.MathUtils.lerp(scrollProgress, scrollTarget, 0.07);
    if (Math.abs(scrollProgress - scrollTarget) < 0.001) {
      scrollProgress = scrollTarget;
    }
    document.body.classList.toggle('has-left-intro', scrollProgress > 0.18);
  } else {
    document.body.classList.add('has-left-intro');
  }

  const nearestSection = Math.round(scrollProgress);
  if (!isSunPrank && !isSpaceTour && nearestSection !== activeClusterIndex) {
    setActiveCluster(nearestSection, false, true);
  }

  const activeMode = sections[activeClusterIndex]?.visualMode;
  const isGalaxyMode = activeMode === 'galaxy';
  const isConstellationMode = activeMode === 'constellation';
  const isPlanetMode = activeMode === 'planet';
  const isJourneyMode = activeMode === 'journey';
  const routeCamera = isSpaceTour
    ? getSpaceTourCamera(getSpaceTourProgress(now))
    : getCameraForProgress(scrollProgress);
  if (isSpaceTour) updateSpaceTourPanel(getSpaceTourProgress(now));
  const sectionInfluences = sections.map((_, index) => getSectionInfluence(index));
  const satelliteCloseupIndex = sections.findIndex((section) => section.id === 'satellite-closeup');
  const satelliteFocusInfluence = satelliteCloseupIndex >= 0 ? sectionInfluences[satelliteCloseupIndex] : 0;
  const focusSatellite = satelliteSystems.find((system) => system.id === 'relay-journey');
  if (focusSatellite && satelliteFocusInfluence > 0.02) {
    const satellitePosition = new THREE.Vector3();
    focusSatellite.holder.getWorldPosition(satellitePosition);
    const closePosition = satellitePosition.clone().add(new THREE.Vector3(1.25, 0.72, 2.35));
    routeCamera.position.lerp(closePosition, satelliteFocusInfluence * 0.72);
    routeCamera.target.lerp(satellitePosition, satelliteFocusInfluence * 0.88);
  }
  const researchFocusIndex = activeClusterIndex === researchSectionIndex && researchExploreIndex !== null
    ? researchExploreIndex
    : null;
  const focusSectionIndex = detailArchiveIndex ?? (researchFocusIndex !== null ? researchSectionIndex : null);
  if (focusSectionIndex !== null) {
    const detailSection = sections[focusSectionIndex];
    let detailTarget = new THREE.Vector3().fromArray(detailSection.position);
    let detailPosition = detailTarget.clone().add(new THREE.Vector3(4.2, 1.6, 8.6));
    const selectedResearchStar = researchStarSystem?.sectionIndex === focusSectionIndex
      ? researchStarSystem.stars[researchFocusIndex ?? activeResearchEntryIndex]
      : null;
    if (selectedResearchStar) {
      const selectedResearchIndex = researchFocusIndex ?? activeResearchEntryIndex;
      const isQuantumFocus = isQuantumResearchEntry(selectedResearchIndex);
      if (isQuantumFocus && researchStarSystem?.blackHole) {
        researchStarSystem.blackHole.getWorldPosition(detailTarget);
      } else {
        selectedResearchStar.anchor.getWorldPosition(detailTarget);
      }
      const sectionCenter = new THREE.Vector3().fromArray(detailSection.position);
      const outward = detailTarget.clone().sub(sectionCenter).normalize();
      detailPosition = isQuantumFocus
        ? detailTarget.clone().add(new THREE.Vector3(0.46, 0.22, 2.95)).add(outward.multiplyScalar(0.28))
        : detailTarget.clone().add(new THREE.Vector3(1.25, 0.72, 5.25)).add(outward.multiplyScalar(0.74));
    }
    routeCamera.position.lerp(detailPosition, detailArchiveIndex !== null ? 0.78 : 0.5);
    routeCamera.target.lerp(detailTarget, detailArchiveIndex !== null ? 0.88 : 0.62);
  }
  if (quantumMode && researchStarSystem?.quantumGalaxy) {
    const blackHolePosition = new THREE.Vector3();
    const quantumCenter = new THREE.Vector3();
    researchStarSystem.blackHole.getWorldPosition(blackHolePosition);
    researchStarSystem.quantumGalaxy.getWorldPosition(quantumCenter);
    const dive = THREE.MathUtils.smoothstep(now - quantumDiveStartedAt, 120, 1850);
    const orbit = new THREE.Vector3(
      Math.sin(elapsed * 0.24) * 1.55,
      0.46 + Math.cos(elapsed * 0.18) * 0.34,
      2.72 + Math.sin(elapsed * 0.16) * 0.34
    );
    const quantumTarget = blackHolePosition.clone().lerp(quantumCenter, dive);
    const quantumPosition = blackHolePosition.clone().add(new THREE.Vector3(0.07, 0.04, 0.82)).lerp(
      quantumCenter.clone().add(orbit),
      dive
    );
    if (quantumNodeFocusIndex !== null && researchStarSystem.quantumNodes[quantumNodeFocusIndex]) {
      const focusNode = researchStarSystem.quantumNodes[quantumNodeFocusIndex];
      const nodeTarget = new THREE.Vector3();
      focusNode.anchor.getWorldPosition(nodeTarget);
      const isDeepNode = focusNode.data?.zoom === 'deep';
      const nodePosition = nodeTarget.clone().add(isDeepNode
        ? new THREE.Vector3(0.16, 0.09, 0.66)
        : new THREE.Vector3(0.62, 0.34, 1.55));
      quantumTarget.lerp(nodeTarget, 0.92);
      quantumPosition.lerp(nodePosition, isDeepNode ? 0.96 : 0.82);
    }
    routeCamera.position.lerp(quantumPosition, 0.86);
    routeCamera.target.lerp(quantumTarget, 0.9);
  }
  if (isSunPrank) {
    const sunPosition = celestial.sun.position.clone();
    const intro = THREE.MathUtils.smoothstep(now - sunPrank.startedAt, 0, 850);
    const orbit = new THREE.Vector3(
      Math.sin(elapsed * 0.44) * 1.2,
      Math.cos(elapsed * 0.36) * 0.8,
      0
    );
    const sunCameraPosition = sunPosition.clone().add(new THREE.Vector3(0, 0.5, 25)).add(orbit);
    routeCamera.position.lerp(sunCameraPosition, intro);
    routeCamera.target.lerp(sunPosition, intro);
  }
  const galaxyIndex = sections.findIndex((section) => section.visualMode === 'galaxy');
  const galaxyInfluence = galaxyIndex >= 0 ? sectionInfluences[galaxyIndex] : 0;
  const routeDepth = THREE.MathUtils.smoothstep(scrollProgress, 1.4, sections.length - 1);
  const driftAmount = siteData.visual?.cameraDrift ?? 0.34;
  const cinematicOffset = new THREE.Vector3(
    Math.sin(elapsed * 0.19) * driftAmount * (isGalaxyMode || isJourneyMode || isSpaceTour ? 1.8 : 1),
    Math.cos(elapsed * 0.13) * driftAmount * (isGalaxyMode || isJourneyMode || isSpaceTour ? 0.75 : 0.45),
    Math.sin(elapsed * 0.11) * driftAmount * (isGalaxyMode || isJourneyMode || isSpaceTour ? 1.1 : 0.55)
  );
  const cinematicTarget = routeCamera.position.clone().add(cinematicOffset);

  const returnBoost = now < sunReturnBoostUntil;
  camera.position.lerp(cinematicTarget, isSunPrank ? 0.24 : isSpaceTour ? 0.052 : returnBoost ? 0.13 : 0.028);
  controls.target.lerp(routeCamera.target, isSunPrank ? 0.28 : isSpaceTour ? 0.08 : returnBoost ? 0.16 : 0.055);
  controls.update();

  background.field.rotation.y = elapsed * 0.005;
  background.field.rotation.x = Math.sin(elapsed * 0.08) * 0.015;
  fadeMaterial(background.web.material, Math.max(isSpaceTour ? 0.18 : 0, isConstellationMode ? 1 : 0, isJourneyMode ? 0.86 : 0, isPlanetMode ? 0.58 : 0, routeDepth * 0.32), 0.045);
  fadeMaterial(routeLine.material, Math.max(isSpaceTour ? 0 : 0, isConstellationMode ? 0.55 : 0, isJourneyMode ? 0.46 : 0, isPlanetMode ? 0.36 : 0, routeDepth * 0.22), 0.045);

  celestial.earthGroup.rotation.y += 0.0009;
  celestial.atmosphere.rotation.y += 0.00045;
  celestial.sun.rotation.y = elapsed * 0.025;
  celestial.sunGlow.scale.setScalar(1 + Math.sin(elapsed * 0.7) * 0.035);
  fadeObject(celestial.sun, isSunPrank ? 1 : 0, 0.1);
  fadeObject(celestial.sunGlow, isSunPrank ? 1 : 0, 0.1);
  fadeObject(celestial.earthGroup, Math.max(sectionInfluences[0], 0.08 * (1 - routeDepth)), 0.035);
  fadeObject(galaxy, Math.max(galaxyInfluence, isSpaceTour ? 0.56 : 0, isJourneyMode ? 0.48 : 0, isPlanetMode || isConstellationMode ? 0.28 : 0), 0.045);
  galaxy.rotation.x = -0.42 + Math.sin(elapsed * 0.05) * 0.035;
  galaxy.rotation.y = elapsed * 0.018;
  galaxy.rotation.z = 0.18 + Math.sin(elapsed * 0.08) * 0.05;

  cometField.children.forEach((comet, index) => {
    comet.position.x += comet.userData.speed;
    comet.position.y += Math.sin(elapsed * 0.7 + index) * 0.002;
    if (comet.position.x > comet.userData.wrap) {
      comet.position.x = -comet.userData.wrap;
      comet.position.y = -16 + (index % 9) * 4;
    }
  });
  fadeObject(cometField, isSpaceTour ? 0.92 : 0.28 + routeDepth * 0.72, 0.04);

  journeyAssets.forEach((system, index) => {
    const [start, end] = system.progressRange;
    const enter = THREE.MathUtils.smoothstep(scrollProgress, start, start + 0.65);
    const exit = 1 - THREE.MathUtils.smoothstep(scrollProgress, end - 0.75, end);
    const targetOpacity = isSpaceTour ? 0 : Math.max(0, enter * exit);
    system.group.rotation.y += system.speed;
    system.group.rotation.x += Math.sin(elapsed * 0.22 + index) * 0.00035;
    if (system.type === 'starStream') {
      system.group.position.z += Math.sin(elapsed * 0.18 + index) * 0.006;
    }
    fadeObject(system.group, targetOpacity, 0.045);
  });

  const tourProgress = isSpaceTour ? getSpaceTourProgress(now) : 0;
  spaceTourAssets.forEach((system, index) => {
    const influence = isSpaceTour ? getSpaceTourMomentInfluence(tourProgress, system.momentIndex) : 0;
    system.group.rotation.y += system.speed;
    system.group.rotation.x += Math.sin(elapsed * 0.18 + index) * 0.00045;
    if (system.type === 'starStream') {
      system.group.position.z += Math.sin(elapsed * 0.16 + index) * 0.01;
    }
    fadeObject(system.group, influence, 0.065);
  });

  clusterGroups.forEach((group, index) => {
    const isEarthIntro = index === 0;
    const isGalaxyReveal = sections[index]?.visualMode === 'galaxy';
    const influence = sectionInfluences[index];
    const targetOpacity = isEarthIntro || isGalaxyReveal ? 0 : Math.max(influence, routeDepth * 0.18);
    const activeBoost = 1 + influence * 0.5;
    fadeObject(group, targetOpacity);
    group.rotation.x = Math.sin(elapsed * 0.21 + index) * 0.08;
    group.rotation.y = elapsed * (0.038 + index * 0.004);
    group.rotation.z = Math.cos(elapsed * 0.17 + index) * 0.06;
    const pulse = activeBoost + Math.sin(elapsed * 0.9 + index) * 0.04;
    group.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.04);
  });

  planetSystems.forEach((system, index) => {
    const influence = sectionInfluences[system.sectionIndex] ?? 0;
    const targetOpacity = Math.max(influence, isPlanetMode ? 0.1 : 0);
    system.planet.rotation.y += system.rotationSpeed;
    system.group.rotation.y = Math.sin(elapsed * 0.13 + index) * 0.08;
    system.group.rotation.x = Math.cos(elapsed * 0.11 + index) * 0.035;
    system.aura.material.rotation = elapsed * 0.035 + index;
    system.orbit.rotation.z += 0.0008 + index * 0.00012;
    system.dust.rotation.z += 0.0014 + index * 0.00018;
    const scale = 0.78 + influence * 0.24 + Math.sin(elapsed * 0.7 + index) * 0.025 * influence;
    system.group.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.045);
    fadeObject(system.group, targetOpacity, 0.045);
  });

  if (researchStarSystem) {
    const influence = sectionInfluences[researchStarSystem.sectionIndex] ?? 0;
    const isOpen = detailArchiveIndex === researchStarSystem.sectionIndex;
    const isExploring = activeClusterIndex === researchStarSystem.sectionIndex && researchExploreIndex !== null;
    const focusedEntry = researchExploreIndex ?? activeResearchEntryIndex;
    const isQuantumFocus = (isOpen || isExploring) && isQuantumResearchEntry(focusedEntry);
    const targetOpacity = Math.max(influence, isOpen || isExploring ? 1 : 0);
    researchStarSystem.group.rotation.y = Math.sin(elapsed * 0.16) * 0.16;
    researchStarSystem.group.rotation.x = Math.cos(elapsed * 0.12) * 0.06;
    researchStarSystem.dust.rotation.y += 0.0018;
    researchStarSystem.dust.rotation.z += 0.0009;
    researchStarSystem.ribbon.rotation.z = 0.12 + Math.sin(elapsed * 0.12) * 0.08;
    researchStarSystem.ribbon.rotation.y = -0.18 + Math.cos(elapsed * 0.1) * 0.08;
    researchStarSystem.veil.material.rotation = elapsed * 0.018;
    researchStarSystem.blackHole.rotation.z = elapsed * 0.16;
    researchStarSystem.photonRing.rotation.z -= 0.018;
    researchStarSystem.photonRing.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.035);
    researchStarSystem.accretionInner.rotation.z -= 0.012;
    researchStarSystem.accretionOuter.rotation.z += 0.007;
    researchStarSystem.accretionDisk.rotation.z -= 0.009;
    researchStarSystem.lens.rotation.z = 0.08 + Math.sin(elapsed * 0.55) * 0.06;
    researchStarSystem.quantumGalaxy.rotation.y = 0.32 + elapsed * 0.035;
    researchStarSystem.quantumGalaxy.rotation.z = 0.08 + Math.sin(elapsed * 0.12) * 0.08;
    researchStarSystem.quantumField.rotation.y += 0.0016;
    researchStarSystem.quantumVeil.material.rotation = elapsed * 0.025;
    researchStarSystem.quantumNodes.forEach((node, index) => {
      const focused = index === quantumNodeFocusIndex;
      const pulse = 1 + Math.sin(elapsed * 1.1 + node.phase) * 0.08 + (focused ? 0.38 : 0);
      node.anchor.scale.setScalar(pulse);
      node.nodeGlow.scale.setScalar(0.46 + Math.sin(elapsed * 0.9 + index) * 0.06 + (focused ? 0.34 : 0));
      node.notebookNodes?.forEach((notebook, notebookIndex) => {
        notebook.anchor.rotation.y += 0.004 + notebookIndex * 0.0008;
        const notebookScale = focused ? 1 + Math.sin(elapsed * 1.2 + notebook.phase) * 0.08 : 0.22;
        notebook.anchor.scale.lerp(new THREE.Vector3(notebookScale, notebookScale, notebookScale), 0.08);
        notebook.glow.scale.setScalar(0.24 + Math.sin(elapsed * 1.4 + notebookIndex) * 0.04 + (focused ? 0.12 : 0));
      });
    });
    researchStarSystem.stars.forEach((star, index) => {
      const selected = (isOpen || isExploring) && index === focusedEntry;
      const pulse = 1 + Math.sin(elapsed * 1.35 + star.phase) * 0.08 + (selected ? 0.26 : 0);
      star.anchor.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.08);
      star.glint.rotation.z += 0.0015 + index * 0.00035;
      const glowScale = 0.36 + Math.sin(elapsed * 1.1 + star.phase) * 0.04 + (selected ? 0.18 : 0);
      star.glow.scale.set(glowScale, glowScale, 1);
    });
    fadeObject(researchStarSystem.group, targetOpacity, 0.06);
    fadeObject(researchStarSystem.blackHole, isQuantumFocus ? 1 : 0, 0.08);
    fadeObject(researchStarSystem.quantumGalaxy, quantumMode ? 1 : 0, 0.075);
  }

  satelliteSystems.forEach((system, index) => {
    const influence = sectionInfluences[system.sourceSectionIndex] ?? 0;
    const targetOpacity = Math.max(influence, routeDepth * 0.14) * system.maxOpacity;
    system.pivot.rotation.y = elapsed * system.speed + system.phase + scrollProgress * 0.18;
    system.holder.rotation.y = elapsed * 0.55 + index;
    system.holder.rotation.x = Math.sin(elapsed * 0.4 + index) * 0.2;
    fadeObject(system.pivot, targetOpacity, 0.05);
  });

  if (isSpaceTour) {
    hoveredCluster = null;
  } else {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clusterTargets);
    hoveredCluster = intersects[0]?.object.userData.index ?? null;
  }
  document.body.classList.toggle('is-hovering-cluster', hoveredCluster !== null);

  updateLabels();
  updateQuantumLabels();
  composer.render();
  requestAnimationFrame(animate);
}

setActiveCluster(0, true);
animate();

window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('wheel', handleWheel, { passive: false });
sunModeToggle?.addEventListener('click', startSunPrank);
quantumReturnEl?.addEventListener('click', () => exitQuantumMode(true));
sectionActionEl?.addEventListener('click', () => {
  const activeDetail = sections[activeClusterIndex]?.detail;
  if (activeDetail?.action === 'spaceTour') {
    startSpaceTour();
    return;
  }
  openDetailArchive(activeClusterIndex);
});
spaceTourExitEl?.addEventListener('click', endSpaceTour);
researchCloseEl?.addEventListener('click', closeDetailArchive);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (spaceTour) {
      endSpaceTour();
      return;
    }
    if (quantumMode) {
      exitQuantumMode(true);
      return;
    }
    closeDetailArchive();
  }
});
soundToggle?.addEventListener('click', () => {
  toggleSound().catch(() => {
    soundEnabled = false;
    soundToggle.classList.remove('is-on');
    soundToggle.setAttribute('aria-pressed', 'false');
    soundToggle.textContent = siteData.audio?.label ?? 'Sound';
  });
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
