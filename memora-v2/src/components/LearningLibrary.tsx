import type { AtomicUnit } from '../domain/unit';
import { useState } from 'react';
import type { LearningMode } from '../domain/game';
import { missingGrammarWords, requiredGrammarWords } from '../domain/learningModes';
import { readWordMemories } from '../domain/memory';
import './learningLibrary.css';
import { getPlayableGrammar } from '../domain/unit';
import { lessonForForm } from '../domain/grammarLesson';

export function LearningLibrary({ mode, units, userId, inspection, onOpen, onBack, onWords, notice, onRetry }: {
  mode: 'vocabulary' | 'grammar'; units: AtomicUnit[]; userId: string; inspection: boolean;
  onOpen: (unit: AtomicUnit, mode: LearningMode) => void; onBack: () => void; onWords: () => void;
  notice?: string | null; onRetry?: () => void;
}) {
  const memories = readWordMemories(userId);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const allGroups = units.filter((unit) => mode === 'grammar' ? unit.kind !== 'vocabulary-pack' && (unit.mirror || getPlayableGrammar(unit).length > 0) : !unit.mirror);
  const domains = [...new Set(allGroups.filter((unit) => unit.kind === 'vocabulary-pack').map((unit) => unit.title.split(' · ')[1]))];
  const groups = allGroups.filter((unit) => (!domain || unit.kind === 'vocabulary-pack' && unit.title.split(' · ')[1] === domain) && `${unit.title} ${unit.mirror?.novelty ?? ''} ${unit.grammar.map((form) => form.lesson?.title ?? form.spanish).join(' ')} ${unit.words.map((word) => `${word.en} ${word.es}`).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
    .sort((left, right) => mode === 'grammar' && !inspection ? Number(Boolean(missingGrammarWords(left, memories).length)) - Number(Boolean(missingGrammarWords(right, memories).length)) : 0);
  return <main className="journey-screen learning-library"><header className="journey-header"><button type="button" onClick={onBack}>← Inicio</button><strong>MEMORA · {mode === 'vocabulary' ? 'PALABRAS' : 'GRAMÁTICA'}</strong></header>
    <section><p className="eyebrow">{mode === 'vocabulary' ? 'PRIMERO, PALABRAS' : 'CON LO QUE YA SABES'}</p><h1>{mode === 'vocabulary' ? 'Palabras que se quedan contigo.' : 'Haz que tus palabras hablen.'}</h1><p>{mode === 'vocabulary' ? 'Asocia, escucha y recuerda. Puedes terminar aquí y seguir acumulando palabras.' : 'Un truco breve, piezas que se mueven y frases con palabras preparadas.'}</p>{inspection ? <p>Modo de prueba · puedes explorar las fichas sin guardar progreso.</p> : null}</section>
    {notice ? <div role="status"><p>{notice}</p>{onRetry ? <button type="button" className="quiet-action" onClick={onRetry}>Volver a intentar</button> : null}</div> : null}
    <div className="learning-library-filters"><label>{mode === 'grammar' ? 'Buscar truco o palabra' : 'Buscar palabra'}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === 'grammar' ? 'Jugando, preguntas, negar…' : 'Information, casa, tecnología…'} /></label>{domains.length ? <label>Ámbito<select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="">Todos los ámbitos</option>{domains.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : null}</div>
    <div className="learning-library-grid">{groups.map((unit) => {
      const missing = mode === 'grammar' ? missingGrammarWords(unit, memories) : [];
      const ready = inspection || !missing.length;
      const firstForm = getPlayableGrammar(unit)[0];
      const base = unit.words.find((word) => word.en.toLowerCase() === firstForm?.englishBase?.toLowerCase())?.es.toLowerCase();
      const grammarTitle = unit.mirror?.novelty ?? (firstForm ? lessonForForm(firstForm, base)?.title ?? `Usar «${firstForm.spanish}»` : 'Descubre un truco');
      const label = unit.kind === 'vocabulary-pack' ? unit.words.every((word) => word.associationMode === 'cognate') ? 'Cognados · sin puente forzado' : unit.words.every((word) => word.en.includes(' ')) ? 'Phrasal verbs · asociaciones' : 'Palabras · asociaciones' : unit.location?.label ?? 'Una historia de Memora';
      return <article key={unit.id}><p className="eyebrow">{label}</p><h2>{mode === 'grammar' ? grammarTitle : unit.title}</h2><p>{mode === 'vocabulary' ? unit.words.map((word) => `${word.en} · ${word.es}`).join(' / ') : requiredGrammarWords(unit).join(' · ')}</p>{!ready ? <p className="learning-requirements">Primero prepara: {missing.join(', ').toUpperCase()}.</p> : null}<button type="button" className="primary-action" disabled={!ready} onClick={() => onOpen(unit, mode)}>{mode === 'vocabulary' ? 'Aprender estas palabras →' : 'Descubrir el truco →'}</button>{!ready ? <button type="button" className="quiet-action" onClick={onWords}>Ir a las palabras</button> : null}</article>;
    })}</div>{!groups.length ? <p>{search.trim() || domain ? 'No hay resultados para esa búsqueda.' : 'Aún no hay contenido publicado disponible para este apartado.'}</p> : null}
  </main>;
}
