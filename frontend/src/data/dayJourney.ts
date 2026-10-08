export interface DayJourneyChapter {
  id: string;
  number: number;
  moment: string;
  title: string;
  emoji: string;
  sceneEs: string;
  sceneEn: string;
  target: string;
  pattern: string;
  words: [string, string][];
  reward: number;
}

/**
 * La columna vertebral de Memora: una historia cotidiana que da contexto a
 * las palabras, las estructuras y las prácticas. Cada capítulo se completa
 * produciendo una frase, no solo pulsando "siguiente".
 */
export const DAY_JOURNEY: DayJourneyChapter[] = [
  {
    id: 'wake-up', number: 1, moment: 'Al despertar', title: 'Empieza el día', emoji: '🌅',
    sceneEs: 'Abres los ojos, miras la hora y decides levantarte antes de que empiece el ruido del día.',
    sceneEn: 'I usually get up early because I want to have a quiet morning.',
    target: 'I usually get up early.', pattern: 'I usually + verbo',
    words: [['get up', 'levantarse'], ['early', 'temprano'], ['usually', 'normalmente']], reward: 20,
  },
  {
    id: 'bathroom', number: 2, moment: 'En el baño', title: 'Tu primera rutina', emoji: '🚿',
    sceneEs: 'Te duchas y te preparas. Es una rutina sencilla, pero ya estás hablando en inglés.',
    sceneEn: 'I have a quick shower and get ready for the day.',
    target: 'I have a quick shower.', pattern: 'I have + a/an + cosa',
    words: [['shower', 'ducha'], ['quick', 'rápida'], ['get ready', 'prepararse']], reward: 20,
  },
  {
    id: 'breakfast', number: 3, moment: 'En el desayuno', title: 'Elige tu energía', emoji: '☕',
    sceneEs: 'Preparas café y algo de comer. Mientras desayunas decides qué necesitas hacer hoy.',
    sceneEn: 'I need to make coffee before I start work.',
    target: 'I need to make coffee.', pattern: 'I need to + verbo',
    words: [['need to', 'necesitar'], ['make', 'hacer / preparar'], ['before', 'antes de']], reward: 25,
  },
  {
    id: 'news', number: 4, moment: 'Con las noticias', title: 'Di lo que piensas', emoji: '📰',
    sceneEs: 'Lees las noticias. Algo te sorprende y usas una palabra muy frecuente para matizar tu opinión.',
    sceneEn: 'Actually, the news is not as bad as it sounds.',
    target: 'Actually, the news is not bad.', pattern: 'Actually, + opinión',
    words: [['actually', 'en realidad'], ['news', 'noticias'], ['sounds', 'suena']], reward: 25,
  },
  {
    id: 'leave-home', number: 5, moment: 'Al salir de casa', title: 'Pon el plan en marcha', emoji: '🚪',
    sceneEs: 'Coges las llaves, sales de casa y piensas en lo que vas a hacer durante el trayecto.',
    sceneEn: "I'm going to take the car because it's raining.",
    target: "I'm going to take the car.", pattern: "I'm going to + verbo", 
    words: [['going to', 'ir a'], ['take', 'coger / llevar'], ['car', 'coche']], reward: 25,
  },
  {
    id: 'work', number: 6, moment: 'En el trabajo', title: 'Cuenta tu obligación', emoji: '💻',
    sceneEs: 'Llegas al trabajo y tienes una tarea pendiente. La dices en voz alta para empezar sin bloquearte.',
    sceneEn: 'I have to finish this task before lunch.',
    target: 'I have to finish this task.', pattern: 'I have to + verbo',
    words: [['have to', 'tener que'], ['finish', 'terminar'], ['task', 'tarea']], reward: 30,
  },
  {
    id: 'friend', number: 7, moment: 'Con un amigo', title: 'Mantén la conversación', emoji: '👋',
    sceneEs: 'Te encuentras con un amigo. No necesitas una frase perfecta: empiezas, preguntas y ganas tiempo.',
    sceneEn: "Well, actually, I'm doing fine. How about you?",
    target: "Actually, I'm doing fine.", pattern: "Well / Actually, + respuesta", 
    words: [['well', 'bueno'], ['doing fine', 'estar bien'], ['how about you?', '¿y tú?']], reward: 30,
  },
  {
    id: 'phone', number: 8, moment: 'Al teléfono', title: 'Pide que te ayuden', emoji: '📞',
    sceneEs: 'Te llaman mientras hay ruido. Pides que repitan la frase de forma educada y sigues la conversación.',
    sceneEn: 'Could you repeat that, please? I did not hear you.',
    target: 'Could you repeat that, please?', pattern: 'Could you + verbo...?',
    words: [['could you', 'podrías'], ['repeat', 'repetir'], ['hear', 'oír']], reward: 35,
  },
  {
    id: 'emergency', number: 9, moment: 'Cuando surge algo', title: 'Reacciona sin quedarte en blanco', emoji: '🚨',
    sceneEs: 'Algo se tuerce y tienes que explicar el problema deprisa. La estructura te da una salida inmediata.',
    sceneEn: 'There is a problem. I need help right now.',
    target: 'There is a problem.', pattern: 'There is + cosa',
    words: [['there is', 'hay'], ['problem', 'problema'], ['right now', 'ahora mismo']], reward: 35,
  },
  {
    id: 'evening', number: 10, moment: 'Al terminar', title: 'Cierra el día contando', emoji: '🌙',
    sceneEs: 'Vuelves a casa. Miras atrás y cuentas qué ocurrió, qué aprendiste y qué harás mañana.',
    sceneEn: 'I really improved today, and tomorrow I will keep going.',
    target: 'I really improved today.', pattern: 'I really + verbo',
    words: [['really', 'de verdad / muy'], ['improved', 'mejoré'], ['keep going', 'seguir']], reward: 40,
  },
];

const STORAGE_KEY = 'memora.journey.chapter';

export function journeyProgress(): number {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    return Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 0), DAY_JOURNEY.length) : 0;
  } catch { return 0; }
}

export function saveJourneyProgress(completedChapter: number): number {
  const next = Math.min(Math.max(Math.floor(completedChapter), 0), DAY_JOURNEY.length);
  try { localStorage.setItem(STORAGE_KEY, String(Math.max(journeyProgress(), next))); } catch { /* almacenamiento opcional */ }
  return journeyProgress();
}

export function activeJourneyChapter(): DayJourneyChapter | null {
  return DAY_JOURNEY[journeyProgress()] ?? null;
}
