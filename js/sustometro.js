/* =============================================
   SUSTÓMETRO - TANQUE DE SUSTOS MONSTERS INC (ESTILO SISTEMAS)
   Muestra en tiempo real a todas las personas registradas en Supabase (tabla 'perfiles')
   con su avatar personalizado, puntajes reales y el Tanque de Sustos interactivo.
   ============================================= */

const tanqueLiquido = $('#tanque-liquido');
const hudNombre = $('#hud-nombre');
const hudPuntos = $('#hud-puntos');
const rankingContador = $('#ranking-contador');
const lista = $('#sustometro-lista');
const lectura = $('#sustometro-lectura');

let asustadores = [];
// La persona elegida con clic. Se guarda su id (no su puesto) para que siga elegida
// cuando la tabla se vuelve a dibujar porque alguien se registró o ganó puntos.
let idElegido = null;

// Calcula el porcentaje real según los puntos de la persona respecto a la meta o mayor puntaje
function calcularPorcentajeReal(puntos, maxPuntos) {
  if (!puntos || puntos <= 0) return 0;
  const meta = Math.max(100, maxPuntos || 100);
  return Math.min(100, Math.round((puntos / meta) * 100));
}

// Selecciona un asustador y llena/vacía el Tanque de Sustos con animación
function seleccionarAsustador(indice) {
  if (!asustadores || !asustadores.length) return;

  const maxPuntos = Math.max(100, ...asustadores.map((p) => Number(p.puntos) || 0));
  const persona = asustadores[indice];
  idElegido = persona.id;
  const puntos = Number(persona.puntos) || 0;
  const porcentaje = calcularPorcentajeReal(puntos, maxPuntos);
  const usuario = persona.correo?.includes('@') ? persona.correo.split('@')[0] : 'estudiante';
  const nombreLimpio = (persona.nombre || 'Estudiante UNAL').trim();

  // Nivel del líquido en el tanque (0% si tiene 0 puntos)
  if (tanqueLiquido) {
    tanqueLiquido.style.height = `${porcentaje}%`;
  }

  // Pantalla del tanque: nombre y puntos
  if (hudNombre) hudNombre.textContent = nombreLimpio;
  if (hudPuntos) hudPuntos.innerHTML = `${puntos} <small>pts</small>`;

  // Marcar la tarjeta seleccionada en la lista
  $$('.asustador-card').forEach((card, i) => {
    card.setAttribute('aria-pressed', i === indice ? 'true' : 'false');
  });

  // Lectura debajo del tanque (también la anuncian los lectores de pantalla)
  // Los puntos ya salen en la pantalla del tanque: aquí solo va un mensaje
  if (puntos === 0) {
    escribirLectura('¡Participa en las competencias para llenar el tanque de sustos!', nombreLimpio, usuario);
  } else if (indice === 0) {
    escribirLectura('¡Lidera la tabla del Sustómetro!', nombreLimpio, usuario);
  } else {
    escribirLectura(`Va en el puesto ${indice + 1} de la tabla del Sustómetro.`, nombreLimpio, usuario);
  }
}

// Nombre y usuario en su propia línea, y el mensaje debajo.
// Se arma con textContent y no con innerHTML porque el nombre lo escribe cada persona.
function escribirLectura(mensaje, nombre, usuario) {
  if (!lectura) return;

  const partes = [];
  if (nombre) partes.push(Object.assign(document.createElement('strong'), { textContent: nombre }));
  if (usuario) partes.push(Object.assign(document.createElement('small'), { textContent: `@${usuario}` }));
  partes.push(mensaje);
  lectura.replaceChildren(...partes);
}

// Dibuja las tarjetas de los asustadores en la columna derecha
function renderizarRanking(personas) {
  asustadores = personas;
  const total = personas.length;

  if (rankingContador) {
    rankingContador.textContent = `${total} ${total === 1 ? 'Asustador Registrado' : 'Asustadores Registrados'}`;
  }

  if (total === 0) {
    if (tanqueLiquido) tanqueLiquido.style.height = '0%';
    if (hudNombre) hudNombre.textContent = 'Esperando asustadores';
    if (hudPuntos) hudPuntos.innerHTML = '0 <small>pts</small>';

    lista.innerHTML = `
      <li class="ranking-vacio">
        <div class="ranking-vacio__caja">
          <svg class="ranking-vacio__icono-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>El Tanque de Sustos está listo</h3>
          <p>Aún no hay asustadores registrados. Sé la primera persona en emitir tu Carnet de Asustador.</p>
          <button class="portada__boton portada__boton--sesion" id="btn-registrar-vacio" type="button">
            Crear mi Carnet
          </button>
        </div>
      </li>
    `;

    if (lectura) lectura.textContent = 'Aún no hay asustadores registrados.';

    $('#btn-registrar-vacio')?.addEventListener('click', () => {
      if (typeof cambiarModoAuth === 'function') cambiarModoAuth(true);
      $('#auth-modal')?.showModal();
    });
    return;
  }

  const maxPuntos = Math.max(100, ...personas.map((p) => Number(p.puntos) || 0));
  const hayPuntosEnJuego = personas.some((p) => Number(p.puntos) > 0);
  // La misma persona de antes (o el primer puesto si aún no se ha elegido a nadie)
  const elegido = Math.max(0, personas.findIndex((p) => p.id === idElegido));

  // Crear tarjetas para cada estudiante
  lista.innerHTML = personas.map((persona, i) => {
    const puntos = Number(persona.puntos) || 0;
    const porcentaje = calcularPorcentajeReal(puntos, maxPuntos);
    const usuario = persona.correo?.includes('@') ? persona.correo.split('@')[0] : 'estudiante';
    const monstruo = persona.monstruo || {};
    const colorMonstruo = monstruo.color || '#1667c2';

    // Solo se destacan con podio si alguien ya tiene puntos mayores a 0
    let medallaClase = 'normal';
    if (hayPuntosEnJuego && puntos > 0) {
      if (i === 0) medallaClase = 'oro';
      else if (i === 1) medallaClase = 'plata';
      else if (i === 2) medallaClase = 'bronce';
    }

    return `
      <li class="asustador-item">
        <button type="button" class="asustador-card" data-indice="${i}" aria-pressed="${i === elegido ? 'true' : 'false'}">
          <div class="asustador-card__posicion asustador-card__posicion--${medallaClase}">
            <span>${i + 1}</span>
          </div>

          <div class="asustador-card__avatar" style="border-color: ${colorMonstruo}">
            ${dibujarMonstruoPersonalizado(monstruo)}
          </div>

          <div class="asustador-card__info">
            <div class="asustador-card__nombre">${persona.nombre || 'Estudiante UNAL'}</div>
            <div class="asustador-card__correo">@${usuario} · UNAL</div>
          </div>

          <div class="asustador-card__puntaje">
            <span class="asustador-card__pts">${puntos} <small>PTS</small></span>
            <span class="asustador-card__porcentaje">${porcentaje}%</span>
          </div>
        </button>
        <button type="button" class="asustador-item__carnet" data-indice="${i}" aria-label="Ver carnet" title="Ver carnet">
          ${ICONOS.carnet}
        </button>
      </li>
    `;
  }).join('');

  // Pequeña espera para que el tanque se llene con animación
  setTimeout(() => {
    seleccionarAsustador(elegido);
  }, 100);
}

// Abre la ventana con el carnet de una persona de la tabla
function mostrarCarnetDe(indice) {
  const persona = asustadores[indice];
  const contenedor = $('#carnet-modal-carnet');
  contenedor.innerHTML = carnetDeAsustador('', persona.correo, persona.monstruo || {});
  // El nombre lo escribe cada persona: se pone con textContent para que no se lea como HTML
  contenedor.querySelector('.carnet__nombre').textContent = (persona.nombre || 'Estudiante UNAL').trim();
  $('#carnet-modal').showModal();
}

// Consulta Supabase con fallback si 'puntos' aún no existe
async function cargarSustometro() {
  try {
    let { data: perfiles, error } = await clienteSupabase
      .from('perfiles')
      .select('id, nombre, correo, monstruo, puntos, creado_en')
      .order('puntos', { ascending: false })
      .order('creado_en', { ascending: true });

    // Fallback: si aún no ejecutaron el script de la columna puntos en Supabase
    if (error && error.message && error.message.includes('puntos')) {
      const fallback = await clienteSupabase
        .from('perfiles')
        .select('id, nombre, correo, monstruo, creado_en')
        .order('creado_en', { ascending: true });
      perfiles = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error al cargar perfiles:', error);
      mostrarErrorSustometro('No se pudo sincronizar con Supabase. Revisa las políticas RLS de lectura.');
      return;
    }

    renderizarRanking(perfiles || []);
  } catch (err) {
    console.error('Error inesperado:', err);
    mostrarErrorSustometro('Ocurrió un error inesperado al conectar con el servidor.');
  }
}

function mostrarErrorSustometro(mensaje) {
  if (tanqueLiquido) tanqueLiquido.style.height = '0%';
  if (rankingContador) rankingContador.textContent = 'Error de Conexión';
  if (hudNombre) hudNombre.textContent = 'Sin conexión';

  lista.innerHTML = `
    <li class="ranking-error">
      <div class="ranking-vacio__caja">
        <svg class="ranking-vacio__icono-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Error al consultar la tabla</h3>
        <p>${mensaje}</p>
        <button class="portada__boton portada__boton--sesion" onclick="cargarSustometro()" type="button">
          Reintentar conexión
        </button>
      </div>
    </li>
  `;

  if (lectura) lectura.textContent = 'Error al consultar los asustadores.';
}

// Eventos de interacción (clic y teclado). La persona elegida se queda en el tanque hasta elegir otra.
// El botón del carnet también la elige, además de abrir su carnet.
lista.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.asustador-card, .asustador-item__carnet');
  if (!boton) return;

  seleccionarAsustador(Number(boton.dataset.indice));
  if (boton.matches('.asustador-item__carnet')) mostrarCarnetDe(Number(boton.dataset.indice));
});

lista.addEventListener('focusin', (evento) => {
  const card = evento.target.closest('.asustador-card');
  if (card) {
    seleccionarAsustador(Number(card.dataset.indice));
  }
});

$('#btn-cerrar-carnet').addEventListener('click', () => $('#carnet-modal').close());

// Un clic en el fondo oscuro (fuera de la caja) cierra la ventana
$('#carnet-modal').addEventListener('click', (evento) => {
  if (evento.target === $('#carnet-modal')) $('#carnet-modal').close();
});


/* ---------- Easter egg de los stickers del tanque ---------- */

// Cada sticker tocado en el orden correcto se queda levantado; si uno se toca fuera de orden,
// todos vuelven a su sitio con una sacudida. Al levantar los cinco sale una ventana.
// El orden está aquí para poder levantar cada sticker, y también en la función reclamar_easter_egg
// de Supabase (si se cambia, hay que cambiarlo en los dos). El código del premio solo está en
// Supabase, que además recuerda quién lo encontró primero.
const ORDEN_STICKERS = ['terminal', 'cpp', 'linux', 'python', 'git'];
let stickersLevantados = 0;

function bajarStickers() {
  stickersLevantados = 0;
  $$('.sticker--levantado').forEach((sticker) => sticker.classList.remove('sticker--levantado'));
}

$('.tanque__stickers').addEventListener('click', async (evento) => {
  const sticker = evento.target.closest('.sticker');
  if (!sticker) return;

  if (sticker.dataset.sticker !== ORDEN_STICKERS[stickersLevantados]) {
    bajarStickers();
    const stickers = $('.tanque__stickers');
    stickers.classList.remove('tanque__stickers--error');
    void stickers.offsetWidth;   // reinicia la animación si se falla dos veces seguidas
    stickers.classList.add('tanque__stickers--error');
    // Si el que falló es el primero del orden, cuenta como el inicio de un nuevo intento
    if (sticker.dataset.sticker !== ORDEN_STICKERS[0]) return;
  }

  sticker.classList.add('sticker--levantado');
  stickersLevantados++;
  if (stickersLevantados < ORDEN_STICKERS.length) return;

  const { data, error } = await clienteSupabase.rpc('reclamar_easter_egg', { secuencia: ORDEN_STICKERS.join(',') });
  bajarStickers();
  if (error) {
    console.error('Error al revisar el easter egg:', error);
    return;
  }
  if (data.estado !== 'incorrecto') mostrarEasterEgg(data);
});

// data.estado es 'primero' (y trae data.codigo) o 'tarde' si alguien ya lo había encontrado
function mostrarEasterEgg({ estado, codigo }) {
  const esPrimero = estado === 'primero';
  $('#easter-egg-modal').classList.toggle('easter-egg--tarde', !esPrimero);
  // Las huellas van en su propio span para quitarles el contorno blanco del título
  $('#easter-egg-titulo').innerHTML = esPrimero
    ? 'Conocedor de la informática'
    : 'Alguien más lo encontró primero...&nbsp;<span class="easter-egg__huellas">🐾</span>';
  $('#easter-egg-premio').hidden = !esPrimero;
  $('#easter-egg-codigo').textContent = codigo ?? '';
  $('#easter-egg-modal').showModal();
}

// La ventana va decorada con copias de los cinco stickers del tanque
$('#easter-egg-stickers').append(...[...$$('.tanque__stickers .sticker__svg')].map((svg) => svg.cloneNode(true)));

$('#btn-cerrar-easter-egg').addEventListener('click', () => $('#easter-egg-modal').close());

$('#easter-egg-modal').addEventListener('click', (evento) => {
  if (evento.target === $('#easter-egg-modal')) $('#easter-egg-modal').close();
});

// Suscripción en tiempo real a Supabase
try {
  clienteSupabase
    .channel('cambios-perfiles-sustometro')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => {
      cargarSustometro();
    })
    .subscribe();

  clienteSupabase.auth.onAuthStateChange(() => {
    cargarSustometro();
  });
} catch (e) {
  console.log('Realtime no disponible en este cliente');
}

// Cabecera: tres dibujos pixel art, como en la página de una actividad
$('#sustometro-adornos').innerHTML = ['monstruoSusto', 'tanqueSustos', 'fantasma'].map((nombre) => dibujarPixeles(PIXELES[nombre])).join('');

// Escudo en el pie de página
if ($('#pie-escudo')) {
  $('#pie-escudo').innerHTML = dibujarEscudo();
}

// Cargar datos
cargarSustometro();
