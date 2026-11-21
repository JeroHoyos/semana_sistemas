/* =============================================
   BRACKETS AND STANDINGS: the logic
   Pure functions (no page, no Supabase) used by scripts/brackets.ts and tested in tests/.
   ============================================= */

export const BYE = Symbol('bye');   // empty first-round slot: whoever faces it goes through

/* ---------- Building the rounds ---------- */

// The first round, two by two, with a bye for each null. If the count is not a power of two, the
// missing byes are spread one per match (top slots first, then bottom ones), so nobody gets two.
export function firstRound(names) {
  const size = 2 ** Math.ceil(Math.log2(Math.max(names.length, 2)));
  const half = size / 2;
  const slots = names.length === size
    ? names
    : Array.from({ length: size }, (_, i) => names[i % 2 ? half + (i - 1) / 2 : i / 2]);
  return slots.map((name) => name ?? BYE);
}

// Which side goes through: a bye lets the other one through; two people need a result marked.
function winnerSide([top, bottom]: unknown[], marked) {
  if (top === BYE) return bottom === BYE ? null : 1;
  if (bottom === BYE) return 0;
  if (top === null || bottom === null) return null;   // a rival is not decided yet
  return marked === 0 || marked === 1 ? marked : null;
}

// Every round's matches, and the champion. A side is a name, BYE, or null (not decided yet).
export function buildRounds({ participantes, ganadores }) {
  let sides = firstRound(participantes);
  const rounds = [];
  while (sides.length > 1) {
    const round = rounds.length;
    const matches = [];
    for (let m = 0; m < sides.length / 2; m++) {
      const pair = [sides[2 * m], sides[2 * m + 1]];
      matches.push({ key: `${round}-${m}`, sides: pair, winner: winnerSide(pair, ganadores[`${round}-${m}`]) });
    }
    rounds.push(matches);
    sides = matches.map(({ sides: pair, winner }) => (winner !== null ? pair[winner] : pair.every((s) => s === BYE) ? BYE : null));
  }
  return { rounds, champion: typeof sides[0] === 'string' ? sides[0] : null };
}

// Places first (1, 2, 3…), then DNF; equal places go by name
export function sortStandings(list) {
  return [...list].sort((a, b) => {
    const isDnfA = a.puesto === 'DNF';
    const isDnfB = b.puesto === 'DNF';
    if (isDnfA && !isDnfB) return 1;
    if (!isDnfA && isDnfB) return -1;
    if (isDnfA && isDnfB) return String(a.nombre).localeCompare(String(b.nombre));
    const numA = Number(a.puesto);
    const numB = Number(b.puesto);
    if (numA !== numB) return numA - numB;
    return String(a.nombre).localeCompare(String(b.nombre));
  });
}
