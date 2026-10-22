import type { AtomicWord } from '../domain/unit';

/** A memory cue is not a transcription or an approved pronunciation. */
export function BridgeSoundNote({ word, explain = false }: { word: AtomicWord; explain?: boolean }) {
  if (!word.bridge || word.associationMode === 'cognate') return null;
  return <div className="bridge-sound-note">
    <small>El puente ayuda a recordar; no es la pronunciación inglesa.</small>
    {explain && word.bridgeEvidence?.soundRelation ? <details><summary>Diferencia con el sonido inglés</summary><p>{word.bridgeEvidence.soundRelation}</p></details> : null}
  </div>;
}
