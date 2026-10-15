import type { UnitSummary } from '../services/directus';
import type { LearningActivity } from './learningActivity';

export const MAP_STEP = 180;
export const MAP_TOP = 110;
export const MAP_NODE_WIDTH = 196;

const places: Record<string, { title: string; name: string; scene: string }> = {
  calle: { title: 'Explora la ciudad', name: 'La ciudad', scene: 'city' },
  casa: { title: 'Un rincón por descubrir', name: 'En casa', scene: 'home' },
  tecnología: { title: 'Enciende tus ideas', name: 'Tecnología', scene: 'technology' },
  profesional: { title: 'Ideas en marcha', name: 'En el trabajo', scene: 'work' },
  trabajo: { title: 'Ideas en marcha', name: 'En el trabajo', scene: 'work' },
  restauración: { title: 'Algo se está cocinando', name: 'A la mesa', scene: 'food' },
  diversión: { title: 'Tiempo para disfrutar', name: 'Tiempo libre', scene: 'leisure' },
  ocio: { title: 'El escenario te espera', name: 'Tiempo libre', scene: 'leisure' },
  educación: { title: 'El taller de las ideas', name: 'Aprender y descubrir', scene: 'learning' },
  salud: { title: 'Palabras para cuidarte', name: 'Tu bienestar', scene: 'health' },
  general: { title: 'Abre nuevas puertas', name: 'Primeras conexiones', scene: 'learning' },
};

/** Presentation only: IDs, content, prerequisites and saved attempts never change. */
export function journeyPresentation(unit: UnitSummary) {
  const cognate = /^Cognados\s*·\s*([^·]+)\s*·\s*(\d+)$/iu.exec(unit.title);
  const association = /^Asociaciones cotidianas\s*·/iu.test(unit.title);
  const phrasal = /^Phrasal verbs\s*·\s*([^·]+)/iu.exec(unit.title);
  const place = cognate ? places[cognate[1].trim().toLocaleLowerCase('es')] : undefined;
  const pack = Boolean(unit.kind === 'vocabulary-pack' || cognate || association || phrasal || unit.id.startsWith('editorial-'));
  const terms = unit.words?.map((word) => word.en).join(' · ') ?? '';
  const station = cognate ? Number(cognate[2]) : null;
  const arrival = unit.words?.some((word) => word.en.toUpperCase() === 'HOTEL') && unit.words?.some((word) => word.en.toUpperCase() === 'STATION');
  return {
    title: cognate ? arrival ? 'Tu primera parada' : place?.title ?? 'Nuevas palabras, nuevas puertas' : association ? 'Conexiones sorprendentes' : phrasal ? `El poder de ${phrasal[1].trim()}` : unit.title,
    place: place?.name ?? (association ? 'El taller de los recuerdos' : phrasal ? 'El laboratorio de expresiones' : pack ? 'Explora el inglés' : unit.location?.label ?? 'La Casa Viva'),
    scene: place?.scene ?? (phrasal ? 'technology' : association || pack ? 'leisure' : 'home'),
    subtitle: pack ? `${unit.words?.length ?? 0} ${phrasal ? 'expresiones' : 'palabras'} para descubrir y recordar.` : unit.teaser || 'Descubre la escena y utiliza lo que aprendes.',
    station,
    terms,
    pack,
  };
}

export function mapPosition(index: number, width: number) {
  const margin = MAP_NODE_WIDTH / 2 + 14;
  const sway = Math.max(0, Math.min(145, width / 2 - margin));
  return { x: width / 2 + Math.sin(index * .95) * sway, y: MAP_TOP + index * MAP_STEP };
}

/** A completed vocabulary session finishes a stop, not full-story or grammar mastery. */
export function completedVocabularyStop(unit: UnitSummary, activities: readonly LearningActivity[]) {
  return journeyPresentation(unit).pack && activities.some((activity) => activity.unitId === unit.id
    && activity.contentVersion === (unit.contentVersion ?? '1') && activity.source === 'learner'
    && activity.phase === 'completion' && activity.skill === 'vocabulary' && activity.activityId === 'vocabulary-completed');
}

export function mapScrollTarget(index: number, count: number, viewportHeight: number) {
  const safe = Math.max(0, Math.min(index, count - 1));
  return Math.max(0, MAP_TOP + safe * MAP_STEP - viewportHeight / 2);
}

export function mapPath(count: number, width: number) {
  if (!count) return '';
  const first = mapPosition(0, width);
  let path = `M ${first.x} ${first.y}`;
  for (let i = 1; i < count; i++) {
    const previous = mapPosition(i - 1, width);
    const next = mapPosition(i, width);
    const middle = (previous.y + next.y) / 2;
    path += ` C ${previous.x} ${middle}, ${next.x} ${middle}, ${next.x} ${next.y}`;
  }
  return path;
}
