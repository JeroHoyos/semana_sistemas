/* =============================================
   AUTENTICACIÓN Y CARNET DE ASUSTADOR (SUPABASE)
   ============================================= */

const SUPABASE_URL = 'https://uwcdgpxdiigllqhhmyss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RncHhkaWlnbGxxaGhteXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDc4ODUsImV4cCI6MjEwODI4Mzg4NX0.NuHGfN7un_7Qxg_uosrxtYcUouK593WdmQLrg9mjHjs';

const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let modoRegistro = false;
let usuarioActual = null;

// Catálogo completo de opciones tipo videojuego para el monstruo
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

// Índices activos del carrusel
const indicesMonstruo = {
  estilo: 0,
  cuerpo: 0,
  color: 0,
  ojos: 0,
  cuernos: 0,
  boca: 0,
  accesorio: 0,
};

function obtenerConfigActual() {
  const cfg = {};
  for (const prop of Object.keys(CATALOGO_MONSTRUO)) {
    cfg[prop] = CATALOGO_MONSTRUO[prop][indicesMonstruo[prop]].valor;
  }
  return cfg;
}

if ($('#auth-icono-ojo') && typeof ICONOS !== 'undefined') {
  $('#auth-icono-ojo').innerHTML = ICONOS.ojo;
}

// Genera el HTML del Carnet de Asustador
function armarHTMLCarnet(nombre, correo, cfg) {
  const nombreMostrar = (nombre && nombre.trim()) ? nombre.trim() : 'Tu Nombre Aquí';
  const usuarioCorreo = (correo && correo.includes('@')) ? correo.split('@')[0] : 'estudiante';
  const rolCredencial = cfg.estilo === 'femenino' ? 'Asustadora' : 'Asustador';

  return `
    <article class="carnet">
      <div class="carnet__escudo">${dibujarEscudo()}</div>
      <div class="carnet__marca">
        <span class="carnet__semana">Semana</span>
        <span class="carnet__sistemas">— de sistemas —</span>
      </div>
      <div class="carnet__nombre">${nombreMostrar}</div>
      <div class="carnet__cargo">@${usuarioCorreo} · UNAL</div>
      <div class="carnet__franja" style="background: ${cfg.color}">${rolCredencial}</div>
      <div class="carnet__foto" style="border-color: ${cfg.color}">
        ${dibujarMonstruoPersonalizado(cfg)}
      </div>
    </article>
  `;
}

// Actualiza los textos y redibuja la vista previa del carnet en vivo
function actualizarPreviewCarnet() {
  const cfg = obtenerConfigActual();

  for (const prop of Object.keys(CATALOGO_MONSTRUO)) {
    const item = CATALOGO_MONSTRUO[prop][indicesMonstruo[prop]];
    if (prop === 'color') {
      const dot = $('#dot-color');
      const txt = $('#txt-color');
      if (dot) dot.style.background = item.valor;
      if (txt) txt.textContent = item.texto;
    } else {
      const el = $(`#val-${prop}`);
      if (el) el.textContent = item.texto;
    }
  }

  const contenedor = $('#preview-carnet-registro');
  if (!contenedor) return;
  const nombre = $('#auth-nombre').value;
  const correo = $('#auth-correo').value;
  contenedor.innerHTML = armarHTMLCarnet(nombre, correo, cfg);
}

// Escuchar los clics en las flechas del selector tipo videojuego
if ($('#creador-carnet')) {
  $('#creador-carnet').addEventListener('click', (evento) => {
    const flecha = evento.target.closest('.selector-arcade__flecha');
    if (!flecha) return;

    const fila = flecha.closest('.selector-arcade');
    if (!fila) return;

    const prop = fila.dataset.prop;
    const dir = Number(flecha.dataset.dir);
    const total = CATALOGO_MONSTRUO[prop].length;

    indicesMonstruo[prop] = (indicesMonstruo[prop] + dir + total) % total;
    actualizarPreviewCarnet();
  });
}

// Botón "🎲 Aleatorio"
if ($('#btn-monstruo-random')) {
  $('#btn-monstruo-random').addEventListener('click', () => {
    for (const prop of Object.keys(CATALOGO_MONSTRUO)) {
      const total = CATALOGO_MONSTRUO[prop].length;
      indicesMonstruo[prop] = Math.floor(Math.random() * total);
    }
    actualizarPreviewCarnet();
  });
}

$('#auth-nombre').addEventListener('input', actualizarPreviewCarnet);
$('#auth-correo').addEventListener('input', actualizarPreviewCarnet);

// Cambiar entre pestaña "Ingresar" y "Crear Carnet"
function cambiarModoAuth(esRegistro) {
  modoRegistro = esRegistro;
  $('#tab-login').setAttribute('aria-pressed', !esRegistro);
  $('#tab-registro').setAttribute('aria-pressed', esRegistro);

  $('#auth-modal').classList.toggle('auth-modal--registro', esRegistro);
  if ($('#creador-carnet')) {
    $('#creador-carnet').hidden = !esRegistro;
  }
  $('#campo-nombre').hidden = !esRegistro;
  $('#auth-nombre').required = esRegistro;

  $('#auth-titulo').textContent = esRegistro ? 'Carnet de Asustador' : 'Acceso';
  $('#auth-submit-texto').textContent = esRegistro ? 'Emitir mi Carnet' : 'Entrar';
  ocultarMensajeAuth();

  if (esRegistro) {
    actualizarPreviewCarnet();
  }
}

function mostrarMensajeAuth(texto, esError = true) {
  const el = $('#auth-mensaje');
  el.textContent = texto;
  el.className = `auth-mensaje ${esError ? 'auth-mensaje--error' : 'auth-mensaje--exito'}`;
  el.hidden = false;
}

function ocultarMensajeAuth() {
  const el = $('#auth-mensaje');
  el.hidden = true;
  el.textContent = '';
}

function actualizarInterfazSesion(user) {
  usuarioActual = user;
  const boton = $('#btn-abrir-auth');
  const textoBoton = $('#sesion-texto');

  if (user) {
    const nombreCompleto = user.user_metadata?.full_name || user.email.split('@')[0];
    const primerNombre = nombreCompleto.trim().split(' ')[0];
    const monstruoGuardado = user.user_metadata?.monstruo || obtenerConfigActual();

    textoBoton.textContent = primerNombre;
    boton.classList.add('portada__boton--conectado');

    $('#auth-modal').classList.add('auth-modal--registro');
    $('#auth-vista-formulario').hidden = true;
    $('#auth-vista-perfil').hidden = false;
    $('#auth-titulo').textContent = 'Carnet de Asustador';
    $('#perfil-carnet-final').innerHTML = armarHTMLCarnet(nombreCompleto, user.email, monstruoGuardado);
    $('#perfil-correo').textContent = user.email;
  } else {
    textoBoton.textContent = 'Iniciar sesión';
    boton.classList.remove('portada__boton--conectado');

    $('#auth-vista-formulario').hidden = false;
    $('#auth-vista-perfil').hidden = true;
    cambiarModoAuth(modoRegistro);
  }
}

$('#btn-abrir-auth').addEventListener('click', () => {
  ocultarMensajeAuth();
  $('#auth-modal').showModal();
});

$('#btn-cerrar-auth').addEventListener('click', () => {
  $('#auth-modal').close();
});

$('#auth-modal').addEventListener('click', (evento) => {
  if (evento.target === $('#auth-modal')) {
    $('#auth-modal').close();
  }
});

$('#tab-login').addEventListener('click', () => cambiarModoAuth(false));
$('#tab-registro').addEventListener('click', () => cambiarModoAuth(true));

// Envío del formulario de registro o login
$('#auth-form').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarMensajeAuth();

  const nombre = $('#auth-nombre').value.trim();
  const correo = $('#auth-correo').value.trim().toLowerCase();
  const clave = $('#auth-clave').value;

  if (!correo.endsWith('@unal.edu.co')) {
    mostrarMensajeAuth('Usa tu correo institucional terminado en @unal.edu.co');
    return;
  }

  const btnSubmit = $('#auth-submit');
  const textoOriginal = $('#auth-submit-texto').textContent;
  btnSubmit.disabled = true;
  $('#auth-submit-texto').textContent = 'Cargando…';

  try {
    if (modoRegistro) {
      if (!nombre) {
        throw new Error('Escribe tu nombre para imprimirlo en el carnet.');
      }

      const { data, error } = await clienteSupabase.auth.signUp({
        email: correo,
        password: clave,
        options: {
          data: {
            full_name: nombre,
            monstruo: obtenerConfigActual(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        mostrarMensajeAuth('¡Carnet de Asustador emitido con éxito!', false);
        setTimeout(() => $('#auth-modal').close(), 1000);
      } else {
        mostrarMensajeAuth('¡Carnet creado! Revisa tu correo @unal.edu.co para activarlo.', false);
      }
    } else {
      const { error } = await clienteSupabase.auth.signInWithPassword({
        email: correo,
        password: clave,
      });

      if (error) throw error;
      $('#auth-modal').close();
    }
  } catch (err) {
    let mensaje = err.message || 'No se pudo completar la operación.';
    if (mensaje.includes('Invalid login credentials')) {
      mensaje = 'Correo o contraseña incorrectos.';
    } else if (mensaje.includes('User already registered')) {
      mensaje = 'Este correo ya tiene un carnet. Ve a la pestaña Ingresar.';
    }
    mostrarMensajeAuth(mensaje);
  } finally {
    btnSubmit.disabled = false;
    $('#auth-submit-texto').textContent = textoOriginal;
  }
});

$('#btn-cerrar-sesion').addEventListener('click', async () => {
  await clienteSupabase.auth.signOut();
  $('#auth-form').reset();
  $('#auth-modal').close();
});

clienteSupabase.auth.getSession().then(({ data: { session } }) => {
  actualizarInterfazSesion(session?.user ?? null);
});

clienteSupabase.auth.onAuthStateChange((_event, session) => {
  actualizarInterfazSesion(session?.user ?? null);
});