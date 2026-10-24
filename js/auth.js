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

// Carnet con el nombre, el usuario del correo (lo que va antes de la @) y el monstruo
function carnetDeAsustador(nombre, correo, monstruo) {
  const nombreVisible = nombre?.trim() || 'Tu Nombre Aquí';
  const usuario = correo?.includes('@') ? correo.split('@')[0] : 'estudiante';
  const rol = monstruo.estilo === 'femenino' ? 'Asustadora' : 'Asustador';

  return `
    <article class="carnet">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        <span class="carnet__semana">Semana</span>
        <span class="carnet__sistemas">— de sistemas —</span>
      </div>
      <div class="carnet__nombre">${nombreVisible}</div>
      <div class="carnet__cargo">@${usuario} · UNAL</div>
      <div class="carnet__franja" style="background: ${monstruo.color}">${rol}</div>
      <div class="carnet__foto" style="border-color: ${monstruo.color}">
        ${dibujarMonstruoPersonalizado(monstruo)}
      </div>
    </article>
  `;
}

// Muestra en cada selector la opción elegida y vuelve a dibujar el carnet de muestra
function actualizarVistaPrevia() {
  for (const parte of PARTES) {
    $(`#val-${parte}`).textContent = opcionElegida(parte).texto;
  }
  $('#dot-color').style.background = opcionElegida('color').valor;

  $('#preview-carnet-registro').innerHTML =
    carnetDeAsustador($('#auth-nombre').value, $('#auth-correo').value, monstruoElegido());
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
  $('#btn-abrir-auth').classList.toggle('portada__boton--conectado', Boolean(usuario));
  if (usuario) {
    mostrarPerfil(usuario);
  } else {
    mostrarFormulario();
  }
}

function mostrarPerfil(usuario) {
  const nombreCompleto = usuario.user_metadata?.full_name || usuario.email.split('@')[0];
  const monstruo = usuario.user_metadata?.monstruo || monstruoElegido();

  $('#sesion-texto').textContent = nombreCompleto.trim().split(' ')[0];   // el botón de la portada muestra el primer nombre
  $('#auth-modal').classList.add('auth-modal--registro');
  $('#auth-vista-formulario').hidden = true;
  $('#auth-vista-perfil').hidden = false;
  $('#auth-titulo').textContent = 'Carnet de Asustador';
  $('#perfil-carnet-final').innerHTML = carnetDeAsustador(nombreCompleto, usuario.email, monstruo);
  $('#perfil-correo').textContent = usuario.email;
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


/* ---------- Arranque ---------- */

// Al cargar la página, y cada vez que alguien entra o sale, se actualiza la interfaz
clienteSupabase.auth.getSession().then(({ data: { session } }) => {
  actualizarInterfazSesion(session?.user ?? null);
});

clienteSupabase.auth.onAuthStateChange((_evento, session) => {
  actualizarInterfazSesion(session?.user ?? null);
});
