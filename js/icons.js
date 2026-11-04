/* =============================================
   SVG DRAWINGS
   Icons, speaker monsters, the crest and the Scarer ID card monster.
   Icons use "currentColor", so CSS sets their color (color: ...).
   ============================================= */

const ICONS = {
  // Eye with horns: the site's mark
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.5 7.5 5 2.5l5 3.6M16.5 7.5l2.5-5-5 3.6" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <ellipse cx="12" cy="14" rx="10" ry="7" fill="none" stroke="currentColor" stroke-width="2.4"/>
    <circle cx="12" cy="14" r="3.8" fill="currentColor"/>
  </svg>`,

  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>
  </svg>`,

  overlap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>
  </svg>`,

  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>
  </svg>`,

  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
  </svg>`,

  // One icon per activity type (icon field of ACTIVITY_TYPES in data.js)
  microphone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>
  </svg>`,
  workshop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="4.5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20M10 8.5 8 10l2 1.5M14 8.5l2 1.5-2 1.5"/>
  </svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3.5M8 20.5h8M9.5 17.5h5"/>
  </svg>`,
  people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a4.5 4.5 0 0 1 5 4.5"/>
  </svg>`,

  // ID card: a card with a person and two lines (the Scare Meter "ver carnet" button)
  idCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.7-1.4 1.8-2 3-2s2.3.6 3 2M14.5 10h4M14.5 13.5h3"/>
  </svg>`,

  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 16.67c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.12.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.18-.48-.3z"/>
  </svg>`,

  // Big icons on the competition cards
  magnifier: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/>
  </svg>`,

  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8 6 2.5 12 8 18M16 6l5.5 6-5.5 6M14 3.5l-4 17"/>
  </svg>`,

  pixel: `<svg viewBox="0 0 10 10" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M5 0h2v2H5zM4 2h2v3H4zM6 3h2v1H6zM2 2h2v1H2zM1 3h1v1H1zM6 5h2v1H6zM7 6h1v2H7zM8 8h1v1H8zM3 5h2v1H3zM2 6h1v2H2zM1 8h1v1H1z"/>
  </svg>`,

  ball: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <defs><clipPath id="ball-edge"><circle cx="12" cy="12" r="9.5"/></clipPath></defs>
    <g clip-path="url(#ball-edge)" fill="currentColor">
      <circle cx="12" cy="2.5" r="3.6"/><circle cx="21" cy="9.1" r="3.6"/><circle cx="17.6" cy="19.7" r="3.6"/>
      <circle cx="6.4" cy="19.7" r="3.6"/><circle cx="3" cy="9.1" r="3.6"/>
    </g>
    <path d="M12 7.6l4.2 3-1.6 5H9.4l-1.6-5z" fill="currentColor"/>
    <path d="M12 7.6V4M16.2 10.6l2.8-.9M14.6 15.6l1.7 2.4M9.4 15.6l-1.7 2.4M7.8 10.6 5 9.7" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`,

  gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6.5 7.5h11a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.8 2.8 0 0 1-4.8 1.3L14.5 16h-5l-1.8 2.2a2.8 2.8 0 0 1-4.8-1.3l-.8-4a4.5 4.5 0 0 1 4.4-5.4z"/>
    <path d="M7.5 10.5v4M5.5 12.5h4"/>
    <circle cx="16" cy="11.5" r=".6"/><circle cx="18" cy="13.5" r=".6"/>
  </svg>`,
};

// One-eyed monster peeking from below. If it is a mystery, the eye shows a "?".
function drawMonster(color, isMystery) {
  const eye = isMystery
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
    ${eye}
    <path d="M45 85q15 9 30 0" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

// Week crest: laurels, horns, a varsity-style "26" and a ribbon
function drawCrest() {
  // Laurel leaves on the left side, spread along an arc.
  // The right side is the same laurel mirrored (scale(-1 1)).
  let leaves = '';
  for (let i = 0; i < 9; i++) {
    const angle = 116 + i * 14;
    const x = (100 + 80 * Math.cos(angle * Math.PI / 180)).toFixed(1);
    const y = (104 + 80 * Math.sin(angle * Math.PI / 180)).toFixed(1);
    leaves += `<ellipse cx="${x}" cy="${y}" rx="11.5" ry="4.6" transform="rotate(${angle + 128} ${x} ${y})"/>`;
  }

  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="#2a2f36">
      <g>${leaves}</g>
      <g transform="translate(200 0) scale(-1 1)">${leaves}</g>
    </g>
    <g fill="#efe3c4" stroke="#2a2f36" stroke-width="3" stroke-linejoin="round">
      <path d="M64 50c-6-12-12-20-21-26 14 1 24 9 30 20z"/>
      <path d="M136 50c6-12 12-20 21-26-14 1-24 9-30 20z"/>
    </g>
    <path d="M100 34l50 12v54q0 40-50 58-50-18-50-58V46z" fill="#fff" stroke="#2a2f36" stroke-width="5"/>
    <path d="M100 45l40 10v45q0 32-40 47-40-15-40-47V55z" fill="#1667c2"/>
    <text x="100" y="113" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="46"
      fill="#fff" stroke="#0a2c52" stroke-width="4.5" stroke-linejoin="round" paint-order="stroke">26</text>
    <g stroke="#2a2f36" stroke-width="3" stroke-linejoin="round">
      <path d="M54 166l-22 2 8 10-8 11 24-2z" fill="#dfe2e6"/>
      <path d="M146 166l22 2-8 10 8 11-24-2z" fill="#dfe2e6"/>
      <path d="M52 160q48 12 96 0v26q-48 12-96 0z" fill="#f6f6f4"/>
    </g>
    <text x="100" y="183" text-anchor="middle" font-family="Graduate, serif" font-size="17" fill="#2a2f36">&lt;/&gt;</text>
  </svg>`;
}


/* ---------- Scarer ID card monster ---------- */

// Option for each part when the monster has none (or one that no longer exists).
const DEFAULT_MONSTER = {
  estilo: 'masculino',
  cuerpo: 'manchas',
  color: '#1667c2',
  ojos: 'ciclope',
  cuernos: 'toro',
  boca: 'colmillos',
  accesorio: 'ninguno',
};

// The drawing for each option, per part (the options are those of MONSTER_CATALOG in auth.js).
// Each drawing receives the monster's color and whether it is feminine, and returns its SVG shapes.
// To add an option, add it here and in the catalog.
const MONSTER_PARTS = {
  // Horns or whatever it wears on its head (goes behind the body)
  cuernos: {
    toro: () => `
      <path d="M36 38C26 26 18 16 12 6c16 2 28 12 34 26z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M84 38c10-12 18-22 24-32-16 2-28 12-34 26z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M20 14c4 3 7 7 9 11M100 14c-4 3-7 7-9 11" stroke="#b8a477" stroke-width="2" stroke-linecap="round"/>`,
    ramas: () => `
      <path d="M38 34 C24 28 16 14 24 6 C30 12 28 20 36 22 C40 16 44 10 42 4 C48 12 46 24 44 32 Z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M82 34 C96 28 104 14 96 6 C90 12 92 20 84 22 C80 16 76 10 78 4 C72 12 74 24 76 32 Z" fill="#efe3c4" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>`,
    antenas: (color) => `
      <path d="M44 32 Q32 10 22 14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M76 32 Q88 10 98 14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="21" cy="14" r="6.5" fill="#ffdf5d" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="99" cy="14" r="6.5" fill="#ffdf5d" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="19" cy="12" r="2" fill="#fff"/>
      <circle cx="97" cy="12" r="2" fill="#fff"/>`,
    cresta: () => `
      <path d="M34 36 L26 14 L46 28 L60 6 L74 28 L94 14 L86 36 Z" fill="#ff6b4a" stroke="#2a2f36" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M46 28 L60 15 L74 28" fill="#ffcf4b"/>`,
    serpientes: (color) => `
      <g fill="${color}" stroke="#2a2f36" stroke-width="2.2" stroke-linecap="round">
        <path d="M36 36 C20 24 18 8 30 10 C38 11 34 22 44 30"/>
        <path d="M50 30 C44 14 52 2 62 8 C68 12 60 22 62 30"/>
        <path d="M84 36 C100 24 102 8 90 10 C82 11 86 22 76 30"/>
        <circle cx="29" cy="10" r="1.5" fill="#ffdf5d" stroke="none"/>
        <circle cx="60" cy="8" r="1.5" fill="#ffdf5d" stroke="none"/>
        <circle cx="91" cy="10" r="1.5" fill="#ffdf5d" stroke="none"/>
      </g>`,
    orejas: (color) => `
      <ellipse cx="24" cy="36" rx="12" ry="16" transform="rotate(-22 24 36)" fill="${color}" stroke="#2a2f36" stroke-width="2.4"/>
      <ellipse cx="24" cy="36" rx="6" ry="9" transform="rotate(-22 24 36)" fill="#ff9eb5"/>
      <ellipse cx="96" cy="36" rx="12" ry="16" transform="rotate(22 96 36)" fill="${color}" stroke="#2a2f36" stroke-width="2.4"/>
      <ellipse cx="96" cy="36" rx="6" ry="9" transform="rotate(22 96 36)" fill="#ff9eb5"/>`,
  },

  // Body silhouette and texture
  cuerpo: {
    // Classic furry, Sulley style
    manchas: (color) => `
      <path d="M14 106V64q0-38 46-38t46 38v42z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>
      <g fill="rgba(0,0,0,.15)">
        <circle cx="26" cy="74" r="5.5"/><circle cx="94" cy="80" r="7"/>
        <circle cx="88" cy="46" r="4"/><circle cx="32" cy="46" r="3.5"/>
      </g>`,
    redondo: (color) => `
      <path d="M18 106 C14 56 30 28 60 28 C90 28 106 56 102 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>
      <path d="M34 38 Q60 32 86 38" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-linecap="round"/>`,
    escamas: (color) => `
      <path d="M16 106 V64 Q16 26 60 26 Q104 26 104 64 V106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>
      <g fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2" stroke-linecap="round">
        <path d="M22 72q6 6 12 0M34 72q6 6 12 0M74 72q6 6 12 0M86 72q6 6 12 0"/>
        <path d="M28 84q6 6 12 0M80 84q6 6 12 0"/>
      </g>`,
    rayas: (color) => `
      <path d="M12 106 L16 58 Q18 26 60 26 Q102 26 104 58 L108 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>
      <g fill="rgba(0,0,0,.16)">
        <path d="M15 62 Q30 56 36 64 Q26 68 14 68 Z"/>
        <path d="M14 78 Q28 73 32 80 Q24 84 13 84 Z"/>
        <path d="M105 62 Q90 56 84 64 Q94 68 106 68 Z"/>
        <path d="M106 78 Q92 73 88 80 Q96 84 107 84 Z"/>
      </g>`,
    gelatina: (color) => `
      <path d="M14 106 Q10 74 20 54 Q28 26 60 26 Q92 26 100 54 Q110 74 106 106 Z" fill="${color}" stroke="#2a2f36" stroke-width="2.6"/>
      <g fill="rgba(255,255,255,.28)">
        <circle cx="28" cy="68" r="5"/><circle cx="34" cy="82" r="2.5"/>
        <circle cx="92" cy="72" r="6"/><circle cx="85" cy="44" r="3"/>
      </g>`,
  },

  // The feminine style has blush on the cheeks
  estilo: {
    masculino: () => '',
    femenino: () => `
      <ellipse cx="30" cy="70" rx="6.5" ry="3.6" fill="rgba(255,105,140,.45)"/>
      <ellipse cx="90" cy="70" rx="6.5" ry="3.6" fill="rgba(255,105,140,.45)"/>`,
  },

  // Eyes. Some change with the style: eyelashes for feminine, eyebrows for masculine.
  ojos: {
    ciclope: (color, isFeminine) => `
      ${isFeminine
        ? '<path d="M42 43 L35 36 M49 39 L45 31 M71 39 L75 31 M78 43 L85 36" stroke="#2a2f36" stroke-width="2.6" stroke-linecap="round"/>'
        : '<path d="M42 36 Q60 41 78 36" fill="none" stroke="#2a2f36" stroke-width="3.2" stroke-linecap="round"/>'}
      <circle cx="60" cy="56" r="18.5" fill="#fff" stroke="#2a2f36" stroke-width="2.5"/>
      <circle cx="60" cy="56" r="9.5" fill="#1f7fd1"/>
      <circle cx="60" cy="56" r="4.5" fill="#05080c"/>
      <circle cx="56" cy="52" r="2.6" fill="#fff"/>`,
    doble: (color, isFeminine) => `
      ${isFeminine
        ? '<path d="M31 45 L25 39 M37 42 L34 35 M83 42 L86 35 M89 45 L95 39" stroke="#2a2f36" stroke-width="2.4" stroke-linecap="round"/>'
        : '<path d="M31 40 L52 43 M89 40 L68 43" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>'}
      <circle cx="44" cy="56" r="12.5" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="44" cy="56" r="6" fill="#1f7fd1"/><circle cx="44" cy="56" r="2.8" fill="#05080c"/><circle cx="41.8" cy="53.5" r="1.7" fill="#fff"/>
      <circle cx="76" cy="56" r="12.5" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="76" cy="56" r="6" fill="#1f7fd1"/><circle cx="76" cy="56" r="2.8" fill="#05080c"/><circle cx="73.8" cy="53.5" r="1.7" fill="#fff"/>`,
    triple: (color, isFeminine) => `
      ${isFeminine
        ? '<path d="M24 47 L19 42 M96 47 L101 42 M60 33 L60 27" stroke="#2a2f36" stroke-width="2.3" stroke-linecap="round"/>'
        : ''}
      <circle cx="36" cy="58" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="36" cy="58" r="4.8" fill="#2f9e5b"/><circle cx="36" cy="58" r="2.2" fill="#05080c"/><circle cx="34.5" cy="56.5" r="1.3" fill="#fff"/>
      <circle cx="84" cy="58" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="84" cy="58" r="4.8" fill="#2f9e5b"/><circle cx="84" cy="58" r="2.2" fill="#05080c"/><circle cx="82.5" cy="56.5" r="1.3" fill="#fff"/>
      <circle cx="60" cy="46" r="10.5" fill="#fff" stroke="#2a2f36" stroke-width="2.2"/>
      <circle cx="60" cy="46" r="5" fill="#2f9e5b"/><circle cx="60" cy="46" r="2.3" fill="#05080c"/><circle cx="58.2" cy="44.2" r="1.4" fill="#fff"/>`,
    tallos: (color) => `
      <path d="M46 42 Q40 26 36 22 M74 42 Q80 26 84 22" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      <path d="M46 42 Q40 26 36 22 M74 42 Q80 26 84 22" fill="none" stroke="#2a2f36" stroke-width="2"/>
      <circle cx="36" cy="22" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <circle cx="36" cy="22" r="4.8" fill="#e05a7a"/><circle cx="36" cy="22" r="2.2" fill="#05080c"/><circle cx="34" cy="20" r="1.4" fill="#fff"/>
      <circle cx="84" cy="22" r="10" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <circle cx="84" cy="22" r="4.8" fill="#e05a7a"/><circle cx="84" cy="22" r="2.2" fill="#05080c"/><circle cx="82" cy="20" r="1.4" fill="#fff"/>`,
    intenso: (color) => `
      <circle cx="44" cy="56" r="12" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="44" cy="56" r="5.8" fill="#f08a24"/><circle cx="44" cy="56" r="2.6" fill="#05080c"/>
      <path d="M31 49 L57 54 L57 43 L31 43 Z" fill="${color}"/>
      <path d="M31 49 L57 54" stroke="#2a2f36" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="76" cy="56" r="12" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <circle cx="76" cy="56" r="5.8" fill="#f08a24"/><circle cx="76" cy="56" r="2.6" fill="#05080c"/>
      <path d="M89 49 L63 54 L63 43 L89 43 Z" fill="${color}"/>
      <path d="M89 49 L63 54" stroke="#2a2f36" stroke-width="2.8" stroke-linecap="round"/>`,
  },

  boca: {
    colmillos: () => `
      <path d="M43 81 Q60 90 77 81" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
      <path d="M47 83 L51 92 L56 85 Z" fill="#fff" stroke="#2a2f36" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M64 85 L69 92 L73 83 Z" fill="#fff" stroke="#2a2f36" stroke-width="1.8" stroke-linejoin="round"/>`,
    rugido: () => `
      <path d="M42 78 Q60 72 78 78 Q82 94 60 94 Q38 94 42 78 Z" fill="#6b1426" stroke="#2a2f36" stroke-width="2.4"/>
      <path d="M46 77 L50 83 L54 76 L60 83 L66 76 L70 83 L74 77" fill="#fff" stroke="#2a2f36" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M48 91 Q60 84 72 91" fill="#ff758f"/>`,
    sonrisa: () => `
      <path d="M42 80 Q60 94 78 80 Z" fill="#fff" stroke="#2a2f36" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M45 83 Q60 90 75 83" fill="none" stroke="#2a2f36" stroke-width="1.4"/>`,
    sierra: () => `
      <rect x="42" y="78" width="36" height="13" rx="6" fill="#fff" stroke="#2a2f36" stroke-width="2.4"/>
      <path d="M44 84 L49 79 L54 89 L60 79 L66 89 L71 79 L76 84" fill="none" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>`,
    brackets: () => `
      <rect x="42" y="78" width="36" height="12" rx="6" fill="#fff" stroke="#2a2f36" stroke-width="2.3"/>
      <line x1="43" y1="84" x2="77" y2="84" stroke="#8a94a3" stroke-width="2"/>
      <rect x="47" y="82" width="4" height="4" fill="#35b6b4" stroke="#2a2f36" stroke-width="1"/>
      <rect x="58" y="82" width="4" height="4" fill="#e05a7a" stroke="#2a2f36" stroke-width="1"/>
      <rect x="69" y="82" width="4" height="4" fill="#35b6b4" stroke="#2a2f36" stroke-width="1"/>`,
    lengua: () => `
      <path d="M44 81 Q60 89 76 81" fill="none" stroke="#2a2f36" stroke-width="3" stroke-linecap="round"/>
      <path d="M54 84 V92 A6 6 0 0 0 66 92 V84 Z" fill="#ff6b8b" stroke="#2a2f36" stroke-width="2"/>
      <line x1="60" y1="85" x2="60" y2="92" stroke="#d23c5a" stroke-width="1.6" stroke-linecap="round"/>`,
  },

  // College accessories
  accesorio: {
    ninguno: () => '',
    gorra: () => `
      <path d="M36 30 Q60 12 84 30 Z" fill="#0a2c52" stroke="#2a2f36" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M32 30 Q60 25 94 32 Q96 36 84 35 Q60 31 32 30 Z" fill="#1667c2" stroke="#2a2f36" stroke-width="2"/>
      <text x="60" y="27" text-anchor="middle" font-family="Graduate, serif" font-weight="700" font-size="9" fill="#fff">UN</text>`,
    gafas: () => `
      <g fill="rgba(255,255,255,.2)" stroke="#11161c" stroke-width="2.8">
        <rect x="27" y="45" width="30" height="20" rx="4"/>
        <rect x="63" y="45" width="30" height="20" rx="4"/>
        <line x1="57" y1="53" x2="63" y2="53"/>
        <line x1="16" y1="51" x2="27" y2="51"/>
        <line x1="93" y1="51" x2="104" y2="51"/>
      </g>`,
    mono: () => `
      <g transform="translate(83, 28) rotate(16)">
        <path d="M0 0 L-12 -8 L-12 8 Z" fill="#e03e6d" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>
        <path d="M0 0 L12 -8 L12 8 Z" fill="#e03e6d" stroke="#2a2f36" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="3.8" fill="#ff85a7" stroke="#2a2f36" stroke-width="1.8"/>
      </g>`,
    corbata: () => `
      <path d="M55 93 L65 93 L63 98 L57 98 Z" fill="#d23c5a" stroke="#2a2f36" stroke-width="1.8"/>
      <path d="M57 98 L63 98 L66 106 L54 106 Z" fill="#1667c2" stroke="#2a2f36" stroke-width="1.8"/>`,
    audifonos: () => `
      <path d="M16 60 A44 42 0 0 1 104 60" fill="none" stroke="#26303b" stroke-width="4.5"/>
      <rect x="8" y="50" width="10" height="22" rx="5" fill="#1667c2" stroke="#2a2f36" stroke-width="2.2"/>
      <rect x="102" y="50" width="10" height="22" rx="5" fill="#1667c2" stroke="#2a2f36" stroke-width="2.2"/>`,
  },
};

// Anyone can store any text as their monster's color, and it ends up inside style and SVG attributes.
function monsterColor(monster) {
  return /^#[0-9a-f]{6}$/i.test(monster?.color) ? monster.color : DEFAULT_MONSTER.color;
}

// Draws the Scarer ID card monster.
// monster says which option each part uses, for example { cuerpo: 'rayas', ojos: 'triple', color: '#2f9e5b' }.
function drawCustomMonster(monster = {}) {
  const chosen = { ...DEFAULT_MONSTER, ...monster };
  const color = monsterColor(monster);
  const isFeminine = chosen.estilo === 'femenino';

  // The feminine style "al natural" wears a bow
  if (isFeminine && chosen.accesorio === 'ninguno') chosen.accesorio = 'mono';

  const draw = (part) => {
    const drawings = MONSTER_PARTS[part];
    // hasOwn: a stored value like '__proto__' must not reach a non-function and break the whole table
    const option = Object.hasOwn(drawings, chosen[part]) ? chosen[part] : DEFAULT_MONSTER[part];
    return drawings[option](color, isFeminine);
  };

  // Back to front: each part paints over the previous one
  return `<svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${draw('cuernos')}
    ${draw('cuerpo')}
    ${draw('estilo')}
    ${draw('ojos')}
    ${draw('boca')}
    ${draw('accesorio')}
  </svg>`;
}


/* ---------- Team banner (inscripciones.html) ---------- */

// Fraternity style banner: a cloth with the team's letters and a monster detail.
// Besides its two colors (fondo and tinta, any #rrggbb), a banner picks one option of each part below.
// The keys are stored in Supabase (equipos.bandera) and checked in supabase/teams.sql: add new ones there too.

// A five-pointed star centered on x, y
function starPath(x, y, radius) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const r = i % 2 ? radius * .45 : radius;
    return `${(x + r * Math.cos(angle)).toFixed(1)} ${(y + r * Math.sin(angle)).toFixed(1)}`;
  });
  return `M${points.join('L')}z`;
}

// Checkerboard squares of 20 for the "cuadros" pattern
const CHECKER_SQUARES = Array.from({ length: 48 }, (_, i) => [i % 6, Math.floor(i / 6)])
  .filter(([x, y]) => (x + y) % 2)
  .map(([x, y]) => `M${x * 20} ${y * 20}h20v20h-20z`).join('');

const BANNER_OPTIONS = {
  // Outline of the cloth
  forma: {
    golondrina: { label: 'Golondrina', path: 'M0 0h120v150l-60-32-60 32z' },
    punta: { label: 'Punta', path: 'M0 0h120v118l-60 32-60-32z' },
    recta: { label: 'Recta', path: 'M0 0h120v150H0z' },
    ondas: { label: 'Ondas', path: 'M0 0h120v140q-15 12-30 0t-30 0-30 0-30 0z' },
  },
  // Drawn over the cloth color, in a lighter or darker shade of it
  estampado: {
    liso: { label: 'Liso', draw: () => '' },
    rayas: { label: 'Rayas', draw: () => '<path d="M15 0v150M45 0v150M75 0v150M105 0v150" stroke="#000" stroke-opacity=".13" stroke-width="13"/>' },
    franja: { label: 'Franja', draw: () => '<path d="M-10 18 130 128" stroke="#fff" stroke-opacity=".3" stroke-width="28"/>' },
    manchas: { label: 'Manchas', draw: () => `<g fill="#000" fill-opacity=".14">
      <circle cx="16" cy="22" r="9"/><circle cx="98" cy="26" r="12"/><circle cx="66" cy="12" r="5"/><circle cx="10" cy="76" r="7"/>
      <circle cx="108" cy="80" r="8"/><circle cx="30" cy="112" r="11"/><circle cx="92" cy="118" r="7"/><circle cx="60" cy="104" r="4"/></g>` },
    cuadros: { label: 'Cuadros', draw: () => `<path d="${CHECKER_SQUARES}" fill="#000" fill-opacity=".1"/>` },
  },
  // Receives the outline and the letters' color
  borde: {
    ninguno: { label: 'Sin borde', draw: () => '' },
    ribete: { label: 'Ribete', draw: (shape, ink) => `<path d="${shape}" fill="none" stroke="${ink}" stroke-width="10"/>` },
    costura: { label: 'Costura', draw: (shape) => `<path d="${shape}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2"
      stroke-dasharray="5 4" transform="translate(6 7.5) scale(.9)"/>` },
  },
  // Line around the letters, like college jerseys
  contorno: {
    ninguno: { label: 'Sin contorno', color: null },
    blanco: { label: 'Blanco', color: '#ffffff' },
    negro: { label: 'Negro', color: '#17181b' },
  },
  // scale: wide fonts get smaller letters so four still fit
  fuente: {
    varsity: { label: 'Universitaria', family: 'Graduate, serif', weight: 400, scale: 1 },
    bloque: { label: 'Bloque', family: 'Alfa Slab One, serif', weight: 400, scale: 1 },
    griega: { label: 'Griega', family: 'Cinzel, serif', weight: 700, scale: 1 },
    terror: { label: 'Terror', family: 'Creepster, cursive', weight: 400, scale: 1.2 },
    pixel: { label: 'Pixel', family: "'Press Start 2P', monospace", weight: 400, scale: .7 },
    circo: { label: 'Circo', family: 'Rye, serif', weight: 400, scale: .9 },
  },
  // Monster detail around the letters. Receives the letters' color.
  adorno: {
    ninguno: { label: 'Ninguno', draw: () => '' },
    cuernos: { label: 'Cuernos', draw: (ink) => `<g fill="${ink}">
      <path d="M41 44c-7-6-10-15-8-24 5 6 10 11 17 15z"/>
      <path d="M79 44c7-6 10-15 8-24-5 6-10 11-17 15z"/></g>` },
    antenas: { label: 'Antenas', draw: (ink) => `<g fill="${ink}">
      <path d="M50 44q-4-14-12-22M70 44q4-14 12-22" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="37" cy="21" r="5"/><circle cx="83" cy="21" r="5"/></g>` },
    ojo: { label: 'Ojo', draw: (ink) => `
      <path d="M38 33q22-18 44 0-22 18-44 0z" fill="#fff" stroke="${ink}" stroke-width="3"/>
      <circle cx="60" cy="33" r="6.5" fill="${ink}"/>
      <circle cx="60" cy="33" r="3" fill="#17181b"/>` },
    corona: { label: 'Corona', draw: (ink) => `<path d="M42 42l3-22 9 10 6-14 6 14 9-10 3 22z" fill="${ink}"/>` },
    estrellas: { label: 'Estrellas', draw: (ink) => `<path d="${starPath(36, 30, 7)}${starPath(60, 22, 9)}${starPath(84, 30, 7)}" fill="${ink}"/>` },
    baba: { label: 'Baba', draw: (ink) => `<path fill="${ink}" d="M0 0h120v7H0z
      M10 6v10a4 4 0 0 0 8 0V6zM33 6v18a4 4 0 0 0 8 0V6zM56 6v7a4 4 0 0 0 8 0V6zM80 6v15a4 4 0 0 0 8 0V6zM101 6v9a4 4 0 0 0 8 0V6z"/>` },
    colmillos: { label: 'Colmillos', draw: (ink) => `<g fill="#fff" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
      <path d="M43 92h12l-6 16z"/><path d="M65 92h12l-6 16z"/></g>` },
    garras: { label: 'Garras', draw: (ink) => `<path fill="${ink}" d="M38 112l19-25 4 1-17 25zM51 113l19-25 4 1-17 25zM64 114l19-25 4 1-17 25z"/>` },
  },
};

const DEFAULT_BANNER = {
  letras: '?', fondo: '#1667c2', tinta: '#ffffff',
  forma: 'golondrina', estampado: 'liso', borde: 'ninguno', contorno: 'ninguno', fuente: 'varsity', adorno: 'ninguno',
};

// Anyone can store any text in their banner, and it ends up inside SVG attributes
const hexColorOr = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(value) ? value : fallback);

// The chosen option of a part, or the default one if it is missing or unknown.
// hasOwn: a stored value like '__proto__' must not reach a non-option and break the list.
function bannerOption(banner, part) {
  const options = BANNER_OPTIONS[part];
  return options[Object.hasOwn(options, banner[part]) ? banner[part] : DEFAULT_BANNER[part]];
}

// Each banner clips its cloth with its own id, so several can share a page
let bannerCount = 0;

// banner: { letras, fondo, tinta, forma, estampado, borde, contorno, fuente, adorno }, as stored in equipos.bandera
function drawBanner(banner = {}) {
  const letters = [...String(banner.letras || DEFAULT_BANNER.letras)].slice(0, 4);
  const background = hexColorOr(banner.fondo, DEFAULT_BANNER.fondo);
  const ink = hexColorOr(banner.tinta, DEFAULT_BANNER.tinta);
  const [shape, pattern, border, outline, font, adornment] =
    ['forma', 'estampado', 'borde', 'contorno', 'fuente', 'adorno'].map((part) => bannerOption(banner, part));
  const size = [64, 52, 40, 31][letters.length - 1] * font.scale;
  const stroke = outline.color
    ? `stroke="${outline.color}" stroke-width="${(size * .12).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"`
    : '';
  const clip = `banner-cloth-${++bannerCount}`;

  return `<svg viewBox="0 0 120 150" aria-hidden="true">
    <clipPath id="${clip}"><path d="${shape.path}"/></clipPath>
    <g clip-path="url(#${clip})">
      <path d="${shape.path}" fill="${background}"/>
      ${pattern.draw()}
      <path d="M0 0h120v6H0z" fill="#000" opacity=".12"/>
      ${border.draw(shape.path, ink)}
    </g>
    <text x="60" y="82" text-anchor="middle" font-family="${font.family}" font-weight="${font.weight}"
      font-size="${size.toFixed(1)}" fill="${ink}" ${stroke}>${escapeHtml(letters.join(''))}</text>
    ${adornment.draw(ink)}
  </svg>`;
}
