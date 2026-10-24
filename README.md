# Semana de Sistemas

Página de la Semana de Sistemas de la Facultad de Minas (Universidad Nacional de Colombia, sede Medellín): horario, ponentes, competencias, grupos estudiantiles, galería y el Carnet de Asustador.

Es un sitio estático: HTML, CSS y JavaScript, sin frameworks ni paso de compilación.

- **Verla:** abre `index.html` en el navegador. El inicio de sesión necesita internet (usa Supabase).
- **Cambiar el contenido:** todo está en `js/data.js` (días, ponentes, grupos, actividades y galería). Al inicio de cada lista hay un comentario con los campos que acepta. Las imágenes van en `img/` en formato `.jpg` (los dibujos como el favicon, en `.svg`); las fotos y videos de la galería, en `img/galeria/`.


## Estructura

```
index.html        Página principal: portada, ponentes, horario, competencias, grupos y galería
evento.html       Página de una actividad (evento.html?id=maraton)
css/styles.css    Todos los estilos
js/
  data.js         Contenido del evento: días, tipos, ponentes, grupos, actividades y galería
  iconos.js       Dibujos SVG: íconos, monstruos de los ponentes, escudo y monstruo del carnet
  pixeles.js      Adornos pixel art de la cabecera de cada actividad
  comun.js        Funciones que usan las dos páginas ($, buscarDia, enlaceActividad…)
  main.js         Arma las secciones de index.html a partir de data.js
  evento.js       Arma evento.html a partir de data.js
  auth.js         Inicio de sesión y Carnet de Asustador (Supabase)
img/              Fotos y dibujos; la galería, en img/galeria/
```


## Cómo está escrito el código

- **Sin módulos.** Cada script define constantes y funciones globales, así que el orden de los `<script>` importa: primero `data.js`, después los dibujos y `comun.js`, y al final el script de la página.
- **Nombres completos y en español:** `boton`, `actividad`, `evento`; no `btn`, `el` o `e`.
- **Los nombres dicen qué hace cada función:**
  - `pintarX()` escribe en la página (`pintarHorario`, `pintarGaleria`).
  - `xDeY()` solo devuelve HTML, sin tocar la página (`tarjetaDeActividad`, `carnetDePonente`, `seccionDelPonente`).
  - `buscarX(id)` busca en los datos (`buscarPonente`, `buscarGrupo`).
- **Cada archivo se divide en secciones** con `/* ---------- Nombre ---------- */`.
- **Los comentarios explican el porqué** (una regla del evento, un detalle del CSS, una decisión de accesibilidad), no lo que ya se lee en el código.


## Legibilidad: complejidad cognitiva

Seguimos la idea de [complexipy](https://github.com/rohaquinlop/complexipy): medir qué tan difícil es *entender* una función, no cuántos caminos tiene. Cada `if`, `else if`, `else`, ternario, ciclo, `catch` o cadena de `&&` / `||` suma 1 punto, y suma más cuanto más anidado esté.

**Regla: ninguna función pasa de 15 puntos.** Si una función crece, estas son las técnicas que se usan en el proyecto:

| Técnica | En vez de | Ejemplo |
| --- | --- | --- |
| **Tabla de opciones** | una cadena larga de `if / else if` según un valor | `PARTES_MONSTRUO` en `iconos.js`, `ERRORES_SUPABASE` en `auth.js`, `TIPOS` en `data.js` |
| **Salir temprano** (cláusula de guarda) | envolver todo el cuerpo en un `if` | `if (!ponente) return '';` en `seccionDelPonente` |
| **Una función por tarea** | una función que arma muchas cosas distintas | `pintarInformacion` en `evento.js` solo junta las secciones; cada una está en su propia función |
| **Sacar plantillas anidadas** | un `map` dentro de otro `map` dentro de un template | `bloqueDeActividad` y `carnetDePonente` en `main.js` |

complexipy analiza Python. Si algún día se agregan herramientas al proyecto, la regla equivalente para JavaScript es `sonarjs/cognitive-complexity` de `eslint-plugin-sonarjs`, con el mismo umbral de 15.


## Sesión y Carnet de Asustador

- `auth.js` usa Supabase Auth. Solo se aceptan correos `@unal.edu.co`.
- El nombre y el monstruo de cada persona se guardan en los datos de su cuenta (`full_name` y `monstruo`); no hay tablas propias.
- La clave que está en `auth.js` es la pública (`anon`) y está hecha para ir en el navegador. **Nunca pongas ahí la clave `service_role`.**
- **Para agregar una opción al monstruo** (un cuerpo, unos ojos, un accesorio…): súmala a `CATALOGO_MONSTRUO` en `auth.js` (el nombre que se ve) y a `PARTES_MONSTRUO` en `iconos.js` (su dibujo), con el mismo `valor`.


## Autores

Web hecha por Santiago Escobar Arias y Jerónimo Hoyos Botero.
