/* =============================================
   CÓDIGOS Y TÍTULOS
   El apartado "¿Tienes un código?" del Sustómetro. La persona escribe un código (lo ganó, por ejemplo,
   encontrando un easter egg) y, si es válido, se le desbloquea el título de TITULOS (js/data.js) que
   le corresponde. El título queda guardado en su cuenta (user_metadata.titulos) y lo elige después
   en "Editar carnet" (js/auth.js).

   Los códigos no están escritos en la página: solo su huella SHA-256. Se generan con
   node herramientas/hash-codigo.js "EL CÓDIGO"
   ============================================= */

// Debe ser idéntica a normalizarCodigo() de herramientas/hash-codigo.js:
// sin tildes, en mayúsculas y sin espacios ("huevo susto" y "HUEVO  SUSTO" valen igual)
function normalizarCodigo(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
}

// SHA-256 en texto hexadecimal. crypto.subtle solo existe en páginas seguras (https o localhost).
async function huellaDe(texto) {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const estiloDeUsuario = () => usuarioActual?.user_metadata?.monstruo?.estilo;


/* ---------- Mensaje debajo del formulario ---------- */

// tipo: 'exito' | 'error' | 'info'. accion (opcional): { texto, alClick } agrega un botón al mensaje.
function mostrarMensajeCodigo(texto, tipo, accion) {
  const caja = $('#codigos-mensaje');
  const boton = $('#codigos-accion');
  caja.className = `codigos__mensaje codigos__mensaje--${tipo}`;
  $('#codigos-mensaje-texto').textContent = texto;
  boton.hidden = !accion;
  boton.textContent = accion?.texto || '';
  boton.onclick = accion?.alClick || null;
  caja.hidden = false;
}


/* ---------- Colección de títulos ---------- */

// Una pastilla por título: abierto (con su nombre) o bloqueado (con su pista)
function pintarColeccion() {
  const lista = $('#codigos-coleccion');
  const cuenta = $('#codigos-cuenta');

  if (!usuarioActual) {
    cuenta.textContent = 'Inicia sesión para guardar tus títulos en tu carnet.';
    lista.innerHTML = '';
    return;
  }

  const abiertos = new Set(titulosDesbloqueados(usuarioActual).map((titulo) => titulo.id));
  const enUso = tituloElegidoDe(usuarioActual).id;
  const estilo = estiloDeUsuario();
  cuenta.textContent = `Tus títulos: ${abiertos.size} de ${TITULOS.length}`;

  lista.innerHTML = TITULOS.map((titulo) => {
    if (!abiertos.has(titulo.id)) {
      return `<li class="titulo-chip titulo-chip--bloqueado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        <span><span class="visualmente-oculto">Bloqueado: </span>${titulo.pista || 'Título secreto'}</span>
      </li>`;
    }
    return `<li class="titulo-chip titulo-chip--abierto ${titulo.id === enUso ? 'titulo-chip--en-uso' : ''}">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8Z"/></svg>
      <span>${textoDeTitulo(titulo, estilo)}${titulo.id === enUso ? '<small>en uso</small>' : ''}</span>
    </li>`;
  }).join('');
}

document.addEventListener('carnet:sesion', pintarColeccion);
pintarColeccion();   // auth.js puede haber avisado antes de que este archivo cargara


/* ---------- Canjear ---------- */

// Tras 5 códigos malos seguidos se espera medio minuto: así no se prueba uno por uno a mano
const INTENTOS_MAXIMOS = 5;
const ESPERA_SEGUNDOS = 30;
let intentosFallidos = 0;
let bloqueadoHasta = 0;

async function canjearCodigo(texto) {
  const huella = await huellaDe(normalizarCodigo(texto));
  const titulo = TITULOS.find((t) => !t.libre && t.codigo === huella);
  if (!titulo) return { estado: 'invalido' };

  if (titulosDesbloqueados(usuarioActual).some((t) => t.id === titulo.id)) {
    return { estado: 'repetido', titulo };
  }

  const meta = usuarioActual.user_metadata || {};
  const titulos = [...new Set([...(meta.titulos || []), titulo.id])];
  const { data, error } = await clienteSupabase.auth.updateUser({ data: { ...meta, titulos } });
  if (error) throw error;

  actualizarInterfazSesion(data.user);   // refresca el carnet y la colección con el título nuevo
  return { estado: 'nuevo', titulo };
}

$('#codigos-form').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const entrada = $('#codigos-entrada');

  if (!normalizarCodigo(entrada.value)) {
    mostrarMensajeCodigo('Escribe tu código primero.', 'error');
    return;
  }
  if (!usuarioActual) {
    // El código se queda escrito: al entrar basta con volver a pulsar "Canjear"
    mostrarMensajeCodigo('Inicia sesión para canjear tu código: así el título queda guardado en tu carnet.', 'info');
    $('#auth-modal').showModal();
    return;
  }
  if (!window.crypto?.subtle) {
    mostrarMensajeCodigo('Este navegador no puede validar códigos en esta dirección. Abre la página con https.', 'error');
    return;
  }
  if (Date.now() < bloqueadoHasta) {
    const faltan = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
    mostrarMensajeCodigo(`Demasiados intentos. Espera ${faltan} segundos y prueba de nuevo.`, 'error');
    return;
  }

  const boton = $('#codigos-boton');
  const textoBoton = boton.querySelector('span');
  boton.disabled = true;
  textoBoton.textContent = 'Canjeando…';

  try {
    const { estado, titulo } = await canjearCodigo(entrada.value);
    const nombre = titulo && textoDeTitulo(titulo, estiloDeUsuario());
    const editar = { texto: 'Editar mi carnet', alClick: abrirEdicionCarnet };

    if (estado === 'invalido') {
      intentosFallidos++;
      if (intentosFallidos >= INTENTOS_MAXIMOS) {
        intentosFallidos = 0;
        bloqueadoHasta = Date.now() + ESPERA_SEGUNDOS * 1000;
        mostrarMensajeCodigo(`Ese código no existe. Demasiados intentos: espera ${ESPERA_SEGUNDOS} segundos.`, 'error');
      } else {
        mostrarMensajeCodigo('Ese código no existe. Revisa que esté bien escrito.', 'error');
      }
      return;
    }

    intentosFallidos = 0;
    entrada.value = '';
    if (estado === 'repetido') {
      mostrarMensajeCodigo(`Ese código ya lo canjeaste: tienes el título «${nombre}».`, 'info', editar);
    } else {
      mostrarMensajeCodigo(`¡Desbloqueaste el título «${nombre}»! Ya puedes ponértelo en tu carnet.`, 'exito', editar);
    }
  } catch (error) {
    console.error(error);
    mostrarMensajeCodigo('No se pudo guardar el título. Revisa tu conexión e intenta de nuevo.', 'error');
  } finally {
    boton.disabled = false;
    textoBoton.textContent = 'Canjear';
  }
});
