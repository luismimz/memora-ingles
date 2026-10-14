import type { LessonPiece } from './grammarLesson';
import type { GrammarForm } from './unit';

/** Literal, authored matches only. Never infer -er/-ing from a noun. */
export function markGrammarText(text: string, marks: LessonPiece[]): LessonPiece[] {
  const ordered = marks.filter((mark) => mark.text.trim()).sort((a, b) => b.text.length - a.text.length);
  const lower = text.toLocaleLowerCase().replace(/[’‘]/g, "'");
  const result: LessonPiece[] = [];
  let plain = ''; let index = 0;
  while (index < text.length) {
    const mark = ordered.find((candidate) => {
      const start = candidate.text.toLocaleLowerCase().replace(/[’‘]/g, "'");
      if (!lower.startsWith(start, index)) return false;
      const letter = (value: string) => /[\p{L}\p{N}]/u.test(value);
      return !(letter(start[0]) && index > 0 && letter(text[index - 1])) && !(letter(start.at(-1)!) && index + start.length < text.length && letter(text[index + start.length]));
    });
    if (!mark) { plain += text[index++]; continue; }
    if (plain) { result.push({ text: plain, role: 'context' }); plain = ''; }
    result.push({ text: text.slice(index, index + mark.text.length), role: mark.role });
    index += mark.text.length;
  }
  if (plain) result.push({ text: plain, role: 'context' });
  return result;
}

export function grammarSentencePieces(text: string, form: GrammarForm, language: 'es' | 'en'): LessonPiece[] {
  const inflected = language === 'es' ? form.spanish : form.english;
  const verbPieces = language === 'es' ? form.spanishPieces : form.englishPieces;
  const pieces: LessonPiece[] = verbPieces?.length ? verbPieces.map((part) => ({ text: part.text, role: ['root', 'participle'].includes(part.role) ? 'verb' : part.role === 'auxiliary' ? 'auxiliary' : 'change' })) : language === 'es'
    ? [{ text: form.spanishStem, role: 'verb' }, { text: form.spanishEnding, role: 'change' }]
    : [{ text: form.englishRoot, role: 'verb' }, { text: form.englishNut, role: 'change' }];
  const marks: LessonPiece[] = form.subjects.flatMap((subject) => (language === 'es' ? [subject.es, subject.reducedEs] : [subject.en, subject.expandedEn]).filter((value): value is string => Boolean(value)).map((value) => ({ text: value, role: 'auxiliary' })));
  const authored = form.lesson?.steps.flatMap((step) => (language === 'es' ? step.es : step.en).filter((part) => part.role !== 'context' && part.role !== 'change')) ?? [];
  marks.push(...authored.filter((part) => !part.text.toLocaleLowerCase().includes(inflected.toLocaleLowerCase())), { text: inflected, role: 'verb' });
  const firstExpression = form.lesson?.steps[0].en.find((part) => part.role === 'verb')?.text.trim();
  if (language === 'en' && form.englishBase && firstExpression?.startsWith(`${form.englishBase} `)) marks.push({ text: firstExpression.slice(form.englishBase.length).trim(), role: 'verb' });
  // Prefer explicit typed verb pieces to a whole phrase's decorative mark.
  const rows = markGrammarText(text, marks.filter((mark) => mark.text.trim().toLocaleLowerCase() !== inflected.toLocaleLowerCase() || mark.role === 'verb'));
  if (pieces.map((part) => part.text).join('').toLocaleLowerCase() !== inflected.toLocaleLowerCase()) return rows;
  return rows.flatMap((part) => {
    const split = markGrammarText(part.text, [{ text: inflected, role: 'change' }]);
    return split.flatMap((fragment) => {
      if (fragment.role !== 'change') return [{ ...fragment, role: part.role }];
      let offset = 0;
      return pieces.map((piece) => { const value = { ...piece, text: fragment.text.slice(offset, offset + piece.text.length) }; offset += piece.text.length; return value; });
    });
  });
}
