import { describe, expect, it } from 'vitest';
import legacyPlay from '../../content/stage0-play-dog-beach.json';
import legacyWash from '../../content/phase1-wash-soap-dog.json';
import { getPlayableGrammar, getSpanishSubjectLabel, getUnitSentences, makeRecallChoices, nextReviewAt, validateApprovedAssociation, validateAssociationQuality, validateUnit } from './unit';
const previewUnit = validateUnit(legacyPlay);
const reviewUnits = [previewUnit, validateUnit(legacyWash)];

describe('contrato de unidad atómica', () => {
  it('acepta personas V2 sin recortar sus letras', () => {
    expect(getSpanishSubjectLabel('Yo estoy', 'jugando')).toBe('Yo estoy');
    expect(getSpanishSubjectLabel('Vosotros estáis', 'jugando')).toBe('Vosotros estáis');
    expect(getSpanishSubjectLabel('Yo estoy jugando', 'jugando')).toBe('Yo estoy');
  });

  it('rechaza una ayuda de frase introducida como IPA de palabra', () => {
    const broken = { ...previewUnit, words: [{ ...previewUnit.words[0], ipa: '//aim PLÉI-ing//' }, ...previewUnit.words.slice(1)] };
    expect(() => validateUnit(broken)).toThrow(/IPA/);
  });

  it('acepta la unidad curada completa', () => {
    expect(validateUnit(previewUnit).words).toHaveLength(3);
    expect(validateUnit(previewUnit).grammar.map((form) => form.id)).toEqual(['to', 'ing']);
    expect(getPlayableGrammar(previewUnit).map((form) => form.id)).toEqual(['ing']);
    expect(getUnitSentences(previewUnit)).toHaveLength(2);
    expect(previewUnit.grammar.find((form) => form.id === 'to')?.subjects[0].phrase).toBe('to play');
    expect(reviewUnits[1].practiceSentences).toHaveLength(2);
    expect(reviewUnits.flatMap(getUnitSentences).some((sentence) => /\bwant\b/i.test(sentence.en))).toBe(false);
    expect(previewUnit.communication?.layer).toBe('converse');
    expect(previewUnit.words.some((word) => word.confusers?.length)).toBe(true);
  });

  it('valida ambas escenas de la primera fase y reutiliza DOG sin cambiar su ancla', () => {
    expect(reviewUnits).toHaveLength(2);
    expect(reviewUnits.flatMap((unit) => unit.words).filter((word) => word.en === 'DOG').map((word) => word.scene))
      .toEqual([previewUnit.words[1].scene, previewUnit.words[1].scene]);
    expect(reviewUnits.every((unit) => unit.grammar.map((form) => form.id).join(',') === 'to,ing')).toBe(true);
  });

  it('mantiene las mismas ocho personas en PLAY y WASH', () => {
    const people = ['Yo', 'Tú', 'Él', 'Ella', 'Nosotros', 'Vosotros', 'Ellos', 'Ellas'];
    for (const unit of reviewUnits) {
      const form = unit.grammar.find((item) => item.id === 'ing');
      expect(form?.subjects.map((subject) => subject.es.split(' ')[0])).toEqual(people);
      expect(form?.subjects.map((subject) => subject.en)).toEqual(["I'm", "You're", "He's", "She's", "We're", "You're", "They're", "They're"]);
      expect(form?.subjects.every((subject) => subject.phrase.endsWith(` ${form.english}`))).toBe(true);
    }
  });

  it('rechaza frases que no corresponden a sus segmentos', () => {
    const broken = { ...previewUnit, sentence: { ...previewUnit.sentence, en: 'You play football.' } };
    expect(() => validateUnit(broken)).toThrow(/frase|segmentos/i);
  });

  it('rechaza también una frase adicional inconsistente', () => {
    const broken = { ...previewUnit, practiceSentences: [{ ...previewUnit.practiceSentences![0], en: 'I play.' }] };
    expect(() => validateUnit(broken)).toThrow(/frase|segmentos/i);
  });

  it('acepta una primera frase de dos chunks sin inventar una tercera pieza', () => {
    const sentence = {
      en: "I'm playing on my computer.",
      es: 'Estoy jugando en mi ordenador.',
      slots: [
        { en: "I'm playing", es: 'Estoy jugando', choices: ["I'm playing", 'I play'] as [string, string] },
        { en: 'on my computer.', es: 'en mi ordenador.', choices: ['on my computer.', 'at my desk.'] as [string, string] },
      ],
      pronunciationTip: 'Une I am hasta oír una sola pieza: aim.',
    };
    expect(validateUnit({ ...previewUnit, sentence }).sentence.slots).toHaveLength(2);
  });

  it('acepta una frase inicial breve cuando sus chunks están perfectamente alineados', () => {
    const sentence = {
      en: "I'm making my bed.",
      es: 'Estoy haciendo mi cama.',
      slots: [
        { en: "I'm making", es: 'Estoy haciendo', choices: ["I'm making", 'I make'] as [string, string] },
        { en: 'my bed.', es: 'mi cama.', choices: ['my bed.', 'my desk.'] as [string, string] },
      ],
      pronunciationTip: 'La e de make desaparece antes de ing.',
    };
    expect(validateUnit({ ...previewUnit, sentence }).sentence.en).toBe("I'm making my bed.");
  });

  it('exige dos opciones distintas por segmento sin adelantar la respuesta', () => {
    const sentence = previewUnit.sentence;
    expect(sentence.slots.map((slot) => slot.es)).toEqual(['Estoy', 'jugando', 'con mi perro', 'en la playa.']);
    expect(sentence.slots.map((slot) => slot.en)).toEqual(["I'm", 'playing', 'with my dog', 'on the beach.']);
    expect(sentence.slots[1].choices).toEqual(['playing', 'play']);
    const broken = { ...previewUnit, sentence: { ...sentence, slots: sentence.slots.map((slot, index) => index === 1 ? { ...slot, choices: ['playing', 'playing'] } : slot) } };
    expect(() => validateUnit(broken)).toThrow(/opciones/i);
  });

  it('admite una imagen directa para DOG y rechaza palabras sin ancla visual', () => {
    expect(previewUnit.words[1].bridge).toBe('');
    expect(previewUnit.words[1].emojis).toEqual(['🐕', '🦴']);
    const broken = { ...previewUnit, words: [{ ...previewUnit.words[0], emojis: [] }, ...previewUnit.words.slice(1)] };
    expect(() => validateUnit(broken)).toThrow(/uno o dos iconos/i);
  });

  it('rechaza un confusor igual al objetivo', () => {
    const broken = { ...previewUnit, words: [{ ...previewUnit.words[0], confusers: ['PLAY'] }, ...previewUnit.words.slice(1)] };
    expect(() => validateUnit(broken)).toThrow(/confusores/i);
  });

  it('solo permite instalar asociaciones aprobadas con audio y evidencia editorial', () => {
    const approved = {
      ...previewUnit.words[0],
      scene: 'En la PLAYA, PLAYA juega con luz.',
      associationMode: 'acoustic_bridge' as const,
      associationId: 'play-scene',
      associationVersion: 2,
      status: 'approved' as const,
      audioUrl: '/audio/play.mp3',
      audioProvenance: {
        source: 'Kokoro',
        pronunciationGuide: 'en-US; stress on PLAY',
        license: 'Internal generated audio',
        modelVersion: 'kokoro-v1',
      },
      bridgeEvidence: {
        spanishCue: previewUnit.words[0].bridge,
        familiarMeaning: 'jugar',
        soundRelation: 'La primera sílaba recuerda al puente.',
        cueType: 'spanish_word' as const,
      },
      editorialReview: { verdict: 'approved' as const, reviewedBy: 'editor-1', reason: 'Puente claro y escena causal.' },
    };
    expect(validateApprovedAssociation(approved)).toEqual(approved);
    expect(() => validateApprovedAssociation({ ...approved, status: 'needs_review' })).toThrow(/aprobada/);
    expect(() => validateApprovedAssociation({ ...approved, audioUrl: undefined })).toThrow(/audio/);
    expect(() => validateApprovedAssociation({ ...approved, audioProvenance: undefined })).toThrow(/procedencia/);
    expect(() => validateApprovedAssociation({ ...approved, bridgeEvidence: undefined })).toThrow(/evidencia/);
  });

  it('bloquea la instalación de rutas sin puente en el protocolo vigente', () => {
    const direct = {
      ...previewUnit.words[1],
      associationMode: 'direct_image' as const,
      associationId: 'dog-scene',
      associationVersion: 2,
      status: 'approved' as const,
      audioUrl: '/audio/dog.mp3',
      audioProvenance: {
        source: 'Kokoro',
        pronunciationGuide: 'en-US; short vowel',
        license: 'Internal generated audio',
      },
      anchor: 'El perro rompe el hueso gigante.',
      meaningTerms: ['PERRO', 'hueso'],
      editorialReview: { verdict: 'approved' as const, reviewedBy: 'editor-1', reason: 'Imagen inequívoca.' },
    };
    expect(() => validateApprovedAssociation(direct)).toThrow(/puente español real/);
    expect(() => validateApprovedAssociation({ ...direct, meaningTerms: ['montaña'] })).toThrow(/puente español real/);
  });

  it('acepta las cinco rutas declaradas por el protocolo', () => {
    for (const associationMode of ['acoustic_bridge', 'direct_image', 'cognate', 'context_scene', 'action_scene'] as const) {
      expect(() => validateUnit({
        ...previewUnit,
        words: previewUnit.words.map((word, index) => index === 0 ? { ...word, associationMode } : word) as typeof previewUnit.words,
      })).not.toThrow();
    }
  });

  it('devuelve controles baratos sin afirmar calidad mnemotécnica', () => {
    const report = validateAssociationQuality({
      ...previewUnit.words[0],
      scene: 'PLAYA juega.',
      bridge: 'jugar',
      associationMode: 'acoustic_bridge',
    });
    expect(report.automatedGate).toBe('blocked');
    expect(report.checks.find((check) => check.rule === 'scene_length')?.status).toBe('blocked');
    expect(report.checks.find((check) => check.rule === 'bridge_not_translation')?.status).toBe('blocked');
  });

  it('mantiene los avisos visibles sin convertirlos en bloqueos', () => {
    const report = validateAssociationQuality({
      ...previewUnit.words[0],
      scene: 'En la playa una acción ocurre junto al mar.',
      bridge: 'playa',
      associationMode: 'acoustic_bridge',
    });
    expect(report.checks.find((check) => check.rule === 'bridge_capitalized')?.status).toBe('warn');
    expect(report.automatedGate).toBe('pass');
    const withoutCapitalizationCheck = report.checks.filter((check) => check.rule !== 'bridge_capitalized');
    expect(withoutCapitalizationCheck.some((check) => check.status === 'blocked')).toBe(false);
  });

  it('valida el intercambio conversacional completo', () => {
    expect(validateUnit(previewUnit).communication?.reply).toBe('I want to play on the beach.');
    const broken = { ...previewUnit, communication: { ...previewUnit.communication!, reply: '' } };
    expect(() => validateUnit(broken)).toThrow(/intercambio/i);
  });
});

describe('recuperación', () => {
  it('varía la posición sin repetir ni perder opciones', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const choices = makeRecallChoices(previewUnit, 0, seed);
      expect(new Set(choices.map((item) => item.en)).size).toBe(3);
      positions.add(choices.findIndex((item) => item.en === 'PLAY'));
    }
    expect(positions.size).toBe(3);
  });

  it('programa el primer repaso a una hora y luego a un día', () => {
    const now = new Date('2026-10-10T12:00:00.000Z');
    expect(nextReviewAt(now, 0).toISOString()).toBe('2026-10-10T13:00:00.000Z');
    expect(nextReviewAt(now, 1).toISOString()).toBe('2026-10-11T12:00:00.000Z');
    expect(nextReviewAt(now, -1).toISOString()).toBe('2026-10-10T12:10:00.000Z');
  });
});
