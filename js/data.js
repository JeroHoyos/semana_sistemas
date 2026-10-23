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
// Opcionales: foto (imagen cuadrada en img/; si no hay, sale su monstruo), bio y enlace
// (LinkedIn o página: sale como "Saber más" en la página de su charla)
const PONENTES = [
  { id: 'eduardo', nombre: 'Eduardo', cargo: 'CEO de Unergy', credencial: 'Invitado', color: '#f2a33a' },
  { id: 'mariano', nombre: 'Mariano Sosa', cargo: 'Ciencia de datos', credencial: 'Ponente', color: '#8b5fd6' },
  { id: 'daniel', nombre: 'Daniel Arango Sohm', cargo: 'Conferencista internacional', credencial: 'Ponente', color: '#1667c2',
    foto: 'img/ponente-daniel-arango.jpg', enlace: 'https://www.linkedin.com/in/daniel-arango-sohm-352b4822a/',
    bio: 'He ganado tres veces el premio al mejor proyecto en Ingeniería de Sistemas en la EAFIT. Soy conferencista internacional y he dado charlas en Medellín JS, Python Medellín (dos veces), Medellín AI, PyCon Colombia, Python Moscow, Perú y BarNLP. Soy mitad colombiano, también tengo ascendencia alemana y rusa, y hablo ruso y alemán.' },
];

// Grupos estudiantiles que participan en la Semana. Cada uno sale como un banderín de su color.
// tipo: el texto pequeño debajo del banderín.
// Opcionales: logo (imagen cuadrada en img/), enlace (red social o página: el banderín lleva a ella)
// y descripcion (sale en la página de las actividades que organiza, junto con el enlace como "Saber más").
const GRUPOS = [
  { id: 'unalgoritmo', nombre: 'UNAlgoritmo', tipo: 'Grupo estudiantil', color: '#9128d9', logo: 'img/grupo-unalgoritmo.jpg',
    enlace: 'https://www.linkedin.com/company/unalgoritmo/',
    descripcion: 'UN Algoritmo es un grupo estudiantil adscrito a la Facultad de Minas de la Universidad Nacional de Colombia (Sede Medellín) dedicado a impulsar la programación competitiva, el pensamiento algorítmico y las estructuras de datos. Mediante entrenamientos semanales estructurados tanto para principiantes como para niveles avanzados, el grupo prepara equipos para competir en la Maratón Nacional de Programación, en las rondas clasificatorias del ICPC (International Collegiate Programming Contest) y en la Maratona Feminina de Programação (MFP), fortaleciendo la comunicación, la resolución rápida de problemas y el trabajo en equipo bajo el formato de un computador por terna.' },
  { id: 'aperture', nombre: 'Aperture', tipo: 'Semillero', color: '#1aa3b8', logo: 'img/grupo-aperture.png',
    enlace: 'https://aperture-systems-lab.github.io',
    descripcion: 'Aperture es un Semillero de Investigación estudiantil donde se explora la ciencia de datos, el machine learning y la IA. Es un espacio para aprender haciendo: desarrollamos proyectos, compartimos conocimientos y conectamos esa teoría con problemas de la vida real, impulsando una comunidad colaborativa en la universidad.' },
  { id: 'turing-box', nombre: 'Turing Box', tipo: 'Grupo estudiantil', color: '#c4358c', logo: 'img/grupo-turing-box.jpg',
    enlace: 'https://www.instagram.com/turingbox/' },
  { id: 'uneural', nombre: 'UNeural', tipo: 'Grupo estudiantil', color: '#4a4fd8', logo: 'img/grupo-uneural.jpg',
    enlace: 'https://www.instagram.com/uneuralgroup' },
];

// Horas en formato 'HH:MM' (24 h). Mantén el orden por día y hora.
// Las horas son provisionales: hay que confirmarlas con el horario oficial.
// Las competencias llevan además icono, color y resumen para su tarjeta.
// Opcionales: lugar (ej. 'Bloque M8, auditorio'), descripcion (texto largo
// para la página de la actividad, cada \n es un párrafo; si no hay, se usa el resumen), organiza (id de GRUPOS)
// y reglas (lista de { titulo, texto } que sale como "Formato y reglas" en su página).
const ACTIVIDADES = [
  // Miércoles
  { id: 'inaugural', dia: 'mie', inicio: '09:00', fin: '10:00', tipo: 'conferencia', titulo: 'Conferencia inaugural', ponente: 'eduardo', lugar: 'Aula Máxima' },
  { id: 'feria', dia: 'mie', inicio: '09:00', fin: '12:00', tipo: 'social', titulo: 'Feria de stands', lugar: 'Hall M10' },
  { id: 'datos', dia: 'mie', inicio: '11:00', fin: '12:00', tipo: 'conferencia', titulo: 'Conferencia: Ciencia de datos', ponente: 'mariano', lugar: 'Aula Máxima' },
  { id: 'taller-aperture', dia: 'mie', inicio: '14:00', fin: '15:00', tipo: 'taller', titulo: 'De Prompts a Agentes: Inteligencia Artificial Agéntica con Python', organiza: 'aperture', lugar: 'Aula M3-224',
    descripcion: '¿Qué pasa cuando un LLM deja de solo responder y empieza a actuar?\n' +
      'En este taller veremos cómo crear un agente, hacerlo más capaz y llevarlo a producción. Lo haremos con LangChain, uno de los frameworks de Python más usados para construir aplicaciones y agentes con LLMs.\n' +
      '¡Ven a descubrir cómo funciona un agente!' },
  { id: 'taller-llm', dia: 'mie', inicio: '15:00', fin: '16:00', tipo: 'taller', titulo: 'LLM, agentes, harness, skills y MCP', organiza: 'turing-box', lugar: 'Aula M3-224',
    descripcion: 'Un recorrido general sobre qué es un LLM, un agente, un harness, skills y MCP.' },

  // Jueves
  { id: 'observacion', dia: 'jue', inicio: '07:00', fin: '10:00', tipo: 'competencia', titulo: 'Carrera de observación',
    icono: 'lupa', color: '#e05a7a', resumen: 'Recorre el campus resolviendo pistas antes que los demás equipos.', lugar: 'Hall M10' },
  { id: 'maraton', dia: 'jue', inicio: '14:00', fin: '18:00', tipo: 'competencia', titulo: 'Maratón de programación',
    icono: 'codigo', color: '#2f9e5b', resumen: 'Cuatro horas de problemas algorítmicos contra el reloj.', organiza: 'unalgoritmo', lugar: 'Salón M7-501',
    descripcion: 'Llega la Maratón de Programación, el evento insignia en la sede Medellín para medir el pensamiento algorítmico, la lógica y el trabajo colaborativo en equipos de tres personas frente a retos de programación.',
    reglas: [
      { titulo: 'Conformación y estaciones', texto: 'Participación en ternas (3 integrantes). Cada equipo contará con un computador para la resolución e implementación del código.' },
      { titulo: 'Lenguajes permitidos', texto: 'Los problemas se pueden resolver en cualquier lenguaje de programación, principalmente C++, Python y Java.' },
      { titulo: 'Material de consulta', texto: 'Se permite llevar material impreso o escrito (libros, apuntes, notas o código en papel). No se admiten memorias USB ni dispositivos de almacenamiento externos.' },
      { titulo: 'Entorno cerrado e integridad', texto: 'Queda estrictamente prohibido el acceso a internet y el uso de herramientas de inteligencia artificial (Google, ChatGPT, Copilot, Stack Overflow, entre otros); el incumplimiento implicará la expulsión inmediata del equipo. Sí se permitirá consultar la documentación de los lenguajes de programación.' },
    ] },

  // Viernes
  { id: 'atletismo', dia: 'vie', inicio: '08:00', fin: '09:00', tipo: 'competencia', titulo: 'Carrera de atletismo 8‑bit',
    icono: 'pixel', color: '#f08a24', resumen: 'Una carrera con alma de videojuego retro.' },
  { id: 'futbol', dia: 'vie', inicio: '09:00', fin: '11:00', tipo: 'competencia', titulo: 'Torneo de fútbol',
    icono: 'balon', color: '#1667c2', resumen: 'Arma tu equipo y sal a la cancha.', lugar: 'Placa polideportiva',
    descripcion: 'Arma tu equipo y sal a la cancha. Se prestan petos y balón.' },
  { id: 'videojuegos', dia: 'vie', inicio: '10:00', fin: '12:00', tipo: 'competencia', titulo: 'Torneo de videojuegos',
    icono: 'control', color: '#7b4fc9', resumen: 'Demuestra quién manda con el control en la mano.' },
  { id: 'karaoke', dia: 'vie', inicio: '14:00', fin: '15:00', tipo: 'social', titulo: 'Karaoke y Just Dance' },
  { id: 'premiacion', dia: 'vie', inicio: '15:00', fin: '16:00', tipo: 'social', titulo: 'Premiación' },
  { id: 'ia-cuantica', dia: 'vie', inicio: '16:00', fin: '17:00', tipo: 'conferencia',
    titulo: 'El futuro de los LLM está en la computación cuántica, fotónica y térmica', ponente: 'daniel',
    descripcion: 'El problema de la IA es el consumo de energía, pero ¿qué pasa si no calculamos con energía?\n' +
      'Durante esta charla veremos el proceso para llegar a hacer diferentes modelos de lenguaje estado del arte, autorregresivos y de difusión, y entender cómo llegar a la mejor configuración de capas entre los diferentes paradigmas de computación. ¿Dónde puedo usar la cuántica? ¿Dónde puedo poner la térmica? ¿Para qué sirve y qué es eso? ¿Y cómo multiplicar a la velocidad de la luz de forma paralelizada?\n' +
      'Con demo en vivo y animaciones para que sea intuitivo.' },
];
