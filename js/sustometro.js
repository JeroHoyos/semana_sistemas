/* =============================================
   SUSTÓMETRO - TANQUE DE SUSTOS MONSTERS INC (ESTILO SISTEMAS)
   Muestra en tiempo real a todas las personas registradas en Supabase (tabla 'perfiles')
   con su avatar personalizado, puntajes reales y el Tanque de Sustos interactivo.
   ============================================= */

const tanqueLiquido = $('#tanque-liquido');
const hudPorcentaje = $('#hud-porcentaje');
const hudNombre = $('#hud-nombre');
const hudPuntos = $('#hud-puntos');
const hudEstado = $('#hud-estado');
const rankingContador = $('#ranking-contador');
const lista = $('#sustometro-lista');
const lectura = $('#sustometro-lectura');

let asustadores = [];
let indiceActual = 0;

// Calcula el porcentaje real según los puntos de la persona respecto a la meta o mayor puntaje
function calcularPorcentajeReal(puntos, maxPuntos) {
  if (!puntos || puntos <= 0) return 0;
  const meta = Math.max(100, maxPuntos || 100);
  return Math.min(100, Math.round((puntos / meta) * 100));
}

// Selecciona un asustador y llena/vacía el Tanque de Sustos con animación
function seleccionarAsustador(indice) {
  if (!asustadores || !asustadores.length) return;
  indiceActual = indice;

  const maxPuntos = Math.max(100, ...asustadores.map((p) => Number(p.puntos) || 0));
  const persona = asustadores[indice];
  const puntos = Number(persona.puntos) || 0;
  const porcentaje = calcularPorcentajeReal(puntos, maxPuntos);
  const usuario = persona.correo?.includes('@') ? persona.correo.split('@')[0] : 'estudiante';
  const nombreLimpio = (persona.nombre || 'Estudiante UNAL').trim();

  // Nivel del líquido en el tanque (0% si tiene 0 puntos)
  if (tanqueLiquido) {
    tanqueLiquido.style.height = `${porcentaje}%`;
  }

  // Actualizar pantalla HUD digital de Sistemas
  if (hudPorcentaje) hudPorcentaje.textContent = `${porcentaje}%`;
  if (hudNombre) hudNombre.textContent = `> ${nombreLimpio.toUpperCase()}`;
  if (hudPuntos) hudPuntos.textContent = `${puntos} PTS`;
  if (hudEstado) {
    if (puntos === 0) {
      hudEstado.textContent = 'STANDBY';
      hudEstado.style.color = '#38bdf8';
    } else if (indice === 0) {
      hudEstado.textContent = 'MÁXIMO SUSTO';
      hudEstado.style.color = '#ff3366';
    } else {
      hudEstado.textContent = 'ENERGÍA ACTIVA';
      hudEstado.style.color = '#38bdf8';
    }
  }

  // Marcar la tarjeta seleccionada en la lista
  $$('.asustador-card').forEach((card, i) => {
    card.setAttribute('aria-pressed', i === indice ? 'true' : 'false');
  });

  // Lectura accesible para lectores de pantalla
  if (lectura) {
    if (puntos === 0) {
      lectura.textContent = `${nombreLimpio} (@${usuario}) tiene 0 puntos acumulados. ¡Participa en las competencias para llenar el tanque de sustos!`;
    } else if (indice === 0) {
      lectura.textContent = `${nombreLimpio} (@${usuario}) lidera la tabla con ${puntos} pts: ¡tanque calibrado al ${porcentaje} %!`;
    } else {
      lectura.textContent = `${nombreLimpio} (@${usuario}) tiene ${puntos} pts: tanque calibrado al ${porcentaje} %.`;
    }
  }
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
    if (hudPorcentaje) hudPorcentaje.textContent = '0%';
    if (hudNombre) hudNombre.textContent = '> ESPERANDO ASUSTADORES';
    if (hudPuntos) hudPuntos.textContent = '0 PTS';
    if (hudEstado) hudEstado.textContent = 'STANDBY';

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
        <button type="button" class="asustador-card" data-indice="${i}" aria-pressed="${i === 0 ? 'true' : 'false'}">
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
      </li>
    `;
  }).join('');

  // Seleccionar el primero sin inflar el tanque artificialmente
  setTimeout(() => {
    seleccionarAsustador(0);
  }, 100);
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
  if (hudEstado) hudEstado.textContent = 'DESCONECTADO';

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

// Eventos de interacción (click, hover y teclado)
lista.addEventListener('click', (evento) => {
  const card = evento.target.closest('.asustador-card');
  if (card) {
    seleccionarAsustador(Number(card.dataset.indice));
  }
});

lista.addEventListener('focusin', (evento) => {
  const card = evento.target.closest('.asustador-card');
  if (card) {
    seleccionarAsustador(Number(card.dataset.indice));
  }
});

lista.addEventListener('pointerover', (evento) => {
  const card = evento.target.closest('.asustador-card');
  if (card && evento.pointerType === 'mouse') {
    seleccionarAsustador(Number(card.dataset.indice));
  }
});

// Al salir del área de tarjetas con el mouse, vuelve al primer puesto
lista.addEventListener('pointerleave', (evento) => {
  if (evento.pointerType === 'mouse') {
    seleccionarAsustador(0);
  }
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

// Escudo en el pie de página
if ($('#pie-escudo')) {
  $('#pie-escudo').innerHTML = dibujarEscudo();
}

// Cargar datos
cargarSustometro();
