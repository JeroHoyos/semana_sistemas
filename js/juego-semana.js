/* =============================================
   JUEGO DE LA SEMANA (consola retro del Sustómetro)
   La consola no sabe de qué se trata el juego: pone la pantalla, los controles (teclado, cruceta,
   botones y deslizar el dedo), el sonido, y guarda el resultado en Supabase al terminar.

   Cada semana tiene su juego (SEMANAS, abajo) y se cambia con los botones del letrero de arriba.
   Una semana bloqueada todavía no se abre: solo la pueden jugar los supervisores (admins), para probarla.

   Cada juego trae su ficha (JUEGO_SNAKE en snake.js):
     id, nombre       así se guarda en Supabase y así se muestra
     marcador         'puntos' (gana el mayor) o 'tiempo' (en tics de 1/35 s; gana el menor)
     crear(lienzo, avisos)  arma la partida
     portada          texto, items y ayudas del letrero de inicio
     fin              título del letrero al terminar (exito: true lo pinta de triunfo)
     botones          opcional, { a, b }: A y B son botones del juego mientras se juega (sin esto, B no aparece)
     cruceta          opcional, 'diagonales': deja apretar dos direcciones a la vez
     esperaFin        opcional: ms antes de poder empezar otra partida (y de ver el letrero de fin)

   La partida que devuelve crear(): estado ('listo' | 'cargando' | 'jugando' | 'pausa' | 'fin'), puntaje,
   iniciar(), pausar(), reanudar(), redimensionar(), dibujar(), tecla(código, presionada) → si la usó,
   mando(botón, presionado) y, si los necesita, detener(), mirar(dx, tipo), tocar() y cambiarSonido(activo).

   Supabase: tabla puntajes_juego y funciones registrar_puntaje_juego y ranking_juego
   (supabase/juego-de-la-semana.sql). Sin sesión se puede jugar, pero el resultado no entra a la tabla.
   ============================================= */

// Las semanas, en orden. bloqueada: todavía no se abre y solo la ven los supervisores.
// Para abrir una semana: quitarle bloqueada aquí y quitar su juego de juego_bloqueado() en el SQL.
const SEMANAS = [
  { ...JUEGO_SNAKE, semana: 1 },
];

const consola = $('#consola');
const pantallaConsola = $('#consola-pantalla');
const lienzoConsola = $('#consola-lienzo');
const LIMITE_RECORDS = 10;
const CLAVE_SEMANA = 'juego_semana_elegida';

let JUEGO = null;               // la ficha de la semana que se está viendo
let juego = null;               // su partida
const partidas = new Map();     // semana → partida (se arma la primera vez que se abre esa semana)
const lienzos = new Map();      // semana → su <canvas>

// Mejor resultado de la cuenta con sesión abierta (el de Supabase), del juego que se está viendo
let recordEnLinea = 0;
// Resultados hechos sin sesión, por juego: se guardan apenas la persona inicie sesión
const pendientes = new Map();


/* ---------- Pequeñas ayudas ---------- */

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 2345 tics → "1:07.00": minutos, segundos y centésimas, como en los speedruns
function formatearTiempo(tics) {
  const centesimas = Math.floor(Math.max(0, tics) * 100 / 35);
  const minutos = Math.floor(centesimas / 6000);
  const segundos = Math.floor(centesimas / 100) % 60;
  return `${minutos}:${String(segundos).padStart(2, '0')}.${String(centesimas % 100).padStart(2, '0')}`;
}

// Cómo se muestra y se compara el resultado de cada tipo de juego
const MARCADORES = {
  // Más puntos es mejor. En la pantalla van con cuatro cifras, como en las maquinitas (120 → "0120").
  puntos: {
    hud: 'PTS',
    nombre: 'puntaje',
    pantalla: (n) => String(Math.max(0, n)).padStart(4, '0'),
    texto: (n) => `${n} pts`,
    tabla: (n) => String(n),
    mejora: (nuevo, anterior) => nuevo > (anterior || 0),
    sinRecord: 'Todavía no tienes puntaje. Juega una partida para entrar a la tabla.',
  },
  // El tiempo va en tics (1/35 s). Menos es mejor; 0 quiere decir que todavía no hay.
  tiempo: {
    hud: 'TIEMPO',
    nombre: 'tiempo',
    vacio: '-:--.--',
    pantalla: formatearTiempo,
    texto: formatearTiempo,
    tabla: formatearTiempo,
    mejora: (nuevo, anterior) => !anterior || nuevo < anterior,
    menorGana: true,
    sinRecord: 'Todavía no tienes tiempo. Llega a la salida para entrar a la tabla.',
  },
};
const marcadorDe = (ficha) => MARCADORES[ficha.marcador] || MARCADORES.puntos;
let marcador = MARCADORES.puntos;   // el del juego que se está viendo
const pantallaRecord = (valor) => (valor ? marcador.pantalla(valor) : marcador.vacio ?? marcador.pantalla(0));
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
const claveRecordLocal = (ficha = JUEGO) => `juego_semana_record_${ficha.id}`;
const esperaFin = () => JUEGO.esperaFin ?? 900;

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


/* ---------- Quién puede abrir cada semana ---------- */

// Supervisor de Sustos (admin): quien tiene ese título en su cuenta (la revisión es de sustometro.js)
const esAdmin = () => typeof esSupervisorActual === 'function' && esSupervisorActual();
const puedeJugar = (ficha) => !ficha.bloqueada || esAdmin();
// La que se ve al entrar: la última semana abierta
const semanaPorDefecto = () => [...SEMANAS].reverse().find((ficha) => !ficha.bloqueada) || SEMANAS[0];


/* ---------- Sonido: pitidos de 8 bits con Web Audio ---------- */

const sonido = {
  activo: true,   // siempre empieza prendido: no se guarda, porque en el celular no habría cómo volver a prenderlo
  contexto: null,

  // [frecuencia, duración, retraso, forma de onda]
  NOTAS: {
    inicio: [[523, 0.07, 0], [784, 0.1, 0.08]],
    bug: [[880, 0.04, 0], [1320, 0.06, 0.04]],
    fin: [[392, 0.12, 0, 'sawtooth'], [294, 0.14, 0.13, 'sawtooth'], [196, 0.32, 0.28, 'sawtooth']],
    record: [[523, 0.08, 0], [659, 0.08, 0.09], [784, 0.08, 0.18], [1047, 0.24, 0.27]],
    pausa: [[440, 0.06, 0]],
    bloqueado: [[196, 0.08, 0, 'square'], [147, 0.14, 0.09, 'square']],
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
    pintarSonido();
    if (this.activo) this.tocar('pausa');
  },
};

// El sonido se prende y se apaga con la tecla M
function pintarSonido() {
  $('#consola-sonido').textContent = sonido.activo ? '♪ ON' : '♪ OFF';
  partidas.forEach((partida) => partida.cambiarSonido?.(sonido.activo));
}


/* ---------- Las partidas: una por semana, cada una con su lienzo ---------- */

// Los avisos de una partida que no se está viendo no tocan la consola
// (por ejemplo, Doom que termina de cargar después de que la persona se cambió de semana)
function crearPartida(ficha) {
  const lienzo = lienzos.size ? lienzoConsola.cloneNode(false) : lienzoConsola;
  if (lienzo !== lienzoConsola) {
    lienzo.removeAttribute('id');
    [...lienzos.values()].at(-1).after(lienzo);
  }
  lienzos.set(ficha.semana, lienzo);

  let partida = null;
  const activa = () => partida !== null && partida === juego;
  partida = ficha.crear(lienzo, {
    alCambiarPuntaje: (valor) => {
      if (activa()) $('#consola-pts').textContent = marcador.pantalla(valor);
    },
    alTerminar: (valor, gano, detalle) => {
      if (activa()) terminarPartida(valor, detalle);
    },
    alCambiarEstado: () => {
      if (!activa()) {
        if (partida.estado === 'jugando') partida.pausar();
        return;
      }
      pintarEstado();
      if (juego.estado === 'jugando' && (document.hidden || !pantallaALaVista)) pausarSiJuega();
    },
    alCargar: (avance) => {
      if (activa()) pintarCarga(avance);
    },
    alError: (mensaje) => {
      if (activa()) mostrarAviso(mensaje);
    },
    pedirPausa: () => {
      if (activa()) pausarSiJuega();
    },
    sonar: (nombre) => {
      if (activa()) sonido.tocar(nombre);
    },
  });

  if ('ResizeObserver' in window) new ResizeObserver(() => partida.redimensionar()).observe(lienzo);
  partida.cambiarSonido?.(sonido.activo);
  return partida;
}

// Lo que dice el letrero de fin de cada semana, para que no se mezclen al cambiar de una a otra
const finesGuardados = new Map();

function guardarFin() {
  finesGuardados.set(JUEGO.semana, {
    puntaje: $('#fin-puntaje').textContent,
    detalle: $('#fin-detalle').textContent,
    estado: $('#fin-estado').textContent,
    record: $('#fin-estado').classList.contains('capa__estado--record'),
    sesion: !$('#fin-sesion').hidden,
  });
}

function restaurarFin() {
  const fin = finesGuardados.get(JUEGO.semana)
    || { puntaje: marcador.pantalla(0), detalle: '', estado: '', record: false, sesion: false };
  $('#fin-puntaje').textContent = fin.puntaje;
  $('#fin-detalle').textContent = fin.detalle;
  $('#fin-detalle').hidden = !fin.detalle;
  $('#fin-estado').textContent = fin.estado;
  $('#fin-estado').classList.toggle('capa__estado--record', fin.record);
  $('#fin-sesion').hidden = !fin.sesion;
}

// Cambia la consola a otra semana. La partida que se deja queda en pausa (y se puede seguir al volver).
function elegirSemana(ficha, { guardar = false } = {}) {
  if (!puedeJugar(ficha) || ficha === JUEGO) return;

  if (juego) {
    soltarControles();
    juego.detener?.();
    if (juego.estado === 'jugando') juego.pausar();
    guardarFin();
  }

  JUEGO = ficha;
  marcador = marcadorDe(ficha);
  if (!partidas.has(ficha.semana)) partidas.set(ficha.semana, crearPartida(ficha));
  juego = partidas.get(ficha.semana);
  lienzos.forEach((lienzo, semana) => { lienzo.hidden = semana !== ficha.semana; });
  if (guardar) guardarLocal(CLAVE_SEMANA, ficha.semana);

  vestirConsola();
  restaurarFin();
  mostrarAviso('');
  $('#consola-pts').textContent = marcador.pantalla(juego.puntaje ?? 0);
  recordEnLinea = 0;
  pintarSonido();
  pintarRecord();
  pintarEstado();
  pintarSemanas();
  juego.redimensionar();
  cargarRecords();
}

// data-estado en la consola decide qué letrero se ve encima de la pantalla (lo hace el CSS)
function pintarEstado() {
  consola.dataset.estado = juego.estado;
}

// REC: con sesión, el récord de la cuenta; sin sesión, el de este navegador
function pintarRecord() {
  const record = usuarioActual ? recordEnLinea : leerLocal(claveRecordLocal(), 0);
  $('#consola-rec').textContent = pantallaRecord(record);
}

function pintarCarga(avance) {
  const porcentaje = Math.max(0, Math.min(100, Math.floor(avance * 100)));
  $('#carga-barra').style.width = `${porcentaje}%`;
  $('#carga-texto').textContent = `${porcentaje}%`;
}

// Un aviso en el letrero de inicio (por ejemplo, si el juego no se pudo cargar)
function mostrarAviso(mensaje) {
  const aviso = $('#inicio-aviso');
  aviso.textContent = mensaje;
  aviso.hidden = !mensaje;
}

// Justo después de terminar no se puede volver a empezar: así un toque de más no se salta el resultado
let finPartidaEn = 0;

// A (o Start, Espacio, Enter): empezar, pausar o seguir
function botonPrincipal() {
  if (juego.estado === 'cargando') return;
  if (juego.estado === 'fin' && performance.now() - finPartidaEn < esperaFin()) return;

  if (juego.estado === 'jugando') {
    juego.pausar();
    sonido.tocar('pausa');
  } else if (juego.estado === 'pausa') {
    juego.reanudar();
  } else {
    mostrarAviso('');
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
  soltarControles();
  pintarEstado();
}

// detalle: una línea más para el letrero de fin (Doom: enemigos y secretos)
async function terminarPartida(puntaje, detalle = '') {
  const ficha = JUEGO;
  const marcadorFicha = marcadorDe(ficha);
  finPartidaEn = performance.now();
  soltarControles();
  pintarEstado();
  $('#fin-puntaje').textContent = marcadorFicha.pantalla(puntaje);
  $('#fin-detalle').textContent = detalle;
  $('#fin-detalle').hidden = !detalle;
  $('#fin-sesion').hidden = true;

  if (marcadorFicha.mejora(puntaje, leerLocal(claveRecordLocal(ficha), 0))) guardarLocal(claveRecordLocal(ficha), puntaje);
  pintarRecord();

  if (puntaje <= 0) {
    escribirFin(ficha.fin?.sinPuntos || 'Sin puntos esta vez. ¡Otra!');
    return;
  }

  if (!usuarioActual) {
    if (marcadorFicha.mejora(puntaje, pendientes.get(ficha))) pendientes.set(ficha, puntaje);
    escribirFin(`Inicia sesión para guardar tu ${marcadorFicha.nombre} en la tabla.`);
    $('#fin-sesion').hidden = false;
    return;
  }

  await guardarPuntaje(puntaje, ficha);
}

// Si la persona ya se cambió de semana, el mensaje queda guardado para cuando vuelva
function escribirFin(texto, destacado = false, ficha = JUEGO) {
  if (ficha !== JUEGO) {
    const fin = finesGuardados.get(ficha.semana);
    if (fin) Object.assign(fin, { estado: texto, record: destacado, sesion: false });
    return;
  }
  const estado = $('#fin-estado');
  estado.textContent = texto;
  estado.classList.toggle('capa__estado--record', destacado);
}

async function guardarPuntaje(puntaje, ficha = JUEGO) {
  if (typeof esPayaso === 'function' && usuarioActual && esPayaso(usuarioActual.email, usuarioActual.user_metadata?.full_name)) {
    escribirFin('🤡 Tu cuenta tiene Shadowban permanente. No guarda récords.', false, ficha);
    return;
  }

  const marcadorFicha = marcadorDe(ficha);
  escribirFin(`Guardando ${marcadorFicha.nombre}…`, false, ficha);
  const { data, error } = await clienteSupabase.rpc('registrar_puntaje_juego', {
    p_juego: ficha.id,
    p_puntaje: puntaje,
  });

  if (error) {
    console.error('Error al guardar el resultado:', error);
    const bloqueada = String(error.message || '').includes('Semana bloqueada');
    escribirFin(bloqueada
      ? 'Esta semana todavía está bloqueada: solo se guardan los resultados de los supervisores.'
      : `No se pudo guardar tu ${marcadorFicha.nombre}. Intenta otra partida en un rato.`, false, ficha);
    return;
  }

  if (ficha === JUEGO && data?.mejor) {
    recordEnLinea = data.mejor;
    pintarRecord();
  }
  if (data?.record) {
    escribirFin('¡Nuevo récord personal!', true, ficha);
  } else {
    escribirFin(`Tu récord sigue siendo ${marcadorFicha.texto(data?.mejor ?? puntaje)}.`, false, ficha);
  }
  cargarRecords();
}


/* ---------- Selector de semana (en el letrero de arriba) ---------- */

const contenedorSemanas = $('#consola-semanas');
const CANDADO_SEMANA = '<svg class="consola__candado" viewBox="0 0 10 12" aria-hidden="true"><path d="M2.5 5.5V3.5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1" y="5.5" width="8" height="6.5" rx="1" fill="currentColor"/></svg>';

contenedorSemanas.innerHTML = SEMANAS.map((ficha) => `
  <button class="consola__semana" type="button" data-semana="${ficha.semana}">
    ${ficha.bloqueada ? CANDADO_SEMANA : ''}<span>Semana ${ficha.semana}</span>
  </button>`).join('');

// Las semanas bloqueadas no dicen qué juego traen (salvo a los supervisores)
function pintarSemanas() {
  const admin = esAdmin();
  $$('#consola-semanas .consola__semana').forEach((boton) => {
    const ficha = SEMANAS.find((f) => f.semana === Number(boton.dataset.semana));
    const cerrada = !puedeJugar(ficha);
    const etiqueta = cerrada
      ? `Semana ${ficha.semana}: bloqueada`
      : `Semana ${ficha.semana}: ${ficha.nombre}${ficha.bloqueada && admin ? ' (bloqueada, solo supervisores)' : ''}`;
    boton.setAttribute('aria-pressed', String(ficha === JUEGO));
    boton.classList.toggle('consola__semana--bloqueada', Boolean(ficha.bloqueada));
    if (cerrada) boton.setAttribute('aria-disabled', 'true');
    else boton.removeAttribute('aria-disabled');
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
  });
}

let avisoSemanaHasta = 0;
function avisarSemana(texto) {
  const aviso = $('#semana-aviso');
  aviso.textContent = texto;
  aviso.hidden = false;
  avisoSemanaHasta = performance.now() + 2600;
  setTimeout(() => {
    if (performance.now() >= avisoSemanaHasta) aviso.hidden = true;
  }, 2700);
}

// Si un supervisor eligió a mano una semana, al volver a entrar se le abre esa (se recuerda en este navegador)
let semanaElegidaAMano = false;

contenedorSemanas.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.consola__semana');
  if (!boton) return;
  const ficha = SEMANAS.find((f) => f.semana === Number(boton.dataset.semana));
  if (!ficha || ficha === JUEGO) return;

  if (!puedeJugar(ficha)) {
    avisarSemana(`Semana ${ficha.semana} bloqueada · muy pronto`);
    sonido.tocar('bloqueado');
    return;
  }
  semanaElegidaAMano = true;
  elegirSemana(ficha, { guardar: true });
});

// Cambió la sesión: quien deja de ser supervisor sale de la semana bloqueada; quien entra como
// supervisor vuelve a la semana que tenía elegida (si todavía no ha empezado a jugar)
function revisarSemanas() {
  if (!puedeJugar(JUEGO)) {
    elegirSemana(semanaPorDefecto());
  } else if (!semanaElegidaAMano && juego.estado === 'listo') {
    const guardada = SEMANAS.find((ficha) => ficha.semana === leerLocal(CLAVE_SEMANA, 0));
    if (guardada && puedeJugar(guardada)) elegirSemana(guardada);
  }
  pintarSemanas();
}


/* ---------- Teclado ---------- */

// Mientras se juega, cada juego decide qué hace con sus teclas (y la página no se mueve con ellas).
// Sin partida, la consola solo escucha si tiene el foco, salvo Espacio/Enter cuando la pantalla está a la vista
// y nada más tiene el foco. Así las flechas siguen sirviendo para bajar por la página.
function alPresionarTecla(evento) {
  if (evento.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if ($('dialog[open]')) return;

  const codigo = evento.code;
  const jugando = juego.estado === 'jugando';
  const conFoco = consola.contains(document.activeElement);
  const esEmpezar = codigo === 'Space' || codigo === 'Enter';
  const sinFoco = document.activeElement === document.body || !document.activeElement;
  if (!jugando && !conFoco && !(esEmpezar && sinFoco && pantallaALaVista)) return;

  if (codigo === 'KeyP' || codigo === 'Escape') {
    if (jugando) {
      evento.preventDefault();
      botonPrincipal();
    }
    return;
  }
  if (codigo === 'KeyM') {
    sonido.alternar();
    return;
  }

  if (jugando && juego.tecla(codigo, true)) {
    evento.preventDefault();
    return;
  }

  if (esEmpezar) {
    if (evento.target.closest?.('button')) return;   // Enter en un botón ya hace clic en ese botón
    if (evento.repeat) return;                       // dejar la tecla abajo no empieza otra partida
    evento.preventDefault();
    botonPrincipal();
  } else if (conFoco && codigo.startsWith('Arrow')) {
    evento.preventDefault();   // con la consola enfocada, las flechas no mueven la página
  }
}

// Soltar una tecla siempre le llega al juego, para que nada se quede apretado
function alSoltarTecla(evento) {
  if (juego.tecla(evento.code, false) && juego.estado === 'jugando') evento.preventDefault();
}

document.addEventListener('keydown', alPresionarTecla);
document.addEventListener('keyup', alSoltarTecla);


/* ---------- Cruceta ----------
   Se sigue el dedo (o el mouse) sobre toda la cruceta: se puede deslizar de un brazo a otro sin soltar.
   Cada dirección cuenta mientras esté apretada; con cruceta 'diagonales', en las esquinas se aprietan dos. */

const cruceta = $('.cruceta');
let crucetaPuntero = null;
let crucetaApretadas = new Set();

// Que los movimientos del dedo le sigan llegando al elemento aunque salga de él (si el navegador no deja, no pasa nada)
function capturarPuntero(elemento, evento) {
  try {
    elemento.setPointerCapture?.(evento.pointerId);
  } catch {
    // Puntero que ya no está activo
  }
}

function direccionesCruceta(evento) {
  const caja = cruceta.getBoundingClientRect();
  const dx = evento.clientX - (caja.left + caja.width / 2);
  const dy = evento.clientY - (caja.top + caja.height / 2);
  const direcciones = new Set();
  if (Math.hypot(dx, dy) < caja.width * 0.12) return direcciones;   // el centro no apreta nada

  if (JUEGO.cruceta !== 'diagonales') {
    if (Math.abs(dx) > Math.abs(dy)) direcciones.add(dx > 0 ? 'derecha' : 'izquierda');
    else direcciones.add(dy > 0 ? 'abajo' : 'arriba');
    return direcciones;
  }

  // Ocho sectores de 45°: 0° es la derecha y 90° es abajo
  const angulo = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angulo > -67.5 && angulo < 67.5) direcciones.add('derecha');
  if (angulo > 22.5 && angulo < 157.5) direcciones.add('abajo');
  if (angulo > 112.5 || angulo < -112.5) direcciones.add('izquierda');
  if (angulo > -157.5 && angulo < -22.5) direcciones.add('arriba');
  return direcciones;
}

function apretarCruceta(nuevas) {
  for (const direccion of crucetaApretadas) {
    if (!nuevas.has(direccion)) juego.mando(direccion, false);
  }
  for (const direccion of nuevas) {
    if (!crucetaApretadas.has(direccion)) juego.mando(direccion, true);
  }
  crucetaApretadas = nuevas;
  $$('.cruceta__boton').forEach((boton) => {
    boton.classList.toggle('cruceta__boton--apretado', nuevas.has(boton.dataset.direccion));
  });
}

cruceta.addEventListener('pointerdown', (evento) => {
  if (crucetaPuntero !== null) return;
  evento.preventDefault();
  crucetaPuntero = evento.pointerId;
  capturarPuntero(cruceta, evento);
  apretarCruceta(direccionesCruceta(evento));
});
cruceta.addEventListener('pointermove', (evento) => {
  if (evento.pointerId === crucetaPuntero) apretarCruceta(direccionesCruceta(evento));
});
function soltarCruceta(evento) {
  if (evento.pointerId !== crucetaPuntero) return;
  crucetaPuntero = null;
  apretarCruceta(new Set());
}
cruceta.addEventListener('pointerup', soltarCruceta);
cruceta.addEventListener('pointercancel', soltarCruceta);
cruceta.addEventListener('lostpointercapture', soltarCruceta);

// Con el teclado (Tab hasta la cruceta y Enter) cada brazo es un toque
$$('.cruceta__boton').forEach((boton) => {
  boton.addEventListener('click', (evento) => {
    if (evento.detail !== 0) return;   // detail 0 = clic hecho con el teclado
    juego.mando(boton.dataset.direccion, true);
    juego.mando(boton.dataset.direccion, false);
  });
});


/* ---------- Botones A y B, y Start ----------
   Si el juego trae botones (Doom, Defrag), mientras se juega A y B son del juego y cuentan mientras estén apretados.
   Si no (Snake), A empieza o pausa y B no aparece. Start empieza o pausa siempre. */

const botonesDelJuego = [];

function conectarBoton(elemento, boton, accionConsola) {
  let apretado = false;
  const esDelJuego = () => JUEGO.botones && juego.estado === 'jugando';

  const soltarBoton = () => {
    if (!apretado) return;
    apretado = false;
    juego.mando(boton, false);
  };

  elemento.addEventListener('pointerdown', (evento) => {
    if (!esDelJuego()) return;
    evento.preventDefault();
    capturarPuntero(elemento, evento);
    apretado = true;
    juego.mando(boton, true);
  });
  elemento.addEventListener('pointerup', soltarBoton);
  elemento.addEventListener('pointercancel', soltarBoton);
  elemento.addEventListener('lostpointercapture', soltarBoton);

  elemento.addEventListener('click', (evento) => {
    if (esDelJuego()) {
      if (evento.detail === 0) {   // con el teclado: un toque
        juego.mando(boton, true);
        juego.mando(boton, false);
      }
      return;
    }
    accionConsola?.();
  });

  botonesDelJuego.push(soltarBoton);
}

conectarBoton($('#boton-a'), 'a', botonPrincipal);
conectarBoton($('#boton-b'), 'b');
$('#boton-start').addEventListener('click', botonPrincipal);

// Al pausar, terminar o cambiar de semana se sueltan la cruceta y los botones (el dedo puede seguir encima)
function soltarControles() {
  if (crucetaApretadas.size) apretarCruceta(new Set());
  botonesDelJuego.forEach((soltarBoton) => soltarBoton());
}

// En el celular, dejar el dedo quieto sobre un botón no abre el menú del navegador
consola.addEventListener('contextmenu', (evento) => {
  if (evento.target.closest('button, .consola__pantalla')) evento.preventDefault();
});


/* ---------- Tocar y deslizar el dedo sobre la pantalla ----------
   Snake: deslizar gira. Doom (los juegos con mirar): deslizar gira la vista. Defrag: deslizar mueve y baja la pieza.
   Tocar sin deslizar empieza o sigue la partida; mientras se juega, le avisa al juego si le interesa (Defrag: gira). */

let toque = null;
let toqueDeslizo = false;
const DISTANCIA_DESLIZAR = 22;

pantallaConsola.addEventListener('pointerdown', (evento) => {
  if (evento.target.closest('button')) return;
  toque = { x: evento.clientX, y: evento.clientY };
  toqueDeslizo = false;
});

pantallaConsola.addEventListener('pointermove', (evento) => {
  if (!toque || juego.estado !== 'jugando') return;
  const dx = evento.clientX - toque.x;
  const dy = evento.clientY - toque.y;

  if (juego.mirar) {
    if (evento.pointerType === 'mouse') return;   // con mouse se juega capturando el puntero (lo hace el juego)
    juego.mirar(dx, 'tactil');
    toque = { x: evento.clientX, y: evento.clientY };
    if (dx) toqueDeslizo = true;
    return;
  }

  if (Math.max(Math.abs(dx), Math.abs(dy)) < DISTANCIA_DESLIZAR) return;
  const direccion = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : (dy > 0 ? 'abajo' : 'arriba');
  juego.mando(direccion, true);
  juego.mando(direccion, false);
  toque = { x: evento.clientX, y: evento.clientY };   // se puede seguir deslizando sin levantar el dedo
  toqueDeslizo = true;
});

pantallaConsola.addEventListener('pointerup', (evento) => {
  const tocoBoton = evento.target.closest('button');
  if (toque && !toqueDeslizo && !tocoBoton) {
    if (juego.estado === 'jugando') juego.tocar?.();
    else botonPrincipal();
  }
  toque = null;
});
pantallaConsola.addEventListener('pointercancel', () => { toque = null; });

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

if (!('ResizeObserver' in window)) {
  window.addEventListener('resize', () => juego.redimensionar());
}

// Snake y Defrag escriben con la letra pixelada: se vuelve a dibujar cuando termina de cargar
document.fonts?.load("10px 'Press Start 2P'").then(() => juego.dibujar()).catch(() => {});

// Iniciar sesión desde el letrero de fin de partida o desde la tabla de récords
function abrirInicioDeSesion() {
  if (typeof cambiarModoAuth === 'function') cambiarModoAuth(false);
  $('#auth-modal')?.showModal();
}
$('#fin-sesion').addEventListener('click', abrirInicioDeSesion);


/* ---------- Tabla de récords (de la semana que se está viendo) ---------- */

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

// Puesto con empates: el mismo resultado comparte puesto (1, 2, 2, 4…)
function puestosConEmpates(filas) {
  return filas.map((fila, i) => {
    const primero = filas.findIndex((otra) => otra.mejor_puntaje === fila.mejor_puntaje);
    return primero === -1 ? i + 1 : primero + 1;
  });
}

function pintarRecords(filas) {
  // Filtrar a cualquier tramposo con Shadowban
  const filasFiltradas = (filas || []).filter((fila) => {
    if (typeof esPayaso === 'function') {
      return !esPayaso(fila.usuario, fila.nombre);
    }
    return true;
  });

  if (!filasFiltradas.length) {
    pintarRecordsVacio('La tabla está vacía', `Nadie ha jugado ${escaparHtml(JUEGO.nombre)} todavía. ¡Estrena la tabla!`);
    return;
  }

  const puestos = puestosConEmpates(filasFiltradas);
  const MEDALLAS = { 1: 'oro', 2: 'plata', 3: 'bronce' };

  listaRecords.innerHTML = filasFiltradas.map((fila, i) => {
    const puesto = puestos[i];
    const medalla = MEDALLAS[puesto] || 'normal';
    const monstruo = fila.monstruo || {};
    const esMio = usuarioActual && fila.usuario_id === usuarioActual.id;
    const usuario = fila.usuario ? `@${escaparHtml(fila.usuario)}` : '';
    const partidasFila = `${fila.partidas} ${fila.partidas === 1 ? 'partida' : 'partidas'}`;

    return `
      <li class="record record--${medalla} ${esMio ? 'record--mio' : ''}">
        <span class="asustador-card__posicion asustador-card__posicion--${medalla}">${puesto}</span>
        <span class="asustador-card__avatar" style="border-color: ${escaparHtml(monstruo.color || '#1667c2')}">
          ${dibujarMonstruoPersonalizado(monstruo)}
        </span>
        <span class="record__info">
          <span class="record__nombre">${escaparHtml(fila.nombre)}${esMio ? ' <small>(tú)</small>' : ''}</span>
          <span class="record__usuario">${usuario}${usuario ? ' · ' : ''}${partidasFila}</span>
        </span>
        <span class="record__puntos">${marcador.tabla(fila.mejor_puntaje)}</span>
      </li>`;
  }).join('');
}

// Debajo de la tabla: el récord y el puesto de quien tiene la sesión abierta.
// Si mientras se consulta la persona se cambia de semana, no se pinta nada (ya viene la consulta de la otra).
async function pintarMiRecord(ficha) {
  if (!usuarioActual) {
    recordEnLinea = 0;
    miRecord.innerHTML = `
      <p>Puedes jugar sin cuenta, pero para entrar a la tabla necesitas tu carnet.</p>
      <button class="portada__boton portada__boton--sesion records__sesion" type="button">Iniciar sesión</button>`;
    miRecord.querySelector('button').addEventListener('click', abrirInicioDeSesion);
    pintarRecord();
    return;
  }

  const marcadorFicha = marcadorDe(ficha);
  const { data: fila, error } = await clienteSupabase
    .from('puntajes_juego')
    .select('mejor_puntaje, partidas')
    .eq('usuario_id', usuarioActual.id)
    .eq('juego', ficha.id)
    .maybeSingle();
  if (ficha !== JUEGO) return;

  if (error || !fila || !fila.mejor_puntaje) {
    recordEnLinea = 0;
    miRecord.innerHTML = `<p>${marcadorFicha.sinRecord}</p>`;
    pintarRecord();
    return;
  }

  recordEnLinea = fila.mejor_puntaje;
  pintarRecord();

  // Puesto = cuántas personas tienen un resultado mejor, más uno
  let consulta = clienteSupabase
    .from('puntajes_juego')
    .select('usuario_id', { count: 'exact', head: true })
    .eq('juego', ficha.id);
  consulta = marcadorFicha.menorGana
    ? consulta.gt('mejor_puntaje', 0).lt('mejor_puntaje', fila.mejor_puntaje)
    : consulta.gt('mejor_puntaje', fila.mejor_puntaje);
  const { count } = await consulta;
  if (ficha !== JUEGO) return;

  const puesto = typeof count === 'number' ? ` · puesto <strong>${count + 1}</strong>` : '';
  miRecord.innerHTML = `
    <p>Tu récord: <strong>${marcadorFicha.texto(fila.mejor_puntaje)}</strong>${puesto} · ${fila.partidas} ${fila.partidas === 1 ? 'partida' : 'partidas'}</p>`;
}

let cargandoRecords = null;
let recargarRecords = false;

async function cargarRecords() {
  // Si llega un aviso mientras se consulta (tiempo real, guardar, sesión, cambio de semana), se consulta otra vez al terminar
  if (cargandoRecords) {
    recargarRecords = true;
    return cargandoRecords;
  }
  const ficha = JUEGO;
  cargandoRecords = (async () => {
    try {
      const { data, error } = await clienteSupabase.rpc('ranking_juego', {
        p_juego: ficha.id,
        p_limite: LIMITE_RECORDS,
      });
      if (ficha !== JUEGO) {
        recargarRecords = true;
        return;
      }
      if (error) {
        console.error('Error al cargar los récords:', error);
        pintarRecordsVacio('Tabla sin conexión', 'No se pudieron cargar los récords. El juego funciona igual: inténtalo más tarde.');
        miRecord.innerHTML = '';
        return;
      }
      pintarRecords(data || []);
      await pintarMiRecord(ficha);
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

// Cuando alguien guarda un resultado, la tabla se actualiza sola
try {
  clienteSupabase
    .channel('cambios-puntajes-juego')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'puntajes_juego' }, () => cargarRecords())
    .subscribe();
} catch {
  console.log('Tiempo real no disponible para la tabla de récords');
}

// Cambió la sesión (o sus títulos): se revisa qué semanas puede abrir, se vuelve a pintar la tabla
// (para marcar "tú") y, si había resultados sin guardar, se guardan
document.addEventListener('carnet:sesion', async () => {
  revisarSemanas();
  if (usuarioActual && pendientes.size) {
    const porGuardar = [...pendientes];
    pendientes.clear();
    $('#fin-sesion').hidden = true;
    for (const [ficha, valor] of porGuardar) {
      if (puedeJugar(ficha)) await guardarPuntaje(valor, ficha);
    }
  } else {
    cargarRecords();
  }
});


/* ---------- La consola se viste con la ficha del juego ---------- */

function vestirConsola() {
  const { nombre, portada = {}, fin = {}, botones } = JUEGO;

  consola.dataset.juego = JUEGO.id;
  consola.style.setProperty('--espera-fin', `${esperaFin()}ms`);
  $('#consola-cartucho').textContent = nombre;
  $('#records-juego').textContent = nombre;
  $('#enlace-juego-nombre').textContent = nombre;

  // Letrero de inicio
  $('#inicio-titulo').textContent = nombre;
  $('#inicio-texto').textContent = portada.texto || '';
  $('#inicio-items').innerHTML = typeof portada.items === 'function' ? portada.items() : portada.items || '';
  $('#ayuda-teclado').textContent = portada.ayudaTeclado || '';
  $('#ayuda-tactil').textContent = portada.ayudaTactil || '';

  // Marcador y letrero de fin
  $('#hud-etiqueta').textContent = marcador.hud;
  $('#fin-titulo').textContent = fin.titulo || 'Fin del juego';
  $('#fin-titulo').classList.toggle('capa__titulo--exito', Boolean(fin.exito));
  $('#fin-etiqueta').textContent = mayuscula(marcador.nombre);

  // A y B: si son del juego se llaman como lo que hacen; si no, A es Jugar y B no aparece
  $('#boton-a-texto').textContent = botones?.a || 'Jugar';
  $('#boton-a').setAttribute('aria-label', botones ? `A: ${botones.a.toLowerCase()}` : 'A: jugar o pausar');
  $('#boton-b-grupo').hidden = !botones;
  $('#boton-b-texto').textContent = botones?.b || '';
  $('#boton-b').setAttribute('aria-label', botones ? `B: ${botones.b.toLowerCase()}` : 'B');
}


/* ---------- Arranque: la semana que la persona tenía elegida (si la puede abrir) o la última abierta ---------- */

const semanaGuardada = SEMANAS.find((ficha) => ficha.semana === leerLocal(CLAVE_SEMANA, 0));
elegirSemana(semanaGuardada && puedeJugar(semanaGuardada) ? semanaGuardada : semanaPorDefecto());
