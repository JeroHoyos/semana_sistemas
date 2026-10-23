/* =============================================
   DIBUJOS SVG
   Íconos, monstruos de los ponentes y escudo.
   Todos usan "currentColor", así que su color se cambia con CSS (color: ...).
   ============================================= */

const ICONOS = {
  // Ojo con cuernos: la marca de la página
  ojo: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.5 7.5 5 2.5l5 3.6M16.5 7.5l2.5-5-5 3.6" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <ellipse cx="12" cy="14" rx="10" ry="7" fill="none" stroke="currentColor" stroke-width="2.4"/>
    <circle cx="12" cy="14" r="3.8" fill="currentColor"/>
  </svg>`,

  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>
  </svg>`,

  simultanea: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>
  </svg>`,

  // Íconos grandes de las tarjetas de competencias
  lupa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/>
  </svg>`,

  codigo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8 6 2.5 12 8 18M16 6l5.5 6-5.5 6M14 3.5l-4 17"/>
  </svg>`,

  pixel: `<svg viewBox="0 0 10 10" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M5 0h2v2H5zM4 2h2v3H4zM6 3h2v1H6zM2 2h2v1H2zM1 3h1v1H1zM6 5h2v1H6zM7 6h1v2H7zM8 8h1v1H8zM3 5h2v1H3zM2 6h1v2H2zM1 8h1v1H1z"/>
  </svg>`,

  balon: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <defs><clipPath id="balon-borde"><circle cx="12" cy="12" r="9.5"/></clipPath></defs>
    <g clip-path="url(#balon-borde)" fill="currentColor">
      <circle cx="12" cy="2.5" r="3.6"/><circle cx="21" cy="9.1" r="3.6"/><circle cx="17.6" cy="19.7" r="3.6"/>
      <circle cx="6.4" cy="19.7" r="3.6"/><circle cx="3" cy="9.1" r="3.6"/>
    </g>
    <path d="M12 7.6l4.2 3-1.6 5H9.4l-1.6-5z" fill="currentColor"/>
    <path d="M12 7.6V4M16.2 10.6l2.8-.9M14.6 15.6l1.7 2.4M9.4 15.6l-1.7 2.4M7.8 10.6 5 9.7" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`,

  control: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6.5 7.5h11a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.8 2.8 0 0 1-4.8 1.3L14.5 16h-5l-1.8 2.2a2.8 2.8 0 0 1-4.8-1.3l-.8-4a4.5 4.5 0 0 1 4.4-5.4z"/>
    <path d="M7.5 10.5v4M5.5 12.5h4"/>
    <circle cx="16" cy="11.5" r=".6"/><circle cx="18" cy="13.5" r=".6"/>
  </svg>`,
};

// Monstruo de un ojo que asoma desde abajo. Si es un misterio, el ojo muestra un "?".
function dibujarMonstruo(color, esMisterio) {
  const ojo = esMisterio
    ? `<text x="60" y="67.5" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="26" fill="#2a2f36">?</text>`
    : `<circle cx="60" cy="60" r="9.5" fill="#1f7fd1"/>
       <circle cx="60" cy="60" r="4.5" fill="#05080c"/>
       <circle cx="56.5" cy="56.5" r="2.4" fill="#fff"/>`;

  return `<svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path d="M38 36C32 24 26 16 17 10c14 2 24 10 30 22z" fill="#efe3c4" stroke="#6b5a3a" stroke-width="2"/>
    <path d="M82 36c6-12 12-20 21-26-14 2-24 10-30 22z" fill="#efe3c4" stroke="#6b5a3a" stroke-width="2"/>
    <path d="M14 106V66q0-38 46-38t46 38v40z" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/>
    <g fill="rgba(0,0,0,.13)"><circle cx="28" cy="72" r="5"/><circle cx="94" cy="82" r="7"/><circle cx="88" cy="45" r="3.5"/></g>
    <circle cx="60" cy="58" r="19" fill="#fff" stroke="#2a2f36" stroke-width="2.5"/>
    ${ojo}
    <path d="M45 85q15 9 30 0" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

// Escudo de la Semana: laureles, escudo con estrellas, la S con ojo y una cinta
function dibujarEscudo() {
  const azulMarino = '#0a2c52';

  // Laurel izquierdo: un tallo en arco con un par de hojas cada 12°.
  // El derecho es el mismo laurel reflejado (scale(-1 1)).
  const hoja = 'M0 0C4-4.5 12-4.5 17 0 12 4.5 4 4.5 0 0Z';
  let laurel = '<path d="M93.2 177.7A78 78 0 0 1 40.2 49.9" fill="none" stroke-width="2.5" stroke-linecap="round"/>';
  for (let angulo = 112; angulo <= 208; angulo += 12) {
    const x = (100 + 78 * Math.cos(angulo * Math.PI / 180)).toFixed(1);
    const y = (100 + 78 * Math.sin(angulo * Math.PI / 180)).toFixed(1);
    laurel += `<path d="${hoja}" transform="translate(${x} ${y}) rotate(${angulo + 55})"/>`;  // hacia afuera
    laurel += `<path d="${hoja}" transform="translate(${x} ${y}) rotate(${angulo + 125})"/>`; // hacia adentro
  }
  laurel += `<path d="${hoja}" transform="translate(40.2 49.9) rotate(310)"/>`; // punta

  const estrella = 'M0-4.5 1.1-1.5 4.3-1.4 1.8.6 2.6 3.6 0 1.9-2.6 3.6-1.8.6-4.3-1.4-1.1-1.5Z';

  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="${azulMarino}" stroke="${azulMarino}">
      <g>${laurel}</g>
      <g transform="translate(200 0) scale(-1 1)">${laurel}</g>
    </g>

    <!-- Escudo: campo blanco, banda superior con estrellas y filete azul -->
    <path d="M58 40H142V98C142 130 124 150 100 162 76 150 58 130 58 98Z" fill="#fff"/>
    <path d="M58 40H142V60H58Z" fill="${azulMarino}"/>
    <g fill="#fff">
      <path d="${estrella}" transform="translate(84 50)"/>
      <path d="${estrella}" transform="translate(100 50)"/>
      <path d="${estrella}" transform="translate(116 50)"/>
    </g>
    <path d="M65 66V98C65 125 80 142 100 153 120 142 135 125 135 98V66" fill="none" stroke="#1667c2" stroke-width="2"/>
    <path d="M58 40H142V98C142 130 124 150 100 162 76 150 58 130 58 98Z" fill="none" stroke="${azulMarino}" stroke-width="5" stroke-linejoin="round"/>

    <!-- S con ojo: S gruesa con dos ranuras, ojo en almendra y pupila -->
    <g transform="translate(70 79) scale(.5)">
      <path fill="#1667c2" d="M113.6 11.6L100 32C90 26 70 22 58 23.5 52 24.5 53 30 59 30 72 30.5 88 33 97 37
        112 41 120 52 119.5 66 119 82 100 96 72 96.3 45 96.5 20 94 0 88.6L12.7 67.4
        C30 72.5 48 74 61 73.5 67 73.5 67 67.5 61 67.5 45 68 25 66.5 9.6 63.5
        3 56 0 46 1 36 2 18 10 6 26 2.5 42-.5 58-.5 72 0 88 1 104 5 113.6 11.6Z"/>
      <path fill="#fff" d="M23 51C38 34 78 34 93 51 78 68 38 68 23 51Z"/>
      <circle cx="58" cy="50.5" r="10.5" fill="#000"/>
    </g>

    <!-- Cinta con pliegues en las puntas -->
    <g stroke="${azulMarino}" stroke-width="2.5" stroke-linejoin="round">
      <path d="M56 166 34 168 42 178 34 188 56 186Z" fill="#d9d2bd"/>
      <path d="M144 166 166 168 158 178 166 188 144 186Z" fill="#d9d2bd"/>
      <path d="M52 160Q100 176 148 160V182Q100 198 52 182Z" fill="#f6f1e3"/>
    </g>
    <text x="100" y="185" text-anchor="middle" font-family="Graduate, serif" font-size="14" fill="${azulMarino}">&lt;/&gt;</text>
  </svg>`;
}

// Dibuja el monstruo personalizado para el Carnet de Asustador (estilo videojuego)
function dibujarMonstruoPersonalizado(cfg = {}) {
  const color = cfg.color || '#1667c2';
  const estilo = cfg.estilo || 'masculino';     // 'masculino' | 'femenino'
  const cuerpo = cfg.cuerpo || 'manchas';       // 'manchas' | 'redondo' | 'escamas' | 'rayas' | 'gelatina'
  const cuernos = cfg.cuernos || 'toro';        // 'toro' | 'ramas' | 'antenas' | 'cresta' | 'serpientes' | 'orejas'
  const ojos = cfg.ojos || 'ciclope';           // 'ciclope' | 'doble' | 'triple' | 'tallos' | 'intenso'
  const boca = cfg.boca || 'colmillos';         // 'colmillos' | 'rugido' | 'sonrisa' | 'sierra' | 'brackets' | 'lengua'
  const accesorio = cfg.accesorio || 'ninguno'; // 'ninguno' | 'gorra' | 'gafas' | 'corbata' | 'audifonos' | 'mono'

  // 1. CUERNOS / CABEZA (detrás del cuerpo)
  let svgCabezaDetras = '';
  if (cuernos === 'toro') {
    svgCabezaDetras = `
      <path d="M36 38C26 26 18 16 12 6c16 2 28 12 34 26z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M84 38c10-12 18-22 24-32-16 2-28 12-34 26z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M20 14c4 3 7 7 9 11M100 14c-4 3-7 7-9 11" stroke="#b8a477" stroke-width="2" stroke-linecap="round"/>`;
  } else if (cuernos === 'ramas') {
    svgCabezaDetras = `
      <path d="M38 34 C24 28 16 14 24 6 C30 12 28 20 36 22 C40 16 44 10 42 4 C48 12 46 24 44 32 Z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M82 34 C96 28 104 14 96 6 C90 12 92 20 84 22 C80 16 76 10 78 4 C72 12 74 24 76 32 Z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>`;
  } else if (cuernos === 'antenas') {
    svgCabezaDetras = `
      <path d="M44 32 Q32 10 22 14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M76 32 Q88 10 98 14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="21" cy="14" r="6.5" fill="#ffdf5d" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="99" cy="14" r="6.5" fill="#ffdf5d" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="19" cy="12" r="2" fill="#fff"/>
      <circle cx="97" cy="12" r="2" fill="#fff"/>`;
  } else if (cuernos === 'cresta') {
    svgCabezaDetras = `
      <path d="M34 36 L26 14 L46 28 L60 6 L74 28 L94 14 L86 36 Z" fill="#ff6b4a" stroke="#2a2f36" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M46 28 L60 15 L74 28" fill="#ffcf4b"/>`;
  } else if (cuernos === 'serpientes') {
    svgCabezaDetras = `
      <g fill="#9b51e0" stroke="#2a2f36" stroke-width="2.2" stroke-linecap="round">
        <path d="M36 36 C20 24 18 8 30 10 C38 11 34 22 44 30"/>
        <path d="M50 30 C44 14 52 2 62 8 C68 12 60 22 62 30"/>
        <path d="M84 36 C100 24 102 8 90 10 C82 11 86 22 76 30"/>
        <circle cx="29" cy="10" r="1.5" fill="#ffdf5d" stroke="none"/>
        <circle cx="60" cy="8" r="1.5" fill="#ffdf5d" stroke="none"/>
        <circle cx="91" cy="10" r="1.5" fill="#ffdf5d" stroke="none"/>
      </g>`;
  } else if (cuernos === 'orejas') {
    svgCabezaDetras = `
      <ellipse cx="24" cy="36" rx="12" ry="16" transform="rotate(-22 24 36)" fill="${color}" stroke="#2a2f36" stroke-width="2.4"/>
      <ellipse cx="24" cy="36" rx="6" ry="9" transform="rotate(-22 24 36)" fill="#ff9eb5"/>
      <ellipse cx="96" cy="36" rx="12" ry="16" transform="rotate(22 96 36)" fill="${color}" stroke="#2a2f36" stroke-width="2.4"/>
      <ellipse cx="96" cy="36" rx="6" ry="9" transform="rotate(22 96 36)" fill="#ff9eb5"/>`;
  }

  // 2. SILUETA Y TEXTURA DEL CUERPO
  let svgSilueta = '';
  let svgTextura = '';

  if (cuerpo === 'redondo') {
    svgSilueta = `<path d="M18 106 C14 56 30 28 60 28 C90 28 106 56 102 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>`;
    svgTextura = `<path d="M34 38 Q60 32 86 38" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-linecap="round"/>`;
  } else if (cuerpo === 'escamas') {
    svgSilueta = `<path d="M16 106 V64 Q16 26 60 26 Q104 26 104 64 V106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>`;
    svgTextura = `
      <g fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2" stroke-linecap="round">
        <path d="M22 72q6 6 12 0M34 72q6 6 12 0M74 72q6 6 12 0M86 72q6 6 12 0"/>
        <path d="M28 84q6 6 12 0M80 84q6 6 12 0"/>
      </g>`;
  } else if (cuerpo === 'rayas') {
    svgSilueta = `<path d="M12 106 L16 58 Q18 26 60 26 Q102 26 104 58 L108 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>`;
    svgTextura = `
      <g fill="rgba(0,0,0,.16)">
        <path d="M15 62 Q30 56 36 64 Q26 68 14 68 Z"/>
        <path d="M14 78 Q28 73 32 80 Q24 84 13 84 Z"/>
        <path d="M105 62 Q90 56 84 64 Q94 68 106 68 Z"/>
        <path d="M106 78 Q92 73 88 80 Q96 84 107 84 Z"/>
      </g>`;
  } else if (cuerpo === 'gelatina') {
    svgSilueta = `<path d="M14 106 Q10 74 20 54 Q28 26 60 26 Q92 26 100 54 Q110 74 106 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>`;
    svgTextura = `
      <g fill="rgba(255,255,255,.28)">
        <circle cx="28" cy="68" r="5"/><circle cx="34" cy="82" r="2.5"/>
        <circle cx="92" cy="72" r="6"/><circle cx="85" cy="44" r="3"/>
      </g>`;
  } else {
    // 'manchas' (Clásico peludo tipo Sulley)
    svgSilueta = `<path d="M14 106V64q0-38 46-38t46 38v42z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>`;
    svgTextura = `
      <g fill="rgba(0,0,0,.15)">
        <circle cx="26" cy="74" r="5.5"/><circle cx="94" cy="80" r="7"/>
        <circle cx="88" cy="46" r="4"/><circle cx="32" cy="46" r="3.5"/>
      </g>`;
  }

  // 3. DETALLES DE GÉNERO (Asustadora: rubor y pestañas elegantes)
  let esFemenino = estilo === 'femenino';
  let svgRubor = esFemenino
    ? `<ellipse cx="30" cy="70" rx="6.5" ry="3.6" fill="rgba(255,105,140,.45)"/>
       <ellipse cx="90" cy="70" rx="6.5" ry="3.6" fill="rgba(255,105,140,.45)"/>`
    : '';

  // 4. OJOS
  let svgOjos = '';
  if (ojos === 'ciclope') {
    const pestanas = esFemenino
      ? `<path d="M42 43 L35 36 M49 39 L45 31 M71 39 L75 31 M78 43 L85 36" stroke="#2a2f36" stroke-width="2.6" stroke-linecap="round"/>`
      : `<path d="M42 36 Q60 41 78 36" fill="none" stroke="#2a2f36" stroke-width="3.2" stroke-linecap="round"/>`;
    svgOjos = `
      ${pestanas}
      <circle cx="60" cy="56" r="18.5" fill="#fff" stroke="#2a2f36" stroke-width="2.5"/>
      <circle cx="60" cy="56" r="9.5" fill="#1f7fd1"/>
      <circle cx="60" cy="56" r="4.5" fill="#05080c"/>
      <circle cx="56" cy="52" r="2.6" fill="#fff"/>`;
  } else if (ojos === 'doble') {
    const pestanas = esFemenino
      ? `<path d="M31 45 L25 39 M37 42 L34 35 M83 42 L86 35 M89 45 L95 39" stroke="#2a2f36" stroke-width="2.4" stroke-linecap="round"/>`
      : `<path d="M31 40 L52 43 M89 40 L68 43" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>`;
    svgOjos = `
      ${pestanas}
      <circle cx="44" cy="56" r="12.5" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="44" cy="56" r="6" fill="#1f7fd1"/><circle cx="44" cy="56" r="2.8" fill="#05080c"/><circle cx="41.8" cy="53.5" r="1.7" fill="#fff"/>
      <circle cx="76" cy="56" r="12.5" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="76" cy="56" r="6" fill="#1f7fd1"/><circle cx="76" cy="56" r="2.8" fill="#05080c"/><circle cx="73.8" cy="53.5" r="1.7" fill="#fff"/>`;
  } else if (ojos === 'triple') {
    const pestanas = esFemenino
      ? `<path d="M24 47 L19 42 M96 47 L101 42 M60 33 L60 27" stroke="#2a2f36" stroke-width="2.3" stroke-linecap="round"/>`
      : '';
    svgOjos = `
      ${pestanas}
      <circle cx="36" cy="58" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="36" cy="58" r="4.8" fill="#2f9e5b"/><circle cx="36" cy="58" r="2.2" fill="#05080c"/><circle cx="34.5" cy="56.5" r="1.3" fill="#fff"/>
      <circle cx="84" cy="58" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="84" cy="58" r="4.8" fill="#2f9e5b"/><circle cx="84" cy="58" r="2.2" fill="#05080c"/><circle cx="82.5" cy="56.5" r="1.3" fill="#fff"/>
      <circle cx="60" cy="46" r="10.5" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="60" cy="46" r="5" fill="#2f9e5b"/><circle cx="60" cy="46" r="2.3" fill="#05080c"/><circle cx="58.2" cy="44.2" r="1.4" fill="#fff"/>`;
  } else if (ojos === 'tallos') {
    svgOjos = `
      <path d="M46 42 Q40 26 36 22 M74 42 Q80 26 84 22" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <path d="M46 42 Q40 26 36 22 M74 42 Q80 26 84 22" fill="none" stroke="#2a2f36" stroke-width="2"/>
      <circle cx="36" cy="22" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <circle cx="36" cy="22" r="4.8" fill="#e05a7a"/><circle cx="36" cy="22" r="2.2" fill="#05080c"/><circle cx="34" cy="20" r="1.4" fill="#fff"/>
      <circle cx="84" cy="22" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <circle cx="84" cy="22" r="4.8" fill="#e05a7a"/><circle cx="84" cy="22" r="2.2" fill="#05080c"/><circle cx="82" cy="20" r="1.4" fill="#fff"/>`;
  } else if (ojos === 'intenso') {
    svgOjos = `
      <circle cx="44" cy="56" r="12" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="44" cy="56" r="5.8" fill="#f08a24"/><circle cx="44" cy="56" r="2.6" fill="#05080c"/>
      <path d="M31 49 L57 54 L57 43 L31 43 Z" fill="${color}"/>
      <path d="M31 49 L57 54" stroke="#2a2f36" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="76" cy="56" r="12" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="76" cy="56" r="5.8" fill="#f08a24"/><circle cx="76" cy="56" r="2.6" fill="#05080c"/>
      <path d="M89 49 L63 54 L63 43 L89 43 Z" fill="${color}"/>
      <path d="M89 49 L63 54" stroke="#2a2f36" stroke-width="2.8" stroke-linecap="round"/>`;
  }

  // 5. BOCA
  let svgBoca = '';
  if (boca === 'colmillos') {
    svgBoca = `
      <path d="M43 81 Q60 90 77 81" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
      <path d="M47 83 L51 92 L56 85 Z" fill="#fff" stroke="#2a2f36" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M64 85 L69 92 L73 83 Z" fill="#fff" stroke="#2a2f36" stroke-width="1.8" stroke-linejoin="round"/>`;
  } else if (boca === 'rugido') {
    svgBoca = `
      <path d="M42 78 Q60 72 78 78 Q82 94 60 94 Q38 94 42 78 Z" fill="#6b1426" stroke="#2a2f36" stroke-width="2.4"/>
      <path d="M46 77 L50 83 L54 76 L60 83 L66 76 L70 83 L74 77" fill="#fff" stroke="#2a2f36" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M48 91 Q60 84 72 91" fill="#ff758f"/>`;
  } else if (boca === 'sonrisa') {
    svgBoca = `
      <path d="M42 80 Q60 94 78 80 Z" fill="#fff" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M45 83 Q60 90 75 83" fill="none" stroke="#2a2f36" stroke-width="1.4"/>`;
  } else if (boca === 'sierra') {
    svgBoca = `
      <rect x="42" y="78" width="36" height="13" rx="6" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <path d="M44 84 L49 79 L54 89 L60 79 L66 89 L71 79 L76 84" fill="none" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>`;
  } else if (boca === 'brackets') {
    svgBoca = `
      <rect x="42" y="78" width="36" height="12" rx="6" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <line x1="43" y1="84" x2="77" y2="84" stroke="#8a94a3" stroke-width="2"/>
      <rect x="47" y="82" width="4" height="4" fill="#35b6b4" stroke="#2a2f36" stroke-width="1"/>
      <rect x="58" y="82" width="4" height="4" fill="#e05a7a" stroke="#2a2f36" stroke-width="1"/>
      <rect x="69" y="82" width="4" height="4" fill="#35b6b4" stroke="#2a2f36" stroke-width="1"/>`;
  } else if (boca === 'lengua') {
    svgBoca = `
      <path d="M44 81 Q60 89 76 81" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
      <path d="M54 84 V92 A6 6 0 0 0 66 92 V84 Z" fill="#ff6b8b" stroke="#2a2f36" stroke-width="2"/>
      <line x1="60" y1="85" x2="60" y2="92" stroke="#d23c5a" stroke-width="1.6" stroke-linecap="round"/>`;
  }

  // 6. ACCESORIOS UNIVERSITARIOS (Gorra MU/UNAL, Gafas, Moño, Corbata, Audífonos)
  let svgAccesorioExtra = '';
  if (accesorio === 'gorra') {
    svgAccesorioExtra = `
      <path d="M36 30 Q60 12 84 30 Z" fill="#0a2c52" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M32 30 Q60 25 94 32 Q96 36 84 35 Q60 31 32 30 Z" fill="#1667c2" stroke="#2a2f36" stroke-width="2"/>
      <text x="60" y="27" text-anchor="middle" font-family="Graduate, serif" font-weight="700" font-size="9" fill="#fff">UN</text>`;
  } else if (accesorio === 'gafas') {
    svgAccesorioExtra = `
      <g fill="rgba(255,255,255,.2)" stroke="#11161c" stroke-width="2.8">
        <rect x="27" y="45" width="30" height="20" rx="4"/>
        <rect x="63" y="45" width="30" height="20" rx="4"/>
        <line x1="57" y1="53" x2="63" y2="53"/>
        <line x1="16" y1="51" x2="27" y2="51"/>
        <line x1="93" y1="51" x2="104" y2="51"/>
      </g>`;
  } else if (accesorio === 'mono' || (esFemenino && accesorio === 'ninguno')) {
    svgAccesorioExtra = `
      <g transform="translate(83, 28) rotate(16)">
        <path d="M0 0 L-12 -8 L-12 8 Z" fill="#e03e6d" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>
        <path d="M0 0 L12 -8 L12 8 Z" fill="#e03e6d" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="3.8" fill="#ff85a7" stroke="#2a2f36" stroke-width="1.8"/>
      </g>`;
  } else if (accesorio === 'corbata') {
    svgAccesorioExtra = `
      <path d="M55 93 L65 93 L63 98 L57 98 Z" fill="#d23c5a" stroke="#2a2f36" stroke-width="1.8"/>
      <path d="M57 98 L63 98 L66 106 L54 106 Z" fill="#1667c2" stroke="#2a2f36" stroke-width="1.8"/>`;
  } else if (accesorio === 'audifonos') {
    svgAccesorioExtra = `
      <path d="M16 60 A44 42 0 0 1 104 60" fill="none" stroke="#26303b" stroke-width="4.5"/>
      <rect x="8" y="50" width="10" height="22" rx="5" fill="#1667c2" stroke="#2a2f36" stroke-width="2.2"/>
      <rect x="102" y="50" width="10" height="22" rx="5" fill="#1667c2" stroke="#2a2f36" stroke-width="2.2"/>`;
  }

  return `<svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${svgCabezaDetras}
    ${svgSilueta}
    ${svgTextura}
    ${svgRubor}
    ${svgOjos}
    ${svgBoca}
    ${svgAccesorioExtra}
  </svg>`;
}