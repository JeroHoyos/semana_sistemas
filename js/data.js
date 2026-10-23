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
  { id: 'aperture', nombre: 'Aperture', cargo: 'Taller de agéntica', credencial: 'Tallerista', color: '#35b6b4' },
  { id: 'ia-cuantica', nombre: null, cargo: 'Charla: IA cuántica', credencial: 'Por anunciar', color: '#8a94a3' },
  { id: 'curriculum', nombre: null, cargo: 'Taller de currículum', credencial: 'Por anunciar', color: '#8a94a3' },
];

// Grupos estudiantiles que apoyan la Semana. Cada uno sale como un banderín de su color.
// tipo: el texto pequeño debajo del banderín. logo (opcional): imagen cuadrada en img/.
const GRUPOS = [
  { id: 'unalgoritmo', nombre: 'UNAlgoritmo', tipo: 'Grupo estudiantil', color: '#9128d9', logo: 'img/grupo-unalgoritmo.jpg' },
  { id: 'aperture', nombre: 'Aperture', tipo: 'Semillero', color: '#1aa3b8', logo: 'img/grupo-aperture.png' },
  { id: 'turing-box', nombre: 'Turing Box', tipo: 'Grupo estudiantil', color: '#c4358c', logo: 'img/grupo-turing-box.jpg' },
];

// Horas en formato 'HH:MM' (24 h). Mantén el orden por día y hora.
// Las horas son provisionales: hay que confirmarlas con el horario oficial.
// Las competencias llevan además icono, color y resumen para su tarjeta.
// Opcionales: lugar (ej. 'Bloque M8, auditorio'), descripcion (texto largo
// para la página de la actividad; si no hay, se usa el resumen) y organiza (id de GRUPOS).
const ACTIVIDADES = [
  // Miércoles
  { id: 'inaugural', dia: 'mie', inicio: '09:00', fin: '10:00', tipo: 'conferencia', titulo: 'Conferencia inaugural', ponente: 'eduardo' },
  { id: 'feria', dia: 'mie', inicio: '09:00', fin: '12:00', tipo: 'social', titulo: 'Feria de stands' },
  { id: 'datos', dia: 'mie', inicio: '11:00', fin: '12:00', tipo: 'conferencia', titulo: 'Conferencia: Ciencia de datos', ponente: 'mariano' },
  { id: 'taller-aperture', dia: 'mie', inicio: '14:00', fin: '15:00', tipo: 'taller', titulo: 'Taller de agéntica', organiza: 'aperture' },
  { id: 'taller-curriculum', dia: 'mie', inicio: '15:00', fin: '16:00', tipo: 'taller', titulo: 'Taller de currículum', ponente: 'curriculum' },

  // Jueves
  { id: 'observacion', dia: 'jue', inicio: '07:00', fin: '10:00', tipo: 'competencia', titulo: 'Carrera de observación',
    icono: 'lupa', color: '#e05a7a', resumen: 'Recorre el campus resolviendo pistas antes que los demás equipos.' },
  { id: 'maraton', dia: 'jue', inicio: '14:00', fin: '18:00', tipo: 'competencia', titulo: 'Maratón de programación',
    icono: 'codigo', color: '#2f9e5b', resumen: 'Cuatro horas de problemas algorítmicos contra el reloj.', organiza: 'unalgoritmo' },

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
