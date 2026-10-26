/** Shared written letters only, never a sound or translation rule. */
export function cognateLetters(english: string, spanish: string) {
  const en = Array.from(english), es = Array.from(spanish);
  const clean = (letter: string) => letter.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  const result = { en: [] as number[], es: [] as number[] };
  if (en.length > 80 || es.length > 80) return result;
  const grid = Array.from({ length: en.length + 1 }, () => Array(es.length + 1).fill(0) as number[]);
  for (let i = en.length - 1; i >= 0; i--) for (let j = es.length - 1; j >= 0; j--) grid[i][j] = clean(en[i]) === clean(es[j]) && /\p{L}/u.test(en[i]) ? 1 + grid[i + 1][j + 1] : Math.max(grid[i + 1][j], grid[i][j + 1]);
  let i = 0, j = 0;
  while (i < en.length && j < es.length) {
    if (clean(en[i]) === clean(es[j]) && /\p{L}/u.test(en[i])) { result.en.push(i++); result.es.push(j++); }
    else if (grid[i + 1][j] >= grid[i][j + 1]) i++; else j++;
  }
  return result;
}
