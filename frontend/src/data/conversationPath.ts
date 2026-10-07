export type LanguageUnitKind = 'cognado' | 'conector' | 'verbo' | 'patrón';

export interface LanguageUnit {
  en: string;
  es: string;
  kind: LanguageUnitKind;
  note?: string;
}

export interface ConversationLesson {
  id: string;
  title: string;
  goal: string;
  pattern: string;
  explain: string;
  units: LanguageUnit[];
  examples: [string, string][];
  challenge: [string, string];
  say: string;
}

/**
 * Un itinerario inicial para hablar, no una lista de traducciones. Cada lección
 * presenta pocas unidades de alta frecuencia dentro de un patrón reutilizable.
 */
export const CONVERSATION_PATH: ConversationLesson[] = [
  {
    id: 'really-want',
    title: 'Decir lo que de verdad quieres',
    goal: 'Usa REALLY para dar fuerza a lo que dices.',
    pattern: 'I really want to + verbo',
    explain: 'REALLY significa «realmente / de verdad». Va antes del verbo que quieres reforzar. Después de WANT usamos TO + verbo.',
    units: [
      { en: 'really', es: 'realmente / de verdad', kind: 'conector' },
      { en: 'want', es: 'querer', kind: 'verbo' },
      { en: 'improve', es: 'mejorar', kind: 'cognado', note: 'Se parece a «mejorar», pero se pronuncia /ɪmˈpruːv/.' },
      { en: 'speak', es: 'hablar', kind: 'verbo' },
    ],
    examples: [
      ['I really want to improve my English.', 'De verdad quiero mejorar mi inglés.'],
      ['I really want to speak with confidence.', 'De verdad quiero hablar con confianza.'],
    ],
    challenge: ['De verdad quiero hablar inglés.', 'I really want to speak English.'],
    say: 'I really want to improve my English.',
  },
  {
    id: 'actually',
    title: 'Aclarar lo que quieres decir',
    goal: 'Usa ACTUALLY para corregir o matizar una idea.',
    pattern: 'Actually, + frase',
    explain: 'ACTUALLY normalmente significa «en realidad», «de hecho» o «la verdad es que». No es «actualmente»: para eso usamos CURRENTLY o AT THE MOMENT.',
    units: [
      { en: 'actually', es: 'en realidad / de hecho', kind: 'conector', note: 'Falso amigo: no suele significar «actualmente».' },
      { en: 'currently', es: 'actualmente', kind: 'cognado' },
      { en: 'know', es: 'saber', kind: 'verbo' },
      { en: 'sure', es: 'seguro', kind: 'cognado' },
    ],
    examples: [
      ["Actually, I don't know.", 'En realidad, no lo sé.'],
      ["Actually, I'm not sure.", 'La verdad es que no estoy seguro.'],
    ],
    challenge: ['En realidad, no estoy seguro.', "Actually, I'm not sure."],
    say: "Actually, I'm not sure.",
  },
  {
    id: 'think-maybe',
    title: 'Opinar sin sonar tajante',
    goal: 'Da una opinión natural y deja espacio a la duda.',
    pattern: 'I think + ... / Maybe + ...',
    explain: 'I THINK = «creo que». MAYBE = «quizá». Son dos herramientas muy frecuentes para empezar una respuesta sin quedarte en blanco.',
    units: [
      { en: 'think', es: 'pensar / creer', kind: 'verbo' },
      { en: 'maybe', es: 'quizá', kind: 'conector' },
      { en: 'possible', es: 'posible', kind: 'cognado' },
      { en: 'different', es: 'diferente', kind: 'cognado' },
    ],
    examples: [
      ["I think it's a good idea.", 'Creo que es una buena idea.'],
      ['Maybe we can try again.', 'Quizá podemos intentarlo otra vez.'],
    ],
    challenge: ['Creo que es una buena idea.', "I think it's a good idea."],
    say: "I think it's a good idea.",
  },
  {
    id: 'questions',
    title: 'Hacer preguntas que abren conversación',
    goal: 'Pregunta por la vida de la otra persona, no solo respondas.',
    pattern: 'What / Where + do you + verbo?',
    explain: 'Para preguntar por rutinas usamos DO + persona + verbo base. Aprende la pregunta entera como un bloque que puedes reutilizar.',
    units: [
      { en: 'what', es: 'qué', kind: 'conector' },
      { en: 'where', es: 'dónde', kind: 'conector' },
      { en: 'work', es: 'trabajar', kind: 'cognado' },
      { en: 'usually', es: 'normalmente', kind: 'conector' },
    ],
    examples: [
      ['What do you do?', '¿A qué te dedicas?'],
      ['Where do you work?', '¿Dónde trabajas?'],
    ],
    challenge: ['¿Dónde trabajas?', 'Where do you work?'],
    say: 'Where do you work?',
  },
  {
    id: 'depends',
    title: 'Ganar tiempo y responder con naturalidad',
    goal: 'Evita el blanco con una respuesta útil y flexible.',
    pattern: 'It depends on + nombre / pregunta',
    explain: 'IT DEPENDS ON... significa «depende de...». Es una respuesta muy natural cuando no existe un sí o un no absoluto.',
    units: [
      { en: 'it depends', es: 'depende', kind: 'patrón' },
      { en: 'on', es: 'de', kind: 'conector' },
      { en: 'situation', es: 'situación', kind: 'cognado' },
      { en: 'probably', es: 'probablemente', kind: 'conector' },
    ],
    examples: [
      ['It depends on the situation.', 'Depende de la situación.'],
      ['It probably depends on the price.', 'Probablemente depende del precio.'],
    ],
    challenge: ['Depende de la situación.', 'It depends on the situation.'],
    say: 'It depends on the situation.',
  },
  {
    id: 'polite-help',
    title: 'Pedir ayuda y mantener la conversación',
    goal: 'Pide algo con educación y sin traducir palabra por palabra.',
    pattern: 'Could you + verbo, please?',
    explain: 'COULD YOU...? es una forma amable y muy útil de pedir algo. Después de COULD el verbo va sin TO.',
    units: [
      { en: 'could you', es: '¿podrías...?', kind: 'patrón' },
      { en: 'help', es: 'ayudar', kind: 'verbo' },
      { en: 'repeat', es: 'repetir', kind: 'cognado' },
      { en: 'please', es: 'por favor', kind: 'conector' },
    ],
    examples: [
      ['Could you help me, please?', '¿Podrías ayudarme, por favor?'],
      ['Could you repeat that, please?', '¿Podrías repetir eso, por favor?'],
    ],
    challenge: ['¿Podrías repetir eso, por favor?', 'Could you repeat that, please?'],
    say: 'Could you repeat that, please?',
  },
];
