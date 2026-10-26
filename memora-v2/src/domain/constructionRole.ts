import { lessonForForm, type LessonPiece } from './grammarLesson';
import type { GrammarForm } from './unit';

const literal = (text: string) => text.trim().toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[.!?,;:]+$/, '').trim();
/** Presentation only: reuse roles explicitly demonstrated by this lesson.
 * Unknown or ambiguous pieces stay neutral; never diagnose an answer by colour. */
export function constructionRole(text: string, form: GrammarForm, language: 'en' | 'es', baseSpanish?: string): LessonPiece['role'] | undefined {
  const lesson = lessonForForm(form, baseSpanish);
  if (!lesson) return;
  const candidates: LessonPiece[] = [];
  for (const step of lesson.steps) {
    const parts = step[language];
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (part.role === 'context' || part.role === 'change') continue;
      if (part.role !== 'verb') { candidates.push(part); continue; }
      let value = part.text;
      while (index + 1 < parts.length && parts[index + 1].role === 'change') value += parts[++index].text;
      candidates.push({ text: value, role: 'verb' });
    }
  }
  const roles = new Set(candidates.filter((part) => literal(part.text) === literal(text)).map((part) => part.role));
  return roles.size === 1 ? [...roles][0] : undefined;
}
