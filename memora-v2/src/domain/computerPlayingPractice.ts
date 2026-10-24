import type { AtomicUnit } from './unit';
import { piece, type GrammarLessonData } from './grammarLesson';
import { practicedWordMeaning, type WordMemory } from './memory';

export const computerPlayingSkill = 'computer-playing-prepared-v1';
export const computerPlayingIdentity = 'ing:prepared-computer-v1';

/** A narrow application of the received desk mission, not a catalogue approval. */
export function computerPlayingLesson(unit: AtomicUnit, formId: string): GrammarLessonData | null {
  const form = unit.grammar.find((item) => item.id === formId);
  if (unit.id !== 'm1-test-desk' || unit.grammarContinuation || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')
    || form?.id !== 'ing' || form.lesson || form.englishBase !== 'play' || form.english !== 'playing' || form.spanish !== 'jugando'
    || unit.sentence.en !== "I'm playing on my computer."
    || !Object.entries({ PLAY: 'jugar', COMPUTER: 'ordenador' }).every(([en, es]) => unit.words.some((word) => word.en === en && word.es === es))) return null;
  const message = 'I am playing on my computer';
  return { id: computerPlayingSkill, title: 'Avisa para que no apaguen tu ordenador', language: 'en', advanceMode: 'manual', steps: [
    { caption: 'Primero, quién actúa: YO se dice I.', es: [piece('YO', 'subject')], en: [piece('I', 'subject')] },
    { caption: 'Para «yo estoy», une I + AM.', es: [piece('YO ', 'subject'), piece('ESTOY', 'auxiliary')], en: [piece('I ', 'subject'), piece('AM', 'auxiliary')] },
    { caption: 'PLAY es jugar. Para contar que estás jugando ahora: I AM PLAYING.', es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('jugando', 'verb')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('playing', 'verb')] },
    { caption: 'MY indica «mi» o «mis». MY COMPUTER es mi ordenador.', es: [piece('MI ', 'context'), piece('ORDENADOR', 'context')], en: [piece('MY ', 'context'), piece('COMPUTER', 'context')] },
    { caption: 'ON MY COMPUTER: en mi ordenador, usándolo. Aquí ON no significa estar sentado encima del aparato; no traduce siempre «en».', es: [piece('en mi ordenador', 'context')], en: [piece('ON MY COMPUTER', 'context')] },
    { caption: "Estoy jugando en mi ordenador: I AM PLAYING ON MY COMPUTER. I AM también se une como I'M, sin cambiar el mensaje.", es: [piece('Yo ', 'subject'), piece('estoy ', 'auxiliary'), piece('jugando ', 'verb'), piece('en mi ordenador', 'context')], en: [piece('I ', 'subject'), piece('am ', 'auxiliary'), piece('playing ', 'verb'), piece('on my computer', 'context')] },
  ], checks: [
    { id: 'computer-order-v1', kind: 'choose', prompt: 'Monta el aviso para que no apaguen tu ordenador.', ordering: [piece('ON MY COMPUTER', 'context'), piece('PLAYING', 'verb'), piece('I', 'subject'), piece('AM', 'auxiliary')], answers: [message], hint: 'I + AM + PLAYING + ON MY COMPUTER. El último bloque indica qué aparato usas.', success: 'El aviso ya está montado.' },
    { id: 'computer-meaning-v1', kind: 'explain', prompt: 'Entrega el mensaje a quien está usando el ordenador para jugar.', choices: ['Está jugando en su ordenador.', 'Está jugando con una consola.'], answers: ['Está jugando en su ordenador.'], situation: { message, scenes: [{ choice: 'Está jugando en su ordenador.', state: 'computer-playing' }, { choice: 'Está jugando con una consola.', state: 'console-playing' }] }, hint: 'Las dos personas juegan. ON MY COMPUTER indica el ordenador, no la consola.', success: 'Has identificado qué aparato está usando.' },
    { id: 'computer-use-v1', kind: 'write', prompt: 'Avisa de que estás jugando en tu ordenador.', answers: [message, "I'm playing on my computer"], hint: 'I + AM + PLAYING + ON MY COMPUTER.', success: 'El personaje sabe que el ordenador está en uso.' },
  ] };
}

export function preparedComputerPlayingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): { lesson: GrammarLessonData; unit: AtomicUnit } | null {
  const lesson = computerPlayingLesson(unit, formId);
  if (!lesson || !['PLAY', 'COMPUTER'].every((en) => {
    const word = unit.words.find((item) => item.en === en)!;
    return memories.some((memory) => practicedWordMeaning(memory, word));
  })) return null;
  const en = 'I am playing on my computer.';
  return { lesson, unit: { ...unit, sentence: { en, es: 'Estoy jugando en mi ordenador.', pronunciationTip: 'Escucha ON MY COMPUTER dentro del mensaje completo.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'am'] }, { en: 'am', es: 'estoy', choices: ['am', 'I'] },
    { en: 'playing', es: 'jugando', choices: ['playing', 'I'] }, { en: 'on my computer.', es: 'en mi ordenador', choices: ['on my computer.', 'playing'] },
  ] }, practiceSentences: [], communication: {
    layer: 'converse', interlocutor: 'Nora', intent: 'Avisar de que estás usando el ordenador para que Nora no lo apague.', userTurn: en, reply: 'I will leave your computer on.', replyMode: 'receptive_chunk',
    dialogue: { context: 'Nora va a apagar el ordenador al salir. Estás jugando: avísale para que lo deje encendido.', partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual', turns: [
      { role: 'A', en: 'Are you using the computer?', es: '¿Estás usando el ordenador?', acceptedAnswers: ['Are you using the computer?'] },
      { role: 'B', en, es: 'Estoy jugando en mi ordenador.', acceptedAnswers: [en, "I'm playing on my computer."] },
    ], reply: { en: 'I will leave your computer on.', es: '¡Entendido! Dejo el ordenador encendido para que sigas jugando.' }, rhythmTip: 'Escucha el bloque ON MY COMPUTER junto al resto del mensaje.' },
  } } };
}
