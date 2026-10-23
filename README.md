# Semana de Sistemas

Página web de la Semana de Sistemas de la Facultad de Minas (Medellín), con estilo inspirado en Monsters University.

## Cómo verla

Abre `index.html` en el navegador. No hay que instalar nada.

## Cómo cambiar el contenido

Todo está en `js/data.js`:

- `DIAS`: días del evento y sus fechas.
- `PONENTES`: nombre, cargo y credencial de cada ponente.
- `GRUPOS`: grupos estudiantiles que apoyan (nombre, tipo, color de su banderín y logo en `img/`).
- `ACTIVIDADES`: el horario (día, hora, tipo y título). Cada una puede llevar `lugar`, `descripcion` y `organiza` (el id del grupo que la organiza), que se muestran en su página.

> Las horas del horario son provisionales; hay que confirmarlas.

Al tocar una actividad (en el horario, la vista de semana o las competencias) se abre `evento.html?id=...` con toda su información.

## Archivos

```
index.html       estructura de la página
evento.html      página con la información de una actividad
css/styles.css   estilos
js/data.js       contenido (normalmente solo se toca este)
js/iconos.js     dibujos SVG: íconos, monstruos y escudo
js/comun.js      funciones que usan las dos páginas
js/main.js       arma las secciones y hace funcionar el horario
js/evento.js     arma la página de una actividad
img/             fotos de la Facultad de Minas, logos de los grupos, favicon y textura
```
"# semana_sistemas" 
