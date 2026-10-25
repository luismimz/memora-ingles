import type { GrammarLessonData } from '../domain/grammarLesson';
import type { GrammarForm } from '../domain/unit';
import './grammarActionScene.css';

const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[.!?]/g, '').trim();
/** An authored consequence for one existing lesson, not a source of questions or progress. */
export function supportsGrammarAction(lesson: GrammarLessonData, form?: GrammarForm): boolean {
  return form?.englishBase?.toLowerCase() === 'play' && lesson.id === 'present-continuous:play'
    && lesson.checks.some((check) => check.kind === 'write' && check.answers.some((answer) => ['i am playing', "i'm playing"].includes(normalize(answer))));
}
export function GrammarActionScene({ lesson, form, stage, feedback }: {
  lesson: GrammarLessonData; form?: GrammarForm; stage: 'teach' | 'explain' | 'write' | 'finished'; feedback: 'idle' | 'help' | 'correct';
}) {
  if (!supportsGrammarAction(lesson, form)) return null;
  const running = stage === 'finished' || stage === 'write' && feedback === 'correct';
  const connected = running || stage === 'explain' && feedback === 'correct';
  const caption = running ? '¡El escritorio ya juega! Has contado qué estás haciendo.'
    : feedback === 'help' ? 'El escritorio sigue en pausa. Mira la pista y vuelve a probar.'
      : connected ? 'La conexión encaja. Ahora cuéntalo tú, sin opciones.'
        : stage === 'teach' ? 'Mira cómo encajan las piezas. Después lo contarás tú.'
          : 'Cuenta qué estás haciendo para despertar el escritorio.';
  return <figure className={`grammar-action-scene${running ? ' is-running' : ''}${connected ? ' is-connected' : ''}`} aria-label="El escritorio responde a tu frase">
    {stage !== 'teach' ? <figcaption><strong>DESPIERTA EL ESCRITORIO</strong><span role="status">{caption}</span></figcaption> : null}
    <svg viewBox="0 0 420 120" role="img" aria-label={running ? 'El tablero está jugando' : connected ? 'La conexión está preparada' : 'El tablero espera tu mensaje'}>
      <rect x="137" y="8" width="150" height="84" rx="14" fill="#ac8058" />
      <rect x="145" y="16" width="134" height="66" rx="7" fill={running ? '#356f65' : '#d6d7c1'} />
      {running ? <g className="grammar-action-ball"><circle cx="211" cy="46" r="9" fill="#f5ce73" /><path d="M166 70H194M232 29H260" stroke="#f9efcf" strokeWidth="6" strokeLinecap="round" /></g> : <path d="M201 39V61M220 39V61" stroke="#8e9d8d" strokeWidth="6" strokeLinecap="round" />}
      <path d="M212 92V104M187 104H237M63 108H356" stroke="#997250" strokeWidth="8" strokeLinecap="round" />
      <path d="M62 46H105M105 46V89H135" stroke={connected ? '#4d8f74' : '#bdbea6'} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={connected ? undefined : '6 8'} />
      <circle cx="51" cy="46" r="13" fill="#cc9a51" /><path d="M48 39L56 46L48 53" fill="none" stroke="#fff8df" strokeWidth="3" strokeLinecap="round" />
      <path d="M288 46H319M319 46V89H343" stroke={connected ? '#4d8f74' : '#bdbea6'} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="352" cy="89" r="10" fill={connected ? '#cc9a51' : '#bdbea6'} />
    </svg>
    {stage !== 'teach' ? <small>Tu respuesta mueve la escena; el repaso comprobará qué recuerdas después.</small> : null}
  </figure>;
}
