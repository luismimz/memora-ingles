import type { AtomicWord } from '../domain/unit';
import { cognateLetters } from '../domain/cognateLetters';
import './cognateConnection.css';

export function CognateConnection({ word }: { word: AtomicWord }) {
  const shared = cognateLetters(word.en, word.es);
  const line = (text: string, indexes: number[], language: string) => <strong lang={language} aria-label={text}>{Array.from(text).map((letter, index) => <span aria-hidden="true" className={indexes.includes(index) ? 'is-shared' : 'is-different'} key={index}>{letter}</span>)}</strong>;
  return <div className="cognate-connection" aria-label="Compara las letras, no la pronunciación">
    <div className="cognate-known"><small>Ya lo conoces</small>{line(word.es, shared.es, 'es')}</div>
    <span className="cognate-link" aria-hidden="true">↓</span>
    <div className="cognate-new"><small>En inglés</small>{line(word.en, shared.en, 'en')}</div>
    <p>Un parecido que te ayuda a recordar.</p>
  </div>;
}
