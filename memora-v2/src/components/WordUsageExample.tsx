import type { AtomicWord } from '../domain/unit';
import { SpeechModelButton } from './SpeechModelButton';

/** One authored, translated model. Viewing or listening never answers a task. */
export function WordUsageExample({ word }: { word: AtomicWord }) {
  if (!word.usageExample) return null;
  return <section className="word-usage-example" aria-label={`Ejemplo de uso de ${word.en}`}>
    <small>EN UNA FRASE</small>
    <p lang="en">{word.usageExample.en}</p>
    <p lang="es">{word.usageExample.es}</p>
    <SpeechModelButton text={word.usageExample.en} label="Escuchar el ejemplo" idleLabel="Escuchar" />
  </section>;
}
