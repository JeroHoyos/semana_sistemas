# AGENTS.md

Website for the Semana de Sistemas (Facultad de Minas, UNAL Medellín, 18–20 Nov). Plain static site: HTML, CSS and browser JavaScript, no framework and no build step. Deployed on Vercel as static files. Accounts, the Scare Meter (Sustómetro) ranking and the game records live in Supabase.

## Coding standard

- Follow the `ponytail` skill (`.claude/skills/ponytail/SKILL.md`) when writing code: the smallest complete change, no speculative code.
- Follow the `ponytail-review` skill (`.claude/skills/ponytail-review/SKILL.md`) when reviewing.

## Branches

Git Flow, without release branches:

| Branch | Purpose | Deploys to |
| --- | --- | --- |
| `main` | Production. Only receives merges from `develop` or `hotfix/*`. | The live site (Vercel production) |
| `develop` | Integration: finished work waits here before going live. | Vercel preview |
| `feature/<name>` | One piece of work. Branch from `develop`, merge back with a pull request. | Vercel preview |
| `hotfix/<name>` | Urgent production fix. Branch from `main`, merge into `main`, then into `develop`. | Vercel preview |

- Never commit directly to `main` or `develop`; open a pull request.
- To publish, merge `develop` into `main`.
- `feature/doom-defrag` holds the unpublished games (Doom for week 2, Defrag for week 3). To publish one, unlock it (see "Weekly game locks" below) and merge the branch into `develop`.
- Previews use the same Supabase project as production: whatever you do on a preview writes real data.

## Language

- Code is in English: identifiers, comments, CSS classes and ids, file and folder names.
- Spanish stays in:
  - `README.md` and every text the website shows to people.
  - Page names and URLs: `index.html`, `evento.html?id=maraton`, `sustometro.html`, anchors like `#horario`.
  - Every Supabase name and every value already stored in it. This covers tables and columns (`perfiles`, `puntajes_juego`, `nombre`, `monstruo`…), function names and parameters, `user_metadata` keys (`monstruo`, `titulo`, `titulos`), monster part keys and values (`cuerpo: 'manchas'`), title ids and activity ids.
  - Existing `localStorage` keys (`juego_semana_*`, `semana_sistemas_version`).
- Never rename a stored name without a database migration: the live site breaks.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `evento.html`, `sustometro.html`, `inscripciones.html` | The four pages |
| `js/data.js` | All event content (days, speakers, activities, groups, titles, gallery). Content edits go here. |
| `js/common.js` | Shared helpers (`$`, `escapeHtml`, medals, activity lookups) |
| `js/main.js`, `js/event.js` | Home page and activity page |
| `js/auth.js`, `js/codes.js`, `js/scare-meter.js` | Login and ID card, title codes, Scare Meter |
| `js/registrations.js` | Team sign-ups: captain, members by email, banners (`supabase/teams.sql`) |
| `js/weekly-game.js` | Retro console; each game is a "cartridge" in its own file (`js/snake.js`) |
| `js/icons.js`, `js/pixel-art.js` | SVG icons, monsters and pixel art drawings |
| `games/doom/` | `doom.wasm` (committed build output), `doom1.wad`, engine sources in `source/` |
| `supabase/` | SQL to run in the Supabase SQL Editor |
| `tools/` | `hash-code.js`, `bump-version.js`, `build-doom.sh`, `self-check.html` |

Scripts are classic `<script>` tags sharing globals, so the load order in each HTML file matters. `data.js`, `icons.js` and `common.js` always come first.

## Running and testing

- Serve the folder with any static server, for example `python -m http.server`, instead of opening the files directly (Doom fetches its files, which a `file://` page cannot do).
- After changing shared logic, open `/tools/self-check.html` through the server; it must say `ALL PASSED`. Add a check there for new risky logic.
- Pages read live Supabase data. Do not write to it from tests.

## Rules that are easy to break

- **User text:** every text a person types (names, emails) goes through `escapeHtml` before reaching `innerHTML`. Monster colors go through `monsterColor`.
- **Supabase keys:** the anon key in `js/auth.js` is public by design. Never add the `service_role` key.
- **Browser checks are not security:** the clown ban, title limits and the supervisor check in JavaScript can be bypassed. Supabase policies and functions must enforce anything that matters.
- **Title codes:** the plain-text code never goes in the repo. Run `node tools/hash-code.js "CODE"` and store the hash in `codeHash` in `TITLES`.
- **Version bump:** changing `PROJECT_VERSION` in `js/data.js` (or running `tools/bump-version.js`) signs every user out.
- **Weekly game locks:** to open a locked week, remove `locked` from its entry in `WEEKS` (`js/weekly-game.js`) and remove its game from `juego_bloqueado()` in the SQL, then run the SQL again.
- **Doom:** after editing `games/doom/source/*`, rebuild with `bash tools/build-doom.sh` (needs git and Zig 0.17) and commit `games/doom/doom.wasm`; Vercel cannot build it. The import and export names between the page and the engine are defined in both `doomgeneric_web.c` and `js/doom.js`.
- **Line endings:** `.sh` and `.patch` files must keep LF (`.gitattributes` enforces it).
