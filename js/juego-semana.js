/* =============================================
   JUEGO DE LA SEMANA (consola retro del Sustómetro)
   La consola no sabe de qué se trata el juego: pone la pantalla, los controles (teclado,
   cruceta y deslizar el dedo), el sonido, y guarda el puntaje en Supabase al terminar.
   Para cambiar de juego basta con cambiar JUEGO_DE_LA_SEMANA (y cargar su archivo en sustometro.html).

   Supabase: tabla puntajes_juego y funciones registrar_puntaje_juego y ranking_juego
   (supabase/juego-de-la-semana.sql). Sin sesión se puede jugar, pero el puntaje no entra a la tabla.
   ============================================= */

const JUEGO_DE_LA_SEMANA = {
  id: 'snake',             // así se guarda en Supabase
  nombre: 'Snake',
  semana: 1,
  crear: crearSnake,
};

const consola = $('#consola');
const pantallaConsola = $('#consola-pantalla');
const lienzoConsola = $('#consola-lienzo');
const LIMITE_RECORDS = 10;

// Mejor puntaje de la cuenta con sesión abierta (el de Supabase)
let recordEnLinea = 0;
// El mejor puntaje que se hizo sin sesión: se guarda apenas la persona inicie sesión
let puntajePendiente = 0;


/* ---------- Pequeñas ayudas ---------- */

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 120 → "0120": los puntajes de la pantalla van con cuatro cifras, como en las maquinitas
const cuatroCifras = (n) => String(Math.max(0, n)).padStart(4, '0');

// localStorage puede fallar (ventana privada, sitio bloqueado): nunca debe romper el juego
function leerLocal(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor === null ? porDefecto : JSON.parse(valor);
  } catch {
    return porDefecto;
  }
}
function guardarLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: no pasa nada
  }
}

const CLAVE_RECORD_LOCAL = `juego_semana_record_${JUEGO_DE_LA_SEMANA.id}`;
const CLAVE_SONIDO = 'juego_semana_sonido';


/* ---------- Sonido: pitidos de 8 bits con Web Audio ---------- */

const sonido = {
  activo: leerLocal(CLAVE_SONIDO, true),
  contexto: null,

  // [frecuencia, duración, retraso, forma de onda]
  NOTAS: {
    inicio: [[523, 0.07, 0], [784, 0.1, 0.08]],
    bug: [[880, 0.04, 0], [1320, 0.06, 0.04]],
    tinto: [[660, 0.06, 0], [880, 0.06, 0.07], [1320, 0.12, 0.14]],
    fin: [[392, 0.12, 0, 'sawtooth'], [294, 0.14, 0.13, 'sawtooth'], [196, 0.32, 0.28, 'sawtooth']],
    record: [[523, 0.08, 0], [659, 0.08, 0.09], [784, 0.08, 0.18], [1047, 0.24, 0.27]],
    pausa: [[440, 0.06, 0]],
  },

  tocar(nombre) {
    if (!this.activo || !this.NOTAS[nombre]) return;
    try {
      this.contexto ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.contexto.state === 'suspended') this.contexto.resume();
      const ahora = this.contexto.currentTime;
      for (const [frecuencia, duracion, retraso, forma = 'square'] of this.NOTAS[nombre]) {
        const oscilador = this.contexto.createOscillator();
        const volumen = this.contexto.createGain();
        oscilador.type = forma;
        oscilador.frequency.value = frecuencia;
        volumen.gain.setValueAtTime(0.05, ahora + retraso);
        volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + retraso + duracion);
        oscilador.connect(volumen).connect(this.contexto.destination);
        oscilador.start(ahora + retraso);
        oscilador.stop(ahora + retraso + duracion + 0.02);
      }
    } catch {
      // Navegador sin Web Audio: el juego sigue en silencio
    }
  },

  alternar() {
    this.activo = !this.activo;
    guardarLocal(CLAVE_SONIDO, this.activo);
    pintarSonido();
    if (this.activo) this.tocar('pausa');
  },
};

function pintarSonido() {
  $('#boton-b').setAttribute('aria-pressed', String(sonido.activo));
  $('#consola-sonido').textContent = sonido.activo ? '♪ ON' : '♪ OFF';
}


/* ---------- La partida ---------- */

const juego = JUEGO_DE_LA_SEMANA.crear(lienzoConsola, {
  alCambiarPuntaje: (puntaje) => {
    $('#consola-pts').textContent = cuatroCifras(puntaje);
  },
  alTerminar: (puntaje) => terminarPartida(puntaje),
  sonar: (nombre) => sonido.tocar(nombre),
});

// data-estado en la consola decide qué letrero se ve encima de la pantalla (lo hace el CSS)
function pintarEstado() {
  consola.dataset.estado = juego.estado;
}

// REC: con sesión, el récord de la cuenta; sin sesión, el de este navegador
function pintarRecord() {
  const record = usuarioActual ? recordEnLinea : leerLocal(CLAVE_RECORD_LOCAL, 0);
  $('#consola-rec').textContent = cuatroCifras(record);
}

// Justo después de chocar no se puede volver a empezar: así un toque de más no se salta el puntaje
const ESPERA_TRAS_CHOQUE = 900;
let finPartidaEn = 0;

// El botón A (o Espacio / Enter): empezar, pausar o seguir
function botonPrincipal() {
  if (juego.estado === 'fin' && performance.now() - finPartidaEn < ESPERA_TRAS_CHOQUE) return;

  if (juego.estado === 'jugando') {
    juego.pausar();
    sonido.tocar('pausa');
  } else if (juego.estado === 'pausa') {
    juego.reanudar();
  } else {
    juego.iniciar();
    mostrarConsolaEntera();
  }
  pintarEstado();
}

// Al empezar, si la consola quedó cortada por el borde de la pantalla se acomoda para verla toda
function mostrarConsolaEntera() {
  const caja = consola.getBoundingClientRect();
  if (caja.top < 0 || caja.bottom > window.innerHeight) {
    consola.scrollIntoView({ block: caja.height > window.innerHeight ? 'start' : 'center', behavior: 'smooth' });
  }
  pantallaConsola.focus({ preventScroll: true });
}

function pausarSiJuega() {
  if (juego.estado !== 'jugando') return;
  juego.pausar();
  pintarEstado();
}

async function terminarPartida(puntaje) {
  finPartidaEn = performance.now();
  pintarEstado();
  $('#fin-puntaje').textContent = cuatroCifras(puntaje);
  $('#fin-sesion').hidden = true;

  if (puntaje > leerLocal(CLAVE_RECORD_LOCAL, 0)) guardarLocal(CLAVE_RECORD_LOCAL, puntaje);
  pintarRecord();

  if (puntaje <= 0) {
    escribirFin('Ni un bug esta vez. ¡Otra!');
    return;
  }

  if (!usuarioActual) {
    puntajePendiente = Math.max(puntajePendiente, puntaje);
    escribirFin('Inicia sesión para guardar tu puntaje en la tabla.');
    $('#fin-sesion').hidden = false;
    return;
  }

  await guardarPuntaje(puntaje);
}

function escribirFin(texto, destacado = false) {
  const estado = $('#fin-estado');
  estado.textContent = texto;
  estado.classList.toggle('capa__estado--record', destacado);
}

async function guardarPuntaje(puntaje) {
  escribirFin('Guardando puntaje…');
  const { data, error } = await clienteSupabase.rpc('registrar_puntaje_juego', {
    p_juego: JUEGO_DE_LA_SEMANA.id,
    p_puntaje: puntaje,
  });

  if (error) {
    console.error('Error al guardar el puntaje:', error);
    escribirFin('No se pudo guardar el puntaje. Intenta otra partida en un rato.');
    return;
  }

  recordEnLinea = Math.max(recordEnLinea, data?.mejor || 0);
  pintarRecord();
  if (data?.record) {
    escribirFin('¡Nuevo récord personal!', true);
  } else {
    escribirFin(`Tu récord sigue siendo ${data?.mejor ?? puntaje}.`);
  }
  cargarRecords();
}


/* ---------- Controles ---------- */

const TECLAS = {
  ArrowUp: 'arriba', KeyW: 'arriba',
  ArrowDown: 'abajo', KeyS: 'abajo',
  ArrowLeft: 'izquierda', KeyA: 'izquierda',
  ArrowRight: 'derecha', KeyD: 'derecha',
};

// Mientras se juega, las flechas mueven la culebra (y no la página).
// Sin partida, la consola solo escucha si tiene el foco, salvo Espacio/Enter cuando la pantalla está a la vista
// y nada más tiene el foco. Así las flechas siguen sirviendo para bajar por la página.
document.addEventListener('keydown', (evento) => {
  if (evento.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if ($('dialog[open]')) return;

  const jugando = juego.estado === 'jugando';
  const conFoco = consola.contains(document.activeElement);
  const esEmpezar = evento.code === 'Space' || evento.code === 'Enter';
  const sinFoco = document.activeElement === document.body || !document.activeElement;
  if (!jugando && !conFoco && !(esEmpezar && sinFoco && pantallaALaVista)) return;

  const direccion = TECLAS[evento.code];
  if (direccion) {
    evento.preventDefault();
    juego.girar(direccion);
    return;
  }

  if (evento.code === 'Space' || evento.code === 'Enter') {
    if (evento.target.closest?.('button')) return;   // Enter en un botón ya hace clic en ese botón
    evento.preventDefault();
    botonPrincipal();
  } else if (evento.code === 'KeyP' || evento.code === 'Escape') {
    if (jugando) {
      evento.preventDefault();
      botonPrincipal();
    }
  } else if (evento.code === 'KeyM') {
    sonido.alternar();
  }
});

// La cruceta responde al apoyar el dedo (sin esperar a soltarlo) y también con el teclado
$$('.cruceta__boton').forEach((boton) => {
  boton.addEventListener('pointerdown', (evento) => {
    evento.preventDefault();
    juego.girar(boton.dataset.direccion);
  });
  boton.addEventListener('click', (evento) => {
    if (evento.detail === 0) juego.girar(boton.dataset.direccion);   // detail 0 = clic hecho con el teclado
  });
});

$('#boton-a').addEventListener('click', botonPrincipal);
$('#boton-b').addEventListener('click', () => sonido.alternar());

// Deslizar el dedo sobre la pantalla también gira. Tocarla sin deslizar empieza o sigue la partida.
let toqueInicio = null;
let toqueDeslizo = false;
const DISTANCIA_DESLIZAR = 22;

pantallaConsola.addEventListener('pointerdown', (evento) => {
  if (evento.target.closest('button')) return;
  toqueInicio = { x: evento.clientX, y: evento.clientY };
  toqueDeslizo = false;
});

pantallaConsola.addEventListener('pointermove', (evento) => {
  if (!toqueInicio || juego.estado !== 'jugando') return;
  const dx = evento.clientX - toqueInicio.x;
  const dy = evento.clientY - toqueInicio.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DISTANCIA_DESLIZAR) return;

  if (Math.abs(dx) > Math.abs(dy)) juego.girar(dx > 0 ? 'derecha' : 'izquierda');
  else juego.girar(dy > 0 ? 'abajo' : 'arriba');
  toqueInicio = { x: evento.clientX, y: evento.clientY };   // se puede seguir deslizando sin levantar el dedo
  toqueDeslizo = true;
});

pantallaConsola.addEventListener('pointerup', (evento) => {
  const tocoBoton = evento.target.closest('button');
  if (toqueInicio && !toqueDeslizo && !tocoBoton && juego.estado !== 'jugando') botonPrincipal();
  toqueInicio = null;
});
pantallaConsola.addEventListener('pointercancel', () => { toqueInicio = null; });

// Se pausa sola si la persona se va a otra pestaña, a otra ventana o baja por la página
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pausarSiJuega();
});
window.addEventListener('blur', pausarSiJuega);

let pantallaALaVista = false;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entrada]) => {
    pantallaALaVista = entrada.intersectionRatio >= 0.5;
    if (!pantallaALaVista) pausarSiJuega();
  }, { threshold: [0, 0.5] }).observe(pantallaConsola);
}

if ('ResizeObserver' in window) {
  new ResizeObserver(() => juego.redimensionar()).observe(lienzoConsola);
} else {
  window.addEventListener('resize', () => juego.redimensionar());
}

// El +10 que sube al comer se escribe con la letra pixelada: se vuelve a dibujar cuando termina de cargar
document.fonts?.load("10px 'Press Start 2P'").then(() => juego.dibujar()).catch(() => {});

// Iniciar sesión desde el letrero de fin de partida o desde la tabla de récords
function abrirInicioDeSesion() {
  if (typeof cambiarModoAuth === 'function') cambiarModoAuth(false);
  $('#auth-modal')?.showModal();
}
$('#fin-sesion').addEventListener('click', abrirInicioDeSesion);


/* ---------- Tabla de récords ---------- */

const listaRecords = $('#records-lista');
const miRecord = $('#records-mio');

function pintarRecordsVacio(titulo, texto) {
  listaRecords.innerHTML = `
    <li class="ranking-vacio records__vacio">
      <div class="ranking-vacio__caja">
        <h3>${titulo}</h3>
        <p>${texto}</p>
      </div>
    </li>`;
}

// Puesto con empates: el mismo puntaje comparte puesto (1, 2, 2, 4…)
function puestosConEmpates(filas) {
  return filas.map((fila, i) => {
    const primero = filas.findIndex((otra) => otra.mejor_puntaje === fila.mejor_puntaje);
    return primero === -1 ? i + 1 : primero + 1;
  });
}

function pintarRecords(filas) {
  if (!filas.length) {
    pintarRecordsVacio('La tabla está vacía', `Nadie ha jugado ${escaparHtml(JUEGO_DE_LA_SEMANA.nombre)} todavía. ¡Estrena la tabla!`);
    return;
  }

  const puestos = puestosConEmpates(filas);
  const MEDALLAS = { 1: 'oro', 2: 'plata', 3: 'bronce' };

  listaRecords.innerHTML = filas.map((fila, i) => {
    const puesto = puestos[i];
    const medalla = MEDALLAS[puesto] || 'normal';
    const monstruo = fila.monstruo || {};
    const esMio = usuarioActual && fila.usuario_id === usuarioActual.id;
    const usuario = fila.usuario ? `@${escaparHtml(fila.usuario)}` : '';
    const partidas = `${fila.partidas} ${fila.partidas === 1 ? 'partida' : 'partidas'}`;

    return `
      <li class="record record--${medalla} ${esMio ? 'record--mio' : ''}">
        <span class="asustador-card__posicion asustador-card__posicion--${medalla}">${puesto}</span>
        <span class="asustador-card__avatar" style="border-color: ${escaparHtml(monstruo.color || '#1667c2')}">
          ${dibujarMonstruoPersonalizado(monstruo)}
        </span>
        <span class="record__info">
          <span class="record__nombre">${escaparHtml(fila.nombre)}${esMio ? ' <small>(tú)</small>' : ''}</span>
          <span class="record__usuario">${usuario}${usuario ? ' · ' : ''}${partidas}</span>
        </span>
        <span class="record__puntos">${fila.mejor_puntaje}</span>
      </li>`;
  }).join('');
}

// Debajo de la tabla: el récord y el puesto de quien tiene la sesión abierta
async function pintarMiRecord() {
  if (!usuarioActual) {
    recordEnLinea = 0;
    miRecord.innerHTML = `
      <p>Puedes jugar sin cuenta, pero para entrar a la tabla necesitas tu carnet.</p>
      <button class="portada__boton portada__boton--sesion records__sesion" type="button">Iniciar sesión</button>`;
    miRecord.querySelector('button').addEventListener('click', abrirInicioDeSesion);
    pintarRecord();
    return;
  }

  const { data: fila, error } = await clienteSupabase
    .from('puntajes_juego')
    .select('mejor_puntaje, partidas')
    .eq('usuario_id', usuarioActual.id)
    .eq('juego', JUEGO_DE_LA_SEMANA.id)
    .maybeSingle();

  if (error || !fila || !fila.mejor_puntaje) {
    recordEnLinea = 0;
    miRecord.innerHTML = '<p>Todavía no tienes puntaje. Juega una partida para entrar a la tabla.</p>';
    pintarRecord();
    return;
  }

  recordEnLinea = fila.mejor_puntaje;
  pintarRecord();

  // Puesto = cuántas personas tienen un puntaje mayor, más uno
  const { count } = await clienteSupabase
    .from('puntajes_juego')
    .select('usuario_id', { count: 'exact', head: true })
    .eq('juego', JUEGO_DE_LA_SEMANA.id)
    .gt('mejor_puntaje', fila.mejor_puntaje);

  const puesto = typeof count === 'number' ? ` · puesto <strong>${count + 1}</strong>` : '';
  miRecord.innerHTML = `
    <p>Tu récord: <strong>${fila.mejor_puntaje} pts</strong>${puesto} · ${fila.partidas} ${fila.partidas === 1 ? 'partida' : 'partidas'}</p>`;
}

let cargandoRecords = null;
let recargarRecords = false;

async function cargarRecords() {
  // Si llega un aviso mientras se consulta (tiempo real, guardar, sesión), se consulta otra vez al terminar
  if (cargandoRecords) {
    recargarRecords = true;
    return cargandoRecords;
  }
  cargandoRecords = (async () => {
    try {
      const { data, error } = await clienteSupabase.rpc('ranking_juego', {
        p_juego: JUEGO_DE_LA_SEMANA.id,
        p_limite: LIMITE_RECORDS,
      });
      if (error) {
        console.error('Error al cargar los récords:', error);
        pintarRecordsVacio('Tabla sin conexión', 'No se pudieron cargar los récords. El juego funciona igual: inténtalo más tarde.');
        miRecord.innerHTML = '';
        return;
      }
      pintarRecords(data || []);
      await pintarMiRecord();
    } finally {
      cargandoRecords = null;
      if (recargarRecords) {
        recargarRecords = false;
        cargarRecords();
      }
    }
  })();
  return cargandoRecords;
}

// Cuando alguien guarda un puntaje, la tabla se actualiza sola
try {
  clienteSupabase
    .channel('cambios-puntajes-juego')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'puntajes_juego' }, () => cargarRecords())
    .subscribe();
} catch {
  console.log('Tiempo real no disponible para la tabla de récords');
}

// Cambió la sesión: se vuelve a pintar la tabla (para marcar "tú") y, si había un puntaje sin guardar, se guarda
document.addEventListener('carnet:sesion', async () => {
  if (usuarioActual && puntajePendiente > 0) {
    const pendiente = puntajePendiente;
    puntajePendiente = 0;
    $('#fin-sesion').hidden = true;
    await guardarPuntaje(pendiente);
  } else {
    cargarRecords();
  }
});


/* ---------- Arranque ---------- */

$('#consola-cartucho').textContent = JUEGO_DE_LA_SEMANA.nombre;
$('#records-juego').textContent = JUEGO_DE_LA_SEMANA.nombre;
$('#consola-semana').textContent = `Semana ${JUEGO_DE_LA_SEMANA.semana}`;
$('#enlace-juego-nombre').textContent = JUEGO_DE_LA_SEMANA.nombre;

// Los dibujos del bug y el tinto en el letrero de inicio
$('#consola-ayuda-bug').innerHTML = dibujarPixeles(SPRITES_SNAKE.bug);
$('#consola-ayuda-tinto').innerHTML = dibujarPixeles(SPRITES_SNAKE.tinto);

pintarSonido();
pintarRecord();
pintarEstado();
juego.redimensionar();
cargarRecords();
