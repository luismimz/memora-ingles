import { useState } from 'react';
import { grammarExamples } from '../preview/grammarExamples';
import { GrammarCoach } from './GrammarCoach';

export function GrammarWorkshop({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(() => grammarExamples.findIndex((item) => item.id === 'be-negative'));
  return <main className="game-screen"><header className="game-topbar"><button type="button" className="activity-back" onClick={onBack}>← Recorrido</button><span>REVISIÓN · TRUCOS</span></header>
    <nav className="review-nav"><label htmlFor="grammar-demo">Probar estructura</label><select id="grammar-demo" value={index} onChange={(event) => setIndex(Number(event.target.value))}>{grammarExamples.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select><small>No guarda progreso</small></nav>
    <section className="game-stage"><GrammarCoach key={index} lesson={grammarExamples[index]} userId="preview" unitId="grammar-workshop" reviewMode onReady={() => {}} onContinue={() => index < grammarExamples.length - 1 ? setIndex(index + 1) : onBack()} /></section>
  </main>;
}
