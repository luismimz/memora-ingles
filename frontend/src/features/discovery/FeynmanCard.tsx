import { Rich, SpeakBtn } from '../../components/common';
import type { DiscoveryCard } from './discovery.types';

export function FeynmanCard({ card }: { card: DiscoveryCard }) {
  const modelKey = (card.word.verbFamily || '').toLowerCase().replace(/\s+/g, '_');
  const model = {
    present_perfect: 'El Cable Enchufado',
    reported_speech: 'El Retrovisor del Chismoso',
    conditionals: 'El Selector de Multiversos',
  }[modelKey] || card.word.verbFamily || card.word.es;
  const hint = card.word.hintEs || card.association.keyword;

  return (
    <>
      <header className="discovery-card-header feynman-card-header">
        <div>
          <p className="discovery-card-kicker">MODELO FEYNMAN · {model}</p>
          <h1>{card.word.en}</h1>
          <p className="discovery-card-pronunciation">{card.word.ipa || card.word.pronEs || 'Escucha y explica el patrón'}</p>
        </div>
        <div className="discovery-audio-tools"><span>🔊 modelo</span><SpeakBtn text={card.word.targetSentenceEn || card.word.en} title="Escuchar el modelo" allowBrowserFallback audioUrl={card.word.audioUrl} /></div>
      </header>

      <div className="feynman-model-panel">
        <span className="feynman-model-icon" aria-hidden="true">🧠</span>
        <p className="discovery-card-label">MODELO MENTAL FÍSICO</p>
        <strong>{hint}</strong>
        {card.word.definitionEn ? <p>{card.word.definitionEn}</p> : null}
      </div>

      <div className="discovery-card-association">
        <p className="discovery-card-label">CHIVATO GRAMATICAL</p>
        <p className="discovery-card-keyword">{card.association.keyword}</p>
        <p className="discovery-card-scene"><Rich text={card.association.sceneEs} /></p>
        {card.word.targetSentenceEn ? <p className="discovery-card-story">“{card.word.targetSentenceEn}”</p> : null}
      </div>
    </>
  );
}
