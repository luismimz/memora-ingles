export interface DayJourneyChapter {
  id: string;
  number: number;
  moment: string;
  title: string;
  emoji: string;
  sceneEs: string;
  sceneEn: string;
  target: string;
  challengeEs: string;
  requiredWords: string[];
  minWords: number;
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
    target: 'I usually get up early because I want a quiet morning.', challengeEs: 'Cuenta a qué hora te levantas y añade una razón.', requiredWords: ['get up', 'early', 'because'], minWords: 8, pattern: 'I usually + verbo + because + razón',
    words: [['get up', 'levantarse'], ['early', 'temprano'], ['usually', 'normalmente']], reward: 20,
  },
  {
    id: 'bathroom', number: 2, moment: 'En el baño', title: 'Tu primera rutina', emoji: '🚿',
    sceneEs: 'Te duchas y te preparas. Es una rutina sencilla, pero ya estás hablando en inglés.',
    sceneEn: 'I have a quick shower and get ready for the day.',
    target: 'I have a quick shower and get ready for the day.', challengeEs: 'Describe dos cosas que haces en el baño antes de salir.', requiredWords: ['shower', 'get ready'], minWords: 8, pattern: 'I have + cosa + and + verbo',
    words: [['shower', 'ducha'], ['quick', 'rápida'], ['get ready', 'prepararse']], reward: 20,
  },
  {
    id: 'dress', number: 3, moment: 'Al vestirte', title: 'Elige qué ponerte', emoji: '👕',
    sceneEs: 'Miras el tiempo y eliges la ropa. Explicas una decisión muy normal del día.',
    sceneEn: 'I am wearing a warm jacket because it is cold outside.',
    target: 'I am wearing a warm jacket because it is cold outside.', challengeEs: 'Di qué llevas puesto y relaciónalo con el tiempo.', requiredWords: ['wearing', 'because', 'cold'], minWords: 9, pattern: 'I am wearing + ropa + because + causa',
    words: [['wear', 'llevar puesto'], ['jacket', 'chaqueta'], ['cold', 'frío']], reward: 20,
  },
  {
    id: 'breakfast', number: 4, moment: 'En el desayuno', title: 'Elige tu energía', emoji: '☕',
    sceneEs: 'Preparas café y algo de comer. Mientras desayunas decides qué necesitas hacer hoy.',
    sceneEn: 'I need to make coffee before I start work.',
    target: 'I need to make coffee before I start work.', challengeEs: 'Explica qué necesitas preparar y qué harás después.', requiredWords: ['need to', 'before'], minWords: 8, pattern: 'I need to + verbo + before + momento',
    words: [['need to', 'necesitar'], ['make', 'hacer / preparar'], ['before', 'antes de']], reward: 25,
  },
  {
    id: 'news', number: 5, moment: 'Con las noticias', title: 'Di lo que piensas', emoji: '📰',
    sceneEs: 'Lees las noticias. Algo te sorprende y usas una palabra muy frecuente para matizar tu opinión.',
    sceneEn: 'Actually, the news is not as bad as it sounds.',
    target: 'Actually, the news is not as bad as it sounds.', challengeEs: 'Da tu opinión sobre una noticia y matízala.', requiredWords: ['actually', 'news', 'sounds'], minWords: 9, pattern: 'Actually, + opinión + as...as...',
    words: [['actually', 'en realidad'], ['news', 'noticias'], ['sounds', 'suena']], reward: 25,
  },
  {
    id: 'weather', number: 6, moment: 'Antes de salir', title: 'Comprueba el tiempo', emoji: '🌦️',
    sceneEs: 'Miras por la ventana y decides si llevar paraguas o cambiar de plan.',
    sceneEn: 'It looks like rain, so I am going to take an umbrella.',
    target: 'It looks like rain, so I am going to take an umbrella.', challengeEs: 'Explica qué parece que va a pasar y qué harás por eso.', requiredWords: ['looks like', 'so', 'going to'], minWords: 10, pattern: 'It looks like + situación, so + plan',
    words: [['looks like', 'parece'], ['rain', 'lluvia'], ['umbrella', 'paraguas']], reward: 25,
  },
  {
    id: 'supermarket', number: 7, moment: 'En el supermercado', title: 'Haz la compra', emoji: '🛒',
    sceneEs: 'Sales a comprar algo que falta en casa. Pides ayuda y comparas dos productos.',
    sceneEn: 'Excuse me, where can I find the bread? I need something fresh.',
    target: 'Excuse me, where can I find the bread? I need something fresh.', challengeEs: 'Pide un producto y explica qué tipo necesitas.', requiredWords: ['where can I find', 'need', 'fresh'], minWords: 10, pattern: 'Where can I find + producto? I need + descripción',
    words: [['find', 'encontrar'], ['fresh', 'fresco'], ['something', 'algo']], reward: 25,
  },
  {
    id: 'leave-home', number: 8, moment: 'Al salir de casa', title: 'Pon el plan en marcha', emoji: '🚪',
    sceneEs: 'Coges las llaves, sales de casa y piensas en lo que vas a hacer durante el trayecto.',
    sceneEn: "I'm going to take the car because it's raining.",
    target: "I'm going to take the car because it's raining.", challengeEs: 'Di cómo vas a desplazarte y por qué has elegido esa opción.', requiredWords: ['going to', 'car', 'because'], minWords: 9, pattern: "I'm going to + transporte + because + razón",
    words: [['going to', 'ir a'], ['take', 'coger / llevar'], ['car', 'coche']], reward: 25,
  },
  {
    id: 'commute', number: 9, moment: 'Durante el trayecto', title: 'Llega a tiempo', emoji: '🚗',
    sceneEs: 'Hay tráfico y calculas cuánto tardarás. Avisas si vas a llegar tarde.',
    sceneEn: "There is a lot of traffic, so I might be late for work.",
    target: 'There is a lot of traffic, so I might be late for work.', challengeEs: 'Explica el problema del trayecto y su posible consecuencia.', requiredWords: ['traffic', 'might', 'late'], minWords: 10, pattern: 'There is + problema, so I might + consecuencia',
    words: [['traffic', 'tráfico'], ['might', 'podría'], ['late', 'tarde']], reward: 25,
  },
  {
    id: 'study', number: 10, moment: 'Al estudiar', title: 'Aprende algo difícil', emoji: '📚',
    sceneEs: 'Te sientas a estudiar o a programar. Divides el problema en partes para no bloquearte.',
    sceneEn: 'I am trying to understand this lesson, but it is more difficult than I expected.',
    target: 'I am trying to understand this lesson, but it is more difficult than I expected.', challengeEs: 'Cuenta qué estás intentando aprender y qué dificultad tienes.', requiredWords: ['trying to', 'understand', 'but'], minWords: 11, pattern: 'I am trying to + verbo, but + dificultad',
    words: [['try', 'intentar'], ['understand', 'entender'], ['difficult', 'difícil']], reward: 30,
  },
  {
    id: 'work', number: 11, moment: 'En el trabajo', title: 'Cuenta tu obligación', emoji: '💻',
    sceneEs: 'Llegas al trabajo y tienes una tarea pendiente. La dices en voz alta para empezar sin bloquearte.',
    sceneEn: 'I have to finish this task before lunch.',
    target: 'I have to finish this task before lunch.', challengeEs: 'Explica qué tienes que terminar y antes de cuándo.', requiredWords: ['have to', 'finish', 'before'], minWords: 9, pattern: 'I have to + verbo + before + límite',
    words: [['have to', 'tener que'], ['finish', 'terminar'], ['task', 'tarea']], reward: 30,
  },
  {
    id: 'meeting', number: 12, moment: 'En una reunión', title: 'Aporta una idea', emoji: '🧑‍💼',
    sceneEs: 'En una reunión propones una solución y explicas por qué puede funcionar.',
    sceneEn: 'I think we should try this idea because it could save us time.',
    target: 'I think we should try this idea because it could save us time.', challengeEs: 'Propón una idea y justifica qué problema resuelve.', requiredWords: ['think', 'should', 'because'], minWords: 11, pattern: 'I think we should + verbo + because + beneficio',
    words: [['think', 'pensar'], ['should', 'debería'], ['save time', 'ahorrar tiempo']], reward: 30,
  },
  {
    id: 'interview', number: 13, moment: 'En una entrevista', title: 'Habla de tu experiencia', emoji: '🎤',
    sceneEs: 'Te preguntan por qué encajas en un puesto. Respondes con experiencia y una fortaleza.',
    sceneEn: 'I have worked on similar projects and I am good at solving problems.',
    target: 'I have worked on similar projects and I am good at solving problems.', challengeEs: 'Cuenta una experiencia y una cosa que sabes hacer bien.', requiredWords: ['worked', 'good at', 'problems'], minWords: 11, pattern: 'I have + participio + and I am good at + -ing',
    words: [['experience', 'experiencia'], ['similar', 'parecido'], ['solve', 'resolver']], reward: 35,
  },
  {
    id: 'lunch', number: 14, moment: 'A la hora de comer', title: 'Pide y conversa', emoji: '🥗',
    sceneEs: 'Comes fuera y necesitas pedir un plato, preguntar por un ingrediente y ser educado.',
    sceneEn: "I'd like the chicken, please. Does it contain nuts?",
    target: "I'd like the chicken, please. Does it contain nuts?", challengeEs: 'Pide un plato y pregunta por un ingrediente importante.', requiredWords: ["I'd like", 'please', 'contain'], minWords: 9, pattern: "I'd like + plato. Does it contain + ingrediente?",
    words: [['I’d like', 'me gustaría'], ['contain', 'contener'], ['nuts', 'frutos secos']], reward: 30,
  },
  {
    id: 'restaurant', number: 15, moment: 'En el restaurante', title: 'Resuelve un pedido', emoji: '🍽️',
    sceneEs: 'Tu pedido llega equivocado. Lo explicas sin enfadarte y pides una solución.',
    sceneEn: 'I am sorry, but I ordered the soup, not the salad. Could you change it?',
    target: 'I am sorry, but I ordered the soup, not the salad. Could you change it?', challengeEs: 'Explica el error y pide educadamente que lo solucionen.', requiredWords: ['ordered', 'not', 'could you'], minWords: 12, pattern: 'I am sorry, but + pasado. Could you + verbo?',
    words: [['order', 'pedir'], ['instead', 'en vez de'], ['change', 'cambiar']], reward: 30,
  },
  {
    id: 'pharmacy', number: 16, moment: 'En la farmacia', title: 'Explica cómo te encuentras', emoji: '💊',
    sceneEs: 'No te encuentras bien. Explicas desde cuándo tienes síntomas y preguntas qué puedes tomar.',
    sceneEn: 'I have had a headache since yesterday. What can I take for it?',
    target: 'I have had a headache since yesterday. What can I take for it?', challengeEs: 'Explica un síntoma, desde cuándo y pide una recomendación.', requiredWords: ['headache', 'since', 'what can I take'], minWords: 11, pattern: 'I have had + síntoma + since + momento',
    words: [['headache', 'dolor de cabeza'], ['since', 'desde'], ['take', 'tomar']], reward: 35,
  },
  {
    id: 'doctor', number: 17, moment: 'En el médico', title: 'Describe un problema', emoji: '🩺',
    sceneEs: 'El médico te pregunta qué ocurre. Respondes con claridad y dices qué empeora el problema.',
    sceneEn: 'It hurts when I move, and it has been getting worse this week.',
    target: 'It hurts when I move, and it has been getting worse this week.', challengeEs: 'Describe qué te duele, cuándo ocurre y si ha cambiado.', requiredWords: ['hurts', 'when', 'worse'], minWords: 10, pattern: 'It hurts when + acción, and it has been + -ing',
    words: [['hurt', 'doler'], ['move', 'moverse'], ['worse', 'peor']], reward: 35,
  },
  {
    id: 'bank', number: 18, moment: 'En el banco', title: 'Haz una gestión', emoji: '🏦',
    sceneEs: 'Necesitas resolver una gestión y preguntas qué documentos hacen falta.',
    sceneEn: 'I would like to open an account. What documents do I need?',
    target: 'I would like to open an account. What documents do I need?', challengeEs: 'Explica qué gestión quieres hacer y pregunta qué necesitas.', requiredWords: ['would like', 'account', 'what documents'], minWords: 10, pattern: 'I would like to + verbo. What + cosa + do I need?',
    words: [['would like', 'me gustaría'], ['account', 'cuenta'], ['documents', 'documentos']], reward: 35,
  },
  {
    id: 'post-office', number: 19, moment: 'En correos', title: 'Envía algo', emoji: '📦',
    sceneEs: 'Tienes que enviar un paquete. Preguntas cuánto cuesta y cuándo llegará.',
    sceneEn: 'How much does it cost to send this package, and when will it arrive?',
    target: 'How much does it cost to send this package, and when will it arrive?', challengeEs: 'Pregunta por el precio y el tiempo de entrega de un envío.', requiredWords: ['how much', 'send', 'when will'], minWords: 11, pattern: 'How much does it cost to + verbo? When will + sujeto + verbo?',
    words: [['send', 'enviar'], ['package', 'paquete'], ['arrive', 'llegar']], reward: 30,
  },
  {
    id: 'shopping', number: 20, moment: 'De compras', title: 'Compara opciones', emoji: '🛍️',
    sceneEs: 'Comparas dos productos, preguntas por una talla y decides cuál te conviene.',
    sceneEn: 'This one is cheaper, but the other one looks better quality. Do you have it in medium?',
    target: 'This one is cheaper, but the other one looks better quality. Do you have it in medium?', challengeEs: 'Compara dos opciones y pregunta por una talla o característica.', requiredWords: ['cheaper', 'but', 'do you have'], minWords: 12, pattern: 'This one is + comparativo, but + alternativa. Do you have...?',
    words: [['cheaper', 'más barato'], ['quality', 'calidad'], ['medium', 'mediana']], reward: 30,
  },
  {
    id: 'travel', number: 21, moment: 'Preparando un viaje', title: 'Organiza una escapada', emoji: '🧳',
    sceneEs: 'Planeas un viaje. Dices dónde vas, cuándo sales y qué quieres hacer allí.',
    sceneEn: "I'm going to visit London next month because I want to practise my English.",
    target: "I'm going to visit London next month because I want to practise my English.", challengeEs: 'Cuenta adónde vas, cuándo y para qué.', requiredWords: ['going to', 'next month', 'because'], minWords: 11, pattern: "I'm going to + lugar + momento + because + propósito",
    words: [['visit', 'visitar'], ['next month', 'el mes que viene'], ['practise', 'practicar']], reward: 35,
  },
  {
    id: 'airport', number: 22, moment: 'En el aeropuerto', title: 'Encuentra la puerta', emoji: '✈️',
    sceneEs: 'Tienes poco tiempo y preguntas dónde está la puerta de embarque y cuánto tardas.',
    sceneEn: 'Excuse me, could you tell me where gate twenty is? I am in a hurry.',
    target: 'Excuse me, could you tell me where gate twenty is? I am in a hurry.', challengeEs: 'Pregunta por un lugar y explica que tienes prisa.', requiredWords: ['could you tell me', 'where', 'in a hurry'], minWords: 12, pattern: 'Could you tell me where + lugar + is? I am + estado',
    words: [['gate', 'puerta de embarque'], ['hurry', 'prisa'], ['tell me', 'decirme']], reward: 35,
  },
  {
    id: 'directions', number: 23, moment: 'Buscando una dirección', title: 'No te pierdas', emoji: '🗺️',
    sceneEs: 'Te has perdido y pides indicaciones. Repites la ruta para comprobar que la has entendido.',
    sceneEn: 'Could you tell me how to get to the station? Do I turn left here?',
    target: 'Could you tell me how to get to the station? Do I turn left here?', challengeEs: 'Pregunta cómo llegar y confirma una indicación.', requiredWords: ['how to get to', 'turn left', 'here'], minWords: 12, pattern: 'How do I get to + lugar? Do I + dirección + here?',
    words: [['get to', 'llegar a'], ['turn left', 'girar a la izquierda'], ['station', 'estación']], reward: 35,
  },
  {
    id: 'friend', number: 24, moment: 'Con un amigo', title: 'Mantén la conversación', emoji: '👋',
    sceneEs: 'Te encuentras con un amigo. No necesitas una frase perfecta: empiezas, preguntas y ganas tiempo.',
    sceneEn: "Well, actually, I'm doing fine. How about you?",
    target: "Well, actually, I'm doing fine. How about you?", challengeEs: 'Responde cómo estás, añade un detalle y devuelve la pregunta.', requiredWords: ['actually', 'fine', 'how about you'], minWords: 9, pattern: 'Well / Actually, + respuesta + How about you?',
    words: [['well', 'bueno'], ['doing fine', 'estar bien'], ['how about you?', '¿y tú?']], reward: 30,
  },
  {
    id: 'phone', number: 25, moment: 'Al teléfono', title: 'Pide que te ayuden', emoji: '📞',
    sceneEs: 'Te llaman mientras hay ruido. Pides que repitan la frase de forma educada y sigues la conversación.',
    sceneEn: 'Could you repeat that, please? I did not hear you.',
    target: 'Could you repeat that, please? I did not hear you.', challengeEs: 'Pide que repitan algo y explica por qué no lo has oído.', requiredWords: ['could you repeat', 'please', 'hear'], minWords: 9, pattern: 'Could you + verbo...? I did not + verbo...',
    words: [['could you', 'podrías'], ['repeat', 'repetir'], ['hear', 'oír']], reward: 35,
  },
  {
    id: 'appointment', number: 26, moment: 'Organizando una cita', title: 'Cambia un plan', emoji: '📅',
    sceneEs: 'No puedes acudir a una cita. Llamas, explicas el motivo y propones otra hora.',
    sceneEn: "I'm afraid I can't make it today. Could we move the appointment to tomorrow?",
    target: "I'm afraid I can't make it today. Could we move the appointment to tomorrow?", challengeEs: 'Cancela o cambia una cita con educación y propón otro momento.', requiredWords: ["can't make it", 'could we', 'tomorrow'], minWords: 11, pattern: "I'm afraid + problema. Could we + propuesta?",
    words: [['make it', 'poder acudir'], ['move', 'cambiar'], ['appointment', 'cita']], reward: 35,
  },
  {
    id: 'emergency', number: 27, moment: 'Cuando surge algo', title: 'Reacciona sin quedarte en blanco', emoji: '🚨',
    sceneEs: 'Algo se tuerce y tienes que explicar el problema deprisa. La estructura te da una salida inmediata.',
    sceneEn: 'There is a problem. I need help right now.',
    target: 'There is a problem and I need help right now.', challengeEs: 'Explica qué ocurre y qué ayuda necesitas inmediatamente.', requiredWords: ['there is', 'problem', 'need help'], minWords: 9, pattern: 'There is + problema + and I need + ayuda',
    words: [['there is', 'hay'], ['problem', 'problema'], ['right now', 'ahora mismo']], reward: 35,
  },
  {
    id: 'car-problem', number: 28, moment: 'Con un problema en el coche', title: 'Explica una avería', emoji: '🔧',
    sceneEs: 'El coche no arranca. Describes el problema y dices qué vas a hacer.',
    sceneEn: "My car won't start, so I'm going to call a mechanic.",
    target: "My car won't start, so I'm going to call a mechanic.", challengeEs: 'Describe una avería y explica tu siguiente paso.', requiredWords: ["won't start", 'so', 'going to'], minWords: 10, pattern: "My + cosa + won't + verbo, so I'm going to + acción",
    words: [['start', 'arrancar'], ['mechanic', 'mecánico'], ['call', 'llamar']], reward: 35,
  },
  {
    id: 'home-chores', number: 29, moment: 'En casa', title: 'Pon orden', emoji: '🧹',
    sceneEs: 'Vuelves a casa y repartes las tareas. Dices qué has hecho y qué queda pendiente.',
    sceneEn: "I've already done the washing-up, but I still have to clean the kitchen.",
    target: "I've already done the washing-up, but I still have to clean the kitchen.", challengeEs: 'Cuenta una tarea terminada y otra que todavía tienes que hacer.', requiredWords: ['already', 'still have to', 'clean'], minWords: 11, pattern: "I've already + participio, but I still have to + verbo",
    words: [['already', 'ya'], ['still', 'todavía'], ['clean', 'limpiar']], reward: 35,
  },
  {
    id: 'programming', number: 30, moment: 'Aprendiendo informática', title: 'Explica un proyecto', emoji: '🧑‍💻',
    sceneEs: 'Estudias programación y explicas qué estás construyendo y qué problema intentas resolver.',
    sceneEn: 'I am building a small app that helps people learn by practising every day.',
    target: 'I am building a small app that helps people learn by practising every day.', challengeEs: 'Explica qué estás creando, para quién y cómo funciona.', requiredWords: ['building', 'helps', 'by'], minWords: 12, pattern: 'I am + -ing + cosa + that helps + persona + by + -ing',
    words: [['build', 'construir'], ['help', 'ayudar'], ['by practising', 'practicando']], reward: 40,
  },
  {
    id: 'evening', number: 31, moment: 'Al terminar', title: 'Cierra el día contando', emoji: '🌙',
    sceneEs: 'Vuelves a casa. Miras atrás y cuentas qué ocurrió, qué aprendiste y qué harás mañana.',
    sceneEn: 'I really improved today, and tomorrow I will keep going.',
    target: 'I really improved today, and tomorrow I will keep going.', challengeEs: 'Resume tu día, di qué mejoró y qué harás mañana.', requiredWords: ['really', 'today', 'tomorrow'], minWords: 10, pattern: 'I really + verbo + today, and tomorrow I will + verbo',
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
