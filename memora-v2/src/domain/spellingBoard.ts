/** Literal spelling support, never syllables or a pronunciation rule. */
export function spellingBoard(model: string, layout?: 'letters-v2', legacy = false) {
  const parts = legacy ? model.includes(' ') ? model.split(/\s+/) : model.length > 10 ? model.match(/.{1,2}/gu)! : Array.from(model) : Array.from(model);
  const letters = parts.flatMap((part, index) => /[A-ZÀ-Ü]/u.test(part) ? [index] : []);
  const guided = !legacy && letters.length >= 7;
  const gaps = guided ? [...new Set([letters[1], letters[Math.floor(letters.length / 2)], letters[letters.length - 2]])] : letters;
  return { parts, gaps, guided, layout: layout ?? 'letters-v2' as const };
}
