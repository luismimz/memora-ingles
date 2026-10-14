import { getExpandedEnglishSubject, getSpanishSubjectLabel, type GrammarForm, type GrammarPiece } from '../domain/unit';

interface GrammarMorphologyProps {
  form: GrammarForm;
  step: number;
  joined: boolean;
  subjectIndex: number;
  baseSpanish?: string;
}

/** One visual contract for every verb: subject, root and intent keep their roles and colours. */
export function GrammarMorphology({ form, step, joined, subjectIndex, baseSpanish }: GrammarMorphologyProps) {
  const subject = form.subjects[subjectIndex];
  const spanishSubject = subject.reducedEs ? subject.es : getSpanishSubjectLabel(subject.es, form.spanish);
  const [spanishPronoun, ...spanishBeingParts] = spanishSubject.split(' ');
  const spanishBeing = spanishBeingParts.join(' ');
  const reducedSpanish = subject.reducedEs || (spanishBeing.charAt(0).toUpperCase() + spanishBeing.slice(1));
  const contraction = subject.en;
  const expandedEnglish = getExpandedEnglishSubject(subject);
  const expandedParts = expandedEnglish.split(/\s+/);
  const contractionPieces = [expandedParts[0], expandedParts.slice(1).join(' ')];
  const canContract = expandedEnglish !== subject.en;
  const spanishPieces: GrammarPiece[] = form.spanishPieces || [
    { id: 'verb-root', text: step === 0 && baseSpanish ? baseSpanish : form.spanishStem, role: 'root' },
    ...(form.spanishEnding ? [{ id: 'intent', text: form.spanishEnding, role: 'ending' as const }] : []),
  ];
  const englishPieces: GrammarPiece[] = form.englishPieces || [
    { id: 'verb-root', text: form.englishRoot, role: 'root' },
    { id: 'intent', text: form.englishNut, role: form.placement === 'after' ? 'ending' : 'auxiliary' },
  ];
  const orderedEnglish = form.placement === 'before' && !form.englishPieces ? [...englishPieces].reverse() : englishPieces;

  function pieceClass(piece: GrammarPiece) {
    return ['ending', 'auxiliary', 'negation', 'connector'].includes(piece.role) ? 'morph-intent' : 'morph-root';
  }

  return <div className="metamorph" aria-label={`${form.spanish} se convierte en ${form.english}`}>
    <div className={`spanish-form ${step >= 2 && spanishSubject ? 'has-subject' : ''}`}>
      {step >= 2 && spanishSubject ? <span className={`spanish-subject ${spanishSubject.length > 12 ? 'is-long' : ''} ${joined ? 'is-reduced' : ''}`} key={subject.es} aria-label={joined ? reducedSpanish : spanishSubject}>
        <span className="spanish-subject-pieces" aria-hidden={joined}><span className="subject-person">{spanishPronoun}</span><span className="subject-being">{spanishBeing}</span></span>
        <span className="spanish-subject-result" aria-hidden={!joined}>{reducedSpanish}</span>
      </span> : null}
      <span className={`spanish-word ${step >= 1 ? 'is-transforming' : ''}`}>{spanishPieces.map((piece, index) =>
        <span key={piece.id} aria-hidden={step === 0 && index > 0} className={index === 0 || step >= 1 ? pieceClass(piece) : 'morph-piece is-hidden'} data-role={piece.role}>{step === 0 && index === 0 && baseSpanish ? baseSpanish : piece.text}</span>)}</span>
    </div>
    <div className="english-assembly">
      {step >= 2 && subject.en ? canContract ? <span className={`contraction-demo ${joined ? 'is-joined' : ''}`} key={subject.es} aria-label={joined ? contraction : expandedEnglish}>
        <span className="contraction-piece subject-person" aria-hidden={joined}>{contractionPieces[0]}</span>
        <span className="contraction-piece subject-being" aria-hidden={joined}>{contractionPieces[1]}</span>
        <span className="contraction-result" aria-hidden={!joined}>{contraction}</span>
      </span> : <span className="active-subject" aria-hidden="true">{subject.en}</span> : null}
      <div className={`english-form ${step >= 0 ? 'is-visible' : ''} ${step >= 1 ? 'is-swapped' : ''} ${step >= 2 ? 'is-assembled' : ''} ${form.placement === 'after' ? 'is-suffix' : 'is-prefix'}`}>
        {orderedEnglish.map((piece, index) => <span key={piece.id} data-role={piece.role} className={`${piece.role === 'root' || piece.role === 'participle' ? 'english-root' : 'english-nut'} ${index === 0 || step >= 1 ? pieceClass(piece) : 'morph-piece is-hidden'}`}>{step === 0 && index === 0 && form.englishBase ? form.englishBase : piece.text}</span>)}
      </div>
    </div>
  </div>;
}
