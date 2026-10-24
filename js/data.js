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
  { id: 'mariano', nombre: 'Mariano Sosa', cargo: 'Ingeniero de datos y docente', credencial: 'Ponente', color: '#8b5fd6',
    foto: 'img/ponente-mariano-sosa.jpg',
    bio: 'Soy ingeniero de datos en Lovelytics, donde he participado en proyectos de arquitectura y gobierno de plataformas de datos, migración de información y desarrollo de pipelines en Azure y Databricks para empresas de los sectores de seguros, salud y servicios financieros. Paralelamente, me dedico a la formación en análisis de datos donde acompaño a estudiantes en el desarrollo de sus habilidades técnicas.\n' +
      'Desde mi experiencia en la industria tecnológica y en la educación, promuevo una visión integral de la ingeniería que combina fundamentos sólidos, pensamiento crítico, comunicación, aprendizaje continuo y habilidades humanas para resolver problemas reales. Me interesa conectar el conocimiento técnico con su aplicación práctica y ayudar a otros a desarrollar las competencias que necesitan para crecer profesionalmente en un entorno tecnológico en constante evolución.' },
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
  { id: 'aperture', nombre: 'Aperture', tipo: 'Semillero', color: '#1aa3b8', logo: 'img/grupo-aperture.jpg',
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
// para la página de la actividad, cada \n es un párrafo; si no hay, se usa el resumen), organiza (id de GRUPOS),
// reglas (lista de { titulo, texto } que sale como "Formato y reglas" en su página),
// imagen (en img/: sale junto al texto de su página),
// video ({ id, titulo } de un video de YouTube: el id es lo que va después de youtu.be/ en el enlace),
// cifras (lista de { valor, nombre } que salen como recuadros grandes debajo del texto, ej. { valor: 16, nombre: 'jugadores' })
// y adornos (tres dibujos pixel art de js/pixeles.js que salen en la cabecera de su página; el del medio va más alto).
const ACTIVIDADES = [
  // Miércoles
  { id: 'inaugural', dia: 'mie', inicio: '09:00', fin: '10:00', tipo: 'conferencia', titulo: 'Conferencia inaugural', ponente: 'eduardo', lugar: 'Aula Máxima',
    adornos: ['bandera', 'microfono', 'cohete'] },
  { id: 'feria', dia: 'mie', inicio: '09:00', fin: '12:00', tipo: 'social', titulo: 'Feria de stands', lugar: 'Hall M10',
    descripcion: 'Descubre la innovación desde adentro y amplía tus horizontes. Conecta con el talento universitario recorriendo los stands de nuestros grupos estudiantiles y semilleros de investigación, e interactúa directamente con empresas invitadas para resolver dudas, intercambiar experiencias y construir tu red profesional.',
    adornos: ['maletin', 'carpa', 'gafete'] },
  { id: 'datos', dia: 'mie', inicio: '11:00', fin: '12:00', tipo: 'conferencia', titulo: 'Más allá del código: de estudiante a ingeniero en la era de la inteligencia artificial', ponente: 'mariano', lugar: 'Aula Máxima',
    descripcion: '¿Qué significa realmente ser un buen ingeniero de sistemas en un mundo donde la inteligencia artificial puede generar código, las tecnologías cambian constantemente y los problemas reales exigen mucho más que conocimientos técnicos?\n' +
      'Durante esta charla exploraremos cómo pasar de aprender herramientas a desarrollar un perfil profesional integral, capaz de comprender problemas, tomar decisiones técnicas y construir soluciones que generen valor. Abordaremos la importancia de los fundamentos de la ingeniería, el pensamiento crítico y el uso responsable de la inteligencia artificial, así como el papel de las habilidades humanas, la comunicación, el trabajo en equipo y el aprendizaje continuo.\n' +
      'A través de ejemplos prácticos y situaciones del mundo tecnológico, reflexionaremos sobre cómo se conectan los conocimientos adquiridos en la universidad con los desafíos de la industria y qué pueden hacer los estudiantes, desde cualquier semestre, para prepararse para su futuro profesional.\n' +
      'Una invitación a mirar más allá del código y descubrir cómo construir una carrera en la que la tecnología, el criterio y las habilidades humanas trabajen juntos.',
    adornos: ['birrete', 'casco', 'baseDatos'] },
  { id: 'taller-aperture', dia: 'mie', inicio: '14:00', fin: '15:00', tipo: 'taller', titulo: 'De Prompts a Agentes: Inteligencia Artificial Agéntica con Python', organiza: 'aperture', lugar: 'Aula M3-224',
    descripcion: '¿Qué pasa cuando un LLM deja de solo responder y empieza a actuar?\n' +
      'En este taller veremos cómo crear un agente, hacerlo más capaz y llevarlo a producción. Lo haremos con LangChain, uno de los frameworks de Python más usados para construir aplicaciones y agentes con LLMs.\n' +
      '¡Ven a descubrir cómo funciona un agente!',
    adornos: ['terminal', 'robot', 'rayo'] },
  { id: 'taller-llm', dia: 'mie', inicio: '15:00', fin: '16:00', tipo: 'taller', titulo: 'LLM, agentes, harness, skills y MCP', organiza: 'turing-box', lugar: 'Aula M3-224',
    descripcion: 'Un recorrido general sobre qué es un LLM, un agente, un harness, skills y MCP.',
    adornos: ['chat', 'chip', 'enchufe'] },

  // Jueves
  { id: 'observacion', dia: 'jue', inicio: '07:00', fin: '10:00', tipo: 'competencia', titulo: 'Carrera de observación',
    icono: 'lupa', color: '#e05a7a', resumen: 'Recorre el campus resolviendo pistas antes que los demás equipos.', lugar: 'Hall M10',
    descripcion: 'Una verdadera prueba de velocidad, lógica y trabajo en equipo. Recorre las estaciones distribuidas alrededor del campus resolviendo acertijos y desafíos en el menor tiempo posible.\n' +
      '¿Tiene tu equipo la destreza mental y la resistencia necesarias para llevarse la victoria?',
    adornos: ['interrogacion', 'lupa', 'mapa'] },
  { id: 'maraton', dia: 'jue', inicio: '14:00', fin: '18:00', tipo: 'competencia', titulo: 'Maratón de programación',
    icono: 'codigo', color: '#2f9e5b', resumen: 'Cuatro horas de problemas algorítmicos contra el reloj.', organiza: 'unalgoritmo', lugar: 'Salón M7-501',
    descripcion: 'Llega la Maratón de Programación, el evento insignia en la sede Medellín para medir el pensamiento algorítmico, la lógica y el trabajo colaborativo en equipos de tres personas frente a retos de programación.',
    reglas: [
      { titulo: 'Conformación y estaciones', texto: 'Participación en ternas (3 integrantes). Cada equipo contará con un computador para la resolución e implementación del código.' },
      { titulo: 'Lenguajes permitidos', texto: 'Los problemas se pueden resolver en cualquier lenguaje de programación, principalmente C++, Python y Java.' },
      { titulo: 'Material de consulta', texto: 'Se permite llevar material impreso o escrito (libros, apuntes, notas o código en papel). No se admiten memorias USB ni dispositivos de almacenamiento externos.' },
      { titulo: 'Entorno cerrado e integridad', texto: 'Queda estrictamente prohibido el acceso a internet y el uso de herramientas de inteligencia artificial (Google, ChatGPT, Copilot, Stack Overflow, entre otros); el incumplimiento implicará la expulsión inmediata del equipo. Sí se permitirá consultar la documentación de los lenguajes de programación.' },
    ],
    adornos: ['globo', 'computador', 'relojArena'] },

  // Viernes
  { id: 'atletismo', dia: 'vie', inicio: '08:00', fin: '09:00', tipo: 'competencia', titulo: 'Carrera de atletismo 8‑bit',
    icono: 'pixel', color: '#f08a24', resumen: 'Una carrera con alma de videojuego retro.',
    descripcion: 'Pon a prueba tu velocidad y resistencia en un circuito a lo largo de todo el campus. Prepárate para enfrentar los cambios de inclinación del terreno, superar cada nivel y retarte a ti mismo en una carrera con pura alma de videojuego retro.',
    imagen: 'img/actividad-atletismo.jpg',
    adornos: ['medalla10', 'medalla01', 'medalla11'] },
  { id: 'futbol', dia: 'vie', inicio: '09:00', fin: '11:00', tipo: 'competencia', titulo: 'Torneo de fútbol',
    icono: 'balon', color: '#1667c2', resumen: 'Arma tu equipo y sal a la cancha.', lugar: 'Placa polideportiva',
    descripcion: 'Reúne a tu equipo y demuestra tu nivel en la cancha en un torneo de eliminación directa por brackets. Avanza llave a llave, supera a tus rivales en cada partido y compite hasta alcanzar la gran final.\n' +
      'Se prestan los petos y el balón.',
    imagen: 'img/actividad-futbol.jpg',
    video: { id: '_2zoIHTWd00', titulo: 'Comercial de Nike Football: Arriésgalo todo (2014)' },
    adornos: ['camiseta', 'copa', 'balon'] },
  { id: 'videojuegos', dia: 'vie', inicio: '10:00', fin: '12:00', tipo: 'competencia', titulo: 'Torneo de videojuegos', lugar: 'Sala Lovelace Turing',
    icono: 'control', color: '#7b4fc9', resumen: '16 jugadores se enfrentan en Overcooked hasta que solo quede un campeón.',
    descripcion: 'Toma el control, demuestra tu talento en la pantalla y compite codo a codo con otros jugadores para coronarte como el campeón del torneo.',
    imagen: 'img/actividad-overcooked2.jpg',
    cifras: [{ valor: 16, nombre: 'jugadores' }, { valor: 'VS', nombre: 'modo' }],
    adornos: ['gorroChef', 'control', 'reyCebolla'] },
  { id: 'karaoke', dia: 'vie', inicio: '14:00', fin: '15:00', tipo: 'social', titulo: 'Karaoke y Just Dance', lugar: 'Sala Lovelace Turing',
    descripcion: 'El espacio perfecto para soltar la voz, sacar los mejores pasos y pasar un buen rato. Canta tus canciones favoritas en el karaoke o acepta el reto en la pantalla de Just Dance para demostrar quién domina la pista.',
    imagen: 'img/actividad-just-dance.jpg',
    adornos: ['nota', 'microfono', 'bolaDisco'] },
  { id: 'premiacion', dia: 'vie', inicio: '15:00', fin: '16:00', tipo: 'social', titulo: 'Premiación',
    descripcion: '¡Llegó el momento de la verdad! Acompaña a tus equipos y competidores favoritos en la entrega oficial de premios y la clausura del evento.',
    imagen: 'img/actividad-premiacion.jpg',
    adornos: ['estrella', 'copa', 'estrella'] },
  { id: 'ia-cuantica', dia: 'vie', inicio: '16:00', fin: '17:00', tipo: 'conferencia', lugar: 'Aula M3-224',
    titulo: 'El futuro de los LLM está en la computación cuántica, fotónica y térmica', ponente: 'daniel',
    descripcion: 'El problema de la IA es el consumo de energía, pero ¿qué pasa si no calculamos con energía?\n' +
      'Durante esta charla veremos el proceso para llegar a hacer diferentes modelos de lenguaje estado del arte, autorregresivos y de difusión, y entender cómo llegar a la mejor configuración de capas entre los diferentes paradigmas de computación. ¿Dónde puedo usar la cuántica? ¿Dónde puedo poner la térmica? ¿Para qué sirve y qué es eso? ¿Y cómo multiplicar a la velocidad de la luz de forma paralelizada?\n' +
      'Con demo en vivo y animaciones para que sea intuitivo.',
    adornos: ['termometro', 'atomo', 'bombillo'] },
];

// Fotos y videos de ediciones anteriores para la galería (los archivos van en img/galeria/).
// Los .mp4 salen como videos cortos sin sonido; portada es la imagen que se ve mientras cargan.
// texto: lo que se ve. No sale en pantalla: lo leen los lectores de pantalla.
const GALERIA = [
  { archivo: 'img/galeria/foto-grupal.jpg', texto: 'Foto grupal en las escaleras de la entrada de la Facultad de Minas' },
  { archivo: 'img/galeria/maraton.jpg', texto: 'Sala de computadores llena de globos durante la maratón de programación' },
  { archivo: 'img/galeria/globos.mp4', portada: 'img/galeria/globos-portada.jpg', texto: 'Carrera con globos en la placa polideportiva' },
  { archivo: 'img/galeria/futbol.jpg', texto: 'Partido de fútbol con petos en la placa polideportiva' },
  { archivo: 'img/galeria/conferencia.jpg', texto: 'Conferencia sobre agentes de inteligencia artificial en el auditorio' },
  { archivo: 'img/galeria/feria.mp4', portada: 'img/galeria/feria-portada.jpg', texto: 'Recorrido por la feria de stands' },
  { archivo: 'img/galeria/maraton-equipo.jpg', texto: 'Un equipo concentrado frente al computador en la maratón' },
  { archivo: 'img/galeria/carrera.jpg', texto: 'Estudiantes sentados en fila durante un juego en la placa' },
  { archivo: 'img/galeria/auditorio.mp4', portada: 'img/galeria/auditorio-portada.jpg', texto: 'Público en el auditorio durante una charla' },
  { archivo: 'img/galeria/globos.jpg', texto: 'Estudiantes jugando con un globo en la placa polideportiva' },
];
