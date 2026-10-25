import type { AtomicUnit } from '../domain/unit';
import { useEffect, useRef, useState } from 'react';
import type { LearningMode } from '../domain/game';
import { missingGrammarWords, requiredGrammarWords } from '../domain/learningModes';
import { readWordMemories } from '../domain/memory';
import './learningLibrary.css';
import { getPlayableGrammar } from '../domain/unit';
import { lessonForForm } from '../domain/grammarLesson';
import { readLearningActivities } from '../domain/learningActivity';

const PAGE_SIZE = 6;
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
const domainOf = (unit: AtomicUnit) => unit.kind === 'vocabulary-pack' ? unit.title.split(' · ')[1]?.trim() ?? '' : '';

export type LibraryBrowseState = { search: string; domain: string; limit: number; selectedId?: string };

export function LearningLibrary({ mode, units, userId, inspection, onOpen, onBack, onWords, notice, onRetry, initialBrowse, onBrowseChange }: {
  mode: 'vocabulary' | 'grammar'; units: AtomicUnit[]; userId: string; inspection: boolean;
  onOpen: (unit: AtomicUnit, mode: LearningMode) => void; onBack: () => void; onWords: () => void;
  notice?: string | null; onRetry?: () => void;
  initialBrowse?: LibraryBrowseState; onBrowseChange?: (state: LibraryBrowseState) => void;
}) {
  const memories = readWordMemories(userId);
  const practiced = new Set(readLearningActivities(userId).filter((activity) => activity.source === 'learner').map((activity) => JSON.stringify([activity.unitId, activity.contentVersion])));
  const [browse, setBrowse] = useState<LibraryBrowseState>(() => initialBrowse ?? { search: '', domain: '', limit: PAGE_SIZE });
  const { search, domain, limit } = browse;
  const updateBrowse = (state: LibraryBrowseState) => { setBrowse(state); onBrowseChange?.(state); };
  const searchInput = useRef<HTMLInputElement>(null);
  const returnTarget = useRef(initialBrowse?.selectedId);
  const returnedHeading = useRef<HTMLHeadingElement>(null);
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const focusNewBatch = useRef(false);
  const firstAdded = useRef(0);
  useEffect(() => { returnedHeading.current?.focus(); }, []);
  useEffect(() => { if (focusNewBatch.current) { nextHeading.current?.focus(); focusNewBatch.current = false; } }, [limit]);
  const clearFilters = () => { focusNewBatch.current = false; updateBrowse({ search: '', domain: '', limit: PAGE_SIZE }); searchInput.current?.focus(); };
  const allGroups = units.filter((unit) => mode === 'grammar' ? unit.kind !== 'vocabulary-pack' && (unit.mirror || getPlayableGrammar(unit).length > 0) : !unit.mirror && unit.kind !== 'grammar-lesson');
  const domains = [...new Set(allGroups.map(domainOf).filter(Boolean))];
  const query = searchable(search);
  const groups = allGroups.filter((unit) => (!domain || domainOf(unit) === domain) && searchable(`${unit.title} ${unit.mirror?.novelty ?? ''} ${unit.grammar.map((form) => form.lesson?.title ?? form.spanish).join(' ')} ${unit.words.map((word) => `${word.en} ${word.es}`).join(' ')}`).includes(query))
    .sort((left, right) => mode === 'grammar' && !inspection ? Number(Boolean(missingGrammarWords(left, memories).length)) - Number(Boolean(missingGrammarWords(right, memories).length)) : 0);
  const visible = groups.slice(0, limit);
  const remaining = groups.length - visible.length;
  const filtered = Boolean(query || domain);
  return <main className="journey-screen learning-library"><header className="journey-header"><button type="button" onClick={onBack}>← Inicio</button><strong>MEMORA · {mode === 'vocabulary' ? 'PALABRAS' : 'GRAMÁTICA'}</strong></header>
    <section><p className="eyebrow">PRÁCTICA POR TU CUENTA</p><h1>{mode === 'vocabulary' ? 'Elige una tanda de palabras.' : 'Elige una práctica de frases.'}</h1><p>Busca una palabra o explora por tandas. Puedes seguir con más hoy. El recorrido guiado sigue en Inicio.</p>{inspection ? <p>Modo de prueba · puedes explorar las fichas sin guardar progreso.</p> : null}</section>
    {notice ? <div role="status"><p>{notice}</p>{onRetry ? <button type="button" className="quiet-action" onClick={onRetry}>Volver a intentar</button> : null}</div> : null}
    <div className="learning-library-filters"><label>{mode === 'grammar' ? 'Buscar truco o palabra' : 'Buscar palabra'}<input ref={searchInput} type="search" value={search} aria-controls="library-groups" aria-describedby="library-results" onChange={(event) => { focusNewBatch.current = false; updateBrowse({ ...browse, search: event.target.value, limit: PAGE_SIZE }); }} placeholder={mode === 'grammar' ? 'Jugando, preguntas, negar…' : 'Information, casa, tecnología…'} /></label>{domains.length ? <label>Ámbito<select value={domain} onChange={(event) => { focusNewBatch.current = false; updateBrowse({ ...browse, domain: event.target.value, limit: PAGE_SIZE }); }}><option value="">Todos los ámbitos</option>{domains.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : null}{filtered ? <button type="button" className="quiet-action" onClick={clearFilters}>Limpiar búsqueda y filtros</button> : null}</div>
    <p id="library-results" className="learning-library-results" role="status">{groups.length ? `Ves ${visible.length} de ${groups.length} tandas${filtered ? ' que coinciden' : ' disponibles'}.` : filtered ? 'No hay resultados para esa búsqueda.' : 'Aún no hay contenido publicado disponible para este apartado.'} {groups.length ? 'Es contenido disponible, no un recuento de aprendizaje.' : ''}</p>
    <div id="library-groups" className="learning-library-grid">{visible.map((unit, index) => {
      const missing = mode === 'grammar' ? missingGrammarWords(unit, memories) : [];
      const ready = inspection || !missing.length;
      const firstForm = getPlayableGrammar(unit)[0];
      const base = unit.words.find((word) => word.en.toLowerCase() === firstForm?.englishBase?.toLowerCase())?.es.toLowerCase();
      const grammarTitle = unit.mirror?.novelty ?? (firstForm ? lessonForForm(firstForm, base)?.title ?? `Usar «${firstForm.spanish}»` : 'Descubre un truco');
      const label = unit.kind === 'vocabulary-pack' ? unit.words.every((word) => word.associationMode === 'cognate') ? 'Cognados · sin puente forzado' : unit.words.every((word) => word.en.includes(' ')) ? 'Phrasal verbs · asociaciones' : 'Palabras · asociaciones' : unit.location?.label ?? 'Una historia de Memora';
      return <article key={unit.id}><p className="eyebrow">{label}</p><h2 tabIndex={-1} ref={unit.id === returnTarget.current ? returnedHeading : index === firstAdded.current ? nextHeading : undefined}>{mode === 'grammar' ? grammarTitle : unit.title}</h2>{practiced.has(JSON.stringify([unit.id, unit.contentVersion ?? '1'])) ? <span className="learning-library-practiced">Práctica registrada</span> : null}<p>{mode === 'vocabulary' ? unit.words.map((word) => `${word.en} · ${word.es}`).join(' / ') : requiredGrammarWords(unit).join(' · ')}</p>{!ready ? <p className="learning-requirements">Primero prepara: {missing.join(', ').toUpperCase()}.</p> : null}<button type="button" className="primary-action" disabled={!ready} onClick={() => { updateBrowse({ ...browse, selectedId: unit.id }); onOpen(unit, mode); }}>{mode === 'vocabulary' ? 'Aprender estas palabras →' : 'Descubrir el truco →'}</button>{!ready ? <button type="button" className="quiet-action" onClick={onWords}>Ir a las palabras</button> : null}</article>;
    })}</div>{remaining > 0 ? <div className="learning-library-more"><button type="button" className="quiet-action" onClick={() => { firstAdded.current = visible.length; focusNewBatch.current = true; updateBrowse({ ...browse, limit: limit + PAGE_SIZE }); }}>Ver {Math.min(PAGE_SIZE, remaining)} tandas más</button><small>Quedan {remaining} por mostrar. La búsqueda siempre incluye todo el catálogo.</small></div> : null}
  </main>;
}
