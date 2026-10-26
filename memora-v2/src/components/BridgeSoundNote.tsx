import type { AtomicWord } from '../domain/unit';

/** Correct only the two inspected legacy notes; never rewrite another story. */
export function bridgeSoundExplanation(word: AtomicWord): { text?: string; source?: string } {
  const text = word.bridgeEvidence?.soundRelation;
  if (word.associationMode === 'acoustic_bridge' && word.en === 'BED' && word.es === 'cama' && word.bridge === 'BEDUINO'
    && word.scene === 'Un BEDUINO duerme debajo de la CAMA.'
    && text === 'BEDUINO empieza exactamente con la secuencia bed; el audio enseña a detenerse tras /d/.') return {
      text: 'BEDUINO es el recuerdo, no un sonido idéntico. BED es una sola sílaba y termina en D, sin «uino». Escucha el modelo inglés.',
      source: 'https://dictionary.cambridge.org/pronunciation/english/bed',
    };
  if (word.associationMode === 'acoustic_bridge' && word.en === 'PILLOW' && word.es === 'almohada' && word.bridge === 'PILOTO'
    && word.scene === 'Un PILOTO aterriza sobre la ALMOHADA y rebota.'
    && text === 'PILOTO y PILLOW comparten pilo al inicio; el inglés termina en /oʊ/ sin la sílaba to.') return {
      text: 'PILOTO ayuda a recordar. En PILLOW el golpe de voz va al principio y no se dice «to». El modelo inglés enseña sus vocales y su ritmo.',
      source: 'https://dictionary.cambridge.org/pronunciation/english/pillow',
    };
  return { text };
}

/** A memory cue is not a transcription or an approved pronunciation. */
export function BridgeSoundNote({ word, explain = false }: { word: AtomicWord; explain?: boolean }) {
  if (!word.bridge || word.associationMode === 'cognate') return null;
  const note = bridgeSoundExplanation(word);
  return <div className="bridge-sound-note">
    <small>El puente ayuda a recordar; no es la pronunciación inglesa.</small>
    {explain && (note.text || word.bridgeEvidence?.familiarMeaning) ? <details><summary>Tu puente y el sonido</summary>{word.bridgeEvidence?.familiarMeaning ? <p><strong>{word.bridge}</strong>: {word.bridgeEvidence.familiarMeaning}</p> : null}{note.text ? <p>{note.text}</p> : null}{note.source ? <a href={note.source} target="_blank" rel="noreferrer">Referencia de pronunciación</a> : null}</details> : null}
  </div>;
}
