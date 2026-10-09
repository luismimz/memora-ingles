import { useEffect, useState } from 'react';
import { Rich, SpeakBtn, playNaturalFast } from '../../components/common';
import { prefetchNaturalAudio } from '../../lib/audioPlayer';
import type { DiscoveryCard } from './discovery.types';

interface TrioCardProps {
  card: DiscoveryCard;
  onAudioUnlock?: () => void;
}

const FORM_KEYS = ['v1', 'v2', 'v3'] as const;
const FORM_LABELS = ['V1 · Base', 'V2 · Pasado', 'V3 · Participio + HAVE'] as const;

const FAMILY_LABELS: Record<string, string> = {
  ut_ut_ut: 'Familia Inalterables (No cambian)',
  inalterables: 'Familia Inalterables (No cambian)',
  rhyme_o: 'Familia de la O',
  ought: 'Familia -OUGHT',
  uy_ought_ought: 'Familia -OUGHT',
  a_aught_aught: 'Familia -AUGHT',
  ee_to_e: 'Familia Doble E (feel → felt, sleep → slept, keep → kept)',
  vocal_corta: 'Familia Doble E (feel → felt, sleep → slept, keep → kept)',
  i_a_u: 'Familia I - A - U',
  ew_own: 'Familia -EW / -OWN',
  e_oke_en: 'Familia -OKE / -EN',
  et_et_et: 'Familia Inalterables (No cambian)',
};

function friendlyFamily(value: string | null) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s/-]+/g, '_');
  return FAMILY_LABELS[key] || 'Verbo Irregular';
}

function sceneVisual(card: DiscoveryCard) {
  if (card.association.emoji?.trim()) return card.association.emoji.trim();
  return card.association.sceneEs.match(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u)?.[0] || '🧠';
}

/** Carta de tres tiempos: una sola asociación encadena las tres formas. */
export function TrioCard({ card, onAudioUnlock }: TrioCardProps) {
  const forms = card.word.irregularForms ?? {};
  const values = FORM_KEYS.map((key, index) => forms[key] || (index === 0 ? card.word.en : card.word.en));
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const bridgeParts = (card.word.bridgeWord || card.association.keyword).split(/\s*(?:\||→|>|\/|;)\s*/).filter(Boolean);
  const translation = card.word.es.trim();
  const activeForm = card.word.irregularExamples?.[FORM_KEYS[activeIndex]];
  const bridge = activeForm?.bridge_word?.trim() || bridgeParts[activeIndex] || bridgeParts[0] || card.association.keyword;
  const activeIpa = activeForm?.ipa?.trim() || card.word.ipa || card.word.pronEs || 'Escucha cada forma';
  const activeScene = activeForm?.scene_es?.trim() || card.association.sceneEs;

  useEffect(() => {
    const examples = Object.values(card.word.irregularExamples ?? {})
      .map((example) => example?.en?.trim())
      .filter((text): text is string => Boolean(text));
    examples.forEach((text) => { void prefetchNaturalAudio(text, undefined, card.word.audioUrl).catch(() => null); });
  }, [card.word.audioUrl, card.word.irregularExamples]);

  const sentenceFor = (index: number) => {
    const key = FORM_KEYS[index];
    const specific = card.word.irregularExamples?.[key];
    if (specific?.en?.trim() && specific.es?.trim()) {
      return { en: specific.en.trim(), es: specific.es.trim() };
    }
    // Compatibilidad con palabras sembradas antes de añadir ejemplos por forma.
    // Nunca dejamos la pestaña sin frase: se muestra el ejemplo canónico como
    // respaldo hasta que Directus reciba el contenido específico.
    return {
      en: card.word.targetSentenceEn?.trim() || card.word.exampleEn?.trim() || '',
      es: card.word.targetSentenceEs?.trim() || card.word.exampleEs?.trim() || '',
    };
  };

  const activeSentence = sentenceFor(activeIndex);

  useEffect(() => setImageFailed(false), [card.association.imageUrl]);

  const selectForm = (index: number) => {
    setActiveIndex(index);
    const sentence = sentenceFor(index);
    playNaturalFast(sentence.en || values[index], false, 8000, true, card.word.audioUrl);
    onAudioUnlock?.();
  };

  return (
    <>
      <header className="discovery-card-header trio-card-header">
        <div>
          <p className="discovery-card-kicker">TRÍO IRREGULAR · {friendlyFamily(card.word.verbFamily)}</p>
          <h1>{values[activeIndex]} <span className="trio-card-translation">· {translation.toUpperCase()}</span></h1>
          <p className="discovery-card-pronunciation">{activeIpa}</p>
        </div>
        <div className="discovery-audio-tools"><span>🔊 forma activa</span><SpeakBtn text={values[activeIndex]} title="Escuchar forma activa" allowBrowserFallback /></div>
      </header>

      <div className="trio-tabs" role="tablist" aria-label="Formas del verbo irregular">
        {FORM_LABELS.map((label, index) => (
          <button key={label} type="button" role="tab" aria-selected={activeIndex === index} className={activeIndex === index ? 'is-active' : ''} onClick={() => selectForm(index)}>
            <small>{label}</small><strong>{values[index]}</strong>
          </button>
        ))}
      </div>

      <div className="discovery-card-visual trio-card-visual">
        {card.association.imageUrl && !imageFailed
          ? <img src={card.association.imageUrl} alt="" onError={() => setImageFailed(true)} />
          : <span className="discovery-card-emoji" aria-hidden="true">{sceneVisual(card)}</span>}
      </div>

      <div className="discovery-card-association">
        <p className="discovery-card-label">PUENTE SONORO</p>
        <p className="discovery-card-keyword">{bridge}</p>
        <p className="discovery-card-scene"><Rich text={activeScene} /></p>
        <section className="trio-card-sentence" aria-live="polite">
          <div className="trio-card-sentence-heading">
            <p className="discovery-card-label">FRASE DE {FORM_LABELS[activeIndex].toUpperCase()}</p>
            <SpeakBtn text={activeSentence.en} title={`Escuchar frase ${FORM_LABELS[activeIndex]}`} allowBrowserFallback audioUrl={card.word.audioUrl} />
          </div>
          {activeSentence.en ? <p className="discovery-card-story">“{activeSentence.en}”</p> : null}
          {activeSentence.es ? <p className="trio-card-example-es">{activeSentence.es}</p> : null}
        </section>
      </div>
    </>
  );
}
