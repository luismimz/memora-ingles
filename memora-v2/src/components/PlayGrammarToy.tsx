import type { LessonPiece } from '../domain/grammarLesson';
import { GrammarOrder } from './GrammarOrder';

/** A guided model, not an exam: moving its one taught chunk reveals the message.
 * The parent owns the neutral exposure, persistence, audio and feed gesture. */
export function PlayGrammarToy({ before, after, token, meaning, target, insight, revealed, onDiscover, rule }: {
  before: { en: string; es: string }; after: { en: string; es: string };
  token: LessonPiece; meaning: string; target: string; insight: string;
  revealed: boolean; onDiscover: () => void;
  rule?: string;
}) {
  return <section className={`play-grammar-toy${revealed ? ' is-connected' : ''}`} aria-label="Transforma el mensaje con una pieza">
    <p className="toy-target" lang="es">{target}</p>
    {rule ? <p className="toy-rule" lang="en">{rule}</p> : null}
    <div className="toy-message">
      <span className={`toy-fixed${before.en === 'I' ? ' toy-who' : ' toy-prefix'}`} lang="en">{before.en}<small lang="es">{before.es}</small></span>
      <GrammarOrder pieces={[token]} translations={[meaning]} selected={revealed ? [0] : []} locked={revealed} puzzle autoCheck onChange={() => {}} onAnswer={(value) => { if (!revealed && value === token.text) onDiscover(); }} />
      <span className="toy-fixed toy-what" lang="en">{after.en}<small lang="es">{after.es}</small></span>
    </div>
    <p className="toy-insight" role="status">{revealed ? insight : `Encaja «${meaning}». Toca o arrastra.`}</p>
  </section>;
}
