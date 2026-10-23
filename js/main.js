/* =============================================
   LÓGICA DE LA PÁGINA
   Toma los datos de data.js y arma cada sección.
   ============================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const buscarDia = (id) => DIAS.find((dia) => dia.id === id);
const buscarPonente = (id) => PONENTES.find((ponente) => ponente.id === id);

// '09:30' → 9.5
function enHoras(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas + minutos / 60;
}

// Quita tildes y mayúsculas para que "futbol" encuentre "Fútbol"
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Dos actividades se cruzan si son el mismo día y sus horas se solapan.
// Las horas 'HH:MM' se pueden comparar directamente como texto.
function seCruzan(a, b) {
  return a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin;
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
      ${dibujarMonstruo(ponente.color, !ponente.nombre)}
    </button>
  `).join('');

  $('#ponentes-miniaturas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.miniatura');
    if (boton) mostrarCarnet(Number(boton.dataset.indice));
  });

  mostrarCarnet(0);
}

function mostrarCarnet(indice) {
  const ponente = PONENTES[indice];
  const esMisterio = !ponente.nombre;

  $$('.miniatura').forEach((boton, i) => boton.setAttribute('aria-pressed', i === indice));

  $('#ponentes-carnet').innerHTML = `
    <article class="carnet ${esMisterio ? 'carnet--misterio' : ''}">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        <span class="carnet__semana">Semana</span>
        <span class="carnet__sistemas">— de sistemas —</span>
      </div>
      <div class="carnet__nombre">${ponente.nombre || '· · ·'}</div>
      <div class="carnet__cargo">${ponente.cargo}</div>
      <div class="carnet__franja">${ponente.credencial}</div>
      <div class="carnet__foto">
        ${dibujarMonstruo(ponente.color, esMisterio)}
        ${esMisterio ? '<span class="carnet__sello">Clasificado</span>' : ''}
      </div>
    </article>
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
  const simultaneas = ACTIVIDADES.filter((otra) => otra !== actividad && seCruzan(otra, actividad));

  // Al buscar se mezclan los tres días, así que se muestra el día de cada actividad
  const dia = estado.busqueda ? `${buscarDia(actividad.dia).nombre} · ` : '';

  const detalles = [];
  if (ponente) {
    detalles.push(`<span><span class="avatar">${dibujarMonstruo(ponente.color, !ponente.nombre)}</span>${ponente.nombre || 'Por anunciar'}</span>`);
  }
  if (actividad.lugar) {
    detalles.push(`<span>${ICONOS.pin}${actividad.lugar}</span>`);
  }
  if (simultaneas.length > 0) {
    const nombres = simultaneas.map((otra) => otra.titulo).join(' y ');
    detalles.push(`<span class="actividad__simultanea">${ICONOS.simultanea}A la vez que ${nombres}</span>`);
  }

  return `
    <li class="actividad" id="actividad-${actividad.id}" style="--color: ${tipo.color}">
      <span class="actividad__tipo">${ICONOS.ojo}${tipo.singular}</span>
      <h4 class="actividad__titulo">${actividad.titulo}</h4>
      <p class="actividad__hora">${dia}${actividad.inicio} – ${actividad.fin}</p>
      <div class="actividad__detalles">${detalles.join('')}</div>
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
    const { actividades, totalCarriles } = repartirEnCarriles(delDia);

    const bloques = actividades.map((actividad) => {
      const tipo = TIPOS[actividad.tipo];
      const atenuado = idsVisibles.includes(actividad.id) ? '' : 'bloque--atenuado';
      // Las variables --desde, --dura, --carril y --carriles ubican el bloque (ver .bloque en el CSS)
      const posicion = `
        --desde: ${enHoras(actividad.inicio) - primeraHora};
        --dura: ${enHoras(actividad.fin) - enHoras(actividad.inicio)};
        --carril: ${actividad.carril};
        --carriles: ${totalCarriles};`;
      return `
        <button class="bloque ${atenuado}" data-ir="${actividad.id}"
          style="--color: ${tipo.color}; --fondo: ${tipo.fondo}; ${posicion}">
          <strong>${actividad.titulo}</strong>
          <span>${actividad.inicio} – ${actividad.fin}</span>
        </button>
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

// Si dos actividades se cruzan, se ponen lado a lado en "carriles" para que no se tapen
function repartirEnCarriles(actividades) {
  const carrilLibreDesde = []; // hora en que queda libre cada carril

  const conCarril = actividades.map((actividad) => {
    let carril = carrilLibreDesde.findIndex((hora) => hora <= actividad.inicio);
    if (carril === -1) carril = carrilLibreDesde.length; // ninguno libre: se abre otro
    carrilLibreDesde[carril] = actividad.fin;
    return { ...actividad, carril };
  });

  return { actividades: conCarril, totalCarriles: carrilLibreDesde.length };
}


/* ---------- Ir a una actividad del horario ---------- */

// Muestra la actividad en la lista del horario y la resalta un momento
function irAActividad(id) {
  const actividad = ACTIVIDADES.find((a) => a.id === id);

  estado.dia = actividad.dia;
  estado.tipo = 'todo';
  estado.busqueda = '';
  estado.verSemana = false;
  $('#buscador').value = '';
  pintarHorario();

  const tarjeta = document.getElementById(`actividad-${id}`);
  tarjeta.scrollIntoView({ block: 'center' });
  tarjeta.classList.add('actividad--resaltada');
  setTimeout(() => tarjeta.classList.remove('actividad--resaltada'), 1800);
}

// Cualquier elemento con data-ir="id" lleva a esa actividad (tarjetas de competencias y bloques de la semana)
document.addEventListener('click', (evento) => {
  const enlace = evento.target.closest('[data-ir]');
  if (enlace) irAActividad(enlace.dataset.ir);
});


/* ---------- Competencias ---------- */

function pintarCompetencias() {
  const competencias = ACTIVIDADES.filter((actividad) => actividad.tipo === 'competencia');

  $('#competencias-lista').innerHTML = competencias.map((actividad) => {
    const dia = buscarDia(actividad.dia);
    return `
      <button class="competencia" data-ir="${actividad.id}" style="--color: ${actividad.color}">
        <span class="competencia__imagen">
          <span class="competencia__dia">${dia.corto}</span>
          ${ICONOS[actividad.icono]}
        </span>
        <span class="competencia__titulo">${ICONOS.ojo}${actividad.titulo}</span>
        <span class="competencia__hora">${dia.nombre} · ${actividad.inicio} – ${actividad.fin}</span>
        <span class="competencia__resumen">${actividad.resumen}</span>
      </button>
    `;
  }).join('');
}


/* ---------- Arranque ---------- */

pintarPortada();
pintarPonentes();
prepararHorario();
pintarHorario();
pintarCompetencias();
$('#pie-escudo').innerHTML = dibujarEscudo();
