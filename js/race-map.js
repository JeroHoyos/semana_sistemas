/* =============================================
   RACE MAP
   The route of the athletics race as a 3D model of Campus Robledo, on the page of the activities
   with `routeMap: true` in js/data.js. Drag to turn it, pinch or scroll to zoom.
   Coordinates are pixels of the official campus plan (north up), traced by hand: the shapes are
   approximate. three.js is only downloaded on that page.
   ============================================= */

const S = 0.25;                          // plan pixels → 3D units
const GROUND = [40, 330, 1240, 1300];    // left, top, right and bottom of the piece of campus shown
const MAP_CENTER = [660, 790];           // the camera looks here

// Starts by M10, crosses M3 through its gate, goes west past M4 and M7, down between M8 and M9
// and back east along Carrera 80 (counterclockwise)
const ROUTE = [
  [920, 945], [918, 860], [905, 770], [897, 705], [880, 668], [815, 640], [750, 612], [650, 598],
  [550, 590], [470, 596], [432, 640], [415, 720], [392, 800], [370, 880], [380, 945], [430, 978],
  [540, 986], [690, 986], [830, 972],
];

const AVENUE = [   // Carrera 80
  [960, 380], [1010, 460], [1090, 560], [1150, 660], [1170, 770], [1140, 880], [1060, 960], [920, 1010],
  [740, 1035], [520, 1050], [400, 1080], [310, 1160], [270, 1300],
];

// [center x, center y, width, depth (plan pixels), height (units), label, turn in degrees]
const BUILDINGS = [
  [520, 1180, 150, 100, 14, 'M1'],
  [285, 1030, 80, 70, 14, 'M2'],
  [760, 725, 230, 70, 16, 'M3'],
  [1015, 720, 170, 70, 16],
  [700, 660, 100, 36, 10, 'M4'],
  [560, 400, 140, 70, 10, 'M6'],
  [560, 515, 110, 80, 26, 'M7'],
  [300, 620, 90, 70, 18, 'M8a', 25],
  [240, 700, 100, 60, 14, 'M8 · Computación', 25],
  [245, 780, 90, 80, 14, 'M8b'],
  [520, 860, 120, 50, 12, 'M9'],
  [740, 895, 60, 80, 6, 'M9a'],
];
const ROUND_BUILDINGS = [[870, 575, 70, 18, 'M5'], [990, 935, 38, 7, 'M10']];   // [x, y, radius, height, label]
const COURTS = [[835, 865, 120, 90, 0xb5654a], [1020, 860, 140, 100, 0xd9d6cc]];   // tennis, basketball

const IGUANAS = [[600, 950, 30], [480, 700, 120], [760, 560, 200], [1000, 620, 300], [310, 890, 60]];   // [x, y, facing]
const CRANE = [650, 470];
const TURBINE = [130, 560];
const RAILS = [[300, 470], [450, 470]];   // the mine cart goes back and forth on them
const LEVELS = [[0.12, 'NIVEL 1'], [0.45, 'NIVEL 2'], [0.78, 'NIVEL 3']];

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

// Plan pixels → 3D point (y is height, in units)
function toWorld([x, y], height = 0) {
  return new THREE.Vector3((x - MAP_CENTER[0]) * S, height, (y - MAP_CENTER[1]) * S);
}

const materials = {};
function material(color) {
  materials[color] ??= new THREE.MeshLambertMaterial({ color });
  return materials[color];
}

function mesh(geometry, color, position) {
  const item = new THREE.Mesh(geometry, Array.isArray(color) ? color.map(material) : material(color));
  item.castShadow = true;
  item.receiveShadow = true;
  if (position) item.position.copy(position);
  return item;
}

// A flat band of the given width (units) along the points (roads)
function ribbon(points, width, color, height, closed) {
  const vertices = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const prev = points[closed ? (i - 1 + count) % count : Math.max(i - 1, 0)];
    const next = points[closed ? (i + 1) % count : Math.min(i + 1, count - 1)];
    const length = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
    const nx = (-(next.z - prev.z) / length) * width / 2;
    const nz = ((next.x - prev.x) / length) * width / 2;
    vertices.push(points[i].x + nx, height, points[i].z + nz, points[i].x - nx, height, points[i].z - nz);
  }
  const index = [];
  for (let i = 0; i < (closed ? count : count - 1); i++) {
    const a = i * 2;
    const b = ((i + 1) % count) * 2;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const band = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  band.receiveShadow = true;
  return band;
}

// A text tag that always faces the camera
function label(text, color, size = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.font = 'bold 60px Barlow, Arial, sans-serif';
  const width = context.measureText(text).width + 64;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect((1024 - width) / 2, 14, width, 100, 50);
  context.fill();
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 512, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(80 * size, 10 * size, 1);
  sprite.renderOrder = 1;
  return sprite;
}

// Same random numbers on every visit, so the trees never move
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plan points along a polyline, every few pixels (to keep trees off the roads)
function samples(points, closed) {
  const list = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    for (let k = 0; k < 1; k += 0.1) list.push([x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]);
  }
  return list;
}

function isFree(x, y) {
  const near = (list, distance) => list.some(([px, py]) => Math.hypot(px - x, py - y) < distance);
  if (near(samples(ROUTE, true), 36) || near(samples(AVENUE), 50) || near(samples(RAILS), 20)) return false;
  if (near([...IGUANAS, CRANE, TURBINE], 22)) return false;
  if (ROUND_BUILDINGS.some(([bx, by, r]) => Math.hypot(bx - x, by - y) < r + 14)) return false;
  return ![...BUILDINGS, ...COURTS].some(([bx, by, w, d]) => Math.abs(bx - x) < w / 2 + 16 && Math.abs(by - y) < d / 2 + 16);
}

function tree(random) {
  const group = new THREE.Group();
  const height = 4 + random() * 4;
  group.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, height, 6), 0x7a5a3c, new THREE.Vector3(0, height / 2, 0)));
  const greens = [0x5b8f3a, 0x6fa646, 0x4f7f33, 0x86b04f];
  const crown = random() < 0.25
    ? new THREE.ConeGeometry(3.2, 9, 7)                     // palm-ish pine
    : new THREE.IcosahedronGeometry(3 + random() * 2.2, 0); // round, low-poly
  const flowering = random() < 0.12;                         // guayacanes: yellow and pink
  const color = flowering ? [0xf2c230, 0xe58fb8][Math.floor(random() * 2)] : greens[Math.floor(random() * greens.length)];
  group.add(mesh(crown, color, new THREE.Vector3(0, height + 2.5, 0)));
  return group;
}

function iguana() {
  const group = new THREE.Group();
  const green = 0x6aa84f;
  group.add(mesh(new THREE.BoxGeometry(6, 1.8, 2.4), green, new THREE.Vector3(0, 1.4, 0)));
  const head = new THREE.Group();
  head.position.set(3.4, 1.8, 0);
  head.add(mesh(new THREE.BoxGeometry(2.6, 1.6, 1.8), green, new THREE.Vector3(1, 0, 0)));
  head.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 2), 0x111111, new THREE.Vector3(1.4, 0.4, 0)));   // eyes
  head.add(mesh(new THREE.BoxGeometry(1, 1.2, 0.3), 0xe0913a, new THREE.Vector3(0.8, -1, 0)));     // dewlap
  group.add(head);
  const tail = mesh(new THREE.ConeGeometry(0.9, 9, 6), 0x5a9442, new THREE.Vector3(-7.4, 1.1, 0));
  tail.rotation.z = Math.PI / 2;
  group.add(tail);
  for (const [x, z] of [[2, 1.4], [2, -1.4], [-2, 1.4], [-2, -1.4]]) {
    group.add(mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), green, new THREE.Vector3(x, 0.5, z)));
  }
  for (let i = 0; i < 5; i++) {   // spikes along the back
    group.add(mesh(new THREE.ConeGeometry(0.3, 0.9, 4), 0x3f6e2c, new THREE.Vector3(2 - i, 2.7, 0)));
  }
  group.userData.head = head;
  group.scale.setScalar(1.8);   // bigger than life, so they show from afar
  return group;
}

function crane() {
  const group = new THREE.Group();
  const yellow = 0xf2b705;
  group.add(mesh(new THREE.BoxGeometry(2, 46, 2), yellow, new THREE.Vector3(0, 23, 0)));
  const top = new THREE.Group();
  top.position.y = 46;
  top.add(mesh(new THREE.BoxGeometry(44, 1.6, 1.6), yellow, new THREE.Vector3(12, 0, 0)));
  top.add(mesh(new THREE.BoxGeometry(5, 3, 3), 0x555b61, new THREE.Vector3(-8, -1, 0)));   // counterweight
  top.add(mesh(new THREE.BoxGeometry(2.6, 3, 2.6), 0x0a2c52, new THREE.Vector3(0, 2, 0)));   // cabin
  top.add(mesh(new THREE.BoxGeometry(0.2, 18, 0.2), 0x333333, new THREE.Vector3(26, -9, 0)));  // cable
  top.add(mesh(new THREE.BoxGeometry(4, 2, 4), 0xd2691e, new THREE.Vector3(26, -19, 0)));       // load: beams
  group.add(top);
  group.userData.spin = top;
  return group;
}

function windTurbine() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.8, 1.5, 44, 10), 0xf4f6f8, new THREE.Vector3(0, 22, 0)));
  group.add(mesh(new THREE.BoxGeometry(5, 2.4, 2.4), 0xf4f6f8, new THREE.Vector3(0.5, 44, 0)));
  const rotor = new THREE.Group();
  rotor.position.set(3.4, 44, 0);
  for (let i = 0; i < 3; i++) {
    const blade = mesh(new THREE.BoxGeometry(0.4, 18, 1.4), 0xffffff, new THREE.Vector3(0, 9, 0));
    const arm = new THREE.Group();
    arm.rotation.x = (i * Math.PI * 2) / 3;
    arm.add(blade);
    rotor.add(arm);
  }
  group.add(rotor);
  group.userData.spin = rotor;
  return group;
}

function satelliteDish() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 6), 0x9aa1a8, new THREE.Vector3(0, 2, 0)));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2),
    new THREE.MeshLambertMaterial({ color: 0xf4f6f8, side: THREE.DoubleSide }));
  dish.castShadow = true;
  dish.position.y = 6;
  dish.rotation.z = -0.9;
  const turn = new THREE.Group();
  turn.add(dish);
  group.add(turn);
  group.userData.spin = turn;
  return group;
}

function mineCart() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(5, 3, 3.4), 0x8b5a2b, new THREE.Vector3(0, 2.4, 0)));
  for (let i = 0; i < 4; i++) {   // ore
    group.add(mesh(new THREE.DodecahedronGeometry(0.9, 0), [0x6b6f75, 0xc9a227][i % 2], new THREE.Vector3(-1.5 + i, 4.2, (i % 2) - 0.5)));
  }
  for (const [x, z] of [[1.6, 1.8], [-1.6, 1.8], [1.6, -1.8], [-1.6, -1.8]]) {
    const wheel = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 10), 0x333333, new THREE.Vector3(x, 0.8, z));
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
  }
  return group;
}

function runner(color) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(2.4, 3, 1.6), color, new THREE.Vector3(0, 3.6, 0)));        // shirt
  group.add(mesh(new THREE.BoxGeometry(2, 2, 2), 0xf1c27d, new THREE.Vector3(0, 6.1, 0)));        // head
  group.add(mesh(new THREE.BoxGeometry(2.2, 0.6, 2.2), 0x0a2c52, new THREE.Vector3(0, 7.2, 0)));  // cap
  const legs = [-0.6, 0.6].map((z) => {
    const leg = mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), 0x0a2c52, new THREE.Vector3(0, 1.1, z));
    group.add(leg);
    return leg;
  });
  group.userData.legs = legs;
  return group;
}

function buildRaceMap(box) {
  const color = activity.color || '#f08a24';
  const random = seededRandom(80);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdcecf8, 420, 900);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8f6a, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.55);
  sun.position.set(-110, 180, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, far: 600 });
  scene.add(sun);

  // The ground: a piece of campus like a model on a table, soil on the sides
  const [left, top, right, bottom] = GROUND;
  const width = (right - left) * S;
  const depth = (bottom - top) * S;
  const base = mesh(new THREE.BoxGeometry(width, 10, depth), [0x8a6a4a, 0x8a6a4a, 0x9fcb83, 0x6f5238, 0x8a6a4a, 0x8a6a4a]);
  base.position.copy(toWorld([(left + right) / 2, (top + bottom) / 2], -5));
  scene.add(base);

  const avenue = new THREE.CatmullRomCurve3(AVENUE.map((p) => toWorld(p))).getSpacedPoints(160);
  scene.add(ribbon(avenue, 17.5, 0x8f969d, 0.15, false));
  scene.add(ribbon(avenue, 0.6, 0xf4f4f2, 0.2, false));   // center line

  const route = new THREE.CatmullRomCurve3(ROUTE.map((p) => toWorld(p, 1)), true);
  scene.add(ribbon(route.getSpacedPoints(300).slice(0, -1), 11, 0xe3d8c3, 0.3, true));
  scene.add(mesh(new THREE.TubeGeometry(route, 400, 1.3, 8, true), color));

  // Arrows along the way, pointing where the runners go
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const arrow = mesh(new THREE.ConeGeometry(2.2, 5, 4), 0x0a2c52);
    arrow.position.copy(route.getPointAt(t)).setY(4);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), route.getTangentAt(t));
    scene.add(arrow);
  }

  // Blocks: cream walls, clay tile roofs
  const walls = 0xece3d3;
  const roof = 0x9c4f3a;
  for (const [x, y, w, d, height, name, turn = 0] of BUILDINGS) {
    const building = mesh(new THREE.BoxGeometry(w * S, height, d * S), [walls, walls, roof, walls, walls, walls], toWorld([x, y], height / 2));
    building.rotation.y = (-turn * Math.PI) / 180;
    scene.add(building);
    if (name) {
      const tag = label(name, name.startsWith('M8 ') ? '#1f6fc5' : '#0a2c52', 0.8);
      tag.position.copy(toWorld([x, y], height + 7));
      scene.add(tag);
    }
  }
  for (const [x, y, r, height, name] of ROUND_BUILDINGS) {
    scene.add(mesh(new THREE.CylinderGeometry(r * S, r * S, height, 32), [walls, roof, walls], toWorld([x, y], height / 2)));
    const tag = label(name, '#0a2c52', 0.8);
    tag.position.copy(toWorld([x, y], height + 7));
    scene.add(tag);
  }
  for (const [x, y, w, d, courtColor] of COURTS) {
    scene.add(mesh(new THREE.BoxGeometry(w * S, 0.5, d * S), courtColor, toWorld([x, y], 0.25)));
  }

  // Trees: the campus is an arboretum
  for (let placed = 0, tries = 0; placed < 150 && tries < 3000; tries++) {
    const x = left + 14 + random() * (right - left - 28);
    const y = top + 14 + random() * (bottom - top - 28);
    if (!isFree(x, y)) continue;
    const item = tree(random);
    item.position.copy(toWorld([x, y]));
    scene.add(item);
    placed++;
  }

  // Engineering bits
  const craneItem = crane();
  craneItem.position.copy(toWorld(CRANE));
  scene.add(craneItem);
  const turbine = windTurbine();
  turbine.position.copy(toWorld(TURBINE));
  turbine.rotation.y = 0.6;
  scene.add(turbine);
  const dish = satelliteDish();
  dish.position.copy(toWorld([240, 700], 14));
  scene.add(dish);

  const [railStart, railEnd] = RAILS.map((p) => toWorld(p, 0.3));
  for (const z of [-1.8, 1.8]) {
    scene.add(mesh(new THREE.BoxGeometry(railEnd.x - railStart.x, 0.4, 0.4), 0x6b6f75, new THREE.Vector3((railStart.x + railEnd.x) / 2, 0.4, railStart.z + z)));
  }
  for (let x = railStart.x; x <= railEnd.x; x += 3) {
    scene.add(mesh(new THREE.BoxGeometry(0.8, 0.3, 5), 0x7a5a3c, new THREE.Vector3(x, 0.2, railStart.z)));
  }
  const cart = mineCart();
  scene.add(cart);

  const iguanas = IGUANAS.map(([x, y, facing]) => {
    const item = iguana();
    item.position.copy(toWorld([x, y]));
    item.rotation.y = (facing * Math.PI) / 180;
    scene.add(item);
    return item;
  });

  // 8-bit touches: coins over the route and a sign for each level
  const coins = [];
  for (let i = 0; i < 16; i++) {
    const coin = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 12), 0xffd23f);
    coin.rotation.x = Math.PI / 2;
    coin.position.copy(route.getPointAt((i + 0.5) / 16)).setY(8);
    scene.add(coin);
    coins.push(coin);
  }
  for (const [t, text] of LEVELS) {
    const tag = label(text, '#6a3fb5', 0.7);
    tag.position.copy(route.getPointAt(t)).setY(15);
    scene.add(tag);
  }

  // Start and finish arch, across the road, with traffic cones
  const start = toWorld(ROUTE[0]);
  for (const side of [-8, 8]) {
    scene.add(mesh(new THREE.BoxGeometry(1.4, 14, 1.4), color, new THREE.Vector3(start.x + side, 7, start.z)));
    scene.add(mesh(new THREE.ConeGeometry(0.9, 2.4, 8), 0xff6a00, new THREE.Vector3(start.x + side * 1.5, 1.2, start.z + 3)));
  }
  const checkered = document.createElement('canvas');
  checkered.width = 64;
  checkered.height = 16;
  const context = checkered.getContext('2d');
  for (let i = 0; i < 16; i++) {
    context.fillStyle = (i + Math.floor(i / 8)) % 2 ? '#111' : '#fff';
    context.fillRect((i % 8) * 8, Math.floor(i / 8) * 8, 8, 8);
  }
  const flagTexture = new THREE.CanvasTexture(checkered);
  flagTexture.magFilter = THREE.NearestFilter;
  const banner = new THREE.Mesh(new THREE.BoxGeometry(17.4, 3, 0.6), new THREE.MeshLambertMaterial({ map: flagTexture }));
  banner.position.set(start.x, 14, start.z);
  banner.castShadow = true;
  scene.add(banner);
  const startTag = label('Salida y meta · Hall M10', color);
  startTag.position.set(start.x, 25, start.z);
  scene.add(startTag);

  const runnerItem = runner(color);
  scene.add(runnerItem);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  box.append(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 2000);
  camera.position.set(-60, 210, 230);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 90;
  controls.maxDistance = 480;
  controls.maxPolarAngle = 1.3;   // never under the table

  new ResizeObserver(() => {
    renderer.setSize(box.clientWidth, box.clientHeight);
    camera.aspect = box.clientWidth / box.clientHeight;
    camera.updateProjectionMatrix();
  }).observe(box);

  const ahead = new THREE.Vector3();
  renderer.setAnimationLoop((now) => {
    const time = still ? 0 : now / 1000;
    const t = (time / 30) % 1;   // one lap every 30 s
    runnerItem.position.copy(route.getPointAt(t)).setY(Math.abs(Math.sin(time * 10)) * 0.6);
    runnerItem.lookAt(ahead.copy(route.getPointAt((t + 0.01) % 1)).setY(runnerItem.position.y));
    runnerItem.rotateY(-Math.PI / 2);
    runnerItem.userData.legs.forEach((leg, i) => { leg.rotation.z = Math.sin(time * 10 + i * Math.PI) * 0.6; });

    craneItem.userData.spin.rotation.y = time * 0.15;
    turbine.userData.spin.rotation.x = time * 1.5;
    dish.userData.spin.rotation.y = time * 0.4;
    cart.position.lerpVectors(railStart, railEnd, (Math.sin(time * 0.5) + 1) / 2);
    iguanas.forEach((item, i) => { item.userData.head.rotation.z = Math.max(0, Math.sin(time * 2 + i * 1.7)) * 0.35; });   // the head bob
    coins.forEach((coin) => { coin.rotation.z = time * 2; });

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
