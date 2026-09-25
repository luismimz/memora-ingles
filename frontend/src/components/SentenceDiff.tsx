import { diffWords, sentenceScore } from '../lib/answer';
import { SpeakBtn } from './common';

/** Corrección de una frase palabra a palabra: marca qué falla y por qué, no solo un porcentaje. */
export function SentenceDiff({ given, expected, spanish }: { given: string; expected: string; spanish?: string | null }) {
  const diff = diffWords(given, expected);
  const score = sentenceScore(given, expected);
  const errors = diff.filter((t) => t.status === 'wrong' || t.status === 'missing' || t.status === 'extra');
  const typos = diff.filter((t) => t.status === 'typo');
  const level = errors.length === 0 ? 'ok' : score >= 0.5 ? 'doubt' : 'fail';
  const title = !given.trim() ? '📖 Así se dice'
    : errors.length === 0 ? (typos.length ? '✅ ¡Bien! Solo una errata' : '✅ ¡Perfecto!')
    : `${score >= 0.5 ? '🤏 Casi' : '📖 Así se dice'}: ${errors.length === 1 ? '1 palabra' : `${errors.length} palabras`} por corregir`;

  return (
    <div className={`feedback ${level}`} style={{ textAlign: 'left', fontWeight: 600 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      {given.trim() && errors.length + typos.length > 0 && (
        <div className="diff-line">
          {diff.map((t, i) => (
            <span key={i} className={`dw ${t.status}`}>
              {t.status === 'extra' ? <s>{t.word}</s>
                : t.status === 'wrong' ? <><s>{t.given}</s> {t.word}</>
                : t.status === 'missing' ? <>＋{t.word}</>
                : t.word}
            </span>
          ))}
        </div>
      )}
      {errors.filter((t) => t.status === 'wrong').map((t, i) => (
        <div key={i} className="small" style={{ marginTop: 4 }}>✏️ Has escrito <b>«{t.given}»</b>; aquí va <b>«{t.word}»</b>.</div>
      ))}
      {typos.map((t, i) => <div key={`t${i}`} className="small" style={{ marginTop: 4 }}>🔤 «{t.given}» se escribe <b>«{t.word}»</b>.</div>)}
      <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap', justifyContent: 'space-between' }}>
        <span><b>{expected}</b>{spanish ? <span className="muted small"> · {spanish}</span> : null}</span>
        <SpeakBtn text={expected} />
      </div>
    </div>
  );
}
