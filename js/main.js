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
    <button class="miniatura" data-indice="${indice}" aria-label="${ponente.nombre || ponente.cargo}">
      ${retratoDePonente(ponente)}
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
const SEGUNDOS_POR_CARNET = 5;
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
  const esMisterio = !ponente.nombre;
  carnetActual = indice;

  $$('.miniatura').forEach((boton, i) => boton.setAttribute('aria-pressed', i === indice));

  const carnet = `
    <article class="carnet ${esMisterio ? 'carnet--misterio' : ''}">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        <span class="carnet__semana">Semana</span>
        <span class="carnet__sistemas">— de sistemas —</span>
      </div>
      <div class="carnet__nombre" style="--letras: ${(ponente.nombre || '· · ·').length}">${ponente.nombre || '· · ·'}</div>
      <div class="carnet__cargo">${ponente.cargo}</div>
      <div class="carnet__franja">${ponente.credencial}</div>
      <div class="carnet__foto">
        ${retratoDePonente(ponente)}
        ${esMisterio ? '<span class="carnet__sello">Clasificado</span>' : ''}
      </div>
    </article>
  `;

  // Si el ponente tiene una actividad, el carnet lleva a la página de esa actividad
  const actividad = ACTIVIDADES.find((a) => a.ponente === ponente.id);
  if (!actividad) {
    $('#ponentes-carnet').innerHTML = carnet;
    return;
  }

  const tipo = TIPOS[actividad.tipo].singular.toLowerCase();
  $('#ponentes-carnet').innerHTML = `
    <a class="carnet-enlace" href="${enlaceActividad(actividad.id)}" aria-label="Ver ${tipo}: ${actividad.titulo}">
      ${carnet}
      <span class="carnet-enlace__texto">Ver su ${tipo} ${ICONOS.flecha}</span>
    </a>
  `;
}


/* ---------- Horario ---------- */

// Lo que la persona tiene elegido en el horario
const estado = {
  dia: DIAS[0].id,   // día seleccionado
  tipo: 'todo',      // pestaña: 'todo' o una clave de TIPOS
  busqueda: '',      // texto del buscador
  verSemana: false,  // true = cuadrícula con toda la semana
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

  $('#buscador').addEventListener('input', (evento) => {
    estado.busqueda = evento.target.value.trim();
    pintarHorario();
  });

  $('#ver-semana').addEventListener('click', () => {
    estado.verSemana = !estado.verSemana;
    pintarHorario();
  });
}

// Vuelve a dibujar el horario según el estado actual
function pintarHorario() {
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

  const columnas = DIAS.map((dia) => {
    const delDia = ACTIVIDADES.filter((actividad) => actividad.dia === dia.id);

    const bloques = repartirEnCarriles(delDia).map((actividad) => {
      const tipo = TIPOS[actividad.tipo];
      const atenuado = idsVisibles.includes(actividad.id) ? '' : 'bloque--atenuado';
      // Las variables --desde, --dura, --carril y --carriles ubican el bloque (ver .bloque en el CSS)
      const posicion = `
        --desde: ${enHoras(actividad.inicio) - primeraHora};
        --dura: ${enHoras(actividad.fin) - enHoras(actividad.inicio)};
        --carril: ${actividad.carril};
        --carriles: ${actividad.carriles};`;
      return `
        <a class="bloque ${atenuado}" href="${enlaceActividad(actividad.id)}"
          style="--color: ${tipo.color}; --fondo: ${tipo.fondo}; ${posicion}">
          <strong>${actividad.titulo}</strong>
          <span>${actividad.inicio} – ${actividad.fin}</span>
        </a>
      `;
    }).join('');

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


/* ---------- Arranque ---------- */

pintarPortada();
pintarPonentes();
prepararHorario();
pintarHorario();
pintarCompetencias();
pintarGrupos();
$('#pie-escudo').innerHTML = dibujarEscudo();
