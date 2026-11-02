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

  const todosLosPuntos = personas.map((p) => Number(p.puntos) || 0);
  const maxPuntos = Math.max(100, ...todosLosPuntos);
  const hayPuntosEnJuego = todosLosPuntos.some((p) => p > 0);
  // Niveles únicos de puntaje para empates en podio (dense ranking)
  const tiersConPuntos = [...new Set(todosLosPuntos.filter((p) => p > 0))].sort((a, b) => b - a);
  // La misma persona de antes (o el primer puesto si aún no se ha elegido a nadie)
  const elegido = Math.max(0, personas.findIndex((p) => p.id === idElegido));

  // Crear tarjetas para cada estudiante
  lista.innerHTML = personas.map((persona, i) => {
    const puntos = Number(persona.puntos) || 0;
    const porcentaje = calcularPorcentajeReal(puntos, maxPuntos);
    const usuario = persona.correo?.includes('@') ? persona.correo.split('@')[0] : 'estudiante';
    const monstruo = persona.monstruo || {};
    const colorMonstruo = monstruo.color || '#1667c2';

    // Título del carnet: si es el usuario actual se prioriza su sesión, sino el de su monstruo en la tabla
    const esMiCuenta = usuarioActual && (persona.id === usuarioActual.id || persona.correo === usuarioActual.email);
    const tituloId = (esMiCuenta && usuarioActual.user_metadata?.titulo)
      ? usuarioActual.user_metadata.titulo
      : (persona.monstruo?.titulo || persona.titulo);
    const tituloObj = (typeof buscarTitulo === 'function' ? buscarTitulo(tituloId) : null) || TITULO_BASE;
    const tituloTexto = typeof textoDeTitulo === 'function' ? textoDeTitulo(tituloObj, monstruo.estilo) : tituloObj.nombre;
    const esDebugger = tituloObj.id === 'debugger';
    const esNocturno = tituloObj.id === 'terror-nocturno';

    let tagTitulo = `<span class="asustador-card__titulo-tag">${tituloTexto}</span>`;
    if (esDebugger) {
      tagTitulo = `<span class="asustador-card__titulo-tag asustador-card__titulo-tag--debugger"><span class="glitch-text" data-text="${tituloTexto}">${tituloTexto}</span></span>`;
    } else if (esNocturno) {
      tagTitulo = `<span class="asustador-card__titulo-tag asustador-card__titulo-tag--nocturno">${tituloTexto}</span>`;
    }

    // Sistema de podio con empates:
    // Si nadie tiene puntos todavía, todos comparten el 1° lugar (oro)
    // Si ya hay puntos en juego, se clasifica por niveles de puntaje mayor a 0
    let medalla = null;
    let puestoNumero = i + 1;

    if (!hayPuntosEnJuego) {
      medalla = 'oro';
      puestoNumero = 1;
    } else if (puntos > 0) {
      const tierIndex = tiersConPuntos.indexOf(puntos);
      puestoNumero = tierIndex + 1;
      if (tierIndex === 0) medalla = 'oro';
      else if (tierIndex === 1) medalla = 'plata';
      else if (tierIndex === 2) medalla = 'bronce';
    }

    const claseTarjetaPodio = medalla ? `asustador-card--${medalla}` : '';
    const claseBotonCarnet = medalla ? `asustador-item__carnet--${medalla}` : '';
    let tituloBotonCarnet = 'Ver carnet';
    if (medalla === 'oro') tituloBotonCarnet = 'Ver carnet dorado (1° puesto)';
    else if (medalla === 'plata') tituloBotonCarnet = 'Ver carnet plateado (2° puesto)';
    else if (medalla === 'bronce') tituloBotonCarnet = 'Ver carnet de bronce (3° puesto)';

    return `
      <li class="asustador-item">
        <button type="button" class="asustador-card ${claseTarjetaPodio}" data-indice="${i}" aria-pressed="${i === elegido ? 'true' : 'false'}">
          <div class="asustador-card__posicion asustador-card__posicion--${medalla || 'normal'}">
            <span>${puestoNumero}</span>
          </div>

          <div class="asustador-card__avatar" style="border-color: ${colorMonstruo}">
            ${dibujarMonstruoPersonalizado(monstruo)}
          </div>

          <div class="asustador-card__info">
            <div class="asustador-card__nombre">
              <span>${persona.nombre || 'Estudiante UNAL'}</span>
              ${tagTitulo}
            </div>
            <div class="asustador-card__correo">@${usuario} · UNAL</div>
          </div>

          <div class="asustador-card__puntaje">
            <span class="asustador-card__pts">${puntos} <small>PTS</small></span>
            <span class="asustador-card__porcentaje">${porcentaje}%</span>
          </div>
        </button>
        <button type="button" class="asustador-item__carnet ${claseBotonCarnet}" data-indice="${i}" aria-label="Ver carnet" title="${tituloBotonCarnet}">
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
  const todosLosPuntos = asustadores.map((p) => Number(p.puntos) || 0);
  const hayPuntosEnJuego = todosLosPuntos.some((p) => p > 0);
  const puntos = Number(persona.puntos) || 0;

  // Determinar medalla con empates para el modal del carnet
  let medalla = null;
  if (!hayPuntosEnJuego) {
    medalla = 'oro';
  } else if (puntos > 0) {
    const tiers = [...new Set(todosLosPuntos.filter((p) => p > 0))].sort((a, b) => b - a);
    const tier = tiers.indexOf(puntos);
    if (tier === 0) medalla = 'oro';
    else if (tier === 1) medalla = 'plata';
    else if (tier === 2) medalla = 'bronce';
  }

  // Si la persona es el usuario con sesión activa en este navegador, priorizamos el título de su sesión
  const esMiCuenta = usuarioActual && (persona.id === usuarioActual.id || persona.correo === usuarioActual.email);
  const tituloId = (esMiCuenta && usuarioActual.user_metadata?.titulo)
    ? usuarioActual.user_metadata.titulo
    : (persona.monstruo?.titulo || persona.titulo);

  const titulo = (typeof buscarTitulo === 'function' ? buscarTitulo(tituloId) : null) || TITULO_BASE;
  const contenedor = $('#carnet-modal-carnet');
  contenedor.innerHTML = carnetDeAsustador('', persona.correo, persona.monstruo || {}, titulo, medalla);
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

// Al tocar los cinco stickers seguidos en cierto orden sale una ventana. Los stickers no dan pistas
// mientras tanto. El orden y el código NO están en la página (el repositorio es público): los guarda
// la función reclamar_easter_egg de Supabase, que además recuerda quién lo encontró primero.
// La página le manda los últimos cinco stickers tocados, separados por comas, cada vez que son
// los cinco distintos (por ejemplo 'python,git,cpp,linux,terminal').
const TOTAL_STICKERS = 5;
let stickersTocados = [];

$('.tanque__stickers').addEventListener('click', async (evento) => {
  const sticker = evento.target.closest('.sticker');
  if (!sticker) return;

  stickersTocados = [...stickersTocados, sticker.dataset.sticker].slice(-TOTAL_STICKERS);
  if (new Set(stickersTocados).size < TOTAL_STICKERS) return;

  const { data, error } = await clienteSupabase.rpc('reclamar_easter_egg', { secuencia: stickersTocados.join(',') });
  if (error) {
    console.error('Error al revisar el easter egg:', error);
    return;
  }
  if (data.estado === 'incorrecto') return;

  stickersTocados = [];
  mostrarEasterEgg(data);
});

// data.estado es 'primero' (y trae data.codigo) o 'tarde' si alguien ya lo había encontrado
function mostrarEasterEgg({ estado, codigo }) {
  const esPrimero = estado === 'primero';
  $('#easter-egg-modal').classList.toggle('easter-egg--tarde', !esPrimero);
  $('#easter-egg-titulo').textContent = esPrimero ? 'Conocedor de la informática' : 'Alguien más lo encontró primero...';
  $('#easter-egg-gif').src = esPrimero ? 'img/gato-programador.gif' : 'img/gato-programador-enojado.gif';
  $('#easter-egg-gif').alt = esPrimero ? 'Gato programando en un portátil' : 'Gato programador con gafas, enojado frente al portátil';
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
