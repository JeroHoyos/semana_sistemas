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

// La tarjeta se arma por secciones, en este orden. Cada sección devuelve su HTML,
// o '' si la actividad no tiene ese dato, así que solo aparecen las que aplican.
function pintarInformacion() {
  $('#evento-info').innerHTML = [
    seccionDeDatos(),
    seccionDeDescripcion(),
    seccionDelVideo(actividad.video),
    seccionDeReglas(actividad.reglas),
    seccionDelPonente(buscarPonente(actividad.ponente)),
    seccionDelGrupo(buscarGrupo(actividad.organiza)),
    seccionDeSimultaneas(buscarSimultaneas(actividad)),
  ].join('');
  $('#evento-info').style.setProperty('--color', actividad.color || TIPOS[actividad.tipo].color);

  ajustarImagenAncha();
}

// Día, hora y lugar
function seccionDeDatos() {
  const datos = [
    { icono: ICONOS.calendario, nombre: 'Día', valor: textoDelDia(buscarDia(actividad.dia)) },
    { icono: ICONOS.reloj, nombre: 'Hora', valor: `${actividad.inicio} – ${actividad.fin}` },
    { icono: ICONOS.pin, nombre: 'Lugar', valor: actividad.lugar || 'Facultad de Minas (salón por confirmar)' },
  ];

  return `
    <dl class="evento__datos">
      ${datos.map((dato) => `
        <div>
          <dt>${dato.icono}${dato.nombre}</dt>
          <dd>${dato.valor}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

// Texto de la actividad (cada \n es un párrafo), con sus cifras debajo si tiene.
// Si hay imagen, va al lado del texto (en el celular, encima).
function seccionDeDescripcion() {
  const descripcion = actividad.descripcion || actividad.resumen || 'Pronto publicaremos más detalles de esta actividad.';
  const texto = `
    <div class="evento__descripcion">
      ${descripcion.split('\n').map((parrafo) => `<p>${parrafo}</p>`).join('')}
    </div>
    ${actividad.cifras ? recuadrosDeCifras(actividad.cifras) : ''}
  `;

  if (!actividad.imagen) return texto;

  return `
    <div class="evento__presentacion">
      <img class="evento__imagen" src="${actividad.imagen}" alt="Imagen de ${actividad.titulo}">
      <div>${texto}</div>
    </div>
  `;
}

// Recuadros con un dato grande y su nombre debajo, por ejemplo "16 / jugadores" (campo cifras)
function recuadrosDeCifras(cifras) {
  return `
    <ul class="evento__cifras">
      ${cifras.map((cifra) => `<li><strong>${cifra.valor}</strong>${cifra.nombre}</li>`).join('')}
    </ul>
  `;
}

// Video de YouTube (campo video). Se usa youtube-nocookie para no dejar cookies hasta que le den play.
function seccionDelVideo(video) {
  if (!video) return '';

  return `
    <h2 class="evento__subtitulo">Para entrar en calor</h2>
    <iframe class="evento__video" src="https://www.youtube-nocookie.com/embed/${video.id}"
      title="${video.titulo}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
  `;
}

function seccionDeReglas(reglas) {
  if (!reglas) return '';

  return `
    <h2 class="evento__subtitulo">Formato y reglas</h2>
    <dl class="evento__reglas">
      ${reglas.map((regla) => `
        <div>
          <dt>${regla.titulo}</dt>
          <dd>${regla.texto}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function seccionDelPonente(ponente) {
  if (!ponente) return '';

  const bio = ponente.bio
    ? ponente.bio.split('\n').map((parrafo) => `<p class="evento__bio">${parrafo}</p>`).join('')
    : '';

  return `
    <h2 class="evento__subtitulo">Ponente</h2>
    <div class="evento__perfil">
      <span class="evento__avatar ${ponente.foto ? 'evento__avatar--foto' : ''}">${retratoDePonente(ponente)}</span>
      <div>
        <strong>${ponente.nombre || 'Por anunciar'}</strong>
        <span>${ponente.cargo}</span>
        ${bio}
        ${saberMas(ponente.enlace, ponente.nombre)}
      </div>
    </div>
  `;
}

function seccionDelGrupo(grupo) {
  if (!grupo) return '';

  return `
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

// "Saber más →" debajo de un ponente o grupo; abre su LinkedIn, red social o página en otra pestaña
function saberMas(enlace, nombre) {
  if (!enlace) return '';

  return `
    <a class="evento__mas" href="${enlace}" target="_blank" rel="noopener" aria-label="Saber más sobre ${nombre}">
      Saber más ${ICONOS.flecha}
    </a>
  `;
}

// Las demás actividades que pasan a la misma hora, con enlace a cada una
function seccionDeSimultaneas(simultaneas) {
  if (simultaneas.length === 0) return '';

  return `
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

// Si la imagen es ancha (como la de Just Dance), se le da más espacio que a una cuadrada.
// Su tamaño solo se conoce cuando termina de cargar.
function ajustarImagenAncha() {
  const imagen = $('.evento__imagen');
  if (!imagen) return;

  const medir = () => imagen.parentElement.classList.toggle(
    'evento__presentacion--ancha', imagen.naturalWidth > imagen.naturalHeight * 1.2);

  if (imagen.complete) medir();
  else imagen.addEventListener('load', medir);
}


/* ---------- Actividad que no existe ---------- */

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
