/* =============================================
   PÁGINA DE UNA ACTIVIDAD
   Lee el id de la dirección (evento.html?id=maraton) y arma la página con sus datos.
   ============================================= */

const actividad = buscarActividad(new URLSearchParams(location.search).get('id'));

// 'Miércoles, 18 nov' (o solo 'Miércoles' si el día no tiene fecha)
function textoDelDia(dia) {
  return `${dia.nombre}${dia.fecha ? `, ${dia.fecha}` : ''}`;
}


/* ---------- Cabecera ---------- */

function pintarPortada() {
  const tipo = TIPOS[actividad.tipo];

  document.title = `${actividad.titulo} · Semana de Sistemas`;

  // Dibujos pixel art sobre el tipo, si la actividad tiene (ver pixeles.js)
  const adornos = actividad.adornos
    ? `<div class="evento-portada__adornos">${actividad.adornos.map((nombre) => dibujarPixeles(PIXELES[nombre])).join('')}</div>`
    : '';

  $('#evento-portada').innerHTML = `
    ${adornos}
    <span class="evento-portada__tipo" style="--color: ${tipo.color}; --fondo: ${tipo.fondo}">${ICONOS.ojo}${tipo.singular}</span>
    <h1 class="evento-portada__titulo">${actividad.titulo}</h1>
  `;
}


/* ---------- Información ---------- */

// "Saber más →" debajo de un ponente o grupo; abre su LinkedIn, red social o página en otra pestaña
function saberMas(enlace, nombre) {
  if (!enlace) return '';
  return `
    <a class="evento__mas" href="${enlace}" target="_blank" rel="noopener" aria-label="Saber más sobre ${nombre}">
      Saber más ${ICONOS.flecha}
    </a>
  `;
}

function pintarInformacion() {
  const ponente = buscarPonente(actividad.ponente);
  const grupo = buscarGrupo(actividad.organiza);
  const simultaneas = buscarSimultaneas(actividad);
  const descripcion = actividad.descripcion || actividad.resumen || 'Pronto publicaremos más detalles de esta actividad.';

  const datos = [
    { icono: ICONOS.calendario, nombre: 'Día', valor: textoDelDia(buscarDia(actividad.dia)) },
    { icono: ICONOS.reloj, nombre: 'Hora', valor: `${actividad.inicio} – ${actividad.fin}` },
    { icono: ICONOS.pin, nombre: 'Lugar', valor: actividad.lugar || 'Facultad de Minas (salón por confirmar)' },
  ];

  let html = `
    <dl class="evento__datos">
      ${datos.map((dato) => `
        <div>
          <dt>${dato.icono}${dato.nombre}</dt>
          <dd>${dato.valor}</dd>
        </div>
      `).join('')}
    </dl>
  `;

  // Texto de la actividad, con las cifras del torneo si tiene cuadro.
  // Si hay imagen, va al lado del texto (en el celular, encima).
  const texto = `
    <div class="evento__descripcion">
      ${descripcion.split('\n').map((parrafo) => `<p>${parrafo}</p>`).join('')}
    </div>
    ${actividad.bracket ? cifrasDelTorneo(actividad.bracket) : ''}
  `;
  html += actividad.imagen ? `
    <div class="evento__presentacion">
      <img class="evento__imagen" src="${actividad.imagen}" alt="Imagen de ${actividad.titulo}">
      <div>${texto}</div>
    </div>
  ` : texto;

  if (actividad.bracket) {
    html += `
      <h2 class="evento__subtitulo">Cuadro del torneo</h2>
      <p class="evento__nota">Eliminación directa: quien gana su partida pasa a la siguiente ronda y quien pierde queda por fuera.</p>
      ${cuadroDelTorneo(actividad.bracket)}
    `;
  }

  if (actividad.reglas) {
    html += `
      <h2 class="evento__subtitulo">Formato y reglas</h2>
      <dl class="evento__reglas">
        ${actividad.reglas.map((regla) => `
          <div>
            <dt>${regla.titulo}</dt>
            <dd>${regla.texto}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }

  if (ponente) {
    html += `
      <h2 class="evento__subtitulo">Ponente</h2>
      <div class="evento__perfil">
        <span class="evento__avatar ${ponente.foto ? 'evento__avatar--foto' : ''}">${retratoDePonente(ponente)}</span>
        <div>
          <strong>${ponente.nombre || 'Por anunciar'}</strong>
          <span>${ponente.cargo}</span>
          ${ponente.bio ? `<p class="evento__bio">${ponente.bio}</p>` : ''}
          ${saberMas(ponente.enlace, ponente.nombre)}
        </div>
        ${ponente.nombre ? `<span class="evento__credencial">${ponente.credencial}</span>` : ''}
      </div>
    `;
  }

  if (grupo) {
    html += `
      <h2 class="evento__subtitulo">Organiza</h2>
      <div class="evento__perfil">
        ${grupo.logo ? `<span class="evento__avatar"><img src="${grupo.logo}" alt="Logo de ${grupo.nombre}"></span>` : ''}
        <div>
          <strong>${grupo.nombre}</strong>
          <span>${grupo.tipo}</span>
          ${grupo.descripcion ? `<p class="evento__bio">${grupo.descripcion}</p>` : ''}
          ${saberMas(grupo.enlace, grupo.nombre)}
        </div>
      </div>
    `;
  }

  if (simultaneas.length > 0) {
    html += `
      <h2 class="evento__subtitulo">A la misma hora</h2>
      <ul class="evento__simultaneas">
        ${simultaneas.map((otra) => `
          <li>
            <a href="${enlaceActividad(otra.id)}" style="--color: ${TIPOS[otra.tipo].color}">
              <strong>${otra.titulo}</strong>
              <span>${otra.inicio} – ${otra.fin}</span>
              ${ICONOS.flecha}
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  $('#evento-info').innerHTML = html;
  $('#evento-info').style.setProperty('--color', actividad.color || TIPOS[actividad.tipo].color);
}


/* ---------- Torneo (campo bracket) ---------- */

// En cada ronda queda la mitad de jugadores: con 16 hay 4 rondas y al final un campeón
function cifrasDelTorneo(jugadores) {
  const cifras = [[jugadores, 'jugadores'], [Math.log2(jugadores), 'rondas'], [1, 'campeón']];
  return `
    <ul class="evento__cifras">
      ${cifras.map(([numero, texto]) => `<li><strong>${numero}</strong>${texto}</li>`).join('')}
    </ul>
  `;
}

// Las rondas se nombran contando desde la final hacia atrás
const NOMBRES_DE_RONDA = ['Final', 'Semifinal', 'Cuartos', 'Octavos', 'Dieciseisavos'];

// Cuadro de eliminación directa. Cada ronda tiene la mitad de partidas que la anterior y van
// de a dos ("par"): los ganadores de un par se enfrentan en la ronda siguiente, y la línea en
// forma de ] que dibuja el CSS los lleva hasta allá. En la primera ronda salen "Jugador 1",
// "Jugador 2"...; en las demás, "?" hasta que se sepa quién ganó.
function cuadroDelTorneo(jugadores) {
  let siguienteJugador = 1;
  const partida = (esPrimeraRonda) => {
    const cupos = esPrimeraRonda ? [`Jugador ${siguienteJugador++}`, `Jugador ${siguienteJugador++}`] : ['?', '?'];
    return `
      <div class="cuadro__partida">
        ${cupos.map((cupo) => `<span class="cuadro__cupo ${esPrimeraRonda ? '' : 'cuadro__cupo--vacio'}">${cupo}</span>`).join('')}
      </div>
    `;
  };

  const partidasPorRonda = [];
  for (let partidas = jugadores / 2; partidas >= 1; partidas /= 2) partidasPorRonda.push(partidas);

  const rondas = partidasPorRonda.map((partidas, r) => {
    const pares = partidas === 1
      ? `<li class="cuadro__par cuadro__par--final">${partida(r === 0)}</li>`
      : Array.from({ length: partidas / 2 }, () => `<li class="cuadro__par">${partida(r === 0)}${partida(r === 0)}</li>`).join('');
    return `
      <div class="cuadro__ronda">
        <h3 class="cuadro__nombre">${NOMBRES_DE_RONDA[partidasPorRonda.length - 1 - r]}</h3>
        <ol class="cuadro__partidas">${pares}</ol>
      </div>
    `;
  }).join('');

  return `
    <p class="cuadro__pista">Desliza para ver todo el cuadro →</p>
    <div class="cuadro">
      ${rondas}
      <div class="cuadro__ronda">
        <h3 class="cuadro__nombre">Campeón</h3>
        <div class="cuadro__campeon">
          <span class="cuadro__copa">${dibujarPixeles(PIXELES.copa)}</span>
          <span class="cuadro__cupo cuadro__cupo--campeon">?</span>
        </div>
      </div>
    </div>
  `;
}

// Si el id de la dirección no corresponde a ninguna actividad
function pintarNoEncontrada() {
  $('#evento-portada').innerHTML = `<h1 class="evento-portada__titulo">Actividad no encontrada</h1>`;
  $('#evento-info').innerHTML = `
    <p class="horario__vacio">${ICONOS.ojo} Ningún monstruo por aquí. Vuelve al horario y elige otra actividad.</p>
  `;
}


/* ---------- Arranque ---------- */

if (actividad) {
  pintarPortada();
  pintarInformacion();
} else {
  pintarNoEncontrada();
}
$('#pie-escudo').innerHTML = dibujarEscudo();
