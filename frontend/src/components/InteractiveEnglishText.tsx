import { useState } from 'react';
import { SpeakBtn } from './common';

const DEFINITIONS: Record<string, { es: string; note: string; example: string }> = {
  charger: { es: 'cargador', note: 'El dispositivo o cable que usas para cargar una batería.', example: 'I need my phone charger.' },
};

export function InteractiveEnglishText({ text, onUnderstood }: { text: string; onUnderstood?: (word: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const parts = text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g);
  const definition = open ? DEFINITIONS[open] : null;

  return (
    <div className="interactive-copy">
      <div className="interactive-sentence">
        {parts.map((part, index) => {
          const key = part.toLowerCase();
          return DEFINITIONS[key]
            ? <button key={`${part}-${index}`} type="button" className="interactive-word" onClick={() => setOpen(key)} aria-expanded={open === key}>{part}</button>
            : <span key={`${part}-${index}`}>{part}</span>;
        })}
      </div>
      {definition && open && (
        <div className="word-definition pop" role="dialog" aria-label={`Significado de ${open}`}>
          <div className="spread"><div><span className="eyebrow">PALABRA DESCUBIERTA</span><h3>{open}</h3></div><SpeakBtn text={open} /></div>
          <strong>{definition.es}</strong>
          <p>{definition.note}</p>
          <div className="definition-example"><span>{definition.example}</span><SpeakBtn text={definition.example} /></div>
          <button type="button" className="btn block" onClick={() => { onUnderstood?.(open); setOpen(null); }}>Ya la entiendo ✓</button>
        </div>
      )}
    </div>
  );
}
