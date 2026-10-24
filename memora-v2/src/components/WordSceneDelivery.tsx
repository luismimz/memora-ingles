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
      {!answered ? <button type="button" className="quiet-action" onClick={onModel}>No me sale: ver la conexión</button> : null}
      {answered ? <div className="word-scene-result" role="status">
        <strong>{modeled ? 'Vamos con el modelo. No hace falta adivinar.' : correct ? 'La palabra ha llegado a su escena.' : chosen ? `Has elegido «${chosen.es}». Mira la conexión:` : 'Mira la conexión:'}</strong>
        <p><b lang="en">{word.en}</b> → {word.es}</p>
        {!correct ? <><SceneVisual word={word} compact showMemoryLink /><p><MnemonicSceneText word={word} /></p></> : null}
        <small>{modeled ? 'Has consultado una ayuda, no es un acierto ni un fallo. Puedes seguir y practicar de nuevo más adelante.' : 'Reconocer con opciones es una práctica; recordar sin pistas es otro paso.'}</small>
      </div> : null}
    </SceneDelivery>
  </div>;
}
