import { getSpanishSubjectLabel, type GrammarForm } from './unit';

export interface GrammarCheck { prompt: string; choices: string[]; answer: string; hint: string }

export function grammarCaption(form: GrammarForm, step: number, baseSpanish?: string): string {
  const captions = [
    `Empieza por la acción${baseSpanish ? `: ${baseSpanish}` : ''}.`,
    `Primera pista: ${form.spanishEnding.toUpperCase()}. En inglés, el verbo recibe ING.`,
    'Segunda pista: ESTOY. En inglés necesitas I AM.',
    "Ahora júntalo: I AM se acorta a I'M. ING sigue en el verbo.",
    '',
  ];
  if (form.visualContract === 'present-continuous' || form.id === 'ing') return captions[Math.min(step, 4)];
  return form.memoryTrick?.explanation || 'Escucha y relaciona las piezas de la frase.';
}

/** Checks use the exact taught form and subjects. Unsupported contracts need their own exercises. */
export function makeGrammarChecks(form: GrammarForm): GrammarCheck[] {
  if (form.visualContract !== 'present-continuous' && form.id !== 'ing') return [];
  const base = form.englishBase;
  const first = form.subjects[0];
  if (!base || !first || first.phrase === `${first.en} ${base}`) return [];
  const checks: GrammarCheck[] = [{
    prompt: `${first.reducedEs || getSpanishSubjectLabel(first.es, form.spanish)} ${form.spanish}`,
    answer: first.phrase,
    choices: [first.phrase, `${first.en} ${base}`],
    hint: `Busca las dos pistas: ESTOY → I AM. ${form.spanishEnding.toUpperCase()} → ING. I AM se acorta a I'M.`,
  }];
  const plural = form.subjects.find((subject) => subject.es.startsWith('Ellos'));
  const singular = form.subjects.find((subject) => subject.es.startsWith('Él '));
  if (plural && singular && plural.phrase !== singular.phrase) checks.push({
    prompt: `${getSpanishSubjectLabel(plural.es, form.spanish)} ${form.spanish}`,
    answer: plural.phrase,
    choices: [singular.phrase, plural.phrase],
    hint: 'Ellos → they. Están → are. They + are se unen: they’re. El verbo mantiene ING.',
  });
  return checks;
}
