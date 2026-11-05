/* =============================================
   EVENT DATA
   All the page content is changed here.
   ============================================= */

// Project version: whenever it changes, users' browsers close old sessions
// automatically, to avoid stale JWTs or stale data.
const PROJECT_VERSION = 'v2026.11.03-201304';

// Accounts sanctioned with a Shadowban and the Clown Licence for cheating or injecting points.
// A fragment matches anywhere in the email or the name: that is how it catches binary aliases such as 01101100.
const CLOWN_FRAGMENTS = ['armarina', 'argenis', 'largo', '01101100', '01101001'];

// extra: a row from 'perfiles', or a monster. Both can carry the es_payaso flag set in the database.
function isClown(email, name = '', extra = null) {
  if ([extra?.es_payaso, extra?.monstruo?.es_payaso].some((flag) => flag === true || flag === 'true')) return true;

  const texts = [email, name].map((text) => String(text || '').toLowerCase());
  return texts.some((text) => CLOWN_FRAGMENTS.some((fragment) => text.includes(fragment)));
}

// One sanctioned person hides behind binary names: the page shows their real identity instead.
function isLargoAlias(email, name) {
  return [email, name].some((value) => String(value).includes('0110') || String(value).toLowerCase().includes('largo'));
}

// date: free text, for example '12 nov'. If empty, the page shows "Día 1", "Día 2"...
const DAYS = [
  { id: 'wed', name: 'Miércoles', short: 'Mié', date: '18 nov' },
  { id: 'thu', name: 'Jueves', short: 'Jue', date: '19 nov' },
  { id: 'fri', name: 'Viernes', short: 'Vie', date: '20 nov' },
];

// Activity types: name on the tabs, label on the cards, colors
// and icon (one from js/icons.js) to recognize the type at a glance
const ACTIVITY_TYPES = {
  talk: { plural: 'Conferencias', singular: 'Conferencia', color: '#c98a00', bg: '#fff3cf', icon: 'microphone' },
  workshop: { plural: 'Talleres', singular: 'Taller', color: '#1667c2', bg: '#dceafa', icon: 'workshop' },
  competition: { plural: 'Competencias', singular: 'Competencia', color: '#d23c5a', bg: '#fde3e8', icon: 'trophy' },
  social: { plural: 'Social', singular: 'Social', color: '#7b4fc9', bg: '#ece4fa', icon: 'people' },
};

// name: null means "to be announced"
// Optional: photo (square image in img/; without it, their monster shows), bio and link
// (LinkedIn or web page: shown as "Saber más" on their talk's page)
// and unconfirmed: true (their ID card gets the "Por confirmar" stamp and their talk a notice)
const SPEAKERS = [
  { id: 'eduardo', name: 'Eduardo', role: 'CEO de Unergy', credential: 'Invitado', color: '#f2a33a', unconfirmed: true },
  { id: 'mariano', name: 'Mariano Sosa', role: 'Ingeniero de datos y docente', credential: 'Ponente', color: '#8b5fd6',
    photo: 'img/speaker-mariano-sosa.jpg',
    bio: 'Soy ingeniero de datos en Lovelytics, donde he participado en proyectos de arquitectura y gobierno de plataformas de datos, migración de información y desarrollo de pipelines en Azure y Databricks para empresas de los sectores de seguros, salud y servicios financieros. Paralelamente, me dedico a la formación en análisis de datos donde acompaño a estudiantes en el desarrollo de sus habilidades técnicas.\n' +
      'Desde mi experiencia en la industria tecnológica y en la educación, promuevo una visión integral de la ingeniería que combina fundamentos sólidos, pensamiento crítico, comunicación, aprendizaje continuo y habilidades humanas para resolver problemas reales. Me interesa conectar el conocimiento técnico con su aplicación práctica y ayudar a otros a desarrollar las competencias que necesitan para crecer profesionalmente en un entorno tecnológico en constante evolución.' },
  { id: 'daniel', name: 'Daniel Arango Sohm', role: 'Conferencista internacional', credential: 'Ponente', color: '#1667c2',
    photo: 'img/speaker-daniel-arango.jpg', link: 'https://www.linkedin.com/in/daniel-arango-sohm-352b4822a/',
    bio: 'He ganado tres veces el premio al mejor proyecto en Ingeniería de Sistemas en la EAFIT. Soy conferencista internacional y he dado charlas en Medellín JS, Python Medellín (dos veces), Medellín AI, PyCon Colombia, Python Moscow, Perú y BarNLP. Soy mitad colombiano, también tengo ascendencia alemana y rusa, y hablo ruso y alemán.' },
  { id: 'yohan', name: 'Yohan Camilo Sánchez Meza', role: 'Líder de Producto en EBS Systems', credential: 'Ponente', color: '#c4358c',
    photo: 'img/speaker-yohan-sanchez.jpg',
    bio: 'Estudiante de último semestre de Ingeniería en Sistemas e Informática y Líder de Producto en EBS Systems.' },
];

// Student groups taking part in the week. Each one shows as a pennant in its color.
// type: the small text below the pennant.
// Optional: logo (square image in img/), link (social network or web page: the pennant links to it)
// and description (shown on the pages of the activities it organizes, with the link as "Saber más").
const GROUPS = [
  { id: 'unalgoritmo', name: 'UNAlgoritmo', type: 'Grupo estudiantil', color: '#9128d9', logo: 'img/group-unalgoritmo.jpg',
    link: 'https://www.linkedin.com/company/unalgoritmo/',
    description: 'UN Algoritmo es un grupo estudiantil adscrito a la Facultad de Minas de la Universidad Nacional de Colombia (Sede Medellín) dedicado a impulsar la programación competitiva, el pensamiento algorítmico y las estructuras de datos. Mediante entrenamientos semanales estructurados tanto para principiantes como para niveles avanzados, el grupo prepara equipos para competir en la Maratón Nacional de Programación, en las rondas clasificatorias del ICPC (International Collegiate Programming Contest) y en la Maratona Feminina de Programação (MFP), fortaleciendo la comunicación, la resolución rápida de problemas y el trabajo en equipo bajo el formato de un computador por terna.' },
  { id: 'aperture', name: 'Aperture', type: 'Semillero', color: '#1aa3b8', logo: 'img/group-aperture.jpg',
    link: 'https://aperture-systems-lab.github.io',
    description: 'Aperture es un Semillero de Investigación estudiantil donde se explora la ciencia de datos, el machine learning y la IA. Es un espacio para aprender haciendo: desarrollamos proyectos, compartimos conocimientos y conectamos esa teoría con problemas de la vida real, impulsando una comunidad colaborativa en la universidad.' },
  { id: 'turing-box', name: 'Turing Box', type: 'Grupo estudiantil', color: '#c4358c', logo: 'img/group-turing-box.jpg',
    link: 'https://www.instagram.com/turingbox_med/',
    description: 'Turing Box es un grupo estudiantil intersedes de la Universidad Nacional de Colombia que abre un espacio de pruebas (sandbox) para explorar tecnologías que no suelen estar en los currículos, como inteligencia artificial, blockchain, web3, realidad aumentada y creación de videojuegos. Funciona a través de nodos temáticos y busca crear comunidad alrededor de la tecnología con eventos, hackathons, charlas, podcasts y creación de contenidos, además de entrenar habilidades técnicas y blandas para impulsar las carreras profesionales de sus integrantes.' },
  { id: 'uneural', name: 'UNeural', type: 'Grupo estudiantil', color: '#4a4fd8', logo: 'img/group-uneural.jpg',
    link: 'https://www.instagram.com/uneuralgroup' },
];

// Times in 'HH:MM' format (24 h). Keep them sorted by day and time.
// Times are provisional: they must be confirmed against the official schedule.
// Competitions also have icon, color and summary for their card.
// Optional: place (e.g. 'Bloque M8, auditorio'), description (long text
// for the activity page, each \n is a paragraph; without it, the summary is used), organizer (id from GROUPS),
// rules (list of { title, text } shown as "Formato y reglas" on its page),
// image (in img/: shown next to the text on its page),
// video ({ id, title } of a YouTube video: the id is what follows youtu.be/ in the link),
// stats (list of { value, label } shown as big boxes below the text, e.g. { value: 16, label: 'jugadores' }),
// team ({ tab, size, maxTeams }: its short name on the inscripciones.html tabs, people per team and, optionally,
// how many teams fit; the activity takes team sign-ups. The same limits live in supabase/teams.sql: change both),
// unconfirmed: true (shows an "Información por confirmar" notice on its page)
// and decorations (three pixel art drawings from js/pixel-art.js for its page header; the middle one sits higher).
const ACTIVITIES = [
  // Wednesday
  { id: 'inaugural', day: 'wed', start: '09:00', end: '10:00', type: 'talk', title: 'Conferencia inaugural', speaker: 'eduardo', place: 'Aula Máxima',
    decorations: ['flag', 'microphone', 'rocket'] },
  { id: 'feria', day: 'wed', start: '09:00', end: '12:00', type: 'social', title: 'Feria de stands', place: 'Hall M10',
    description: 'Descubre la innovación desde adentro y amplía tus horizontes. Conecta con el talento universitario recorriendo los stands de nuestros grupos estudiantiles y semilleros de investigación, e interactúa directamente con empresas invitadas para resolver dudas, intercambiar experiencias y construir tu red profesional.',
    decorations: ['briefcase', 'tent', 'lanyard'] },
  { id: 'datos', day: 'wed', start: '11:00', end: '12:00', type: 'talk', title: 'Más allá del código: de estudiante a ingeniero en la era de la inteligencia artificial', speaker: 'mariano', place: 'Aula Máxima',
    description: '¿Qué significa realmente ser un buen ingeniero de sistemas en un mundo donde la inteligencia artificial puede generar código, las tecnologías cambian constantemente y los problemas reales exigen mucho más que conocimientos técnicos?\n' +
      'Durante esta charla exploraremos cómo pasar de aprender herramientas a desarrollar un perfil profesional integral, capaz de comprender problemas, tomar decisiones técnicas y construir soluciones que generen valor. Abordaremos la importancia de los fundamentos de la ingeniería, el pensamiento crítico y el uso responsable de la inteligencia artificial, así como el papel de las habilidades humanas, la comunicación, el trabajo en equipo y el aprendizaje continuo.\n' +
      'A través de ejemplos prácticos y situaciones del mundo tecnológico, reflexionaremos sobre cómo se conectan los conocimientos adquiridos en la universidad con los desafíos de la industria y qué pueden hacer los estudiantes, desde cualquier semestre, para prepararse para su futuro profesional.\n' +
      'Una invitación a mirar más allá del código y descubrir cómo construir una carrera en la que la tecnología, el criterio y las habilidades humanas trabajen juntos.',
    decorations: ['gradCap', 'helmet', 'database'] },
  { id: 'taller-aperture', day: 'wed', start: '14:00', end: '15:00', type: 'workshop', title: 'De Prompts a Agentes: Inteligencia Artificial Agéntica con Python', organizer: 'aperture', place: 'Aula M3-224',
    description: '¿Qué pasa cuando un LLM deja de solo responder y empieza a actuar?\n' +
      'En este taller veremos cómo crear un agente, hacerlo más capaz y llevarlo a producción. Lo haremos con LangChain, uno de los frameworks de Python más usados para construir aplicaciones y agentes con LLMs.\n' +
      '¡Ven a descubrir cómo funciona un agente!',
    decorations: ['terminal', 'robot', 'lightning'] },
  { id: 'taller-llm', day: 'wed', start: '15:00', end: '16:30', type: 'workshop', title: 'Agentes de IA para todos - Todo lo que necesitas saber', speaker: 'yohan', organizer: 'turing-box', place: 'Aula M3-224',
    description: 'La inteligencia artificial pasó de responder preguntas a ejecutar tareas: crear archivos, revisar su propio trabajo, conectarse con otras herramientas y seguir procedimientos. A esto se le llama agente. En este taller vas a entender qué hay detrás de un agente y vas a trabajar con uno en clase.',
    rules: [
      { title: 'Primera parte', text: 'Qué es un LLM y por qué “solo sabe lo que ve”. Cómo un chat se convierte en un agente: el bucle de pensar, actuar y verificar. Harness engineering: todo lo que rodea al modelo para que trabaje bien y de forma segura. Herramientas, MCP y skills: cómo se le dan nuevas capacidades a un agente. Opciones gratuitas, buenas prácticas y riesgos.' },
      { title: 'Segunda parte: práctica (en parejas)', text: 'Con Gemini CLI, que es gratuito, vas a pedirle al agente que construya una pequeña app, darle reglas propias con un archivo de instrucciones, crear tu primera skill y conectarle una herramienta externa por MCP.' },
      { title: '¿Para quién es?', text: 'Para cualquier persona con curiosidad por la IA, sepa programar o no. Las parejas se arman mezclando perfiles para que todos avancen.' },
      { title: '¿Qué debes traer?', text: 'Computador portátil y una cuenta personal de Google (@gmail.com). Opcional: Node.js instalado (versión 20 o superior). Si no puedes instalarlo, trabajarás desde el navegador.' },
    ],
    decorations: ['chat', 'chip', 'plug'] },

  // Thursday
  { id: 'observacion', day: 'thu', start: '07:00', end: '10:00', type: 'competition', title: 'Carrera de observación', team: { tab: 'Observación', size: 4, maxTeams: 10 },
    icon: 'magnifier', color: '#e05a7a', summary: 'Recorre el campus resolviendo pistas antes que los demás equipos.', place: 'Hall M10',
    description: 'Una verdadera prueba de velocidad, lógica y trabajo en equipo. Recorre las estaciones distribuidas alrededor del campus resolviendo acertijos y desafíos en el menor tiempo posible.\n' +
      '¿Tiene tu equipo la destreza mental y la resistencia necesarias para llevarse la victoria?',
    decorations: ['questionMark', 'magnifier', 'map'] },
  { id: 'maraton', day: 'thu', start: '14:00', end: '18:00', type: 'competition', title: 'Maratón de programación', team: { tab: 'Maratón', size: 3, maxTeams: 10 },
    icon: 'code', color: '#2f9e5b', summary: 'Cuatro horas de problemas algorítmicos contra el reloj.', organizer: 'unalgoritmo', place: 'Salón M7-501',
    description: 'Llega la Maratón de Programación, el evento insignia en la sede Medellín para medir el pensamiento algorítmico, la lógica y el trabajo colaborativo en equipos de tres personas frente a retos de programación.',
    rules: [
      { title: 'Conformación y estaciones', text: 'Participación en ternas (3 integrantes). Cada equipo contará con un computador para la resolución e implementación del código.' },
      { title: 'Lenguajes permitidos', text: 'Los problemas se pueden resolver en cualquier lenguaje de programación, principalmente C++, Python y Java.' },
      { title: 'Material de consulta', text: 'Se permite llevar material impreso o escrito (libros, apuntes, notas o código en papel). No se admiten memorias USB ni dispositivos de almacenamiento externos.' },
      { title: 'Entorno cerrado e integridad', text: 'Queda estrictamente prohibido el acceso a internet y el uso de herramientas de inteligencia artificial (Google, ChatGPT, Copilot, Stack Overflow, entre otros); el incumplimiento implicará la expulsión inmediata del equipo. Sí se permitirá consultar la documentación de los lenguajes de programación.' },
    ],
    decorations: ['balloon', 'computer', 'hourglass'] },

  // Friday
  { id: 'atletismo', day: 'fri', start: '08:00', end: '09:00', type: 'competition', title: 'Carrera de atletismo 8‑bit', individual: { tab: 'Atletismo', max: 45 },
    icon: 'pixel', color: '#f08a24', summary: 'Una carrera con alma de videojuego retro.', place: 'Hall M10',
    description: 'Pon a prueba tu velocidad y resistencia en un circuito a lo largo de todo el campus. Prepárate para enfrentar los cambios de inclinación del terreno, superar cada nivel y retarte a ti mismo en una carrera con pura alma de videojuego retro.',
    image: 'img/activity-athletics.jpg',
    decorations: ['medal10', 'medal01', 'medal11'] },
  { id: 'futbol', day: 'fri', start: '09:00', end: '11:00', type: 'competition', title: 'Torneo de fútbol', team: { tab: 'Fútbol', size: 5, maxTeams: 8 },
    icon: 'ball', color: '#1667c2', summary: 'Arma tu equipo y sal a la cancha.', place: 'Placa polideportiva',
    description: 'Reúne a tu equipo y demuestra tu nivel en la cancha en un torneo de eliminación directa por brackets. Avanza llave a llave, supera a tus rivales en cada partido y compite hasta alcanzar la gran final.\n' +
      'Se prestan los petos y el balón.',
    image: 'img/activity-soccer.jpg',
    video: { id: '_2zoIHTWd00', title: 'Comercial de Nike Football: Arriésgalo todo (2014)' },
    decorations: ['jersey', 'cup', 'ball'] },
  { id: 'videojuegos', day: 'fri', start: '10:00', end: '12:00', type: 'competition', title: 'Torneo de videojuegos', individual: { tab: 'Videojuegos', max: 16 }, place: 'Sala Lovelace Turing',
    icon: 'gamepad', color: '#7b4fc9', summary: '16 jugadores se enfrentan en Overcooked hasta que solo quede un campeón.',
    description: 'Toma el control, demuestra tu talento en la pantalla y compite codo a codo con otros jugadores para coronarte como el campeón del torneo.',
    image: 'img/activity-overcooked2.jpg',
    stats: [{ value: 16, label: 'jugadores' }, { value: 'VS', label: 'modo' }],
    decorations: ['chefHat', 'gamepad', 'onionKing'] },
  { id: 'karaoke', day: 'fri', start: '14:00', end: '15:00', type: 'social', title: 'Karaoke y Just Dance', place: 'Sala Lovelace Turing',
    description: 'El espacio perfecto para soltar la voz, sacar los mejores pasos y pasar un buen rato. Canta tus canciones favoritas en el karaoke o acepta el reto en la pantalla de Just Dance para demostrar quién domina la pista.',
    image: 'img/activity-just-dance.jpg',
    decorations: ['note', 'microphone', 'discoBall'] },
  { id: 'premiacion', day: 'fri', start: '15:00', end: '16:00', type: 'social', title: 'Premiación', place: 'Sala Lovelace Turing',
    description: '¡Llegó el momento de la verdad! Acompaña a tus equipos y competidores favoritos en la entrega oficial de premios y la clausura del evento.',
    image: 'img/activity-awards.jpg',
    decorations: ['star', 'cup', 'star'] },
  { id: 'ia-cuantica', day: 'fri', start: '16:00', end: '17:00', type: 'talk', place: 'Aula M3-224',
    title: 'El futuro de los LLM está en la computación cuántica, fotónica y térmica', speaker: 'daniel',
    description: 'El problema de la IA es el consumo de energía, pero ¿qué pasa si no calculamos con energía?\n' +
      'Durante esta charla veremos el proceso para llegar a hacer diferentes modelos de lenguaje estado del arte, autorregresivos y de difusión, y entender cómo llegar a la mejor configuración de capas entre los diferentes paradigmas de computación. ¿Dónde puedo usar la cuántica? ¿Dónde puedo poner la térmica? ¿Para qué sirve y qué es eso? ¿Y cómo multiplicar a la velocidad de la luz de forma paralelizada?\n' +
      'Con demo en vivo y animaciones para que sea intuitivo.',
    decorations: ['thermometer', 'atom', 'lightbulb'] },
];

// ID card TITLES: what shows on the colored band. Everyone starts with the first one (free) and the
// others unlock by redeeming a code in the Scare Meter section. Once unlocked, the
// person picks it in "Editar carnet".
//   id: internal name, never change it once published (it is stored in each person's account).
//   name / feminine: how it reads on the ID card depending on the monster's style. Without `feminine`, `name` is used.
//   free: true = everyone has it from the start.
//   codeHash: the code's SHA-256 hash (NOT the code). Generate it with: node tools/hash-code.js "THE CODE"
//   description: short phrase shown under "Tus títulos" once unlocked.
//   hint: short phrase shown below "Título secreto" while locked, to make people want to look for it.
//   limit: how many people can hold it (checked in the browser only, see js/codes.js).
// The titles with the id of a secret ('konami', 'video-futbol') have no code: js/secrets.js gives them
// to the first people who find that secret, as many as their limit. Supabase checks that number
// (v_cupos in supabase/secrets.sql): change both together.
const TITLES = [
  { id: 'asustador', name: 'Asustador', feminine: 'Asustadora', free: true,
    description: 'El título con el que arranca todo monstruo de la Semana.' },
  { id: 'supervisor', name: 'Supervisor de Sustos', feminine: 'Supervisora de Sustos',
    description: 'Del equipo de administración de la página.',
    hint: 'Solo para quienes mueven los hilos de la Semana.',
    codeHash: '71c580f40935a6e35613a6223e59db79d22d534a8e3fed097020e3153da846da' },
  { id: 'pionero', name: 'Asustador Pionero', feminine: 'Asustadora Pionera',
    description: 'Llegó antes que nadie y abrió camino a los demás monstruos.',
    hint: 'Los primeros en llegar se llevan algo especial.',
    codeHash: '3bed572cb2f9c1a9f7e3d08a818f5b5463d499f3ef24938aaa4d796347dbadd8' },
  { id: 'debugger', name: 'Debugger',
    description: 'Encuentra los bugs antes de que los bugs lo encuentren.',
    hint: 'Algo no anda bien en el código… ¿lo notaste?',
    codeHash: '30bc3d0b546272ae2dcbc55119bff7af556272354651bc674906fc2dd543f230' },
  { id: 'terror-nocturno', name: 'Terror Nocturno', feminine: 'Terror Nocturno', limit: 5,
    description: 'Acecha cuando se apagan las luces. Solo 5 lo tienen.',
    hint: 'Solo 5 personas podrán reclamarlo. Corre.',
    codeHash: 'c58b28118256f74718a66d20def69ac43887b5dacbc7ffcac09389da6ba38d08' },
  { id: 'konami', name: 'Maestro Konami', feminine: 'Maestra Konami', limit: 5,
    description: 'Una de las 5 primeras personas en meter el código Konami en la consola.',
    hint: 'Los gamers de la vieja escuela conocen el truco.' },
  { id: 'video-futbol', name: 'El Fenómeno', feminine: 'La Fenómeno', limit: 3,   // after Ronaldo Nazário: Brazil green
    description: 'Una de las 3 primeras personas en ver completo el video del torneo de fútbol.',
    hint: 'Hay un video que vale la pena ver hasta el final.' },
  { id: 'qr-gang', name: 'QR Gang', feminine: 'QR Gang',
    description: 'Desbloquea el estilo de carnet Vice City cromático.',
    hint: 'El código de la banda QR esconde un estilo cromático.',
    codeHash: '97313ae5dff440d435ccf82927fcebd9c7444ff7248e05d4be75d898bfe27995' },
  { id: 'franco-impero', name: 'Franco Impero 🇮🇹', feminine: 'Franco Impero 🇮🇹',
    description: 'Desbloquea el estilo de carnet Mafia Italiana y el smoking elegante.',
    hint: 'El respeto y la lealtad abren las puertas de la familia.',
    codeHash: '3efd2435325d19ab5444ae7dbcf754d32d7f17f1c9ec14d853063fce19f452d3', // FRANCO-IMPERO26
    codeHashes: [
      '3efd2435325d19ab5444ae7dbcf754d32d7f17f1c9ec14d853063fce19f452d3', // FRANCO-IMPERO26
      '91b282066b28b9ff04db860acbdd6117f920ed379ac74e0baa34879861c9f5fd', // FRANCO-IMPERO
    ] },
];

// SCARE METER: fed in real time from Supabase (table 'perfiles'),
// showing registered people with their monster and points in sustometro.html.

// Photos and videos from past editions for the gallery (the files go in img/gallery/).
// The .mp4 files show as short silent videos; poster is the image shown while they load.
// text: what is in the image. Not shown on screen: screen readers read it.
const GALLERY = [
  { file: 'img/gallery/group-photo.jpg', text: 'Foto grupal en las escaleras de la entrada de la Facultad de Minas' },
  { file: 'img/gallery/marathon.jpg', text: 'Sala de computadores llena de globos durante la maratón de programación' },
  { file: 'img/gallery/balloons.mp4', poster: 'img/gallery/balloons-poster.jpg', text: 'Carrera con globos en la placa polideportiva' },
  { file: 'img/gallery/soccer.jpg', text: 'Partido de fútbol con petos en la placa polideportiva' },
  { file: 'img/gallery/talk.jpg', text: 'Conferencia sobre agentes de inteligencia artificial en el auditorio' },
  { file: 'img/gallery/fair.mp4', poster: 'img/gallery/fair-poster.jpg', text: 'Recorrido por la feria de stands' },
  { file: 'img/gallery/marathon-team.jpg', text: 'Un equipo concentrado frente al computador en la maratón' },
  { file: 'img/gallery/race.jpg', text: 'Estudiantes sentados en fila durante un juego en la placa' },
  { file: 'img/gallery/auditorium.mp4', poster: 'img/gallery/auditorium-poster.jpg', text: 'Público en el auditorio durante una charla' },
  { file: 'img/gallery/balloons.jpg', text: 'Estudiantes jugando con un globo en la placa polideportiva' },
];
