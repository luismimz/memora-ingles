import { useEffect, useRef, useState } from 'react';
import type { SentenceMemory, WordMemory } from '../domain/memory';

const searchable = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Presentation of existing memories only. Never selects/schedules a learning task. */
export function EvolutionMemoryLibrary({ memories, sentences, onListen, onPractice }: {
  memories: WordMemory[]; sentences: SentenceMemory[]; onListen: (english: string) => void; onPractice: () => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const input = useRef<HTMLInputElement>(null);
  const headings = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string>();
  const entries = [
    ...memories.map((memory) => ({ key: `word:${memory.key}`, en: memory.word.en, es: memory.word.es, next: memory.nextReviewAt, word: memory.word })),
    ...sentences.map((sentence) => ({ key: `sentence:${sentence.key}`, en: sentence.sentenceEn, es: sentence.sentenceEs, next: sentence.nextReviewAt, word: undefined })),
  ];
  const needle = searchable(query.trim());
  const matched = entries.filter((entry) => searchable(`${entry.en} ${entry.es}`).includes(needle));
  const visible = matched.slice(0, limit);
  useEffect(() => {
    if (pendingFocus.current) { headings.current.get(pendingFocus.current)?.focus(); pendingFocus.current = undefined; }
  }, [limit]);
  return <section className="evolution-controls history-library"><details><summary>Palabras, frases y práctica extra</summary>
    {entries.length ? <>
      <label className="evolution-memory-search" htmlFor="evolution-memory-search">Buscar un recuerdo en inglés o español<input ref={input} id="evolution-memory-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(6); }} /></label>
      <p className="evolution-memory-count" role="status">{visible.length} de {matched.length} recuerdos guardados{query.trim() ? ' coinciden con tu búsqueda' : ''}. No es un recuento de palabras nuevas.</p>
      {query ? <button type="button" className="quiet-action" onClick={() => { setQuery(''); setLimit(6); input.current?.focus(); }}>Limpiar búsqueda de recuerdos</button> : null}
      <div className="evolution-memory-results">{visible.map((entry) => <details key={entry.key}><summary ref={(node) => { if (node) headings.current.set(entry.key, node); else headings.current.delete(entry.key); }} data-memory-key={entry.key}>{entry.en} · {entry.es}<small>{entry.word ? 'Palabra o expresión' : 'Frase'}</small></summary>
        {entry.word ? <><p>{entry.word.scene}</p>{entry.word.bridge ? <p>{entry.word.bridge} → {entry.en} → {entry.es}</p> : null}</> : <p>{entry.es}</p>}
        {Number.isFinite(Date.parse(entry.next)) ? <p><small>Próximo repaso sugerido: <time dateTime={entry.next}>{new Date(entry.next).toLocaleString('es-ES')}</time></small></p> : <p><small>Sin fecha de repaso registrada.</small></p>}
        <button type="button" className="quiet-action" aria-label={`Escuchar recuerdo: ${entry.en}`} onClick={() => onListen(entry.en)}>🔊 Escuchar</button>
      </details>)}</div>
      {!matched.length ? <p>No hay recuerdos que coincidan. Prueba otra palabra o limpia la búsqueda.</p> : null}
      {visible.length < matched.length ? <button type="button" className="quiet-action" onClick={() => { pendingFocus.current = matched[limit]?.key; setLimit((value) => value + 6); }}>Ver {Math.min(6, matched.length - visible.length)} recuerdos más</button> : null}
    </> : <p>Aún no hay palabras o frases guardadas para mostrar aquí.</p>}
    <button type="button" className="quiet-action" onClick={onPractice}>Practicar en Arcade</button>
  </details></section>;
}
