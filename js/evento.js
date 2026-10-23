/* =============================================
   PÁGINA DE UNA ACTIVIDAD
   Lee el id de la dirección (evento.html?id=maraton) y arma la página con sus datos.
   ============================================= */

const actividad = buscarActividad(new URLSearchParams(location.search).get('id'));

// 'Miércoles, 18 nov' (o solo 'Miércoles' si el día no tiene fecha)
function textoDelDia(dia) {
  return `${dia.nombre}${dia.fecha ? `, ${dia.fecha}` : ''}`;
}


/* ---------- Cabecera ---------- */

function pintarPortada() {
  const tipo = TIPOS[actividad.tipo];

  document.title = `${actividad.titulo} · Semana de Sistemas`;

  $('#evento-portada').innerHTML = `
    <span class="evento-portada__tipo" style="--color: ${tipo.color}; --fondo: ${tipo.fondo}">${ICONOS.ojo}${tipo.singular}</span>
    <h1 class="evento-portada__titulo">${actividad.titulo}</h1>
    <p class="evento-portada__cuando">${textoDelDia(buscarDia(actividad.dia))} · ${actividad.inicio} – ${actividad.fin}</p>
  `;
}


/* ---------- Información ---------- */

function pintarInformacion() {
  const ponente = buscarPonente(actividad.ponente);
  const grupo = buscarGrupo(actividad.organiza);
  const simultaneas = buscarSimultaneas(actividad);
  const descripcion = actividad.descripcion || actividad.resumen || 'Pronto publicaremos más detalles de esta actividad.';

  const datos = [
    { icono: ICONOS.calendario, nombre: 'Día', valor: textoDelDia(buscarDia(actividad.dia)) },
    { icono: ICONOS.reloj, nombre: 'Hora', valor: `${actividad.inicio} – ${actividad.fin}` },
    { icono: ICONOS.pin, nombre: 'Lugar', valor: actividad.lugar || 'Facultad de Minas (salón por confirmar)' },
  ];

  let html = `
    <dl class="evento__datos">
      ${datos.map((dato) => `
        <div>
          <dt>${dato.icono}${dato.nombre}</dt>
          <dd>${dato.valor}</dd>
        </div>
      `).join('')}
    </dl>
    <div class="evento__descripcion">
      ${descripcion.split('\n').map((parrafo) => `<p>${parrafo}</p>`).join('')}
    </div>
  `;

  if (ponente) {
    html += `
      <h2 class="evento__subtitulo">Ponente</h2>
      <div class="evento__perfil">
        <span class="evento__avatar ${ponente.foto ? 'evento__avatar--foto' : ''}">${retratoDePonente(ponente)}</span>
        <div>
          <strong>${ponente.nombre || 'Por anunciar'}</strong>
          <span>${ponente.cargo}</span>
          ${ponente.bio ? `<p class="evento__bio">${ponente.bio}</p>` : ''}
        </div>
        ${ponente.nombre ? `<span class="evento__credencial">${ponente.credencial}</span>` : ''}
      </div>
    `;
  }

  if (grupo) {
    html += `
      <h2 class="evento__subtitulo">Organiza</h2>
      <div class="evento__perfil">
        ${grupo.logo ? `<span class="evento__avatar"><img src="${grupo.logo}" alt="Logo de ${grupo.nombre}"></span>` : ''}
        <div>
          <strong>${grupo.nombre}</strong>
          <span>${grupo.tipo}</span>
          ${grupo.descripcion ? `<p class="evento__bio">${grupo.descripcion}</p>` : ''}
        </div>
      </div>
    `;
  }

  if (simultaneas.length > 0) {
    html += `
      <h2 class="evento__subtitulo">A la misma hora</h2>
      <ul class="evento__simultaneas">
        ${simultaneas.map((otra) => `
          <li>
            <a href="${enlaceActividad(otra.id)}" style="--color: ${TIPOS[otra.tipo].color}">
              <strong>${otra.titulo}</strong>
              <span>${otra.inicio} – ${otra.fin}</span>
              ${ICONOS.flecha}
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  $('#evento-info').innerHTML = html;
}

// Si el id de la dirección no corresponde a ninguna actividad
function pintarNoEncontrada() {
  $('#evento-portada').innerHTML = `<h1 class="evento-portada__titulo">Actividad no encontrada</h1>`;
  $('#evento-info').innerHTML = `
    <p class="horario__vacio">${ICONOS.ojo} Ningún monstruo por aquí. Vuelve al horario y elige otra actividad.</p>
  `;
}


/* ---------- Arranque ---------- */

if (actividad) {
  pintarPortada();
  pintarInformacion();
} else {
  pintarNoEncontrada();
}
$('#pie-escudo').innerHTML = dibujarEscudo();
