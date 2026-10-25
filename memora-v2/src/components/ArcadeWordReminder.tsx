import type { AtomicWord } from '../domain/unit';
import { wordVisual } from '../domain/wordVisual';
import { playEnglish } from '../services/audio';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import { BridgeSoundNote } from './BridgeSoundNote';

export function ArcadeWordReminder({ word, paused, manual = false, vertical = false }: { word: AtomicWord; paused: boolean; manual?: boolean; vertical?: boolean }) {
  const cognate = word.associationMode === 'cognate';
  return <div className="recall-content arcade-reminder"><p className="eyebrow">{cognate ? 'RECUERDA LA PALABRA' : 'RECUERDA EL PUENTE'}</p><SceneVisual word={wordVisual(word)} /><div className="arcade-reminder-chain">{word.bridge ? <><strong>{word.bridge}</strong><span aria-hidden="true">→</span></> : null}<strong lang="en">{word.en}</strong></div><p className="micro-meaning">{word.es}</p>{cognate ? <p className="arcade-reminder-story">Se parece al español y conserva este significado. Escucha su pronunciación inglesa.</p> : <p className="arcade-reminder-story"><MnemonicSceneText word={word} /></p>}<BridgeSoundNote word={word} /><button type="button" className="quiet-action" disabled={paused} onClick={() => void playEnglish(word.en, word.audioUrl)}>🔊 Escuchar</button>{paused || !vertical ? <small>{paused ? 'En pausa' : manual ? 'Pulsa Seguir cuando quieras' : 'Siguiente…'}</small> : null}</div>;
}
