/* =============================================
   DATOS DEL EVENTO
   Todo el contenido de la página se cambia aquí.
   ============================================= */

// fecha: texto libre, por ejemplo '12 nov'. Si está vacía se muestra "Día 1", "Día 2"...
const DIAS = [
  { id: 'mie', nombre: 'Miércoles', corto: 'Mié', fecha: '18 nov' },
  { id: 'jue', nombre: 'Jueves', corto: 'Jue', fecha: '19 nov' },
  { id: 'vie', nombre: 'Viernes', corto: 'Vie', fecha: '20 nov' },
];

// Tipos de actividad: nombre en las pestañas, etiqueta en las tarjetas y colores
const TIPOS = {
  conferencia: { plural: 'Conferencias', singular: 'Conferencia', color: '#c98a00', fondo: '#fff3cf' },
  taller: { plural: 'Talleres', singular: 'Taller', color: '#1667c2', fondo: '#dceafa' },
  competencia: { plural: 'Competencias', singular: 'Competencia', color: '#d23c5a', fondo: '#fde3e8' },
  social: { plural: 'Social', singular: 'Social', color: '#7b4fc9', fondo: '#ece4fa' },
};

// nombre: null significa "por anunciar"
const PONENTES = [
  { id: 'eduardo', nombre: 'Eduardo', cargo: 'CEO de Unergy', credencial: 'Invitado', color: '#f2a33a' },
  { id: 'mariano', nombre: 'Mariano Sosa', cargo: 'Ciencia de datos', credencial: 'Ponente', color: '#8b5fd6' },
  { id: 'aperture', nombre: 'Aperture', cargo: 'Taller práctico', credencial: 'Tallerista', color: '#35b6b4' },
  { id: 'ia-cuantica', nombre: null, cargo: 'Charla: IA cuántica', credencial: 'Por anunciar', color: '#8a94a3' },
  { id: 'curriculum', nombre: null, cargo: 'Taller de currículum', credencial: 'Por anunciar', color: '#8a94a3' },
];

// Dónde es el evento: se muestra en el mapa de la página de cada actividad
const SEDE = {
  nombre: 'Facultad de Minas',
  direccion: 'Carrera 80 # 65-223, Núcleo Robledo, Medellín',
  busqueda: 'Facultad de Minas, Universidad Nacional de Colombia, Medellín', // lo que se busca en Google Maps
};

// Horas en formato 'HH:MM' (24 h). Mantén el orden por día y hora.
// Las horas son provisionales: hay que confirmarlas con el horario oficial.
// Las competencias llevan además icono, color y resumen para su tarjeta.
// Opcionales: lugar (ej. 'Bloque M8, auditorio') y descripcion (texto largo
// para la página de la actividad; si no hay, se usa el resumen).
const ACTIVIDADES = [
  // Miércoles
  { id: 'inaugural', dia: 'mie', inicio: '09:00', fin: '10:00', tipo: 'conferencia', titulo: 'Conferencia inaugural', ponente: 'eduardo' },
  { id: 'feria', dia: 'mie', inicio: '09:00', fin: '12:00', tipo: 'social', titulo: 'Feria de stands' },
  { id: 'datos', dia: 'mie', inicio: '11:00', fin: '12:00', tipo: 'conferencia', titulo: 'Conferencia: Ciencia de datos', ponente: 'mariano' },
  { id: 'taller-aperture', dia: 'mie', inicio: '14:00', fin: '15:00', tipo: 'taller', titulo: 'Taller Aperture', ponente: 'aperture' },
  { id: 'taller-curriculum', dia: 'mie', inicio: '15:00', fin: '16:00', tipo: 'taller', titulo: 'Taller de currículum', ponente: 'curriculum' },

  // Jueves
  { id: 'observacion', dia: 'jue', inicio: '07:00', fin: '10:00', tipo: 'competencia', titulo: 'Carrera de observación',
    icono: 'lupa', color: '#e05a7a', resumen: 'Recorre el campus resolviendo pistas antes que los demás equipos.' },
  { id: 'maraton', dia: 'jue', inicio: '14:00', fin: '18:00', tipo: 'competencia', titulo: 'Maratón de programación',
    icono: 'codigo', color: '#2f9e5b', resumen: 'Cuatro horas de problemas algorítmicos contra el reloj.' },

  // Viernes
  { id: 'atletismo', dia: 'vie', inicio: '08:00', fin: '09:00', tipo: 'competencia', titulo: 'Carrera de atletismo 8‑bit',
    icono: 'pixel', color: '#f08a24', resumen: 'Una carrera con alma de videojuego retro.' },
  { id: 'futbol', dia: 'vie', inicio: '09:00', fin: '11:00', tipo: 'competencia', titulo: 'Torneo de fútbol',
    icono: 'balon', color: '#1667c2', resumen: 'Arma tu equipo y sal a la cancha.' },
  { id: 'videojuegos', dia: 'vie', inicio: '10:00', fin: '12:00', tipo: 'competencia', titulo: 'Torneo de videojuegos',
    icono: 'control', color: '#7b4fc9', resumen: 'Demuestra quién manda con el control en la mano.' },
  { id: 'karaoke', dia: 'vie', inicio: '14:00', fin: '15:00', tipo: 'social', titulo: 'Karaoke y Just Dance' },
  { id: 'premiacion', dia: 'vie', inicio: '15:00', fin: '16:00', tipo: 'social', titulo: 'Premiación' },
  { id: 'ia-cuantica', dia: 'vie', inicio: '16:00', fin: '17:00', tipo: 'conferencia', titulo: 'Charla: IA cuántica', ponente: 'ia-cuantica' },
];
