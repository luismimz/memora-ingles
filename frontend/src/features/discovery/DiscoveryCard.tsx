import { useState } from 'react';
import { Rich, SpeakBtn } from '../../components/common';
import type { DiscoveryCard as DiscoveryCardModel } from './discovery.types';
import { FeynmanCard } from './FeynmanCard';
import { TrioCard } from './TrioCard';

/** Contenido visual del arquetipo correcto; el gesto vive en AssociationCard. */
export function DiscoveryCardContent({ card, onAudioUnlock }: { card: DiscoveryCardModel; onAudioUnlock?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isTrio = card.word.kind === 'irregular'
    || (card.word.kind as string | null) === 'irregular_verb'
    || Boolean(card.word.irregularForms && Object.keys(card.word.irregularForms).length);
  if (isTrio) return <TrioCard card={card} onAudioUnlock={onAudioUnlock} />;
  if (card.word.kind === 'feynman_model') return <FeynmanCard card={card} />;

  const translation = card.word.es.trim();
  const bridge = card.word.bridgeWord?.trim() || card.association.keyword.trim();

  return (
    <>
      <header className="discovery-card-header">
        <div>
          <p className="discovery-card-kicker">ASOCIACIÓN {card.position + 1} / {card.total}</p>
          <h1>{card.word.en} <span className="discovery-card-translation">· {translation.toUpperCase()}</span></h1>
          <p className="discovery-card-pronunciation">{card.word.ipa || card.word.pronEs || 'Pronunciación preparada en la siguiente escucha'}</p>
        </div>
        <div className="discovery-audio-tools"><span>{card.audioReady ? '🔊 voz lista' : '🔊 pulsa para escuchar'}</span><SpeakBtn text={card.audioText} title="Reproducir palabra" allowBrowserFallback audioUrl={card.word.audioUrl} /></div>
      </header>

      <div className="discovery-card-visual" aria-label="Imagen de la asociación">
        {card.association.imageUrl && !imageFailed ? <img src={card.association.imageUrl} alt="" onError={() => setImageFailed(true)} /> : <span className="discovery-card-emoji" aria-hidden="true">{associationEmoji(card)}</span>}
      </div>

      <div className="discovery-card-association">
        <div className="discovery-card-anchor-row">
          <div>
            <p className="discovery-card-label">PUENTE SONORO</p>
            <p className="discovery-card-keyword">{bridge}</p>
          </div>
          <div className="discovery-card-meaning">
            <span>{card.word.en} significa</span>
            <strong>{translation}</strong>
          </div>
        </div>
        <p className="discovery-card-scene"><Rich text={card.association.sceneEs} /></p>
        {card.association.storyEn ? (
          <div className="discovery-card-example">
            <p className="discovery-card-label">USO REAL</p>
            <p className="discovery-card-story">“{card.association.storyEn}”</p>
            {card.word.targetSentenceEs ? <p className="discovery-card-example-es">{card.word.targetSentenceEs}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function associationEmoji(card: DiscoveryCardModel): string {
  if (card.association.emoji?.trim()) return card.association.emoji.trim();
  return card.association.sceneEs.match(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u)?.[0] ?? '🧠';
}
