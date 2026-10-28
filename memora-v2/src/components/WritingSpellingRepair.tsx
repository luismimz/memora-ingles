import type { SpellingRepair } from '../domain/sentenceAnswer';

/** A proposed edit remains a learner action, not silent autocorrect or a grade. */
export function WritingSpellingRepair({ repair, onApply }: { repair: SpellingRepair; onApply: () => void }) {
  return <div className="writing-spelling-repair">
    <span>{repair.changes.length === 1 ? 'Solo esta palabra' : 'Estas dos palabras'}</span>
    <div className="writing-repair-changes" lang="en">{repair.changes.map((change) => <div key={change.start}><del>{change.written}</del><span aria-hidden="true">→</span><strong>{change.expected.toUpperCase()}</strong></div>)}</div>
    <button type="button" onClick={onApply}>{repair.changes.length === 1 ? 'Corregir esta palabra' : 'Aplicar estas correcciones'}</button>
  </div>;
}
