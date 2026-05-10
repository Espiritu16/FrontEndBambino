export function normalizeSearchText(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchQuery(query: string | null | undefined, fields: Array<string | null | undefined>): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedFields = fields
    .map((f) => normalizeSearchText(f))
    .filter((f) => !!f);

  if (!normalizedFields.length) return false;

  const haystack = normalizedFields.join(' ');
  if (haystack.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const fieldTokens = haystack.split(' ').filter(Boolean);
  if (!queryTokens.length || !fieldTokens.length) return false;

  // Todos los términos de búsqueda deben encontrar al menos una coincidencia
  // en cualquier posición/campo, tolerando typos pequeños.
  return queryTokens.every((qTok) => tokenMatchesAny(qTok, fieldTokens));
}

function tokenMatchesAny(queryToken: string, targetTokens: string[]): boolean {
  return targetTokens.some((token) => {
    if (token.includes(queryToken) || queryToken.includes(token)) return true;
    const dist = damerauLevenshtein(queryToken, token);
    const maxAllowed = queryToken.length <= 4 ? 1 : 2;
    return dist <= maxAllowed;
  });
}

// Distancia Damerau-Levenshtein: maneja sustitución, inserción, borrado y transposición.
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const dp: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // delete
        dp[i][j - 1] + 1, // insert
        dp[i - 1][j - 1] + cost // substitute
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transpose
      }
    }
  }

  return dp[al][bl];
}
