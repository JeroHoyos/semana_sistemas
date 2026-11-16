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
// parking, over the footbridge, down west of the grove and M9 to Carrera 80 and back east along it
const ROUTE = [
  [932, 935], [947, 858], [939, 797], [913, 758], [910, 695], [895, 645], [818, 641], [769, 619],
  [715, 605], [654, 603], [572, 608], [489, 619], [440, 625], [400, 628], [378, 642],
  [388, 682], [422, 735], [432, 800], [412, 865], [392, 920], [397, 975], [428, 998], [561, 995], [715, 990], [869, 985], [935, 968],
];

const TILE = 0x8a4636;     // clay tile roofs
const STONE = 0xd6cfc2;    // the old blocks' walls
const WHITE = 0xe6e4df;
const CONCRETE = 0xbfc2c4; // flat roofs
const SLATE = 0x4a4f55;
const BRICK = 0x8a7466;    // the campus' own paved roads

const ROADS = [   // [points, width in units, color, has a center line]
  [[[960, 380], [1010, 460], [1090, 560], [1150, 660], [1175, 770], [1155, 880], [1080, 975], [920, 1022],
    [740, 1040], [560, 1045], [460, 1065], [380, 1100], [310, 1160], [270, 1300]], 17.5, 0xb9b3a6, true],   // Carrera 80
  [[[700, 1040], [665, 1150], [630, 1300]], 10, 0xb9b3a6, true],                                           // Carrera 78a
  [[[640, 768], [800, 774], [960, 770], [1100, 754], [1132, 712]], 7, BRICK],                              // south of M3
  [[[752, 590], [790, 630], [866, 650], [940, 630], [985, 585]], 8, BRICK],                                // M5 forecourt
  [[[570, 893], [580, 876], [619, 858], [661, 842], [703, 815], [736, 790], [746, 772]], 3.2, 0xd8d2c4],          // footpath from M9 up to M3: not part of the race
  [[[706, 598], [714, 560], [692, 512], [672, 470], [652, 434]], 2.6, 0x9b7a55],                                 // dirt trail from the route up to M6
];

// A block is a group of parts at a spot of the plan, turned some degrees (counterclockwise).
// Part: [x, y from that spot, width, depth (plan pixels), height (units), roof, roof color, walls, lifted (units)]
// Roofs: 'gable' (ridge along the longer side), 'low' (same, flatter) or 'flat'.
const BUILDINGS = [
  { label: 'M1', at: [507, 1170], parts: [                     // a C around a courtyard, with the dark auditorium
    [0, -52, 150, 36, 12, 'gable', TILE, STONE], [-58, 2, 36, 130, 12, 'gable', TILE, STONE],
    [-5, 55, 140, 36, 12, 'gable', TILE, STONE], [22, 2, 62, 50, 10, 'gable', 0x2f3136, STONE],
  ] },
  { label: 'M2', at: [325, 1015], turn: 38, parts: [[0, 0, 118, 42, 13, 'gable', TILE, STONE]] },
  { at: [764, 707], parts: [                                   // M3, west wing: a long bar and pavilions to the north
    [0, 28, 241, 50, 14, 'gable', TILE, STONE],
    [-83, -24, 67, 54, 14, 'gable', TILE, STONE], [13, -24, 33, 54, 14, 'gable', TILE, STONE], [93, -24, 46, 54, 14, 'gable', TILE, STONE],
  ] },
  { at: [1025, 697], parts: [                                  // M3, east wing
    [0, 24, 180, 48, 14, 'gable', TILE, STONE],
    [-67, -24, 44, 50, 14, 'gable', TILE, STONE], [15, -24, 44, 50, 14, 'gable', TILE, STONE], [70, -24, 40, 50, 14, 'gable', TILE, STONE],
  ] },
  { label: 'M3', at: [910, 724], parts: [[0, 0, 50, 46, 8, 'flat', CONCRETE, STONE, 9]] },   // the portal: the route goes under
  { label: 'M4', at: [712, 636], turn: -15, parts: [[0, 0, 92, 34, 7, 'gable', TILE, STONE]] },
  { label: 'M6', at: [556, 390], turn: -8, parts: [           // colonial house around a patio, and a wing to the west
    [45, -32, 90, 22, 6, 'gable', TILE, WHITE], [45, 32, 90, 22, 6, 'gable', TILE, WHITE],
    [79, 0, 22, 86, 6, 'gable', TILE, WHITE], [11, 0, 22, 86, 6, 'gable', TILE, WHITE], [-48, -26, 96, 24, 6, 'gable', TILE, WHITE],
  ] },
  { label: 'M7', at: [561, 527], parts: [                      // two towers, a glass middle set back, a roof slab on top
    [-39, 0, 46, 96, 28, 'flat', CONCRETE, WHITE], [39, 0, 46, 96, 28, 'flat', CONCRETE, WHITE],
    [0, -10, 34, 72, 26, 'flat', CONCRETE, 0x9db0c0], [0, -4, 130, 86, 1.2, 'flat', CONCRETE, CONCRETE, 28.6],
    [0, -12, 60, 40, 4, 'flat', CONCRETE, WHITE, 29.8],
  ] },
  { label: 'M8a', at: [279, 608], turn: 40, parts: [[0, 0, 125, 42, 17, 'flat', CONCRETE, WHITE]] },
  { label: 'M8', at: [270, 695], turn: 20, parts: [           // two tiled houses
    [-36, 6, 60, 36, 9, 'gable', TILE, STONE], [34, -6, 70, 50, 10, 'gable', TILE, STONE],
  ] },
  { label: 'M8b', at: [248, 761], turn: -43, parts: [         // two long bars side by side
    [0, -16, 140, 26, 13, 'flat', WHITE, WHITE], [-8, 16, 120, 26, 11, 'flat', WHITE, WHITE],
  ] },
  { label: 'M9', at: [520, 852], turn: 12, parts: [[0, 0, 133, 50, 10, 'low', SLATE, 0xb8c4cc]] },
  { label: 'M9a', at: [746, 903], turn: -8, parts: [[0, 0, 46, 80, 5, 'low', 0x6d8f4e, STONE]] },
];

// Curved blocks: [label, x, y, outer and inner radius (plan pixels), from and to (degrees on the plan, 90 is south), height]
const ARCS = [
  ['M5', 866, 550, 86, 50, -25, 195, 13],    // wraps its dome, open to the north
  ['M10', 961, 919, 38, 18, 0, 180, 6],      // half a ring
];
const GATE = [910, 724];

const FLATS = [             // [x, y, width, depth, color or 'tennis' / 'basketball']: courts and parking lots
  [851, 866, 138, 87, 'tennis'],
  [1028, 852, 123, 102, 'basketball'],
  [549, 937, 165, 80, 0xd8d2c4],
  [546, 598, 216, 50, BRICK],
  [315, 862, 144, 90, BRICK],
];
const CREEK = [[350, 520], [355, 545], [377, 590], [400, 629], [450, 657], [490, 708], [512, 758], [518, 787], [512, 828]];   // the stream: past M8a, under the footbridge, through the grove down to M9
const BRIDGE = [400, 628];   // where the route crosses it
const GROVES = [[430, 630, 590, 835], [320, 490, 475, 618]];   // left, top, right and bottom: south of the footbridge and north of it, trees stand closer

const IGUANAS = [[600, 700, 30], [565, 765, 160], [640, 905, 200], [1010, 612, 300], [280, 950, 60]];   // [x, y, facing]
const MONSTERS = [[345, 690], [472, 805], [690, 950], [895, 948], [645, 560], [360, 760], [352, 985], [985, 792]];
const MONSTER_COLORS = [0x8e5bd6, 0x1f6fc5, 0xf08a24, 0xe24f6b, 0x22b5a6];
const TURBINE = [130, 560];
const CAT = [396, 838];   // the brown campus cat, sitting by the route
const RAILS = [[300, 470], [450, 470]];   // the mine cart goes back and forth on them

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

// A wall with rows of windows, repeated across and up as many times as asked
function wallMaterial(color, across, up) {
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
  texture.repeat.set(across, up);
  return new THREE.MeshLambertMaterial({ map: texture });
}

// A block of walls with windows (units), its roof on top
function part(width, depth, height, roof, roofColor, walls) {
  const group = new THREE.Group();
  const floors = Math.max(1, Math.round(height / 3.5));
  const front = wallMaterial(walls, Math.max(1, Math.round(width / 3.5)), floors);
  const side = wallMaterial(walls, Math.max(1, Math.round(depth / 3.5)), floors);
  group.add(mesh(new THREE.BoxGeometry(width, height, depth), [side, side, roofColor, roofColor, front, front], new THREE.Vector3(0, height / 2, 0)));
  if (roof === 'flat') return group;

  // Gable: a triangle as wide as the short side, stretched along the long one, with a small overhang
  const along = width >= depth;
  const span = (along ? depth : width) + 1.4;
  const length = (along ? width : depth) + 1.4;
  const rise = span * (roof === 'low' ? 0.14 : 0.34);
  const triangle = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise)]);
  const geometry = new THREE.ExtrudeGeometry(triangle, { depth: length, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2);
  if (along) geometry.rotateY(Math.PI / 2);
  group.add(mesh(geometry, roofColor, new THREE.Vector3(0, height, 0)));
  return group;
}

// A curved block: a slice of a ring (units, plan degrees), tiled on top
function arcBlock(outer, inner, from, to, height) {
  const shape = new THREE.Shape();
  const steps = 40;
  for (let i = 0; i <= steps * 2 + 1; i++) {
    const back = i > steps;
    const angle = ((from + (to - from) * (back ? steps * 2 + 1 - i : i) / steps) * Math.PI) / 180;
    const radius = back ? inner : outer;
    shape[i ? 'lineTo' : 'moveTo'](radius * Math.cos(angle), -radius * Math.sin(angle));
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return mesh(geometry, [TILE, wallMaterial(STONE, 0.28, 0.28)]);   // its walls repeat by distance, not by face
}

// The lines of a court, painted on its floor
function courtMaterial(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = kind === 'tennis' ? '#b5654a' : '#d9d6cc';
  context.fillRect(0, 0, 256, 192);
  context.strokeStyle = '#fff';
  context.lineWidth = 3;
  if (kind === 'tennis') {   // two courts side by side
    for (const x of [14, 136]) {
      context.strokeRect(x, 16, 106, 160);
      context.strokeRect(x + 14, 16, 78, 160);
      context.strokeRect(x + 14, 56, 78, 80);
      context.beginPath();
      context.moveTo(x - 4, 96);
      context.lineTo(x + 110, 96);
      context.moveTo(x + 53, 56);
      context.lineTo(x + 53, 136);
      context.stroke();
    }
  } else {
    context.strokeStyle = '#8a8f96';
    context.strokeRect(12, 12, 232, 168);
    context.beginPath();
    context.moveTo(128, 12);
    context.lineTo(128, 180);
    context.moveTo(152, 96);
    context.arc(128, 96, 24, 0, Math.PI * 2);
    context.moveTo(12, 56);
    context.arc(12, 96, 40, -Math.PI / 2, Math.PI / 2);
    context.moveTo(244, 136);
    context.arc(244, 96, 40, Math.PI / 2, -Math.PI / 2);
    context.stroke();
  }
  return new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(canvas) });
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
  return new THREE.Mesh(new THREE.PlaneGeometry(50, 7.8), new THREE.MeshLambertMaterial({ map: texture }));
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
const ROAD_SAMPLES = ROADS.filter(([, width]) => width >= 7).flatMap(([points]) => samples(points));
const PATH_SAMPLES = ROADS.filter(([, width]) => width < 7).flatMap(([points]) => samples(points));   // narrow ones need less room
const CREEK_SAMPLES = samples(CREEK);

function isFree(x, y) {
  const near = (list, distance) => list.some(([px, py]) => Math.hypot(px - x, py - y) < distance);
  if (near(ROUTE_SAMPLES, 30) || near(ROAD_SAMPLES, 50) || near(PATH_SAMPLES, 16) || near(samples(RAILS), 20) || near(CREEK_SAMPLES, 11)) return false;
  if (near(IGUANAS, 45) || near([...MONSTERS, TURBINE, GATE, BRIDGE, CAT], 24)) return false;
  if (ARCS.some(([, ax, ay, outer]) => Math.hypot(ax - x, ay - y) < outer + 14)) return false;
  if (FLATS.some(([fx, fy, w, d]) => Math.abs(fx - x) < w / 2 + 12 && Math.abs(fy - y) < d / 2 + 12)) return false;
  // Inside a block? Turn the point back into the block's own frame and compare with each part
  return !BUILDINGS.some(({ at, turn = 0, parts }) => {
    const angle = (turn * Math.PI) / 180;
    const localX = (x - at[0]) * Math.cos(angle) - (y - at[1]) * Math.sin(angle);
    const localY = (x - at[0]) * Math.sin(angle) + (y - at[1]) * Math.cos(angle);
    return parts.some(([px, py, w, d]) => Math.abs(localX - px) < w / 2 + 14 && Math.abs(localY - py) < d / 2 + 14);
  });
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

// Sitting brown cat, tail up. Faces +z.
function cat() {
  const group = new THREE.Group();
  const brown = 0x8b5a2b;
  const body = mesh(new THREE.BoxGeometry(1.6, 2, 2.2), brown, new THREE.Vector3(0, 1.1, 0));
  body.rotation.x = -0.35;   // sitting: chest up
  group.add(body);
  group.add(mesh(new THREE.BoxGeometry(1.6, 1.3, 1.3), brown, new THREE.Vector3(0, 2.7, 0.9)));        // head
  group.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.4), 0xe8d5b5, new THREE.Vector3(0, 2.45, 1.6)));     // muzzle
  for (const side of [-1, 1]) {
    group.add(mesh(new THREE.ConeGeometry(0.35, 0.7, 4), brown, new THREE.Vector3(side * 0.5, 3.6, 0.8)));   // ears
    group.add(mesh(new THREE.BoxGeometry(0.25, 0.3, 0.1), 0x2e7d32, new THREE.Vector3(side * 0.4, 2.9, 1.56)));   // green eyes
    group.add(mesh(new THREE.BoxGeometry(0.4, 1.5, 0.4), 0x7a4a22, new THREE.Vector3(side * 0.45, 0.75, 0.9)));   // front legs
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.5, -1.1);
  tail.add(mesh(new THREE.BoxGeometry(0.35, 2.4, 0.35), 0x7a4a22, new THREE.Vector3(0, 1.2, 0)));
  group.add(tail);
  group.userData.tail = tail;
  group.scale.setScalar(1.4);
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
  const base = mesh(new THREE.BoxGeometry((right - left) * S, 10, (bottom - top) * S), [0x8a6a4a, 0x8a6a4a, 0x9dbd6f, 0x6f5238, 0x8a6a4a, 0x8a6a4a]);
  base.position.copy(toWorld([(left + right) / 2, (top + bottom) / 2], -5));
  scene.add(base);

  for (const [points, width, roadColor, line] of ROADS) {
    const road = new THREE.CatmullRomCurve3(points.map((p) => toWorld(p))).getSpacedPoints(160);
    scene.add(ribbon(road, width, roadColor, 0.15, false));
    if (line) scene.add(ribbon(road, 0.5, 0xf4f4f2, 0.2, false));
  }
  for (const [x, y, w, d, floor] of FLATS) {
    const top = typeof floor === 'string' ? courtMaterial(floor) : floor;
    const sides = typeof floor === 'string' ? 0xd9d6cc : floor;
    scene.add(mesh(new THREE.BoxGeometry(w * S, 0.4, d * S), [sides, sides, top, sides, sides, sides], toWorld([x, y], 0.2)));
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

  // Blocks, each made of its parts
  const tagAt = (name, spot, height) => {
    const tag = label(name, name === 'M8' ? '#1f6fc5' : '#0a2c52', 0.8);   // M8 is the home of Sistemas
    tag.position.copy(toWorld(spot, height + 9));
    scene.add(tag);
  };
  for (const { label: name, at, turn = 0, parts } of BUILDINGS) {
    const building = new THREE.Group();
    building.position.copy(toWorld(at));
    building.rotation.y = (turn * Math.PI) / 180;
    for (const [x, y, w, d, height, roof, roofColor, walls, lifted = 0] of parts) {
      const item = part(w * S, d * S, height, roof, roofColor, walls);
      item.position.set(x * S, lifted, y * S);
      building.add(item);
    }
    scene.add(building);
    if (name) tagAt(name, at, Math.max(...parts.map((p) => p[4] + (p[8] || 0))));
  }
  for (const [name, x, y, outer, inner, from, to, height] of ARCS) {
    const block = arcBlock(outer * S, inner * S, from, to, height);
    block.position.copy(toWorld([x, y]));
    scene.add(block);
    tagAt(name, [x, y], height + 4);
  }
  // M5: the paved court inside the arc and the dome on its drum
  const [, domeX, domeY] = ARCS[0];
  scene.add(mesh(new THREE.CylinderGeometry(13, 13, 0.4, 32), 0xd8d2c4, toWorld([domeX, domeY], 0.2)));
  scene.add(mesh(new THREE.CylinderGeometry(8, 8, 9, 24), STONE, toWorld([domeX, domeY - 8], 4.5)));
  scene.add(mesh(new THREE.SphereGeometry(8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xc9ccce, toWorld([domeX, domeY - 8], 9)));

  // The big banner on M3, facing the courts
  const sign = banner();
  sign.position.copy(toWorld([764, 762], 9.6));
  scene.add(sign);

  // The stream, with stones on its banks
  const creek = new THREE.CatmullRomCurve3(CREEK.map((p) => toWorld(p))).getSpacedPoints(60);
  scene.add(ribbon(creek, 2.4, 0x5fb7d9, 0.25, false));
  creek.forEach((point, i) => {
    if (i % 5) return;
    const side = i % 10 ? 1.9 : -1.9;
    scene.add(mesh(new THREE.DodecahedronGeometry(0.7 + random() * 0.5, 0), 0x8f969d, new THREE.Vector3(point.x + side, 0.4, point.z + random())));
  });

  // The wooden footbridge where the route crosses the stream
  const bridgeAt = toWorld(BRIDGE);
  const bridgeT = Array.from({ length: 400 }, (_, i) => i / 400)
    .reduce((a, b) => (route.getPointAt(a).distanceTo(bridgeAt) < route.getPointAt(b).distanceTo(bridgeAt) ? a : b));
  const bridge = new THREE.Group();
  bridge.add(mesh(new THREE.BoxGeometry(11, 0.5, 15), 0x9a6b43, new THREE.Vector3(0, 0.6, 0)));
  for (const side of [-5.2, 5.2]) {
    bridge.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 15), 0x7a4a2b, new THREE.Vector3(side, 3, 0)));   // handrail
    for (const z of [-7, -2.3, 2.3, 7]) bridge.add(mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), 0x7a4a2b, new THREE.Vector3(side, 1.9, z)));
  }
  bridge.position.copy(route.getPointAt(bridgeT)).setY(0);
  bridge.lookAt(bridge.position.clone().add(route.getTangentAt(bridgeT).setY(0)));
  scene.add(bridge);

  // Trees: the campus is an arboretum. The first ones fill the groves, the rest go anywhere.
  for (let placed = 0, tries = 0; placed < 235 && tries < 6000; tries++) {
    const inGrove = placed < 75;
    const [groveLeft, groveTop, groveRight, groveBottom] = GROVES[placed < 40 ? 0 : 1];
    const x = inGrove ? groveLeft + random() * (groveRight - groveLeft) : left + 14 + random() * (right - left - 28);
    const y = inGrove ? groveTop + random() * (groveBottom - groveTop) : top + 14 + random() * (bottom - top - 28);
    if (!isFree(x, y)) continue;
    const item = tree(random);
    item.position.copy(toWorld([x, y]));
    scene.add(item);
    placed++;
  }

  // Engineering bits
  const turbine = windTurbine();
  turbine.position.copy(toWorld(TURBINE));
  turbine.rotation.y = 0.6;
  scene.add(turbine);
  const dish = satelliteDish();
  dish.position.copy(toWorld([279, 608], 17));   // on the flat roof of M8a
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

  const catItem = cat();
  catItem.position.copy(toWorld(CAT));
  catItem.lookAt(toWorld([430, 838]));   // watching the runners go by
  scene.add(catItem);

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

  // 8-bit touch: coins over the route
  const coins = [];
  for (let i = 0; i < 16; i++) {
    const coin = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 12), 0xffd23f);
    coin.rotation.x = Math.PI / 2;
    coin.position.copy(route.getPointAt((i + 0.5) / 16)).setY(8);
    scene.add(coin);
    coins.push(coin);
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
  const startTag = label('Salida y meta', color);
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

    turbine.userData.spin.rotation.x = time * 1.5;
    dish.userData.spin.rotation.y = time * 0.4;
    cart.position.lerpVectors(railStart, railEnd, (Math.sin(time * 0.5) + 1) / 2);
    iguanas.forEach((item, i) => { item.userData.head.rotation.z = Math.max(0, Math.sin(time * 2 + i * 1.7)) * 0.35; });   // the head bob
    fans.forEach((item, i) => {
      item.position.y = Math.max(0, Math.sin(time * 5 + i)) * 1.2;   // jumping with joy
      item.userData.arms.forEach((arm, side) => { arm.rotation.z = (side ? -1 : 1) * (0.3 + Math.sin(time * 6 + i) * 0.3); });
    });
    catItem.userData.tail.rotation.z = Math.sin(time * 2.5) * 0.5;
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
