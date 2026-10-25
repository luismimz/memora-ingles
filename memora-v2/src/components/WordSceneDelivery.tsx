import { useEffect, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { playEnglish } from '../services/audio';
import { SceneDelivery } from './GrammarSituation';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';

/** Meaning recognition with visible options, never independent word retrieval. */
export function WordSceneDelivery({ word, options, selected, answered, correct, modeled = false, presentationKey, onAnswer, onModel }: {
  word: AtomicWord; options: AtomicWord[]; selected?: string; answered: boolean; correct: boolean;
  modeled?: boolean; presentationKey: string; onAnswer: (answer: string) => void; onModel: () => void;
}) {
  const [audioStatus, setAudioStatus] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function listen() {
    const id = ++request.current;
    setAudioStatus('Preparando el sonido inglés…');
    try {
      const result = await playEnglish(word.en.toLowerCase(), word.audioUrl, true, () => { if (id === request.current) setAudioStatus('Reproduciendo…'); });
      if (id === request.current) setAudioStatus(result.status === 'played' ? '' : 'Audio no disponible. Puedes seguir con la palabra escrita.');
    } catch { if (id === request.current) setAudioStatus('Audio no disponible. Puedes seguir con la palabra escrita.'); }
  }
  const chosen = options.find((item) => item.en === selected);
  if (answered) return <div className="word-scene-delivery">
    <h1 role="status">{modeled ? 'Conexión con modelo' : correct ? '✓ Conectada' : 'Esta es la conexión'}</h1>
    <SceneVisual word={word} compact />
    <div className="word-scene-result"><p><b lang="en">{word.en}</b> → {word.es}</p>
      {!correct && !modeled && chosen ? <p>Has elegido «{chosen.es}».</p> : null}
      {!correct ? <p><MnemonicSceneText word={word} /></p> : null}
    </div>
    <button type="button" className="quiet-action" onClick={() => void listen()} aria-label="Escuchar la palabra">🔊</button>
    {audioStatus ? <p className="situation-instruction" role="status">{audioStatus}</p> : null}
  </div>;
  return <div className="word-scene-delivery">
    <h1>¿A qué escena va?</h1>
    <SceneDelivery message={word.en} options={options.map((item) => ({ choice: item.en, label: item.es, visual: <SceneVisual word={item} hideAnswer compact /> }))}
      presentationKey={presentationKey} selected={selected ?? ''} feedback={answered ? correct ? 'correct' : 'help' : 'idle'} disabled={answered}
      onAnswer={onAnswer} onListen={() => void listen()} instruction="Toca su imagen.">
      {audioStatus ? <p className="situation-instruction" role="status">{audioStatus}</p> : null}
      {!answered ? <button type="button" className="quiet-action" onClick={onModel}>No me sale: ver la conexión</button> : null}
    </SceneDelivery>
  </div>;
}
