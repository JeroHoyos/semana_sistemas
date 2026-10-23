/* =============================================
   FUNCIONES COMPARTIDAS
   Las usan la página principal (main.js) y la de cada actividad (evento.js).
   ============================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const buscarDia = (id) => DIAS.find((dia) => dia.id === id);
const buscarPonente = (id) => PONENTES.find((ponente) => ponente.id === id);
const buscarActividad = (id) => ACTIVIDADES.find((actividad) => actividad.id === id);
const buscarGrupo = (id) => GRUPOS.find((grupo) => grupo.id === id);

// Foto del ponente si tiene; si no, su monstruo (con "?" si aún no se ha anunciado)
function retratoDePonente(ponente) {
  return ponente.foto ? `<img src="${ponente.foto}" alt="">` : dibujarMonstruo(ponente.color, !ponente.nombre);
}

// Logo redondo pequeño de un grupo (vacío si el grupo no tiene logo)
function logoDeGrupo(grupo) {
  return grupo.logo ? `<span class="avatar"><img src="${grupo.logo}" alt=""></span>` : '';
}

// Dirección de la página con toda la información de una actividad
const enlaceActividad = (id) => `evento.html?id=${encodeURIComponent(id)}`;

// Dos actividades se cruzan si son el mismo día y sus horas se solapan.
// Las horas 'HH:MM' se pueden comparar directamente como texto.
function seCruzan(a, b) {
  return a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin;
}

// Las demás actividades que pasan a la misma hora
function buscarSimultaneas(actividad) {
  return ACTIVIDADES.filter((otra) => otra !== actividad && seCruzan(otra, actividad));
}
