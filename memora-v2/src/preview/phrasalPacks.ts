import { phrasalFamilies, type PhrasalFamily } from '../domain/phrasalFamilies';
import { validateAssociationQuality, validateUnit, type AtomicUnit, type AtomicWord } from '../domain/unit';

// Each particle has one authored meaning in one situation, not a universal rule.
const particleIPA: Record<string, string> = { ON: 'ɑn', OFF: 'ɔf', UP: 'ʌp', DOWN: 'daʊn', BACK: 'bæk', INTO: 'ˈɪntu', OUT: 'aʊt', OVER: 'ˈoʊvɚ', IN: 'ɪn', AWAY: 'əˈweɪ' };
const cues: Record<string, { meaning: string; sound: string }> = {
  TURN: { meaning: 'momento que corresponde a alguien para hacer algo', sound: 'TURNO recuerda t y rn. TURN usa /ɜː/ y no lleva o final.' },
  GET: { meaning: 'barrio segregado o espacio de aislamiento', sound: 'GUETO comienza con guet, pronunciado get. GET termina en t, sin o.' },
  GO: { meaning: 'pequeña cantidad de líquido con forma redondeada', sound: 'GOTA recuerda go. GO tiene diptongo /oʊ/ y no lleva ta.' },
  TAKE: { meaning: 'pieza que se pulsa en un teclado', sound: 'TECLA recuerda t y k. TAKE usa /eɪ/ y termina en k; no lleva la.' },
};
const scenes: Record<string, string> = {
  'TURN ON': 'En tu TURNO, giras y ENCIENDES una farola que estornuda.',
  'TURN OFF': 'En tu TURNO, giras y APAGAS un semáforo que ronca.',
  'TURN UP': 'En tu TURNO, SUBES EL VOLUMEN hasta levantar el techo.',
  'TURN DOWN': 'En tu TURNO, BAJAS EL VOLUMEN y el techo duerme.',
  'TURN BACK': 'En tu TURNO, el semáforo gira para hacerte VOLVER.',
  'TURN INTO': 'En tu TURNO, un portal te CONVIERTE EN mariposa gigante.',
  'TURN OUT': 'Tras tu TURNO, sale una tarta: todo RESULTA BIEN.',
  'TURN OVER': 'En tu TURNO, una carta gigante DA LA VUELTA sola.',
  'GET UP': 'El GUETO levanta tu cama y te obliga a LEVANTARTE.',
  'GET IN': 'El GUETO se encoge para ENTRAR en un coche diminuto.',
  'GET OUT': 'El GUETO estornuda y te obliga a SALIR del coche.',
  'GET BACK': 'El GUETO camina hacia atrás para VOLVER contigo a casa.',
  'GO OUT': 'Una GOTA atraviesa la puerta y te arrastra para SALIR.',
  'GO BACK': 'La GOTA rebota hacia atrás y te hace VOLVER.',
  'GO ON': 'La GOTA cae sobre una cinta infinita para CONTINUAR.',
  'GO AWAY': 'La GOTA se vuelve río y te hace ALEJARTE.',
  'TAKE OFF': 'Una TECLA muerde tu abrigo y te obliga a QUITÁRTELO.',
  'TAKE AWAY': 'Una TECLA carga una taza y se la LLEVA corriendo.',
  'TAKE BACK': 'Una TECLA corre hacia atrás para DEVOLVER un libro gigante.',
  'TAKE OUT': 'Una TECLA atraviesa la bolsa para SACAR libros disparados.',
};

export function makePhrasalPacks(family: PhrasalFamily): AtomicUnit[] {
  const cue = cues[family.base];
  if (!cue) throw new Error('Revisar el puente de esta familia antes de crear sus prácticas.');
  const words: AtomicWord[] = family.discoveries.map((discovery, index) => {
    const en = `${family.base} ${discovery.particle}`;
    if (!particleIPA[discovery.particle] || !scenes[en]) throw new Error(`Falta un contexto revisable para ${en}.`);
    return {
      id: index + 1, en, es: discovery.meaning,
      ipa: `/${family.word.ipa.replaceAll('/', '')} ${particleIPA[discovery.particle]}/`,
      bridge: family.word.bridge, scene: scenes[en], emojis: family.word.emojis,
      associationMode: 'acoustic_bridge', status: 'needs_review', associationId: `phrasal-${family.base.toLowerCase()}-${discovery.particle.toLowerCase()}`, associationVersion: 1,
      bridgeEvidence: { spanishCue: family.word.bridge, familiarMeaning: cue.meaning, soundRelation: `${cue.sound} El puente recuerda el verbo base; ${discovery.particle} se enseña mediante la fusión visual con sentido de ${discovery.particleMeaning} en este ejemplo, no como traducción universal.`, cueType: 'spanish_word' },
      highlightTerms: [family.word.bridge],
      usageExample: { en: discovery.sentence, es: discovery.translation },
    };
  });
  return Array.from({ length: Math.ceil(words.length / 3) }, (_, index) => {
    const slice = words.slice(index * 3, index * 3 + 3).map((word, offset) => ({ ...word, id: offset + 1 }));
    for (const word of slice) if (validateAssociationQuality(word).automatedGate !== 'pass') throw new Error(`Corregir la historia de ${word.en}.`);
    const context = slice[0].usageExample!;
    return validateUnit({ id: `editorial-phrasals-${family.base.toLowerCase()}-${index + 1}`, title: `Phrasal verbs · ${family.base} · ${index + 1}`, kind: 'vocabulary-pack', activeRecall: true, contentVersion: '1', words: slice, grammar: [], sentence: { ...context, slots: [], pronunciationTip: 'Escucha la expresión completa. El ejemplo se presenta como contexto, no como una frase que debas construir sin preparación.' } });
  });
}

export const phrasalPreviewPacks = phrasalFamilies.flatMap(makePhrasalPacks);
