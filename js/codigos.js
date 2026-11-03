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
// sin tildes, en mayúsculas, sin espacios, guiones ni guiones bajos ("supervisor-sustos" y "SUPERVISOR SUSTOS" valen igual)
function normalizarCodigo(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
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

const ICONO_ESTRELLA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8Z"/></svg>';
const ICONO_CANDADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// Una tarjeta por título: ícono, nombre, mini descripción y su estado (en uso / desbloqueado / bloqueado)
function pintarColeccion() {
  const lista = $('#codigos-coleccion');
  const cuenta = $('#codigos-cuenta');
  const progreso = $('#codigos-progreso');

  if (!usuarioActual) {
    cuenta.textContent = 'Inicia sesión para guardar tus títulos en tu carnet.';
    progreso.hidden = true;
    lista.innerHTML = '';
    return;
  }

  const abiertos = new Set(titulosDesbloqueados(usuarioActual).map((titulo) => titulo.id));
  const enUso = tituloElegidoDe(usuarioActual).id;
  const estilo = estiloDeUsuario();
  cuenta.textContent = `Tus títulos: ${abiertos.size} de ${TITULOS.length}`;
  progreso.hidden = false;
  progreso.firstElementChild.style.width = `${(abiertos.size / TITULOS.length) * 100}%`;

  lista.innerHTML = TITULOS.map((titulo) => {
    const limitada = titulo.limite ? `<span class="titulo-item__limite">Solo ${titulo.limite}</span>` : '';

    if (!abiertos.has(titulo.id)) {
      return `<li class="titulo-item titulo-item--bloqueado">
        <span class="titulo-item__icono">${ICONO_CANDADO}</span>
        <span class="titulo-item__texto">
          <span class="titulo-item__nombre"><span class="visualmente-oculto">Bloqueado: </span>Título secreto ${limitada}</span>
          <span class="titulo-item__desc">${titulo.pista || 'Consigue su código para descubrirlo.'}</span>
        </span>
      </li>`;
    }

    const texto = textoDeTitulo(titulo, estilo);
    const esDebugger = titulo.id === 'debugger';
    const esNocturno = titulo.id === 'terror-nocturno';
    const usado = titulo.id === enUso;
    const nombre = esDebugger ? `<span class="glitch-text" data-text="${texto}">${texto}</span>` : texto;
    const clases = [
      'titulo-item titulo-item--abierto',
      usado ? 'titulo-item--en-uso' : '',
      esDebugger ? 'titulo-item--debugger' : '',
      esNocturno ? 'titulo-item--nocturno' : '',
    ].filter(Boolean).join(' ');

    return `<li class="${clases}">
      <span class="titulo-item__icono">${ICONO_ESTRELLA}</span>
      <span class="titulo-item__texto">
        <span class="titulo-item__nombre">${nombre} ${limitada}</span>
        ${titulo.descripcion ? `<span class="titulo-item__desc">${titulo.descripcion}</span>` : ''}
      </span>
      ${usado ? '<span class="titulo-item__estado">En uso</span>' : ''}
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

// Consulta en tiempo real en la base de datos cuántas personas han desbloqueado un título limitado
async function contarCanjesDeTitulo(tituloId) {
  try {
    const { data: perfiles, error } = await clienteSupabase
      .from('perfiles')
      .select('id, monstruo');
    if (error || !perfiles) return 0;

    let total = 0;
    for (const p of perfiles) {
      const m = p.monstruo || {};
      const lista = Array.isArray(m.titulos) ? m.titulos : [];
      if (lista.includes(tituloId) || m.titulo === tituloId) {
        total++;
      }
    }
    return total;
  } catch (err) {
    console.warn('Error al contar canjes:', err);
    return 0;
  }
}

async function canjearCodigo(texto) {
  const huella = await huellaDe(normalizarCodigo(texto));
  const titulo = TITULOS.find((t) => !t.libre && (t.codigo === huella || (Array.isArray(t.codigos) && t.codigos.includes(huella))));
  if (!titulo) return { estado: 'invalido' };

  if (titulosDesbloqueados(usuarioActual).some((t) => t.id === titulo.id)) {
    return { estado: 'repetido', titulo };
  }

  // Comprobar límite de canjes si el título tiene un cupo máximo
  if (titulo.limite && titulo.limite > 0) {
    const canjeados = await contarCanjesDeTitulo(titulo.id);
    if (canjeados >= titulo.limite) {
      return { estado: 'agotado', titulo, limite: titulo.limite };
    }
  }

  const meta = usuarioActual.user_metadata || {};
  const titulos = [...new Set([...(meta.titulos || []), titulo.id])];
  const { data, error } = await clienteSupabase.auth.updateUser({ data: { ...meta, titulos } });
  if (error) throw error;

  // Sincronizar en la tabla perfiles para que quede registrado en el conteo de límite y en el Sustómetro
  try {
    const m = meta.monstruo || {};
    const titulosActualizados = [...new Set([...(m.titulos || []), titulo.id])];
    const nuevoMonstruo = { ...m, titulos: titulosActualizados };
    if (typeof sincronizarPerfil === 'function') {
      const nombre = meta.full_name || usuarioActual.email.split('@')[0];
      await sincronizarPerfil(nombre, nuevoMonstruo);
    }
  } catch (syncError) {
    console.warn('Aviso sincronizando título a perfiles:', syncError);
  }

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
    const { estado, titulo, limite } = await canjearCodigo(entrada.value);
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
    } else if (estado === 'agotado') {
      mostrarMensajeCodigo(`¡Cupos agotados! El título «${nombre}» era una edición limitada de ${limite || 5} personas y ya fue reclamado en su totalidad.`, 'error');
    } else {
      mostrarMensajeCodigo(`¡Desbloqueaste el título «${nombre}»! Ya puedes ponértelo en tu carnet.`, 'exito', editar);
    }
  } catch (error) {
    console.error('Error al canjear código:', error);
    const msg = String(error?.message || '');
    if (msg.includes('JWT') || msg.includes('token') || msg.includes('session') || msg.includes('User from sub') || msg.includes('Auth') || msg.includes('user not found')) {
      mostrarMensajeCodigo('Tu sesión expiró o cambió en Supabase. Cierra sesión y vuelve a ingresar.', 'error', {
        texto: 'Volver a ingresar',
        alClick: async () => {
          await clienteSupabase.auth.signOut();
          $('#auth-modal').showModal();
        },
      });
    } else {
      const errorLegible = typeof traducirError === 'function' ? traducirError(error) : msg;
      mostrarMensajeCodigo(errorLegible || 'No se pudo guardar el título. Revisa tu conexión e intenta de nuevo.', 'error');
    }
  } finally {
    boton.disabled = false;
    textoBoton.textContent = 'Canjear';
  }
});
