# AGENTS.md

Website for the Semana de Sistemas (Facultad de Minas, UNAL Medellín, 18–20 Nov 2026). Built with Astro (static output), TypeScript and Tailwind CSS 4, managed with pnpm. Deployed on Vercel. Accounts, the Scare Meter (Sustómetro) ranking, the game records, teams and brackets live in Supabase. The event is over: every sign-up is closed (`REGISTRATION_OPEN` is empty).

## Coding standard

- Follow the `ponytail` skill (`.claude/skills/ponytail/SKILL.md`) when writing code: the smallest complete change, no speculative code.
- Follow the `ponytail-review` skill (`.claude/skills/ponytail-review/SKILL.md`) when reviewing.
- Before a pull request: `pnpm check`, `pnpm lint`, `pnpm test` and `pnpm build` must pass.

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
- Previews and `pnpm dev` use the same Supabase project as production: whatever you do there writes real data.

## Language

- Code is in English: identifiers, comments, CSS classes and ids, file and folder names.
- Spanish stays in:
  - `README.md` and every text the website shows to people.
  - Page names and URLs: `index.html`, `evento.html?id=maraton`, `sustometro.html`, anchors like `#horario`. The pages live in `src/pages/*.astro`; `build.format: 'file'` keeps the `.html` addresses.
  - Every Supabase name and every value already stored in it. This covers tables and columns (`perfiles`, `puntajes_juego`, `nombre`, `monstruo`…), function names and parameters, `user_metadata` keys (`monstruo`, `titulo`, `titulos`), monster part keys and values (`cuerpo: 'manchas'`), title ids and activity ids.
  - Existing `localStorage` keys (`juego_semana_*`, `semana_sistemas_version`).
- Never rename a stored name without a database migration: the live site breaks.

## Layout

| Path | What it is |
| --- | --- |
| `src/pages/` | The pages (`index`, `evento`, `sustometro`, `inscripciones`, `politica-datos`, `descanso`) and `semana-sistemas.ics.ts`, the calendar feed built from `ACTIVITIES` |
| `src/layouts/Layout.astro` | The shared `<head>`; `nightRedirect` adds the 1–7 a.m. redirect to `descanso.html` (`src/components/NightRedirect.astro`) |
| `src/data/content.ts` | All event content (days, speakers, activities, groups, titles, gallery). Content edits go here. |
| `src/lib/` | Shared modules: `supabase.ts` (client and `translateError`), `session.ts` (`currentUser`), `common.ts` (`$`, `escapeHtml`, medals, lookups), `icons.ts`, `pixel-art.ts`, `brackets.ts` (bracket and standings logic) |
| `src/scripts/` | Page logic: `main.ts` (home), `event.ts` (activity page), `auth.ts` (login and ID card), `codes.ts` (title codes), `scare-meter.ts`, `registrations.ts` (`supabase/teams.sql`), `pre-register.ts`, `brackets.ts` (`supabase/brackets.sql`), `secrets.ts` (`supabase/secrets.sql`), `race-map.ts` (three.js, loaded only when the page has `#race-map`) |
| `src/games/` | The retro console (`weekly-game.ts`) and its cartridges: `snake.ts`, `doom.ts`, `defrag.ts` |
| `src/styles/` | `global.css` (Tailwind tokens in `@theme`, every rule in `@layer components`) and `legal.css` |
| `public/` | Files served as they are: images, the gallery, `games/doom/doom.wasm` (committed build output) and `doom1.wad` |
| `doom/` | Doom engine sources for the browser (built into `public/games/doom/doom.wasm`) |
| `supabase/` | SQL to run by hand in the Supabase SQL Editor. `*.local.sql` and `week-1-prizes.sql` hold private data and are not committed. |
| `tests/` | Vitest checks of the risky shared logic |
| `tools/` | `hash-code.js`, `bump-version.js`, `build-doom.sh` |

Each page has one `<script>` that imports its modules; Astro bundles them. Modules import what they use, so there is no load order to keep. A module imported by a page runs on that page: do not import `scripts/auth.ts` into `evento.html` code (it has no login dialog).

## Running and testing

- `pnpm dev` serves the site at `localhost:4321`; `pnpm build && pnpm preview` serves the production build.
- `pnpm test` runs `tests/self-check.test.ts`. Add a check there for new risky logic, and keep that logic in `src/lib/` (no DOM, no Supabase) so the test can import it.
- Pages read live Supabase data. Do not write to it from tests.

## Rules that are easy to break

- **User text:** every text a person types (names, emails) goes through `escapeHtml` before reaching `innerHTML`. Monster colors go through `monsterColor`.
- **Supabase keys:** the anon key in `src/lib/supabase.ts` is public by design. Never add the `service_role` key.
- **Browser checks are not security:** the clown ban, title limits, closed sign-ups and the supervisor check in TypeScript can be bypassed. Supabase policies and functions must enforce anything that matters.
- **Supervisors:** each person can edit their own `user_metadata` (titles included) from the browser, so Supabase never trusts it. Its functions ask `es_supervisor()`, which reads `app_metadata.supervisor`, set by hand with SQL (`supabase/weekly-game.sql` says how).
- **Sign-ups:** which activities take sign-ups lives in `REGISTRATION_OPEN` (`src/data/content.ts`) and in `inscripcion_cerrada()` (`supabase/cerrar-inscripciones.sql`). Change both and run the SQL again.
- **Title codes:** the plain-text code never goes in the repo. Run `pnpm hash-code "CODE"` and store the hash in `codeHash` in `TITLES`.
- **Version bump:** changing `PROJECT_VERSION` in `src/data/content.ts` (or running `pnpm bump-version`) signs every user out.
- **Weekly game locks:** to open a locked week, remove `locked` from its entry in `WEEKS` (`src/games/weekly-game.ts`) and remove its game from `juego_bloqueado()` in the SQL, then run the SQL again.
- **Daily game limits:** a game's limit lives in `dailyGames` of its cartridge and in `registrar_puntaje_juego` (`supabase/weekly-game.sql`). Change both and run the SQL again.
- **Login gate:** `sustometro.html` and `inscripciones.html` keep everything with `data-needs-login` hidden without a session (`showLoginGate` in `src/scripts/auth.ts`). It only hides the page: what Supabase gives `anon` stays readable.
- **Tailwind:** there is no preflight reset, and the old rules sit in `@layer components`, so a utility always wins over them. A CSS class must not share a name with a Tailwind utility (`container`, `block`, `flex`, `hidden`…): that is why the page wrapper is `.page-width` and the week grid items are `.week-block`.
- **Doom:** after editing `doom/*`, rebuild with `bash tools/build-doom.sh` (needs git and Zig 0.17) and commit `public/games/doom/doom.wasm`; Vercel cannot build it. The import and export names between the page and the engine are defined in both `doomgeneric_web.c` and `src/games/doom.ts`.
- **Calendar feed:** `/semana-sistemas.ics` is built from `ACTIVITIES` on every deploy (`src/pages/semana-sistemas.ics.ts`). Keep its UIDs (`<activity id>@semanasistemas.vercel.app`): subscribed calendars match events by them.
- **Line endings:** `.sh` and `.patch` files must keep LF (`.gitattributes` enforces it).
