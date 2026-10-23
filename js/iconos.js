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

// Escudo de la Semana: laureles, cuernos, ojo, "SS" y una cinta
function dibujarEscudo() {
  // Hojas de laurel del lado izquierdo, repartidas sobre un arco.
  // El lado derecho es el mismo laurel reflejado (scale(-1 1)).
  let hojas = '';
  for (let i = 0; i < 9; i++) {
    const angulo = 116 + i * 14;
    const x = (100 + 80 * Math.cos(angulo * Math.PI / 180)).toFixed(1);
    const y = (104 + 80 * Math.sin(angulo * Math.PI / 180)).toFixed(1);
    hojas += `<ellipse cx="${x}" cy="${y}" rx="11.5" ry="4.6" transform="rotate(${angulo + 128} ${x} ${y})"/>`;
  }

  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="#2a2f36">
      <g>${hojas}</g>
      <g transform="translate(200 0) scale(-1 1)">${hojas}</g>
    </g>
    <g fill="#efe3c4" stroke="#2a2f36" stroke-width="3" stroke-linejoin="round">
      <path d="M64 50c-6-12-12-20-21-26 14 1 24 9 30 20z"/>
      <path d="M136 50c6-12 12-20 21-26-14 1-24 9-30 20z"/>
    </g>
    <path d="M100 34l50 12v54q0 40-50 58-50-18-50-58V46z" fill="#fff" stroke="#2a2f36" stroke-width="5"/>
    <path d="M100 45l40 10v45q0 32-40 47-40-15-40-47V55z" fill="#1667c2"/>
    <ellipse cx="100" cy="80" rx="23" ry="14.5" fill="#fff" stroke="#0a2c52" stroke-width="2.5"/>
    <circle cx="100" cy="80" r="9" fill="#1f7fd1"/>
    <circle cx="100" cy="80" r="4.2" fill="#05080c"/>
    <text x="100" y="131" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="32" fill="#fff">SS</text>
    <g stroke="#2a2f36" stroke-width="3" stroke-linejoin="round">
      <path d="M54 166l-22 2 8 10-8 11 24-2z" fill="#dfe2e6"/>
      <path d="M146 166l22 2-8 10 8 11-24-2z" fill="#dfe2e6"/>
      <path d="M52 160q48 12 96 0v26q-48 12-96 0z" fill="#f6f6f4"/>
    </g>
    <text x="100" y="183" text-anchor="middle" font-family="Graduate, serif" font-size="17" fill="#2a2f36">&lt;/&gt;</text>
  </svg>`;
}
