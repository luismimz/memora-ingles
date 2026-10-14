import type { CSSProperties } from 'react';
import { mirrorText, type MirrorLessonData, type MirrorPiece, type MirrorRole } from '../domain/mirrorLesson';

export function MirrorPieceView({ piece }: { piece: MirrorPiece }) {
  const root = piece.ending ? piece.text.slice(0, -piece.ending.length) : piece.text;
  return <span className={`mirror-piece mirror-${piece.role}`}>{root}{piece.ending ? <strong className="mirror-ending">{piece.ending}</strong> : null}</span>;
}
export function MirrorRow({ pieces, label, language, onListen }: { pieces: MirrorPiece[]; label: string; language: 'es' | 'en'; onListen?: () => void }) {
  return <div className="mirror-row"><small>{label}{onListen ? <button type="button" onClick={onListen} aria-label={`Escuchar: ${pieces.map((piece) => piece.text).join(' ')}`}>🔊</button> : null}</small><p lang={language} className="mirror-grid" style={{ '--mirror-columns': pieces.length } as CSSProperties}>{pieces.map((piece, index) => <MirrorPieceView key={index} piece={piece} />)}</p></div>;
}
/** Literal reviewed tokens only; never colour a noun by its suffix. Keep original answers intact. */
export function mirrorSegments(text: string, lesson: MirrorLessonData, language: 'es' | 'en'): { text: string; role?: MirrorRole }[] {
  const normalized = text.replace(/[’‘]/g, "'");
  const markers = [...lesson.examples.flatMap((example) => language === 'en' ? example.english : example.mirror), ...lesson.question[language]];
  const known = new Map(markers.map((piece) => [piece.text.toLowerCase(), piece.role]));
  if (language === 'en') known.set("'m", 'auxiliary');
  const sorted = [...known.keys()].sort((a, b) => b.length - a.length);
  const pieces: { text: string; role?: MirrorRole }[] = [];
  let plain = '';
  for (let index = 0; index < text.length;) {
    const key = sorted.find((marker) => normalized.slice(index, index + marker.length).toLowerCase() === marker &&
      (marker.startsWith("'") || index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1])) &&
      (index + marker.length === text.length || !/[\p{L}\p{N}]/u.test(text[index + marker.length])));
    if (key) {
      if (plain) { pieces.push({ text: plain }); plain = ''; }
      pieces.push({ text: text.slice(index, index + key.length), role: known.get(key) }); index += key.length;
    } else { plain += text[index++]; }
  }
  if (plain) pieces.push({ text: plain });
  return pieces;
}
export function MirrorText({ text, lesson, language = 'en' }: { text: string; lesson: MirrorLessonData; language?: 'es' | 'en' }) {
  return <span className="mirror-inline">{mirrorSegments(text, lesson, language).map((piece, index) => <span key={index} className={piece.role ? `mirror-piece mirror-${piece.role}` : undefined}>{piece.text}</span>)}</span>;
}

/** Both languages use the same authored semantic roles, including the question cue. */
export function MirrorQuestion({ lesson, spanishMirror }: { lesson: MirrorLessonData; spanishMirror?: MirrorPiece[] }) {
  return <><p className="mirror-target" lang="es">{spanishMirror ? mirrorText(lesson.question.es) : <MirrorText text={mirrorText(lesson.question.es)} lesson={lesson} language="es" />}</p>{spanishMirror ? <><p className="mirror-rule">¿Quién? <strong className="mirror-person">TÚ.</strong></p><p className="mirror-target mirror-inline" lang="es" aria-label="Pregunta en español espejo">{spanishMirror.map((piece, index) => <span key={index}>{index > 0 ? ' ' : ''}<MirrorPieceView piece={piece} /></span>)}</p></> : null}<p className="mirror-question" lang="en"><MirrorText text={mirrorText(lesson.question.en)} lesson={lesson} language="en" /></p></>;
}
