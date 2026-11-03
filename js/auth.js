/* =============================================
   SESIÓN Y CARNET DE ASUSTADOR (SUPABASE)
   Ventana para ingresar o crear una cuenta con el correo de la UNAL.
   Al crear la cuenta, la persona arma su monstruo y se le emite un carnet.
   ============================================= */

// Esta es la clave pública (anon) de Supabase: está hecha para ir en el navegador.
// Lo que protege los datos son las reglas configuradas en Supabase. Nunca pongas aquí la clave service_role.
const SUPABASE_URL = 'https://uwcdgpxdiigllqhhmyss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RncHhkaWlnbGxxaGhteXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDc4ODUsImV4cCI6MjEwODI4Mzg4NX0.NuHGfN7un_7Qxg_uosrxtYcUouK593WdmQLrg9mjHjs';

const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Solo se aceptan correos institucionales
const DOMINIO_UNAL = '@unal.edu.co';

// true = pestaña "Crear Carnet", false = pestaña "Ingresar"
let modoRegistro = false;


/* ---------- Creador del monstruo ---------- */

// Opciones de cada parte del monstruo, en el orden en que pasan con las flechas.
// valor: la opción que dibuja dibujarMonstruoPersonalizado (iconos.js); texto: lo que se ve en el selector.
const CATALOGO_MONSTRUO = {
  estilo: [
    { valor: 'masculino', texto: 'Asustador' },
    { valor: 'femenino', texto: 'Asustadora' },
  ],
  cuerpo: [
    { valor: 'manchas', texto: 'Peludo Manchas' },
    { valor: 'redondo', texto: 'Redondo Mike' },
    { valor: 'escamas', texto: 'Reptil Randall' },
    { valor: 'rayas', texto: 'Bestia a Rayas' },
    { valor: 'gelatina', texto: 'Mutante Gel' },
  ],
  color: [
    { valor: '#1667c2', texto: 'Azul Sulley' },
    { valor: '#2f9e5b', texto: 'Verde Wazowski' },
    { valor: '#8b5fd6', texto: 'Morado Boggs' },
    { valor: '#e05a7a', texto: 'Rosa Sustos' },
    { valor: '#f08a24', texto: 'Naranja Rugido' },
    { valor: '#35b6b4', texto: 'Turquesa' },
    { valor: '#d23c5a', texto: 'Rojo Escarlata' },
    { valor: '#3b4d63', texto: 'Gris Nocturno' },
  ],
  ojos: [
    { valor: 'ciclope', texto: '1 Ojo Cíclope' },
    { valor: 'doble', texto: '2 Ojos Clásicos' },
    { valor: 'triple', texto: '3 Ojos Mutantes' },
    { valor: 'tallos', texto: 'Ojos en Antena' },
    { valor: 'intenso', texto: 'Mirada Feroz' },
  ],
  cuernos: [
    { valor: 'toro', texto: 'Cuernos Toro' },
    { valor: 'ramas', texto: 'Cuernos Retorcidos' },
    { valor: 'antenas', texto: 'Antenas Luz' },
    { valor: 'cresta', texto: 'Cresta Dragón' },
    { valor: 'serpientes', texto: 'Cabello Medusa' },
    { valor: 'orejas', texto: 'Orejas Peludas' },
  ],
  boca: [
    { valor: 'colmillos', texto: 'Colmillos' },
    { valor: 'rugido', texto: 'Rugido Susto' },
    { valor: 'sonrisa', texto: 'Sonrisa MU' },
    { valor: 'sierra', texto: 'Dientes Sierra' },
    { valor: 'brackets', texto: 'Brackets' },
    { valor: 'lengua', texto: 'Lengua Afuera' },
  ],
  accesorio: [
    { valor: 'ninguno', texto: 'Al Natural' },
    { valor: 'gorra', texto: 'Gorra UNAL' },
    { valor: 'gafas', texto: 'Gafas Dev' },
    { valor: 'audifonos', texto: 'Audífonos' },
    { valor: 'corbata', texto: 'Corbata Sustos' },
    { valor: 'mono', texto: 'Moño Sustos' },
  ],
};

const PARTES = Object.keys(CATALOGO_MONSTRUO);

// Posición de la opción elegida en cada parte (todas arrancan en la primera)
const indicesMonstruo = Object.fromEntries(PARTES.map((parte) => [parte, 0]));

const opcionElegida = (parte) => CATALOGO_MONSTRUO[parte][indicesMonstruo[parte]];

// El monstruo elegido, por ejemplo { estilo: 'masculino', cuerpo: 'manchas', color: '#1667c2', ... }
function monstruoElegido() {
  const monstruo = {};
  for (const parte of PARTES) {
    monstruo[parte] = opcionElegida(parte).valor;
  }
  return monstruo;
}

/* ---------- Títulos del carnet ---------- */

// La persona que está dentro (null si no hay sesión). Lo actualiza actualizarInterfazSesion.
let usuarioActual = null;

// El título de siempre (el "libre" de TITULOS en data.js): todos lo tienen
const TITULO_BASE = TITULOS.find((titulo) => titulo.libre) || TITULOS[0];

const buscarTitulo = (id) => TITULOS.find((titulo) => titulo.id === id);

// Cómo se lee un título según el estilo del monstruo (Asustador / Asustadora, Rey / Reina…)
function textoDeTitulo(titulo, estilo) {
  return estilo === 'femenino' && titulo.femenino ? titulo.femenino : titulo.nombre;
}

// Los títulos que tiene la persona: los libres y los que canjeó con un código.
// Se guardan en su cuenta como lista de ids (user_metadata.titulos); un id que ya no exista en TITULOS se ignora.
function titulosDesbloqueados(usuario) {
  const canjeados = usuario?.user_metadata?.titulos;
  return TITULOS.filter((titulo) => titulo.libre || (Array.isArray(canjeados) && canjeados.includes(titulo.id)));
}

// El título que lleva en el carnet: el elegido (user_metadata.titulo) si sigue desbloqueado; si no, el de siempre
function tituloElegidoDe(usuario) {
  const id = usuario?.user_metadata?.titulo;
  return titulosDesbloqueados(usuario).find((titulo) => titulo.id === id) || TITULO_BASE;
}

// Carnet con el nombre, el usuario del correo (lo que va antes de la @), el monstruo, el título y estado de medalla (oro, plata, bronce)
function carnetDeAsustador(nombre, correo, monstruo, titulo = TITULO_BASE, medalla = null) {
  const nombreVisible = nombre?.trim() || 'Tu Nombre Aquí';
  const usuario = correo?.includes('@') ? correo.split('@')[0] : 'estudiante';
  const esTramposo = typeof esPayaso === 'function' ? esPayaso(correo, nombre, monstruo) : false;
  const rol = esTramposo ? 'TRAMPOSO DE CIRCO' : textoDeTitulo(titulo, monstruo?.estilo);
  const esDebugger = !esTramposo && titulo?.id === 'debugger';
  const esNocturno = !esTramposo && titulo?.id === 'terror-nocturno';

  // Los títulos largos se parten en dos renglones para no chocar con la foto
  let claseFranja = rol.length > 12 ? 'carnet__franja carnet__franja--larga' : 'carnet__franja';
  if (esDebugger) claseFranja += ' carnet__franja--glitch';
  if (esNocturno) claseFranja += ' carnet__franja--nocturno';
  if (esTramposo) claseFranja += ' carnet__franja--payaso';

  const textoRol = esDebugger
    ? `<span class="glitch-text" data-text="${rol}">${rol}</span>`
    : rol;

  // Normalización del tipo de medalla (los tramposos nunca reciben medalla)
  const tipoMedalla = esTramposo ? null : ((medalla === true || medalla === 'oro')
    ? 'oro'
    : (medalla === 'plata' || medalla === 'bronce' ? medalla : null));

  let selloMedalla = '';
  let claseCarnet = 'carnet';
  let colorBordeFoto = monstruo?.color || '#1667c2';

  if (esTramposo) {
    claseCarnet = 'carnet carnet--payaso';
    selloMedalla = '<span class="carnet__sello carnet__sello--payaso">🤡 LICENCIA DE PAYASO</span>';
    colorBordeFoto = '#ff0033';
  } else if (tipoMedalla === 'oro') {
    claseCarnet = 'carnet carnet--dorado';
    selloMedalla = '<span class="carnet__sello carnet__sello--oro">1° PUESTO</span>';
    colorBordeFoto = '#d4a017';
  } else if (tipoMedalla === 'plata') {
    claseCarnet = 'carnet carnet--plata';
    selloMedalla = '<span class="carnet__sello carnet__sello--plata">2° PUESTO</span>';
    colorBordeFoto = '#94a3b8';
  } else if (tipoMedalla === 'bronce') {
    claseCarnet = 'carnet carnet--bronce';
    selloMedalla = '<span class="carnet__sello carnet__sello--bronce">3° PUESTO</span>';
    colorBordeFoto = '#b45309';
  }

  const marcaSemana = esTramposo
    ? `<span class="carnet__semana carnet__semana--payaso">🎪 CIRCO DE</span><span class="carnet__sistemas carnet__sistemas--payaso">— PAYASOS —</span>`
    : `<span class="carnet__semana">Semana</span><span class="carnet__sistemas">— de sistemas —</span>`;

  const narizHtml = esTramposo ? '<div class="nariz-payaso" title="Payaso">🔴</div>' : '';
  const cargoHtml = esTramposo
    ? `<div class="carnet__cargo carnet__cargo--payaso">@${usuario} · PAYASO OFICIAL</div>`
    : `<div class="carnet__cargo">@${usuario} · UNAL</div>`;

  return `
    <article class="${claseCarnet}">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        ${marcaSemana}
      </div>
      ${selloMedalla}
      <div class="carnet__nombre">${nombreVisible}</div>
      ${cargoHtml}
      <div class="${claseFranja}" style="background: ${esTramposo ? '' : (monstruo?.color || '#1667c2')}; --letras: ${rol.length}">${textoRol}</div>
      <div class="carnet__foto" style="border-color: ${colorBordeFoto}">
        ${dibujarMonstruoPersonalizado(monstruo || {})}
        ${narizHtml}
      </div>
    </article>
  `;
}

// Muestra en cada selector la opción elegida y vuelve a dibujar el carnet de muestra.
// Al crear el carnet usa el formulario; al editarlo, el nombre y el título de la vista de edición.
function actualizarVistaPrevia() {
  for (const parte of PARTES) {
    $(`#val-${parte}`).textContent = opcionElegida(parte).texto;
  }
  $('#dot-color').style.background = opcionElegida('color').valor;

  const monstruo = monstruoElegido();
  if (!editando) {
    $('#preview-carnet-registro').innerHTML =
      carnetDeAsustador($('#auth-nombre').value, $('#auth-correo').value, monstruo);
    return;
  }

  const titulos = titulosDesbloqueados(usuarioActual);
  const titulo = titulos.find((t) => t.id === tituloEnEdicion) || TITULO_BASE;
  const textoTitulo = textoDeTitulo(titulo, monstruo.estilo);
  if (titulo.id === 'debugger') {
    $('#val-titulo').innerHTML = `<span class="glitch-text" data-text="${textoTitulo}">${textoTitulo}</span>`;
  } else {
    $('#val-titulo').textContent = textoTitulo;
  }
  $$('#selector-titulo .selector-arcade__flecha').forEach((flecha) => { flecha.disabled = titulos.length < 2; });
  $('#edit-titulos-nota').textContent = titulos.length < 2
    ? 'Aún no tienes otros títulos. Canjea códigos en el Sustómetro para desbloquearlos.'
    : `Tienes ${titulos.length} de ${TITULOS.length} títulos. Canjea más códigos en el Sustómetro.`;

  $('#preview-carnet-registro').innerHTML =
    carnetDeAsustador($('#edit-nombre').value, usuarioActual.email, monstruo, titulo, usuarioMedalla || (usuarioEsLider ? 'oro' : null));
}

// Flechas ‹ › de cada selector: pasan a la opción anterior o a la siguiente (de la última vuelve a la primera)
$('#creador-carnet').addEventListener('click', (evento) => {
  const flecha = evento.target.closest('.selector-arcade__flecha');
  if (!flecha) return;

  const parte = flecha.closest('.selector-arcade').dataset.prop;
  const total = CATALOGO_MONSTRUO[parte].length;
  indicesMonstruo[parte] = (indicesMonstruo[parte] + Number(flecha.dataset.dir) + total) % total;
  actualizarVistaPrevia();
});

$('#btn-monstruo-random').addEventListener('click', () => {
  for (const parte of PARTES) {
    indicesMonstruo[parte] = Math.floor(Math.random() * CATALOGO_MONSTRUO[parte].length);
  }
  actualizarVistaPrevia();
});

$('#auth-nombre').addEventListener('input', actualizarVistaPrevia);
$('#auth-correo').addEventListener('input', actualizarVistaPrevia);
$('#edit-nombre').addEventListener('input', actualizarVistaPrevia);


/* ---------- Editar el carnet ---------- */

// Al editar, el selector del monstruo (#creador-carnet) se mueve de la vista de "Crear Carnet" a la de edición
// y vuelve a su sitio al salir, así se usan los mismos botones y la misma vista previa en los dos casos.
let editando = false;
let tituloEnEdicion = TITULO_BASE.id;   // id del título que se está probando en la vista previa

function mostrarMensajeEdicion(texto) {
  const mensaje = $('#edit-mensaje');
  mensaje.textContent = texto;
  mensaje.className = 'auth-mensaje auth-mensaje--error';
  mensaje.hidden = false;
}

function entrarEdicion() {
  if (!usuarioActual || editando) return;
  const meta = usuarioActual.user_metadata || {};

  // El selector arranca con el monstruo que la persona ya tiene
  for (const parte of PARTES) {
    const indice = CATALOGO_MONSTRUO[parte].findIndex((opcion) => opcion.valor === meta.monstruo?.[parte]);
    indicesMonstruo[parte] = Math.max(indice, 0);
  }
  tituloEnEdicion = tituloElegidoDe(usuarioActual).id;
  editando = true;

  $('#edit-nombre').value = meta.full_name || usuarioActual.email.split('@')[0];
  $('#edit-mensaje').hidden = true;
  $('#edit-creador-montaje').append($('#creador-carnet'));
  $('#creador-carnet').hidden = false;
  $('#auth-vista-perfil').hidden = true;
  $('#auth-vista-edicion').hidden = false;
  $('#auth-titulo').textContent = 'Editar carnet';
  actualizarVistaPrevia();
}

// Descarta lo que se estaba editando y vuelve a mostrar el carnet guardado
function salirDeEdicion() {
  if (!editando) return;
  editando = false;
  $('#auth-form').before($('#creador-carnet'));
  $('#creador-carnet').hidden = !modoRegistro;
  $('#auth-vista-edicion').hidden = true;
  $('#auth-vista-perfil').hidden = false;
  $('#auth-titulo').textContent = 'Carnet de Asustador';
}

// Lo usa el apartado de códigos para llevar a la persona directo a elegir su título nuevo
function abrirEdicionCarnet() {
  if (!usuarioActual) return;
  if (!$('#auth-modal').open) $('#auth-modal').showModal();
  entrarEdicion();
}

// La tabla del Sustómetro lee de la tabla 'perfiles', no de la cuenta: hay que copiarle el nombre y el monstruo
// nuevos (incluyendo el título para que se vea en el Sustómetro).
// Se intenta primero con la función actualizar_perfil de Supabase (supabase/actualizar-perfil.sql)
// y si aún no la han creado, se hace fallback directo con la política de UPDATE de perfiles.
async function sincronizarPerfil(nombre, monstruo) {
  let sincronizado = false;
  try {
    const { error } = await clienteSupabase.rpc('actualizar_perfil', { nuevo_nombre: nombre, nuevo_monstruo: monstruo });
    if (!error) sincronizado = true;
  } catch (error) {
    console.warn('Aviso RPC actualizar_perfil:', error);
  }

  // Fallback directo a perfiles
  if (!sincronizado && usuarioActual?.id) {
    try {
      await clienteSupabase
        .from('perfiles')
        .update({ nombre, monstruo })
        .eq('id', usuarioActual.id);
    } catch (e) {
      console.warn('Aviso update directo perfiles:', e);
    }
  }
}

async function guardarEdicion() {
  const nombre = $('#edit-nombre').value.trim();
  if (!nombre) {
    mostrarMensajeEdicion('Escribe tu nombre para imprimirlo en el carnet.');
    return;
  }
  // Solo se puede dejar un título que la persona ya desbloqueó
  const titulo = titulosDesbloqueados(usuarioActual).find((t) => t.id === tituloEnEdicion) || TITULO_BASE;

  const boton = $('#btn-guardar-edicion');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  $('#edit-mensaje').hidden = true;

  try {
    const titulosIds = titulosDesbloqueados(usuarioActual).map((t) => t.id);
    const monstruoActualizado = { ...monstruoElegido(), titulo: titulo.id, titulos: titulosIds };
    const { data, error } = await clienteSupabase.auth.updateUser({
      data: { ...usuarioActual.user_metadata, full_name: nombre, monstruo: monstruoActualizado, titulo: titulo.id, titulos: titulosIds },
    });
    if (error) throw error;
    await sincronizarPerfil(nombre, monstruoActualizado);
    salirDeEdicion();
    actualizarInterfazSesion(data.user);
    if (typeof cargarSustometro === 'function') {
      cargarSustometro();
    }
  } catch (error) {
    mostrarMensajeEdicion(traducirError(error));
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

$('#btn-editar-carnet').addEventListener('click', entrarEdicion);
$('#btn-cancelar-edicion').addEventListener('click', salirDeEdicion);
$('#btn-guardar-edicion').addEventListener('click', guardarEdicion);

// Flechas del selector de título: pasan entre los títulos desbloqueados
$('#selector-titulo').addEventListener('click', (evento) => {
  const flecha = evento.target.closest('.selector-arcade__flecha');
  if (!flecha || !editando) return;

  const titulos = titulosDesbloqueados(usuarioActual);
  const actual = titulos.findIndex((titulo) => titulo.id === tituloEnEdicion);
  tituloEnEdicion = titulos[(actual + Number(flecha.dataset.dir) + titulos.length) % titulos.length].id;
  actualizarVistaPrevia();
});


/* ---------- Ventana de sesión ---------- */

$('#auth-icono-ojo').innerHTML = ICONOS.ojo;

// Cambia entre la pestaña "Ingresar" y "Crear Carnet"
function cambiarModoAuth(esRegistro) {
  modoRegistro = esRegistro;
  $('#tab-login').setAttribute('aria-pressed', !esRegistro);
  $('#tab-registro').setAttribute('aria-pressed', esRegistro);

  $('#auth-modal').classList.toggle('auth-modal--registro', esRegistro);
  $('#creador-carnet').hidden = !esRegistro;
  $('#campo-nombre').hidden = !esRegistro;
  $('#auth-nombre').required = esRegistro;

  $('#auth-titulo').textContent = esRegistro ? 'Carnet de Asustador' : 'Acceso';
  $('#auth-submit-texto').textContent = esRegistro ? 'Emitir mi Carnet' : 'Entrar';
  ocultarMensajeAuth();

  if (esRegistro) actualizarVistaPrevia();
}

// Mensaje debajo del formulario: de error (rojo) o de éxito (verde)
function mostrarMensajeAuth(texto, esError = true) {
  const mensaje = $('#auth-mensaje');
  mensaje.textContent = texto;
  mensaje.className = `auth-mensaje ${esError ? 'auth-mensaje--error' : 'auth-mensaje--exito'}`;
  mensaje.hidden = false;
}

function ocultarMensajeAuth() {
  const mensaje = $('#auth-mensaje');
  mensaje.hidden = true;
  mensaje.textContent = '';
}

// Con sesión, la ventana muestra el carnet de la persona; sin sesión, el formulario
function actualizarInterfazSesion(usuario) {
  usuarioActual = usuario;
  $('#btn-abrir-auth').classList.toggle('portada__boton--conectado', Boolean(usuario));
  if (usuario) {
    // Si la persona ya había elegido un título o desbloqueado títulos en su cuenta pero no estaban en su monstruo de la tabla,
    // los sincronizamos automáticamente a 'perfiles' para que el conteo global y el Sustómetro los tengan al día.
    const tId = usuario.user_metadata?.titulo;
    const titulosIds = titulosDesbloqueados(usuario).map((t) => t.id);
    const m = usuario.user_metadata?.monstruo || {};
    const necesitaSincronizarTitulo = tId && m.titulo !== tId;
    const necesitaSincronizarTitulos = !Array.isArray(m.titulos) || m.titulos.length !== titulosIds.length;

    if (necesitaSincronizarTitulo || necesitaSincronizarTitulos) {
      const mActualizado = { ...m, ...(tId ? { titulo: tId } : {}), titulos: titulosIds };
      sincronizarPerfil(usuario.user_metadata.full_name || usuario.email.split('@')[0], mActualizado);
    }

    // Supabase avisa de nuevo cada vez que la pestaña recupera el foco: si la persona está editando
    // no se le vuelve a pintar el perfil encima, para que no pierda lo que lleva.
    if (!editando) mostrarPerfil(usuario);
  } else {
    salirDeEdicion();
    mostrarFormulario();
  }
  // Para el apartado de códigos (js/codigos.js): cambió quién está dentro o sus títulos
  document.dispatchEvent(new CustomEvent('carnet:sesion'));
}

let usuarioMedalla = null; // 'oro' | 'plata' | 'bronce' | null
let usuarioEsLider = false; // mantenido para compatibilidad

async function obtenerMedallaUsuario(usuarioId) {
  if (!usuarioId) return null;
  try {
    const { data: perfiles } = await clienteSupabase
      .from('perfiles')
      .select('id, puntos')
      .order('puntos', { ascending: false });
    if (!perfiles || !perfiles.length) return null;

    const puntajes = perfiles.map((p) => Number(p.puntos) || 0);
    const hayPuntosEnJuego = puntajes.some((p) => p > 0);
    const persona = perfiles.find((p) => p.id === usuarioId);
    if (!persona) return null;
    const puntos = Number(persona.puntos) || 0;

    if (!hayPuntosEnJuego) {
      // Si nadie tiene puntos todavía, todos comparten el 1° lugar (oro)
      return 'oro';
    }
    if (puntos <= 0) return null;

    // Niveles únicos de puntaje para resolver empates (dense ranking)
    const tiers = [...new Set(puntajes.filter((p) => p > 0))].sort((a, b) => b - a);
    const tier = tiers.indexOf(puntos);
    if (tier === 0) return 'oro';
    if (tier === 1) return 'plata';
    if (tier === 2) return 'bronce';
    return null;
  } catch {
    return null;
  }
}

async function verificarSiEsLider(usuarioId) {
  const medalla = await obtenerMedallaUsuario(usuarioId);
  return medalla === 'oro';
}

function mostrarPerfil(usuario) {
  const nombreCompleto = usuario.user_metadata?.full_name || usuario.email.split('@')[0];
  const monstruo = usuario.user_metadata?.monstruo || monstruoElegido();
  const titulo = tituloElegidoDe(usuario);
  const esTramposo = typeof esPayaso === 'function' && esPayaso(usuario.email, nombreCompleto, monstruo);

  $('#sesion-texto').textContent = nombreCompleto.trim().split(' ')[0];   // el botón de la portada muestra el primer nombre
  $('#auth-modal').classList.add('auth-modal--registro');
  $('#auth-vista-formulario').hidden = true;
  $('#auth-vista-perfil').hidden = false;

  // Alerta especial de payaso si el usuario fue sancionado por hackeo
  let avisoPayaso = $('#perfil-aviso-payaso');
  if (esTramposo) {
    if (!avisoPayaso) {
      avisoPayaso = document.createElement('div');
      avisoPayaso.id = 'perfil-aviso-payaso';
      avisoPayaso.className = 'aviso-payaso';
      avisoPayaso.innerHTML = `
        <span class="aviso-payaso__icono">🤡🎪</span>
        <div class="aviso-payaso__cuerpo">
          <strong>¡HAY UN PAYASO INTENTANDO ARRUINAR LA FIESTA!</strong>
          <p>Tu cuenta ha sido sancionada con Shadowban por manipular puntos mediante inyección de código. Tu carnet ahora es público como Licencia de Payaso y tus puntos se han congelado en 0.</p>
        </div>
      `;
      $('#perfil-carnet-final').before(avisoPayaso);
    }
    avisoPayaso.hidden = false;
    $('#auth-titulo').textContent = '🤡 Licencia de Payaso';
  } else {
    if (avisoPayaso) avisoPayaso.hidden = true;
    $('#auth-titulo').textContent = 'Carnet de Asustador';
  }

  $('#perfil-carnet-final').innerHTML = carnetDeAsustador(nombreCompleto, usuario.email, monstruo, titulo, usuarioMedalla || (usuarioEsLider ? 'oro' : null));
  $('#perfil-correo').textContent = usuario.email;

  // Consulta asíncrona si tiene podio (oro, plata o bronce) en el Sustómetro para actualizar el carnet
  obtenerMedallaUsuario(usuario.id).then((medalla) => {
    if (medalla !== usuarioMedalla) {
      usuarioMedalla = medalla;
      usuarioEsLider = medalla === 'oro';
      if (!editando && $('#auth-vista-perfil') && !$('#auth-vista-perfil').hidden) {
        $('#perfil-carnet-final').innerHTML = carnetDeAsustador(nombreCompleto, usuario.email, monstruo, titulo, usuarioMedalla);
      }
    }
  });
}

function mostrarFormulario() {
  $('#sesion-texto').textContent = 'Iniciar sesión';
  $('#auth-vista-formulario').hidden = false;
  $('#auth-vista-perfil').hidden = true;
  cambiarModoAuth(modoRegistro);
}

$('#btn-abrir-auth').addEventListener('click', () => {
  ocultarMensajeAuth();
  $('#auth-modal').showModal();
});

$('#btn-cerrar-auth').addEventListener('click', () => $('#auth-modal').close());

// Si se cierra la ventana a mitad de la edición, lo que no se guardó se descarta
$('#auth-modal').addEventListener('close', salirDeEdicion);

// Un clic en el fondo oscuro (fuera de la caja) cierra la ventana
$('#auth-modal').addEventListener('click', (evento) => {
  if (evento.target === $('#auth-modal')) $('#auth-modal').close();
});

$('#tab-login').addEventListener('click', () => cambiarModoAuth(false));
$('#tab-registro').addEventListener('click', () => cambiarModoAuth(true));


/* ---------- Crear carnet, ingresar y salir ---------- */

// Errores de Supabase (vienen en inglés) que se le explican a la persona en español
const ERRORES_SUPABASE = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Este correo ya tiene un carnet. Ve a la pestaña Ingresar.',
};

function traducirError(error) {
  const mensaje = error.message || 'No se pudo completar la operación.';
  const conocido = Object.keys(ERRORES_SUPABASE).find((texto) => mensaje.includes(texto));
  return conocido ? ERRORES_SUPABASE[conocido] : mensaje;
}

// Crea la cuenta y guarda en ella el nombre y el monstruo elegido
async function crearCarnet({ nombre, correo, clave }) {
  if (!nombre) throw new Error('Escribe tu nombre para imprimirlo en el carnet.');

  const { data, error } = await clienteSupabase.auth.signUp({
    email: correo,
    password: clave,
    options: { data: { full_name: nombre, monstruo: monstruoElegido() } },
  });
  if (error) throw error;

  // Si Supabase pide confirmar el correo, todavía no hay sesión
  if (!data.session) {
    mostrarMensajeAuth(`¡Carnet creado! Revisa tu correo ${DOMINIO_UNAL} para activarlo.`, false);
    return;
  }
  mostrarMensajeAuth('¡Carnet de Asustador emitido con éxito!', false);
  setTimeout(() => $('#auth-modal').close(), 1000);
}

async function ingresar({ correo, clave }) {
  const { error } = await clienteSupabase.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw error;
  $('#auth-modal').close();
}

// Envío del formulario: crea el carnet o ingresa, según la pestaña elegida
$('#auth-form').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarMensajeAuth();

  const datos = {
    nombre: $('#auth-nombre').value.trim(),
    correo: $('#auth-correo').value.trim().toLowerCase(),
    clave: $('#auth-clave').value,
  };

  if (!datos.correo.endsWith(DOMINIO_UNAL)) {
    mostrarMensajeAuth(`Usa tu correo institucional terminado en ${DOMINIO_UNAL}`);
    return;
  }

  // Mientras Supabase responde, el botón queda deshabilitado y dice "Cargando…"
  const boton = $('#auth-submit');
  const textoBoton = $('#auth-submit-texto');
  const textoOriginal = textoBoton.textContent;
  boton.disabled = true;
  textoBoton.textContent = 'Cargando…';

  try {
    await (modoRegistro ? crearCarnet(datos) : ingresar(datos));
  } catch (error) {
    mostrarMensajeAuth(traducirError(error));
  } finally {
    boton.disabled = false;
    textoBoton.textContent = textoOriginal;
  }
});

$('#btn-cerrar-sesion').addEventListener('click', async () => {
  await clienteSupabase.auth.signOut();
  $('#auth-form').reset();
  $('#auth-modal').close();
});


/* ---------- Descargar el carnet como imagen ---------- */

// Ancho en píxeles de la imagen, sin importar el tamaño de la pantalla
const ANCHO_IMAGEN_CARNET = 1080;

// Nombre del archivo a partir del nombre del carnet: "Ana María" → carnet-asustador-ana-maria.png
function nombreDeArchivo(nombre) {
  const limpio = nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita las tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `carnet-asustador-${limpio || 'unal'}.png`;
}

// htmlToImage (librería html-to-image) copia el carnet con sus letras y lo pinta en un lienzo.
// La primera vez suele salir en blanco porque el navegador aún no ha preparado las letras,
// así que se vuelve a pintar hasta que el centro del carnet tenga color (máximo 3 intentos).
async function pintarCarnet(carnet) {
  for (let intento = 0; intento < 3; intento++) {
    const lienzo = await htmlToImage.toCanvas(carnet, {
      pixelRatio: ANCHO_IMAGEN_CARNET / carnet.offsetWidth,   // se mide en cada intento por si la ventana cambió de tamaño
      style: { boxShadow: 'none', animation: 'none' },        // sin la sombra ni la animación de entrada
    });
    const centro = lienzo.getContext('2d').getImageData(lienzo.width / 2, lienzo.height / 2, 1, 1).data;
    if (centro[3] > 0) return lienzo.toDataURL('image/png');
  }
  throw new Error('El carnet salió en blanco');
}

// Convierte el carnet en una imagen PNG y la descarga. No necesita sesión: también sirve con el carnet de muestra.
async function descargarCarnet(boton) {
  const carnet = $(`${boton.dataset.carnet} .carnet`);
  const texto = boton.querySelector('span');
  boton.disabled = true;
  texto.textContent = 'Preparando…';

  try {
    const imagen = await pintarCarnet(carnet);
    const enlace = document.createElement('a');
    enlace.href = imagen;
    enlace.download = nombreDeArchivo(carnet.querySelector('.carnet__nombre').textContent);
    enlace.click();
    texto.textContent = 'Descargar carnet';
  } catch (error) {
    console.error(error);
    texto.textContent = 'No se pudo, intenta de nuevo';
  } finally {
    boton.disabled = false;
  }
}

$$('.boton-descargar').forEach((boton) => {
  boton.addEventListener('click', () => descargarCarnet(boton));
});


/* ---------- Arranque y control de versiones ---------- */

// Si la versión del proyecto cambió, cerramos sesiones viejas en el navegador
// y limpiamos tokens almacenados para evitar problemas de JWT o versiones desfasadas.
async function sincronizarVersionSesion() {
  const versionActual = typeof VERSION_PROYECTO !== 'undefined' ? VERSION_PROYECTO : 'v1';
  const versionGuardada = localStorage.getItem('semana_sistemas_version');

  if (versionGuardada !== versionActual) {
    const haySesionPrevia = Object.keys(localStorage).some((k) => k.startsWith('sb-') || k.includes('supabase'));
    if (versionGuardada || haySesionPrevia) {
      try {
        await clienteSupabase.auth.signOut();
      } catch {
        // Ignorar si falla la conexión
      }
      for (const clave of Object.keys(localStorage)) {
        if (clave.startsWith('sb-') || clave.includes('supabase')) {
          localStorage.removeItem(clave);
        }
      }
    }
    localStorage.setItem('semana_sistemas_version', versionActual);
  }
}

// Al cargar la página, primero aseguramos que la versión coincida; luego inicializamos la sesión
sincronizarVersionSesion().finally(() => {
  clienteSupabase.auth.getSession().then(({ data: { session } }) => {
    actualizarInterfazSesion(session?.user ?? null);
  });

  clienteSupabase.auth.onAuthStateChange((_evento, session) => {
    actualizarInterfazSesion(session?.user ?? null);
  });
});
