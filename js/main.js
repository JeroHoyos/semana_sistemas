/* =============================================
   LÓGICA DE LA PÁGINA
   Toma los datos de data.js y arma cada sección.
   ============================================= */

// '09:30' → 9.5
function enHoras(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas + minutos / 60;
}

// Quita tildes y mayúsculas para que "futbol" encuentre "Fútbol"
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}


/* ---------- Portada ---------- */

function pintarPortada() {
  $('#portada-dias').innerHTML = DIAS
    .map((dia) => `<li>${dia.corto}${dia.fecha ? `<small>${dia.fecha}</small>` : ''}</li>`)
    .join('');
}


/* ---------- Ponentes ---------- */

function pintarPonentes() {
  $('#ponentes-miniaturas').innerHTML = PONENTES.map((ponente, indice) => `
    <button class="miniatura" data-indice="${indice}">
      <span class="miniatura__foto">${retratoDePonente(ponente)}</span>
      <span class="miniatura__nombre">${ponente.nombre || 'Por anunciar'}</span>
    </button>
  `).join('');

  $('#ponentes-miniaturas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.miniatura');
    if (boton) mostrarCarnet(Number(boton.dataset.indice));
  });

  // La rotación se pausa mientras el mouse o el foco del teclado están sobre los ponentes.
  // Al salir vuelve a contar desde cero, así el carnet elegido se ve el tiempo completo.
  const seccion = $('#ponentes');
  seccion.addEventListener('mouseenter', pausarCarnets);
  seccion.addEventListener('mouseleave', rotarCarnets);
  seccion.addEventListener('focusin', pausarCarnets);
  seccion.addEventListener('focusout', rotarCarnets);

  mostrarCarnet(0);
  rotarCarnets();
}

// Cada SEGUNDOS_POR_CARNET pasa solo al siguiente ponente (no rota si la persona pidió menos movimiento)
const SEGUNDOS_POR_CARNET = 7;
let carnetActual = 0;
let temporizadorCarnets;

function rotarCarnets() {
  pausarCarnets();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  temporizadorCarnets = setInterval(() => {
    mostrarCarnet((carnetActual + 1) % PONENTES.length);
  }, SEGUNDOS_POR_CARNET * 1000);
}

function pausarCarnets() {
  clearInterval(temporizadorCarnets);
}

function mostrarCarnet(indice) {
  const ponente = PONENTES[indice];
  carnetActual = indice;

  $$('.miniatura').forEach((boton, i) => boton.setAttribute('aria-pressed', i === indice));

  // Si el ponente tiene una actividad, el carnet lleva a la página de esa actividad
  const actividad = ACTIVIDADES.find((a) => a.ponente === ponente.id);
  if (!actividad) {
    cambiarCarnet(carnetDePonente(ponente));
    return;
  }

  const tipo = TIPOS[actividad.tipo].singular.toLowerCase();
  cambiarCarnet(`
    <a class="carnet-enlace" href="${enlaceActividad(actividad.id)}" aria-label="Ver ${tipo}: ${actividad.titulo}">
      ${carnetDePonente(ponente)}
      <span class="carnet-enlace__texto">Ver su ${tipo} ${ICONOS.flecha}</span>
    </a>
  `);
}

// Carnet tipo credencial universitaria. Si el ponente aún no se ha anunciado, sale "Clasificado".
// --letras ajusta el tamaño del nombre para que quepa en el carnet.
function carnetDePonente(ponente) {
  const esMisterio = !ponente.nombre;
  const nombre = ponente.nombre || '· · ·';

  return `
    <article class="carnet ${esMisterio ? 'carnet--misterio' : ''}">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        <span class="carnet__semana">Semana</span>
        <span class="carnet__sistemas">— de sistemas —</span>
      </div>
      <div class="carnet__nombre" style="--letras: ${nombre.length}">${nombre}</div>
      <div class="carnet__cargo">${ponente.cargo}</div>
      <div class="carnet__franja">${ponente.credencial}</div>
      <div class="carnet__foto">
        ${retratoDePonente(ponente)}
        ${esMisterio ? '<span class="carnet__sello">Clasificado</span>' : ''}
      </div>
    </article>
  `;
}

// El carnet que está sale despacio hacia la izquierda y el nuevo entra desde la derecha.
// turnoCarnet evita que un cambio viejo pise a uno más nuevo si se hace clic muy seguido.
let turnoCarnet = 0;

function cambiarCarnet(html) {
  const contenedor = $('#ponentes-carnet');
  const anterior = contenedor.firstElementChild;
  const turno = ++turnoCarnet;

  if (!anterior || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    contenedor.innerHTML = html;
    return;
  }

  anterior.getAnimations().forEach((animacion) => animacion.cancel());
  anterior.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px)' }],
    { duration: 600, easing: 'ease-in', fill: 'forwards' },
  );
  setTimeout(() => {
    if (turno !== turnoCarnet) return;
    contenedor.innerHTML = html;
    contenedor.firstElementChild.animate(
      [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }],
      { duration: 900, easing: 'ease-out' },
    );
  }, 600);
}


/* ---------- Horario ---------- */

// El horario se guarda en sessionStorage (dura mientras la pestaña esté abierta) para que,
// al entrar a una actividad y volver, siga como estaba: mismo día, pestaña, búsqueda o vista de semana.
const CLAVE_HORARIO = 'horario';

function leerHorarioGuardado() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_HORARIO)) || {};
    // Si cambiaron los datos y ese día o esa pestaña ya no existen, se usan los de siempre
    if (!buscarDia(guardado.dia)) delete guardado.dia;
    if (guardado.tipo !== 'todo' && !TIPOS[guardado.tipo]) delete guardado.tipo;
    return guardado;
  } catch {
    return {};   // el navegador no deja usar sessionStorage: el horario arranca como siempre
  }
}

function guardarHorario() {
  try {
    sessionStorage.setItem(CLAVE_HORARIO, JSON.stringify(estado));
  } catch {
    // sin sessionStorage el horario funciona igual, solo que no se recuerda
  }
}

// Lo que la persona tiene elegido en el horario
const estado = {
  dia: DIAS[0].id,   // día seleccionado
  tipo: 'todo',      // pestaña: 'todo' o una clave de TIPOS
  busqueda: '',      // texto del buscador
  verSemana: false,  // true = cuadrícula con toda la semana
  ...leerHorarioGuardado(),
};

// Crea los botones del horario y les pone sus eventos (se llama una sola vez)
function prepararHorario() {
  $('#horario-dias').innerHTML = DIAS.map((dia, i) => `
    <button class="dia" data-dia="${dia.id}">
      <strong>${dia.corto}</strong>
      <span>${dia.fecha || `Día ${i + 1}`}</span>
    </button>
  `).join('');

  const pestanas = [{ id: 'todo', nombre: 'Todo', color: '#0a2c52' }];
  for (const [id, tipo] of Object.entries(TIPOS)) {
    pestanas.push({ id, nombre: tipo.plural, color: tipo.color });
  }
  $('#horario-pestanas').innerHTML = pestanas.map((pestana) => `
    <button class="pestana" data-tipo="${pestana.id}" style="--color: ${pestana.color}">
      ${pestana.nombre} <span class="pestana__cuenta"></span>
    </button>
  `).join('');

  $('#horario-dias').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.dia');
    if (!boton) return;
    estado.dia = boton.dataset.dia;
    estado.verSemana = false;
    pintarHorario();
  });

  $('#horario-pestanas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.pestana');
    if (!boton) return;
    estado.tipo = boton.dataset.tipo;
    pintarHorario();
  });

  $('#buscador').value = estado.busqueda;   // la búsqueda guardada, si había una
  $('#buscador').addEventListener('input', (evento) => {
    estado.busqueda = evento.target.value.trim();
    pintarHorario();
  });

  $('#ver-semana').addEventListener('click', () => {
    estado.verSemana = !estado.verSemana;
    pintarHorario();
  });
}

// Vuelve a dibujar el horario según el estado actual (y lo guarda para cuando vuelva)
function pintarHorario() {
  guardarHorario();

  // Paso 1: filtrar por día y búsqueda. Al buscar o ver la semana se usan los tres días.
  const usarTodosLosDias = estado.busqueda || estado.verSemana;
  const filtradas = ACTIVIDADES.filter((actividad) =>
    (usarTodosLosDias || actividad.dia === estado.dia) && coincideConBusqueda(actividad));

  // Paso 2: filtrar por la pestaña elegida
  const visibles = filtradas.filter((actividad) => estado.tipo === 'todo' || actividad.tipo === estado.tipo);

  actualizarBotones(filtradas);
  actualizarTitulo(visibles.length);

  $('#horario-lista').hidden = estado.verSemana;
  $('#horario-semana').hidden = !estado.verSemana;

  if (estado.verSemana) {
    pintarSemana(visibles);
  } else {
    pintarLista(visibles);
  }
}

function coincideConBusqueda(actividad) {
  if (!estado.busqueda) return true;

  const ponente = buscarPonente(actividad.ponente);
  const texto = [
    actividad.titulo,
    TIPOS[actividad.tipo].plural,
    buscarDia(actividad.dia).nombre,
    ponente?.nombre,
    ponente?.cargo,
    buscarGrupo(actividad.organiza)?.nombre,
    actividad.lugar,
  ].filter(Boolean).join(' ');

  return normalizar(texto).includes(normalizar(estado.busqueda));
}

// Marca el día, la pestaña y el botón "Semana" activos, y cuenta las actividades de cada pestaña
function actualizarBotones(filtradas) {
  $$('.dia').forEach((boton) => {
    const activo = !estado.busqueda && !estado.verSemana && boton.dataset.dia === estado.dia;
    boton.setAttribute('aria-pressed', activo);
  });

  $$('.pestana').forEach((boton) => {
    const tipo = boton.dataset.tipo;
    const cuantas = filtradas.filter((actividad) => tipo === 'todo' || actividad.tipo === tipo).length;
    boton.querySelector('.pestana__cuenta').textContent = `(${cuantas})`;
    boton.setAttribute('aria-pressed', tipo === estado.tipo);
    boton.classList.toggle('pestana--vacia', cuantas === 0);
  });

  $('#ver-semana').setAttribute('aria-pressed', estado.verSemana);
}

function actualizarTitulo(cantidad) {
  const actividades = `${cantidad} ${cantidad === 1 ? 'actividad' : 'actividades'}`;
  let titulo;
  let subtitulo;

  if (estado.busqueda) {
    titulo = `Resultados para “${estado.busqueda}”`;
    subtitulo = `${actividades} en toda la semana`;
  } else if (estado.verSemana) {
    titulo = 'Toda la semana';
    subtitulo = `${actividades} programadas`;
  } else {
    const dia = buscarDia(estado.dia);
    const numero = DIAS.indexOf(dia) + 1;
    titulo = `Día ${numero} — ${dia.nombre}${dia.fecha ? `, ${dia.fecha}` : ''}`;
    subtitulo = `${actividades} programadas`;
  }

  $('#horario-titulo').textContent = titulo;
  $('#horario-subtitulo').textContent = subtitulo;
}


/* ---------- Horario: vista de lista ---------- */

function pintarLista(actividades) {
  if (actividades.length === 0) {
    $('#horario-lista').innerHTML = `
      <li class="horario__vacio">${ICONOS.ojo} Ningún monstruo por aquí. Prueba otra búsqueda o pestaña.</li>
    `;
    return;
  }

  $('#horario-lista').innerHTML = actividades.map(tarjetaDeActividad).join('');
}

function tarjetaDeActividad(actividad) {
  const tipo = TIPOS[actividad.tipo];
  const ponente = buscarPonente(actividad.ponente);
  const grupo = buscarGrupo(actividad.organiza);
  const simultaneas = buscarSimultaneas(actividad);

  // Al buscar se mezclan los tres días, así que se muestra el día de cada actividad
  const dia = estado.busqueda ? `${buscarDia(actividad.dia).nombre} · ` : '';

  const detalles = [];
  if (ponente) {
    detalles.push(`<span><span class="avatar">${retratoDePonente(ponente)}</span>${ponente.nombre || 'Por anunciar'}</span>`);
  }
  if (grupo) {
    detalles.push(`<span>${logoDeGrupo(grupo)}Organiza ${grupo.nombre}</span>`);
  }
  if (actividad.lugar) {
    detalles.push(`<span>${ICONOS.pin}${actividad.lugar}</span>`);
  }
  if (simultaneas.length > 0) {
    const nombres = simultaneas.map((otra) => otra.titulo).join(' y ');
    detalles.push(`<span class="actividad__simultanea">${ICONOS.simultanea}A la vez que ${nombres}</span>`);
  }

  // El enlace del título cubre toda la tarjeta (ver .actividad__titulo a::after en el CSS)
  return `
    <li class="actividad" style="--color: ${tipo.color}">
      <span class="actividad__tipo">${ICONOS.ojo}${tipo.singular}</span>
      <h4 class="actividad__titulo"><a href="${enlaceActividad(actividad.id)}">${actividad.titulo}</a></h4>
      <p class="actividad__hora">${dia}${actividad.inicio} – ${actividad.fin}</p>
      <div class="actividad__detalles">${detalles.join('')}</div>
      <span class="actividad__ver">Ver detalles ${ICONOS.flecha}</span>
    </li>
  `;
}


/* ---------- Horario: vista semanal ---------- */

function pintarSemana(visibles) {
  const idsVisibles = visibles.map((actividad) => actividad.id);
  const primeraHora = Math.floor(Math.min(...ACTIVIDADES.map((a) => enHoras(a.inicio))));
  const ultimaHora = Math.ceil(Math.max(...ACTIVIDADES.map((a) => enHoras(a.fin))));

  let horas = '';
  for (let hora = primeraHora; hora < ultimaHora; hora++) {
    horas += `<span>${hora}:00</span>`;
  }

  // Una columna por día, con sus actividades repartidas en carriles
  const columnas = DIAS.map((dia) => {
    const delDia = ACTIVIDADES.filter((actividad) => actividad.dia === dia.id);
    const bloques = repartirEnCarriles(delDia)
      .map((actividad) => bloqueDeActividad(actividad, primeraHora, idsVisibles.includes(actividad.id)))
      .join('');
    return `<div class="semana__columna">${bloques}</div>`;
  }).join('');

  $('#horario-semana').innerHTML = `
    <div class="semana__rejilla">
      <div class="semana__cabecera"></div>
      ${DIAS.map((dia) => `<div class="semana__cabecera">${dia.nombre}</div>`).join('')}
      <div class="semana__horas">${horas}</div>
      ${columnas}
    </div>
  `;
}

// Bloque de una actividad en la cuadrícula. Las que no pasan los filtros salen atenuadas.
// Las variables --desde, --dura, --carril y --carriles ubican el bloque (ver .bloque en el CSS).
function bloqueDeActividad(actividad, primeraHora, esVisible) {
  const tipo = TIPOS[actividad.tipo];
  const atenuado = esVisible ? '' : 'bloque--atenuado';
  const angosto = actividad.carriles > 1 ? 'bloque--angosto' : '';   // comparte la hora con otra
  const posicion = `
    --desde: ${enHoras(actividad.inicio) - primeraHora};
    --dura: ${enHoras(actividad.fin) - enHoras(actividad.inicio)};
    --carril: ${actividad.carril};
    --carriles: ${actividad.carriles};`;

  return `
    <a class="bloque ${atenuado} ${angosto}" href="${enlaceActividad(actividad.id)}" title="${actividad.titulo}"
      style="--color: ${tipo.color}; --fondo: ${tipo.fondo}; ${posicion}">
      <strong>${actividad.titulo}</strong>
      <span class="bloque__lugar">${ICONOS.pin}${actividad.lugar || 'Por confirmar'}</span>
      <span>${actividad.inicio} – ${actividad.fin}</span>
    </a>
  `;
}

// Si dos actividades se cruzan, se ponen lado a lado en "carriles" para que no se tapen.
// Solo se dividen las que se cruzan: el día se parte en grupos de actividades encadenadas
// por sus horas, y cada grupo tiene sus propios carriles. Una actividad sola ocupa todo el ancho.
function repartirEnCarriles(actividades) {
  const resultado = [];
  let grupo = [];
  let carrilLibreDesde = []; // hora en que queda libre cada carril del grupo
  let finDelGrupo = '';      // hora en que termina la última actividad del grupo

  // Cuando se cierra un grupo ya se sabe cuántos carriles usó: todas sus actividades se dividen igual
  const cerrarGrupo = () => {
    grupo.forEach((actividad) => resultado.push({ ...actividad, carriles: carrilLibreDesde.length }));
    grupo = [];
    carrilLibreDesde = [];
  };

  const enOrden = [...actividades].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (const actividad of enOrden) {
    if (actividad.inicio >= finDelGrupo) cerrarGrupo(); // no se cruza con nada del grupo: empieza otro

    let carril = carrilLibreDesde.findIndex((hora) => hora <= actividad.inicio);
    if (carril === -1) carril = carrilLibreDesde.length; // ninguno libre: se abre otro
    carrilLibreDesde[carril] = actividad.fin;
    grupo.push({ ...actividad, carril });
    if (actividad.fin > finDelGrupo) finDelGrupo = actividad.fin;
  }
  cerrarGrupo();

  return resultado;
}


/* ---------- Competencias ---------- */

function pintarCompetencias() {
  const competencias = ACTIVIDADES.filter((actividad) => actividad.tipo === 'competencia');

  $('#competencias-lista').innerHTML = competencias.map((actividad) => {
    const dia = buscarDia(actividad.dia);
    const grupo = buscarGrupo(actividad.organiza);
    return `
      <a class="competencia" href="${enlaceActividad(actividad.id)}" style="--color: ${actividad.color}">
        <span class="competencia__imagen">
          <span class="competencia__dia">${dia.corto}</span>
          ${ICONOS[actividad.icono]}
        </span>
        <span class="competencia__titulo">${ICONOS.ojo}${actividad.titulo}</span>
        <span class="competencia__hora">${dia.nombre} · ${actividad.inicio} – ${actividad.fin}</span>
        <span class="competencia__resumen">${actividad.resumen}</span>
        ${grupo ? `<span class="competencia__organiza">${logoDeGrupo(grupo)}Organiza ${grupo.nombre}</span>` : ''}
      </a>
    `;
  }).join('');
}


/* ---------- Grupos estudiantiles ---------- */

// --letras ajusta el tamaño del nombre para que quepa en el banderín.
// Si el grupo tiene logo, va como un parche redondo sobre el palo.
// Si tiene enlace, el banderín es un link que abre su página en otra pestaña.
function pintarGrupos() {
  $('#grupos-lista').innerHTML = GRUPOS.map((grupo) => {
    const etiqueta = grupo.enlace ? 'a' : 'span';
    const destino = grupo.enlace ? `href="${grupo.enlace}" target="_blank" rel="noopener"` : '';
    return `
      <li class="grupo" style="--color: ${grupo.color}; --letras: ${grupo.nombre.length}">
        <${etiqueta} class="banderin ${grupo.logo ? 'banderin--con-logo' : ''}" ${destino}>
          <span class="banderin__tela"><span class="banderin__nombre">${grupo.nombre}</span></span>
          ${grupo.logo ? `<img class="banderin__logo" src="${grupo.logo}" alt="Logo de ${grupo.nombre}">` : ''}
        </${etiqueta}>
        <span class="grupo__tipo">${grupo.tipo}</span>
      </li>
    `;
  }).join('');
}


/* ---------- Galería ---------- */

const esVideo = (item) => item.archivo.endsWith('.mp4');

// Dos filas que pasan solas en sentidos contrarios; la segunda empieza por la mitad de la lista.
// Cada fila lleva sus fotos dos veces seguidas: la animación llega a la mitad y vuelve al inicio
// sin que se note el salto (ver .galeria__pista en el CSS). Las copias y la segunda fila se ocultan
// a lectores de pantalla y al teclado, para que cada foto se anuncie una sola vez.
function pintarGaleria() {
  const indices = GALERIA.map((_, i) => i);
  const mitad = Math.ceil(GALERIA.length / 2);
  const filas = [indices, [...indices.slice(mitad), ...indices.slice(0, mitad)]];

  const fotos = (orden, oculta) => orden.map((i) => fotoDeGaleria(i, oculta)).join('');

  $('#galeria-carrusel').innerHTML = filas.map((orden, f) => `
    <div class="galeria__fila">
      <div class="galeria__pista">
        <ul class="galeria__grupo" ${f > 0 ? 'aria-hidden="true"' : ''}>${fotos(orden, f > 0)}</ul>
        <ul class="galeria__grupo" aria-hidden="true">${fotos(orden, true)}</ul>
      </div>
    </div>
  `).join('');

  $('#galeria-cuadricula').innerHTML = fotos(indices, false);

  $('#galeria').addEventListener('click', (evento) => {
    const foto = evento.target.closest('.galeria__foto');
    if (foto) abrirVisor(Number(foto.dataset.indice));
  });

  $('#galeria-ver-todo').addEventListener('click', () => {
    const verTodo = $('#galeria-cuadricula').hidden;
    $('#galeria-cuadricula').hidden = !verTodo;
    $('#galeria-carrusel').hidden = verTodo;
    $('#galeria-ver-todo').setAttribute('aria-pressed', verTodo);
    $('#galeria-ver-todo-texto').textContent = verTodo ? 'Ver carrusel' : 'Ver todo';
  });

  vigilarVideos();
}

function fotoDeGaleria(indice, oculta) {
  const item = GALERIA[indice];
  const medio = esVideo(item)
    ? `<video src="${item.archivo}" poster="${item.portada || ''}" muted loop playsinline preload="metadata"
        disablepictureinpicture disableremoteplayback></video>`
    : `<img src="${item.archivo}" alt="" loading="lazy">`;
  return `
    <li>
      <button class="galeria__foto" data-indice="${indice}" aria-label="Ampliar: ${item.texto}" ${oculta ? 'tabindex="-1"' : ''}>
        ${medio}
      </button>
    </li>
  `;
}

// Los videos de la galería solo se reproducen mientras se ven en pantalla
// (y nunca solos si la persona pidió menos movimiento: se ven al ampliarlos).
function vigilarVideos() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const vigilante = new IntersectionObserver((entradas) => {
    entradas.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
  });
  $$('.galeria video').forEach((video) => vigilante.observe(video));
}


/* ---------- Galería: visor ---------- */

let fotoEnVisor = 0;

function abrirVisor(indice) {
  fotoEnVisor = (indice + GALERIA.length) % GALERIA.length;   // de la última pasa a la primera y al revés
  const item = GALERIA[fotoEnVisor];

  $('#visor-medio').innerHTML = esVideo(item)
    ? `<video src="${item.archivo}" poster="${item.portada || ''}" controls autoplay muted loop playsinline
        disablepictureinpicture disableremoteplayback aria-label="${item.texto}"></video>`
    : `<img src="${item.archivo}" alt="${item.texto}">`;
  $('#visor-cuenta').textContent = `${fotoEnVisor + 1} / ${GALERIA.length}`;

  if (!$('#visor').open) $('#visor').showModal();
}

$('#visor-anterior').addEventListener('click', () => abrirVisor(fotoEnVisor - 1));
$('#visor-siguiente').addEventListener('click', () => abrirVisor(fotoEnVisor + 1));
$('#visor-cerrar').addEventListener('click', () => $('#visor').close());

// El visor ocupa toda la pantalla: si el clic no cayó en la foto ni en un botón, se cierra
$('#visor').addEventListener('click', (evento) => {
  if (evento.target === $('#visor')) $('#visor').close();
});

// Flechas del teclado para pasar (salvo en la barra del video, donde adelantan o atrasan)
$('#visor').addEventListener('keydown', (evento) => {
  if (evento.target.tagName === 'VIDEO') return;
  if (evento.key === 'ArrowLeft') abrirVisor(fotoEnVisor - 1);
  if (evento.key === 'ArrowRight') abrirVisor(fotoEnVisor + 1);
});

// Al cerrar se quita el medio para que un video no siga sonando
$('#visor').addEventListener('close', () => {
  $('#visor-medio').innerHTML = '';
});


/* ---------- Arranque ---------- */

pintarPortada();
pintarPonentes();
prepararHorario();
pintarHorario();
pintarCompetencias();
pintarGrupos();
pintarGaleria();
$('#pie-escudo').innerHTML = dibujarEscudo();
