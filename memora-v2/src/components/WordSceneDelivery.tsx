import { useEffect, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { playEnglish } from '../services/audio';
import { SceneDelivery } from './GrammarSituation';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';

/** Meaning recognition with visible options, never independent word retrieval. */
export function WordSceneDelivery({ word, options, selected, answered, correct, presentationKey, onAnswer }: {
  word: AtomicWord; options: AtomicWord[]; selected?: string; answered: boolean; correct: boolean;
  presentationKey: string; onAnswer: (answer: string) => void;
}) {
  const [audioStatus, setAudioStatus] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function listen() {
    const id = ++request.current;
    setAudioStatus('Preparando el sonido inglés…');
    try {
      const result = await playEnglish(word.en.toLowerCase(), word.audioUrl);
      if (id === request.current) setAudioStatus(result.status === 'played' ? 'Modelo inglés reproducido.' : 'Audio no disponible. Puedes seguir con la palabra escrita.');
    } catch { if (id === request.current) setAudioStatus('Audio no disponible. Puedes seguir con la palabra escrita.'); }
  }
  const chosen = options.find((item) => item.en === selected);
  return <div className="word-scene-delivery">
    <h1>¿A qué escena va?</h1>
    <SceneDelivery message={word.en} options={options.map((item) => ({ choice: item.en, label: item.es, visual: <SceneVisual word={item} hideAnswer compact /> }))}
      presentationKey={presentationKey} selected={selected ?? ''} feedback={answered ? correct ? 'correct' : 'help' : 'idle'} disabled={answered}
      onAnswer={onAnswer} onListen={() => void listen()} instruction="Escucha o lee. Lleva la palabra a su escena, o toca la escena.">
      {audioStatus ? <p className="situation-instruction" role="status">{audioStatus}</p> : null}
      {answered ? <div className="word-scene-result" role="status">
        <strong>{correct ? 'La palabra ha llegado a su escena.' : chosen ? `Has elegido «${chosen.es}». Mira la conexión:` : 'Mira la conexión:'}</strong>
        <p><b lang="en">{word.en}</b> → {word.es}</p>
        {!correct ? <><SceneVisual word={word} compact showMemoryLink /><p><MnemonicSceneText word={word} /></p></> : null}
        <small>Reconocer con opciones es una práctica; recordar sin pistas es otro paso.</small>
      </div> : null}
    </SceneDelivery>
  </div>;
}
