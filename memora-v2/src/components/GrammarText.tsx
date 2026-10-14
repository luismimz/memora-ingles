import type { LessonPiece } from '../domain/grammarLesson';
import type { GrammarForm } from '../domain/unit';
import { grammarSentencePieces, markGrammarText } from '../domain/grammarPresentation';

export function GrammarPieces({ parts }: { parts: LessonPiece[] }) {
  return <>{parts.map((part, index) => <span key={index} className={`coach-piece coach-${part.role}`}>{part.text}</span>)}</>;
}
export function GrammarRow({ parts, language }: { parts: LessonPiece[]; language: string }) {
  return <p className="coach-row" lang={language}><GrammarPieces parts={parts} /></p>;
}
export function GrammarCaption({ text, marks = [] }: { text: string; marks?: LessonPiece[] }) {
  return <GrammarPieces parts={markGrammarText(text, marks)} />;
}
export function GrammarText({ text, form, language = 'en' }: { text: string; form: GrammarForm; language?: 'en' | 'es' }) {
  return <span lang={language} className="grammar-inline"><GrammarPieces parts={grammarSentencePieces(text, form, language)} /></span>;
}
