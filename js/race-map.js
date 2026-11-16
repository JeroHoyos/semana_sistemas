/* =============================================
   RACE MAP
   The route of the athletics race as a 3D campus map, on the page of the activities with
   `routeMap: true` in js/data.js. Drag to turn it, pinch or scroll to zoom.
   Coordinates are pixels of the campus plan (north up), traced by hand: the shapes are approximate.
   three.js is only downloaded on that page.
   ============================================= */

const MAP_SIZE = [423, 329];          // the plan, in pixels
const MAP_CENTER = [172, 160];        // middle of the route: the camera looks here

// Start and finish first; it goes north, west along the top, south and back east (counterclockwise)
const ROUTE = [
  [240, 205], [240, 180], [237, 155], [226, 135], [210, 121], [188, 112], [163, 105], [140, 100],
  [123, 104], [121, 122], [118, 142], [111, 162], [104, 182], [104, 200], [118, 211], [150, 215],
  [190, 215], [222, 212],
];

// Carrera 80, the big curve that wraps the campus
const AVENUE = [[305, 0], [303, 60], [300, 120], [292, 175], [272, 220], [235, 245], [180, 255], [120, 262], [80, 282], [55, 329]];

// [center x, center y, width, depth, height, label]
const BUILDINGS = [
  [148, 184, 44, 16, 14, 'M9'],
  [232, 110, 40, 18, 16, 'M8'],
  [180, 86, 36, 14, 14], [160, 45, 40, 16, 14], [100, 128, 22, 26, 12],
  [190, 150, 22, 14, 10], [214, 150, 18, 14, 10], [264, 150, 22, 14, 10],
  [215, 193, 20, 22, 4], [256, 193, 20, 22, 4],
  [78, 228, 30, 24, 12], [135, 268, 24, 18, 10],
  [335, 100, 30, 20, 12], [362, 142, 26, 20, 10], [338, 186, 24, 18, 10],
];
const POOL = [150, 205, 40, 12];

const THREE_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
];

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

// Plan pixels → 3D point (y is height)
function toWorld([x, y], height = 0) {
  return new THREE.Vector3(x - MAP_CENTER[0], height, y - MAP_CENTER[1]);
}

// A flat band of the given width along the points (roads)
function ribbon(points, width, color, height, closed) {
  const vertices = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const prev = points[closed ? (i - 1 + count) % count : Math.max(i - 1, 0)];
    const next = points[closed ? (i + 1) % count : Math.min(i + 1, count - 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.hypot(dx, dz) || 1;
    const nx = (-dz / length) * width / 2;
    const nz = (dx / length) * width / 2;
    vertices.push(points[i].x + nx, height, points[i].z + nz, points[i].x - nx, height, points[i].z - nz);
  }
  const index = [];
  const segments = closed ? count : count - 1;
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = ((i + 1) % count) * 2;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
}

// A text tag that always faces the camera
function label(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.font = 'bold 56px Barlow, Arial, sans-serif';
  const width = context.measureText(text).width + 64;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect((512 - width) / 2, 16, width, 96, 48);
  context.fill();
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 66);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(64, 16, 1);
  return sprite;
}

function buildRaceMap(box) {
  const color = activity.color || '#f08a24';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.45);
  sun.position.set(-120, 200, 80);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(...MAP_SIZE), new THREE.MeshLambertMaterial({ color: 0xa9cf8f }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(MAP_SIZE[0] / 2 - MAP_CENTER[0], 0, MAP_SIZE[1] / 2 - MAP_CENTER[1]);
  scene.add(ground);

  const avenue = new THREE.CatmullRomCurve3(AVENUE.map((p) => toWorld(p))).getSpacedPoints(120);
  scene.add(ribbon(avenue, 22, 0x9aa1a8, 0.2, false));

  const route = new THREE.CatmullRomCurve3(ROUTE.map((p) => toWorld(p, 1.2)), true);
  scene.add(ribbon(route.getSpacedPoints(240).slice(0, -1), 12, 0xd7d3cb, 0.3, true));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(route, 300, 1.6, 8, true), new THREE.MeshLambertMaterial({ color })));

  // Arrows along the way, pointing where the runners go
  const arrowMaterial = new THREE.MeshLambertMaterial({ color: 0x0a2c52 });
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6, 4), arrowMaterial);
    arrow.position.copy(route.getPointAt(t)).setY(5);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), route.getTangentAt(t));
    scene.add(arrow);
  }

  const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xb59d8c });
  for (const [x, y, width, depth, height, name] of BUILDINGS) {
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial);
    building.position.copy(toWorld([x, y], height / 2));
    scene.add(building);
    if (name) {
      const tag = label(name, '#0a2c52');
      tag.position.copy(toWorld([x, y], height + 10));
      scene.add(tag);
    }
  }
  const pool = new THREE.Mesh(new THREE.BoxGeometry(POOL[2], 0.8, POOL[3]), new THREE.MeshLambertMaterial({ color: 0x4aa3df }));
  pool.position.copy(toWorld(POOL, 0.4));
  scene.add(pool);

  // Start and finish arch, across the road
  const archMaterial = new THREE.MeshLambertMaterial({ color });
  for (const side of [-9, 9]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, 16, 1.6), archMaterial);
    post.position.copy(toWorld([ROUTE[0][0] + side, ROUTE[0][1]], 8));
    scene.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 1.6), new THREE.MeshLambertMaterial({ color: 0x0a2c52 }));
  bar.position.copy(toWorld(ROUTE[0], 16));
  scene.add(bar);
  const startTag = label('Salida y meta', color);
  startTag.position.copy(toWorld(ROUTE[0], 28));
  scene.add(startTag);

  // An 8-bit runner going around (still, at the start, with reduced motion)
  const runner = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffd23f }));
  scene.add(runner);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xeaf2fb);
  box.append(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, 1, 1, 2000);
  camera.position.set(-40, 230, 240);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 110;
  controls.maxDistance = 520;
  controls.maxPolarAngle = 1.35;   // never under the ground

  new ResizeObserver(() => {
    renderer.setSize(box.clientWidth, box.clientHeight);
    camera.aspect = box.clientWidth / box.clientHeight;
    camera.updateProjectionMatrix();
  }).observe(box);

  renderer.setAnimationLoop((time) => {
    const t = still ? 0 : (time / 24000) % 1;   // one lap every 24 s
    runner.position.copy(route.getPointAt(t)).setY(4);
    controls.update();
    renderer.render(scene, camera);
  });
}

async function startRaceMap() {
  const box = $('#race-map');
  if (!box) return;
  try {
    for (const url of THREE_URLS) await loadScript(url);
    buildRaceMap(box);
  } catch {
    box.textContent = 'No se pudo cargar el mapa del recorrido.';
  }
}

startRaceMap();
