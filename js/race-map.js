/* =============================================
   RACE MAP
   The route of the athletics race as a 3D model of Campus Robledo, dressed as a monster
   university: varsity tags, pennants and monsters cheering. It shows on the page of the activities
   with `routeMap: true` in js/data.js. Drag to turn it, pinch or scroll to zoom.
   Coordinates are pixels of the official campus plan (north up), traced by hand: the shapes are
   approximate. three.js is only downloaded on that page.
   ============================================= */

const S = 0.25;                          // plan pixels → 3D units
const GROUND = [40, 330, 1240, 1300];    // left, top, right and bottom of the piece of campus shown
const MAP_CENTER = [690, 790];           // the camera looks here

// Starts at M10, goes up between the courts, through the M3 gate, west past M5 and M4 to the M7
// parking, down west of M9 to Carrera 80 and back east along it
const ROUTE = [
  [932, 935], [947, 858], [939, 797], [913, 758], [910, 695], [895, 645], [818, 641], [769, 619],
  [715, 605], [654, 603], [572, 608], [489, 619], [418, 634], [405, 674], [418, 746], [402, 827],
  [390, 908], [397, 975], [428, 998], [561, 995], [715, 990], [869, 985], [935, 968],
];

const ROADS = [   // [points, width in units]
  [[[960, 380], [1010, 460], [1090, 560], [1150, 660], [1175, 770], [1155, 880], [1080, 975], [920, 1022],
    [740, 1040], [560, 1045], [460, 1065], [380, 1100], [310, 1160], [270, 1300]], 17.5],   // Carrera 80
  [[[700, 1040], [665, 1150], [630, 1300]], 10],                                           // Carrera 78a
];

const TILE = 0x9c4f3a;
const CREAM = 0xece3d3;
const WHITE = 0xe6e4df;
const GRAY = 0xa3a8ad;
const SLATE = 0x4a4f55;

// at: center on the plan · size: width and depth (plan pixels) · height (units) · turn: degrees, counterclockwise
const BUILDINGS = [
  { at: [510, 1175], size: [160, 130], height: 14, label: 'M1', roof: TILE, walls: CREAM },
  { at: [325, 1015], size: [100, 60], height: 14, label: 'M2', turn: 35, roof: TILE, walls: CREAM },
  { at: [764, 707], size: [241, 107], height: 16, roof: TILE, walls: CREAM },     // M3, west wing
  { at: [1025, 697], size: [180, 97], height: 16, roof: TILE, walls: CREAM },     // M3, east wing
  { at: [712, 645], size: [92, 40], height: 9, label: 'M4', turn: -12, roof: TILE, walls: CREAM },
  { at: [556, 390], size: [175, 95], height: 8, label: 'M6', turn: -8, roof: TILE, walls: CREAM },
  { at: [561, 527], size: [123, 102], height: 30, label: 'M7', roof: GRAY, walls: WHITE },
  { at: [279, 608], size: [120, 45], height: 18, label: 'M8a', turn: 40, roof: GRAY, walls: WHITE },
  { at: [279, 695], size: [150, 60], height: 14, label: 'M8 · Computación', turn: 20, roof: TILE, walls: CREAM },
  { at: [248, 761], size: [140, 55], height: 14, label: 'M8b', turn: -35, roof: GRAY, walls: WHITE },
  { at: [520, 852], size: [133, 50], height: 11, label: 'M9', turn: 12, roof: SLATE, walls: WHITE },
  { at: [746, 903], size: [50, 80], height: 5, label: 'M9a', roof: 0x6d8f4e, walls: CREAM },
];
const ROUND_BUILDINGS = [   // [x, y, radius, height, label]
  [869, 565, 64, 18, 'M5'],
  [975, 925, 34, 7, 'M10'],
];
const GATE = [910, 702];    // the M3 portal, between both wings
const FLATS = [             // [x, y, width, depth, color]: courts and parking lots
  [851, 866, 138, 87, 0xb5654a],
  [1028, 852, 123, 102, 0xd9d6cc],
  [549, 937, 165, 80, 0xcfcac0],
];

const IGUANAS = [[600, 700, 30], [470, 740, 120], [820, 785, 200], [1010, 612, 300], [300, 905, 60]];   // [x, y, facing]
const MONSTERS = [[450, 680], [455, 790], [690, 950], [895, 948], [645, 575], [360, 760], [350, 880], [985, 775]];
const MONSTER_COLORS = [0x8e5bd6, 0x1f6fc5, 0xf08a24, 0xe24f6b, 0x22b5a6];
const CRANE = [700, 470];
const TURBINE = [130, 560];
const RAILS = [[300, 470], [450, 470]];   // the mine cart goes back and forth on them
const LEVELS = [[0.14, 'NIVEL 1'], [0.45, 'NIVEL 2'], [0.76, 'NIVEL 3']];

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
  if (color instanceof THREE.Material) return color;
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

function hexColor(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// A wall with rows of windows, repeated to fit its size
function wallMaterial(color, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  context.fillStyle = hexColor(color);
  context.fillRect(0, 0, 32, 32);
  context.fillStyle = '#3d4b5c';
  context.fillRect(9, 10, 14, 13);
  context.fillStyle = 'rgba(255, 255, 255, .25)';
  context.fillRect(9, 10, 14, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(height / 4)));
  return new THREE.MeshLambertMaterial({ map: texture });
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

// Varsity tag that always faces the camera: college letters, white and blue double border
function label(text, background = '#0a2c52', size = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.font = '54px Graduate, serif';
  const width = context.measureText(text).width + 80;
  const x = (1024 - width) / 2;
  context.fillStyle = background;
  context.strokeStyle = '#fff';
  context.lineWidth = 8;
  context.beginPath();
  context.roundRect(x, 12, width, 104, 52);
  context.fill();
  context.stroke();
  context.strokeStyle = '#58a6ff';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x + 10, 22, width - 20, 84, 42);
  context.stroke();
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text.toUpperCase(), 512, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(80 * size, 10 * size, 1);
  sprite.renderOrder = 1;
  return sprite;
}

// "Semana de Sistemas" banner, like the letters on the home page
function banner() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0a2c52';
  context.fillRect(0, 0, 1024, 160);
  context.strokeStyle = '#fff';
  context.lineWidth = 10;
  context.strokeRect(14, 14, 996, 132);
  context.font = '78px "Alfa Slab One", Graduate, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 14;
  context.strokeStyle = '#fff';
  context.strokeText('SEMANA DE SISTEMAS', 512, 84);
  context.fillStyle = '#1f6fc5';
  context.fillText('SEMANA DE SISTEMAS', 512, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(56, 8.8), new THREE.MeshLambertMaterial({ map: texture }));
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

const ROUTE_SAMPLES = samples(ROUTE, true);
const ROAD_SAMPLES = ROADS.flatMap(([points]) => samples(points));

function isFree(x, y) {
  const near = (list, distance) => list.some(([px, py]) => Math.hypot(px - x, py - y) < distance);
  if (near(ROUTE_SAMPLES, 30) || near(ROAD_SAMPLES, 50) || near(samples(RAILS), 20)) return false;
  if (near(IGUANAS, 45) || near([...MONSTERS, CRANE, TURBINE, GATE], 24)) return false;
  if (ROUND_BUILDINGS.some(([bx, by, r]) => Math.hypot(bx - x, by - y) < r + 14)) return false;
  const boxes = [...BUILDINGS.map(({ at, size }) => [...at, ...size]), ...FLATS];
  return !boxes.some(([bx, by, w, d]) => Math.hypot(bx - x, by - y) < Math.hypot(w, d) / 2 + 10);
}

function tree(random) {
  const group = new THREE.Group();
  const height = 4 + random() * 4;
  group.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, height, 6), 0x7a5a3c, new THREE.Vector3(0, height / 2, 0)));
  const greens = [0x5b8f3a, 0x6fa646, 0x4f7f33, 0x86b04f];
  const crown = random() < 0.25
    ? new THREE.ConeGeometry(3.2, 9, 7)                     // cypress
    : new THREE.IcosahedronGeometry(3 + random() * 2.2, 0); // round, low-poly
  const flowering = random() < 0.15;                         // guayacanes: yellow, pink and purple
  const color = flowering ? [0xf2c230, 0xe58fb8, 0x8e5bd6][Math.floor(random() * 3)] : greens[Math.floor(random() * greens.length)];
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
  group.scale.setScalar(1.3);   // bigger than life, so they show from afar
  return group;
}

// A furry fan of the house: round body, two or three eyes, horns and both arms up. Faces +z.
function monster(color, eyes) {
  const group = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(2.4, 14, 10), color, new THREE.Vector3(0, 3, 0));
  body.scale.y = 1.2;
  group.add(body);
  for (let i = 0; i < eyes; i++) {
    const x = (i - (eyes - 1) / 2) * 1.3;
    group.add(mesh(new THREE.SphereGeometry(0.62, 10, 8), 0xffffff, new THREE.Vector3(x, 4, 2.05)));
    group.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), 0x111111, new THREE.Vector3(x, 4, 2.6)));
  }
  group.add(mesh(new THREE.BoxGeometry(1.6, 0.35, 0.3), 0x3a1020, new THREE.Vector3(0, 2.4, 2.3)));   // grin
  for (const side of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.4, 1.4, 6), 0xf3ead8, new THREE.Vector3(side * 1.2, 6, 0));
    horn.rotation.z = -side * 0.35;
    group.add(horn);
    group.add(mesh(new THREE.BoxGeometry(0.9, 0.6, 1.2), color, new THREE.Vector3(side * 1, 0.3, 0.4)));   // feet
  }
  group.userData.arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 2.2, 3.6, 0);
    arm.add(mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), color, new THREE.Vector3(0, 1.2, 0)));
    group.add(arm);
    return arm;
  });
  return group;
}

// String of triangular pennants between two poles, across the route
function pennants(from, to, color) {
  const group = new THREE.Group();
  for (const end of [from, to]) group.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 13, 6), 0xf4f6f8, end.clone().setY(6.5)));
  const colors = [0x1f6fc5, 0xffffff, color, 0x0a2c52];
  for (let i = 1; i < 10; i++) {
    const point = from.clone().lerp(to, i / 10);
    const flag = mesh(new THREE.ConeGeometry(0.9, 2.4, 3), colors[i % colors.length], point.setY(11.6 - Math.sin((i / 10) * Math.PI)));
    flag.rotation.x = Math.PI;
    group.add(flag);
  }
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
    const arm = new THREE.Group();
    arm.rotation.x = (i * Math.PI * 2) / 3;
    arm.add(mesh(new THREE.BoxGeometry(0.4, 18, 1.4), 0xffffff, new THREE.Vector3(0, 9, 0)));
    rotor.add(arm);
  }
  group.add(rotor);
  group.userData.spin = rotor;
  return group;
}

function satelliteDish() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 6), 0x9aa1a8, new THREE.Vector3(0, 2, 0)));
  const dish = mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2),
    new THREE.MeshLambertMaterial({ color: 0xf4f6f8, side: THREE.DoubleSide }), new THREE.Vector3(0, 6, 0));
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
  group.userData.legs = [-0.6, 0.6].map((z) => {
    const leg = mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), 0x0a2c52, new THREE.Vector3(0, 1.1, z));
    group.add(leg);
    return leg;
  });
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
  const base = mesh(new THREE.BoxGeometry((right - left) * S, 10, (bottom - top) * S), [0x8a6a4a, 0x8a6a4a, 0x9fcb83, 0x6f5238, 0x8a6a4a, 0x8a6a4a]);
  base.position.copy(toWorld([(left + right) / 2, (top + bottom) / 2], -5));
  scene.add(base);

  for (const [points, width] of ROADS) {
    const road = new THREE.CatmullRomCurve3(points.map((p) => toWorld(p))).getSpacedPoints(160);
    scene.add(ribbon(road, width, 0x8f969d, 0.15, false));
    scene.add(ribbon(road, 0.5, 0xf4f4f2, 0.2, false));   // center line
  }
  for (const [x, y, w, d, flatColor] of FLATS) {
    scene.add(mesh(new THREE.BoxGeometry(w * S, 0.5, d * S), flatColor, toWorld([x, y], 0.25)));
  }

  const route = new THREE.CatmullRomCurve3(ROUTE.map((p) => toWorld(p, 1)), true);
  scene.add(ribbon(route.getSpacedPoints(300).slice(0, -1), 9, 0xe3d8c3, 0.35, true));
  scene.add(mesh(new THREE.TubeGeometry(route, 400, 1.2, 8, true), color));

  // Arrows along the way, pointing where the runners go
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const arrow = mesh(new THREE.ConeGeometry(2, 4.6, 4), 0x0a2c52);
    arrow.position.copy(route.getPointAt(t)).setY(4);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), route.getTangentAt(t));
    scene.add(arrow);
  }

  // Blocks, with windows on the walls
  for (const { at, size: [w, d], height, label: name, turn = 0, roof, walls } of BUILDINGS) {
    const front = wallMaterial(walls, w * S, height);
    const side = wallMaterial(walls, d * S, height);
    const building = mesh(new THREE.BoxGeometry(w * S, height, d * S), [side, side, roof, roof, front, front], toWorld(at, height / 2));
    building.rotation.y = (turn * Math.PI) / 180;
    scene.add(building);
    if (name) {
      const tag = label(name, name.startsWith('M8 ') ? '#1f6fc5' : '#0a2c52', 0.8);
      tag.position.copy(toWorld(at, height + 7));
      scene.add(tag);
    }
  }
  for (const [x, y, r, height, name] of ROUND_BUILDINGS) {
    scene.add(mesh(new THREE.CylinderGeometry(r * S, r * S, height, 32), [wallMaterial(CREAM, 2 * Math.PI * r * S, height), TILE, TILE], toWorld([x, y], height / 2)));
    const tag = label(name, '#0a2c52', 0.8);
    tag.position.copy(toWorld([x, y], height + 9));
    scene.add(tag);
  }
  scene.add(mesh(new THREE.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd6d3cc, toWorld(ROUND_BUILDINGS[0], 18)));   // M5 dome

  // M3: the portal over the route, its tag and the big banner facing the courts
  scene.add(mesh(new THREE.BoxGeometry(13, 6, 15), [CREAM, CREAM, TILE, CREAM, CREAM, CREAM], toWorld(GATE, 13)));
  const gateTag = label('M3', '#0a2c52', 0.8);
  gateTag.position.copy(toWorld(GATE, 24));
  scene.add(gateTag);
  const sign = banner();
  sign.position.copy(toWorld([770, 761], 9));
  scene.add(sign);

  // Trees: the campus is an arboretum
  for (let placed = 0, tries = 0; placed < 160 && tries < 4000; tries++) {
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
  dish.position.copy(toWorld([279, 695], 14));
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

  // Monster fans, each looking at the nearest bit of the route
  const routePoints = route.getSpacedPoints(200);
  const fans = MONSTERS.map((spot, i) => {
    const item = monster(MONSTER_COLORS[i % MONSTER_COLORS.length], 2 + (i % 2));
    item.position.copy(toWorld(spot));
    const nearest = routePoints.reduce((a, b) => (a.distanceTo(item.position) < b.distanceTo(item.position) ? a : b));
    item.lookAt(nearest.x, 0, nearest.z);
    scene.add(item);
    return item;
  });

  // 8-bit touches: coins over the route; pennants across it at each level
  const coins = [];
  for (let i = 0; i < 16; i++) {
    const coin = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 12), 0xffd23f);
    coin.rotation.x = Math.PI / 2;
    coin.position.copy(route.getPointAt((i + 0.5) / 16)).setY(8);
    scene.add(coin);
    coins.push(coin);
  }
  for (const [t, text] of LEVELS) {
    const point = route.getPointAt(t);
    const tangent = route.getTangentAt(t);
    const across = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(7);
    scene.add(pennants(point.clone().add(across), point.clone().sub(across), color));
    const tag = label(text, '#1f6fc5', 0.7);
    tag.position.copy(point).setY(18);
    scene.add(tag);
  }

  // Start and finish arch, with a checkered banner, pennants and traffic cones
  const start = toWorld(ROUTE[0]);
  const startTangent = route.getTangentAt(0);
  const startAcross = new THREE.Vector3(-startTangent.z, 0, startTangent.x).multiplyScalar(8);
  const arch = new THREE.Group();
  for (const side of [-1, 1]) {
    arch.add(mesh(new THREE.BoxGeometry(1.4, 14, 1.4), color, new THREE.Vector3(side * 8, 7, 0)));
    arch.add(mesh(new THREE.ConeGeometry(0.9, 2.4, 8), 0xff6a00, new THREE.Vector3(side * 11, 1.2, 3)));
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
  arch.add(mesh(new THREE.BoxGeometry(17.4, 3, 0.6), new THREE.MeshLambertMaterial({ map: flagTexture }), new THREE.Vector3(0, 14, 0)));
  arch.position.copy(start);
  arch.lookAt(start.clone().add(startTangent));
  scene.add(arch);
  scene.add(pennants(start.clone().add(startAcross).addScaledVector(startTangent, 6), start.clone().sub(startAcross).addScaledVector(startTangent, 6), color));
  const startTag = label('Salida y meta · Hall M10', color);
  startTag.position.set(start.x, 32, start.z);
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
  camera.position.set(-40, 200, 215);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 80;
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
    fans.forEach((item, i) => {
      item.position.y = Math.max(0, Math.sin(time * 5 + i)) * 1.2;   // jumping with joy
      item.userData.arms.forEach((arm, side) => { arm.rotation.z = (side ? -1 : 1) * (0.3 + Math.sin(time * 6 + i) * 0.3); });
    });
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
    await document.fonts.load('54px Graduate').catch(() => {});   // the tags are drawn with it
    await document.fonts.load('78px "Alfa Slab One"').catch(() => {});
    buildRaceMap(box);
  } catch {
    box.textContent = 'No se pudo cargar el mapa del recorrido.';
  }
}

startRaceMap();
