import type { AtomicWord } from '../domain/unit';
import { playEnglish } from '../services/audio';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';

export function ArcadeWordReminder({ word, paused }: { word: AtomicWord; paused: boolean }) {
  const cognate = word.associationMode === 'cognate';
  return <div className="recall-content arcade-reminder"><p className="eyebrow">{cognate ? 'RECUERDA LA PALABRA' : 'RECUERDA EL PUENTE'}</p>{!cognate ? <SceneVisual word={word} /> : null}<div className="arcade-reminder-chain">{word.bridge ? <><strong>{word.bridge}</strong><span aria-hidden="true">→</span></> : null}<strong lang="en">{word.en}</strong></div><p className="micro-meaning">{word.es}</p>{cognate ? <p className="arcade-reminder-story">Se parece al español y conserva este significado. Escucha su pronunciación inglesa.</p> : <p className="arcade-reminder-story"><MnemonicSceneText word={word} /></p>}<button type="button" className="quiet-action" onClick={() => void playEnglish(word.en, word.audioUrl)}>🔊 Escuchar</button><small>{paused ? 'En pausa' : 'Siguiente…'}</small></div>;
}
