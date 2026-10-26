import type { AtomicWord } from '../domain/unit';
import { wordVisual } from '../domain/wordVisual';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import { BridgeSoundNote } from './BridgeSoundNote';
import { isAssociationRejected } from '../domain/associationPreference';
import { SpeechModelButton } from './SpeechModelButton';

export function ArcadeWordReminder({ word, userId, paused, manual = false, vertical = false }: { word: AtomicWord; userId?: string; paused: boolean; manual?: boolean; vertical?: boolean }) {
  const cognate = word.associationMode === 'cognate';
  if (isAssociationRejected(userId, word)) return <div className="recall-content arcade-reminder"><p className="eyebrow">PALABRA Y SIGNIFICADO</p><h1 lang="en">{word.en}</h1><p className="micro-meaning">{word.es}</p><SpeechModelButton text={word.en} staticAudioId={word.audioUrl} label="Escuchar" disabled={paused} />{paused ? <small>En pausa</small> : null}</div>;
  return <div className="recall-content arcade-reminder"><p className="eyebrow">{cognate ? 'RECUERDA LA PALABRA' : 'RECUERDA EL PUENTE'}</p><SceneVisual word={wordVisual(word)} /><div className="arcade-reminder-chain">{word.bridge ? <><strong>{word.bridge}</strong><span aria-hidden="true">→</span></> : null}<strong lang="en">{word.en}</strong></div><p className="micro-meaning">{word.es}</p>{cognate ? <p className="arcade-reminder-story">Se parece al español y conserva este significado. Escucha su pronunciación inglesa.</p> : <p className="arcade-reminder-story"><MnemonicSceneText word={word} /></p>}<BridgeSoundNote word={word} /><SpeechModelButton text={word.en} staticAudioId={word.audioUrl} label="Escuchar" disabled={paused} />{paused || !vertical ? <small>{paused ? 'En pausa' : manual ? 'Pulsa Seguir cuando quieras' : 'Siguiente…'}</small> : null}</div>;
}
