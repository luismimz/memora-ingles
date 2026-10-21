import { validateGrammarLesson, type GrammarLessonData } from './grammarLesson';
import { validateMirrorLesson, type MirrorLessonData } from './mirrorLesson';
/** Curriculum identifier. The backend visual contract decides how it behaves. */
export type NutId = string;

export type GrammarPieceRole = 'root' | 'ending' | 'auxiliary' | 'participle' | 'negation' | 'connector';

export interface GrammarPiece {
  id: string;
  text: string;
  role: GrammarPieceRole;
}

export interface GrammarSubject {
  /** Final form heard and shown, contracted when the contract teaches a contraction. */
  en: string;
  /** Exact uncontracted form. Never infer this from apostrophes: he's can be he is or he has. */
  expandedEn?: string;
  es: string;
  /** Natural Spanish form after visually dropping the optional pronoun. */
  reducedEs?: string;
  phrase: string;
}

export interface AtomicWord {
  id: number;
  en: string;
  es: string;
  ipa: string;
  bridge: string;
  associationMode?: 'acoustic_bridge' | 'direct_image' | 'cognate' | 'context_scene' | 'action_scene';
  highlightTerms?: string[];
  memoryChain?: string[];
  scene: string;
  /** Transparent correspondence, checked for the same meaning; no invented bridge. */
  cognateEvidence?: { sameMeaning: true; note: string };
  usageExample?: { en: string; es: string };
  /** Reconstruct a previously taught scene; this is not English mastery. */
  reconstruction?: { prompt: string; choices: [string, string]; answer: string; cue: string };
  emojis: [string] | [string, string];
  imageUrl?: string;
  audioUrl?: string;
  audioProvenance?: {
    source: string;
    pronunciationGuide: string;
    license: string;
    modelVersion?: string;
  };
  imageProvenance?: {
    source: string;
    license: string;
    modelVersion?: string;
  };
  learningRole?: 'new' | 'review';
  confusers?: string[];
  associationId?: string;
  associationVersion?: number;
  changeReason?: string;
  supersedes?: string;
  status?: 'needs_review' | 'approved' | 'rejected';
  anchor?: string;
  meaningTerms?: string[];
  bridgeEvidence?: {
    spanishCue: string;
    familiarMeaning: string;
    soundRelation: string;
    cueType: 'spanish_word' | 'spanish_expression';
  };
  editorialReview?: {
    verdict: 'approved' | 'rejected';
    reviewedBy: string;
    reason: string;
  };
}

export type AssociationCheckStatus = 'pass' | 'warn' | 'blocked' | 'not_applicable';
export interface AssociationQualityCheck {
  rule: string;
  status: AssociationCheckStatus;
  message: string;
}

export interface AssociationQualityReport {
  checks: AssociationQualityCheck[];
  automatedGate: 'pass' | 'blocked';
}

export interface GrammarForm {
  id: NutId;
  visualContract?: string;
  memoryTrick?: { cue: string; explanation: string };
  lesson?: GrammarLessonData;
  spanish: string;
  spanishStem: string;
  spanishEnding: string;
  englishRoot: string;
  englishBase?: string;
  englishNut: string;
  english: string;
  placement: 'before' | 'after';
  /** Explicitly typed verb pieces. Required by new curriculum; legacy units use root/nut fields. */
  spanishPieces?: GrammarPiece[];
  englishPieces?: GrammarPiece[];
  subjects: GrammarSubject[];
}

export interface SentenceSlot {
  note?: string;
  /** Authored teaching before this slot's choices; never a scored attempt. */
  preparation?: { en: string; es: string; explanation: string }[];
  en: string;
  es: string;
  choices: [string, string];
}

export interface UnitSentence {
  en: string;
  es: string;
  slots: SentenceSlot[];
  pronunciationTip: string;
}

export interface AtomicUnit {
  /** A word pack has no invented grammar or scored sentence construction. */
  kind?: 'mission' | 'vocabulary-pack' | 'grammar-lesson';
  id: string;
  title: string;
  contentVersion?: string;
  grammarRole?: 'new' | 'review';
  /** Recall without the picture first, with optional aids and recognition fallback. */
  activeRecall?: boolean;
  grammarPrerequisites?: { vocabulary: string[] };
  location?: { world: string; zone: string; locus: string; label: string };
  words: AtomicWord[];
  grammar: GrammarForm[];
  grammarLesson?: GrammarLessonData;
  sentence: UnitSentence;
  practiceSentences?: UnitSentence[];
  mirror?: MirrorLessonData;
  communication?: {
    layer: 'observe' | 'act' | 'converse';
    intent: string;
    interlocutor: string;
    userTurn: string;
    reply: string;
    replyMode: 'target' | 'receptive_chunk';
    practicePrompt?: string;
    acceptedAnswers?: string[];
    dialogue?: { context: string; turns: [DialogueTurn, DialogueTurn]; rhythmTip: string; transfer?: DialogueTurn; transferContext?: string; partner?: string; reply?: { en: string; es: string }; roleSwap?: boolean; questionSkillId?: string; progressiveHints?: [string, string, string]; continueMode?: 'manual' | 'automatic' };
  };
}

export interface DialogueTurn { role: 'A' | 'B'; en: string; es: string; acceptedAnswers: string[] }

export function getUnitSentences(unit: AtomicUnit): UnitSentence[] {
  return [unit.sentence, ...(unit.practiceSentences ?? [])];
}

export function validateAssociationQuality(value: unknown): AssociationQualityReport {
  const word = value && typeof value === 'object' ? value as Partial<AtomicWord> : {};
  const checks: AssociationQualityCheck[] = [];
  const scene = word.scene?.trim() ?? '';
  const bridge = word.bridge?.trim() ?? '';
  const words = scene ? scene.split(/\s+/u).length : 0;
  checks.push({
    rule: 'scene_length',
    status: word.associationMode === 'cognate' ? 'not_applicable' : words >= 5 && words <= 12 ? 'pass' : 'blocked',
    message: word.associationMode === 'cognate' ? 'El cognado no necesita historia absurda.' : words >= 5 && words <= 12 ? 'La escena tiene entre 5 y 12 palabras.' : 'La escena debe tener entre 5 y 12 palabras.',
  });
  const highlights = word.highlightTerms ?? [];
  checks.push({
    rule: 'highlight_terms',
    status: highlights.every((term) => Boolean(term?.trim()) && scene.includes(term)) ? 'pass' : 'blocked',
    message: highlights.every((term) => Boolean(term?.trim()) && scene.includes(term)) ? 'Los términos destacados aparecen en la escena.' : 'Falta algún término destacado en la escena.',
  });
  if (bridge) {
    const bridgeIsTranslation = bridge.toLocaleLowerCase('es') === word.es?.trim().toLocaleLowerCase('es');
    checks.push({
      rule: 'bridge_not_translation',
      status: bridgeIsTranslation ? 'blocked' : 'pass',
      message: bridgeIsTranslation ? 'El puente no puede ser solo la traducción.' : 'El puente no coincide con la traducción.',
    });
    checks.push({
      rule: 'bridge_capitalized',
      status: scene.includes(bridge.toLocaleUpperCase('es')) ? 'pass' : 'warn',
      message: scene.includes(bridge.toLocaleUpperCase('es')) ? 'El puente aparece destacado.' : 'El puente no aparece en mayúsculas completas.',
    });
  } else {
    checks.push({ rule: 'bridge_not_translation', status: 'not_applicable', message: 'No hay puente acústico; se usa una ruta alternativa.' });
    checks.push({ rule: 'bridge_capitalized', status: 'not_applicable', message: 'No hay puente acústico que destacar.' });
  }
  const mode = word.associationMode ?? (bridge ? 'acoustic_bridge' : 'direct_image');
  const cognateValid = mode === 'cognate' && !bridge && !word.bridgeEvidence && word.cognateEvidence?.sameMeaning === true && Boolean(word.cognateEvidence.note?.trim()) && Boolean(word.usageExample?.en?.trim() && word.usageExample.es?.trim());
  const modeConsistent = mode === 'acoustic_bridge' && Boolean(bridge) || cognateValid;
  checks.push({
    rule: 'mode_consistency',
    status: modeConsistent ? 'pass' : 'blocked',
    message: modeConsistent ? cognateValid ? 'Cognado con equivalencia y ejemplo revisables, sin puente inventado.' : 'La asociación tiene puente acústico.' : 'Se necesita un puente español real revisado o un cognado documentado sin puente.',
  });
  return { checks, automatedGate: checks.some((check) => check.status === 'blocked') ? 'blocked' : 'pass' };
}

export function validateApprovedAssociation(value: unknown): AtomicWord {
  if (!value || typeof value !== 'object') throw new Error('La asociación no tiene datos.');
  const word = value as Partial<AtomicWord>;
  if (!word.en?.trim() || !word.es?.trim() || !word.ipa?.trim() || !word.scene?.trim() ||
    typeof word.bridge !== 'string' || !Array.isArray(word.emojis) || !word.emojis.length) {
    throw new Error('La asociación necesita palabra, significado, pronunciación, historia e icono.');
  }
  const quality = validateAssociationQuality(word);
  const blocked = quality.checks.find((check) => check.status === 'blocked');
  if (blocked) throw new Error(`${word.en}: ${blocked.message}`);
  if (word.status !== 'approved') throw new Error(`${word.en}: la asociación no está aprobada editorialmente.`);
  if (!word.audioUrl?.trim()) throw new Error(`${word.en}: falta el audio aprobado.`);
  if (!word.audioProvenance?.source?.trim() || !word.audioProvenance.pronunciationGuide?.trim() ||
    !word.audioProvenance.license?.trim()) {
    throw new Error(`${word.en}: el audio necesita procedencia, guía de pronunciación y licencia.`);
  }
  if (word.imageUrl && (!word.imageProvenance?.source?.trim() || !word.imageProvenance.license?.trim())) {
    throw new Error(`${word.en}: la imagen necesita procedencia y licencia.`);
  }
  const review = word.editorialReview;
  if (!review || review.verdict !== 'approved' || !review.reviewedBy?.trim() || !review.reason?.trim()) {
    throw new Error(`${word.en}: falta una revisión editorial completa.`);
  }
  const mode = word.associationMode ?? 'acoustic_bridge';
  if (!['acoustic_bridge', 'direct_image', 'cognate', 'context_scene', 'action_scene'].includes(mode)) {
    throw new Error(`${word.en}: la ruta de asociación no es válida.`);
  }
  if (mode === 'acoustic_bridge') {
    const evidence = word.bridgeEvidence;
    if (!evidence || evidence.spanishCue !== word.bridge || !evidence.familiarMeaning?.trim() ||
      !evidence.soundRelation?.trim() || !['spanish_word', 'spanish_expression'].includes(evidence.cueType)) {
      throw new Error(`${word.en}: falta la evidencia del puente acústico.`);
    }
  } else if (mode !== 'cognate' && (!word.anchor?.trim() || !word.meaningTerms?.length ||
    !word.meaningTerms.every((term) => term.trim() && word.scene?.includes(term)))) {
    throw new Error(`${word.en}: la ruta alternativa necesita ancla y términos del significado.`);
  }
  return word as AtomicWord;
}

/** El infinitivo ya se conoce como pareja léxica; el taller muestra cambios de forma jugables. */
export function getPlayableGrammar(unit: AtomicUnit): GrammarForm[] {
  const transformations = unit.grammar.filter((form) => form.id !== 'to');
  return transformations.length ? transformations : unit.grammar;
}

/** Supports legacy labels ("Yo estoy jugando") and the V2 contract ("Yo estoy"). */
export function getSpanishSubjectLabel(subject: string, spanishForm: string): string {
  const value = subject.trim();
  const suffix = spanishForm.trim();
  if (!suffix) return value;
  return value.toLocaleLowerCase('es').endsWith(` ${suffix.toLocaleLowerCase('es')}`)
    ? value.slice(0, -(suffix.length + 1)).trim()
    : value;
}

/** Legacy fallback only. New content must provide expandedEn to disambiguate forms such as he's. */
export function getExpandedEnglishSubject(subject: GrammarSubject): string {
  if (subject.expandedEn) return subject.expandedEn;
  const legacy: Record<string, string> = {
    "I'm": 'I am', "You're": 'You are', "He's": 'He is', "She's": 'She is',
    "We're": 'We are', "They're": 'They are',
  };
  return legacy[subject.en] || subject.en;
}

export function validateUnit(value: unknown): AtomicUnit {
  if (!value || typeof value !== 'object') throw new Error('La unidad no tiene datos.');
  const unit = value as Partial<AtomicUnit>;
  if (unit.kind !== undefined && !['mission', 'vocabulary-pack', 'grammar-lesson'].includes(unit.kind)) throw new Error('El tipo de unidad no es válido.');
  if (unit.grammarPrerequisites && (!Array.isArray(unit.grammarPrerequisites.vocabulary) || !unit.grammarPrerequisites.vocabulary.length || unit.grammarPrerequisites.vocabulary.some((word) => typeof word !== 'string' || !word.trim()))) throw new Error('La gramática necesita una lista de palabras preparadas.');
  if (unit.grammarLesson) validateGrammarLesson(unit.grammarLesson);
  if (unit.kind === 'grammar-lesson' && (!unit.grammarPrerequisites?.vocabulary.length || !unit.grammarLesson || !Array.isArray(unit.grammar) || unit.grammar.length)) throw new Error('El truco independiente necesita vocabulario preparado y una lección escrita explícitamente.');
  if (unit.activeRecall !== undefined && typeof unit.activeRecall !== 'boolean') throw new Error('El recuerdo activo debe ser verdadero o falso.');
  if (unit.grammarRole !== undefined && !['new', 'review'].includes(unit.grammarRole)) throw new Error('El papel de la gramática debe ser nuevo o repaso.');
  if (unit.mirror !== undefined) validateMirrorLesson(unit.mirror);
  if (!unit.id || !unit.title?.trim() || !Array.isArray(unit.words) || unit.words.length < 1 || unit.words.length > 6) throw new Error('La unidad debe tener título y entre una y seis palabras.');
  for (const word of unit.words) {
    if (word?.reconstruction && (!word.reconstruction.prompt?.trim() || !word.reconstruction.cue?.trim() ||
      !Array.isArray(word.reconstruction.choices) || word.reconstruction.choices.length !== 2 ||
      word.reconstruction.choices.some((choice) => typeof choice !== 'string' || !choice.trim()) ||
      new Set(word.reconstruction.choices).size !== 2 || !word.reconstruction.choices.includes(word.reconstruction.answer))) {
      throw new Error('La reconstrucción necesita una escena, dos opciones y una respuesta revisada.');
    }
    if (!word || !word.en?.trim() || !word.es?.trim() || !word.ipa?.trim() || typeof word.bridge !== 'string' || !word.scene?.trim()) {
      throw new Error('Una palabra carece de significado, sonido o escena completa.');
    }
    if (!Array.isArray(word.emojis) || word.emojis.length < 1 || word.emojis.length > 2 || word.emojis.some((emoji) => !emoji?.trim())) {
      throw new Error(`${word.en}: la escena necesita uno o dos iconos.`);
    }
    if (!/^\/[^/\r\n]+\/$/u.test(word.ipa.trim())) {
      throw new Error(`${word.en}: el IPA debe ser una transcripción de palabra entre una sola pareja de barras.`);
    }
    if (word.associationMode !== undefined && !['acoustic_bridge', 'direct_image', 'cognate', 'context_scene', 'action_scene'].includes(word.associationMode)) {
      throw new Error(`${word.en}: el modo de asociación no es válido.`);
    }
    if (word.highlightTerms !== undefined && (!Array.isArray(word.highlightTerms) || !word.highlightTerms.length || word.highlightTerms.some((term) => !term?.trim() || !word.scene.includes(term)))) {
      throw new Error(`${word.en}: la historia no contiene literalmente todos sus términos destacados.`);
    }
    if (word.memoryChain !== undefined && (!Array.isArray(word.memoryChain) || word.memoryChain.length < 2 || word.memoryChain.some((term) => !term?.trim()))) {
      throw new Error(`${word.en}: la cadena mnemotécnica está incompleta.`);
    }
    if (word.confusers !== undefined && (!Array.isArray(word.confusers) || word.confusers.some((confuser) => !confuser?.trim() || confuser.trim().toLocaleLowerCase('en-US') === word.en.trim().toLocaleLowerCase('en-US')))) {
      throw new Error(`${word.en}: los confusores deben ser distintos y no estar vacíos.`);
    }
    if (word.associationVersion !== undefined && (!Number.isInteger(word.associationVersion) || word.associationVersion < 1)) {
      throw new Error(`${word.en}: la versión de asociación no es válida.`);
    }
    if (word.changeReason !== undefined && !word.changeReason.trim()) {
      throw new Error(`${word.en}: el motivo del cambio de asociación no puede estar vacío.`);
    }
    if (word.supersedes !== undefined && !word.supersedes.trim()) {
      throw new Error(`${word.en}: la asociación sustituida no puede estar vacía.`);
    }
  }
  if (!Array.isArray(unit.grammar) || !['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? 'mission') && unit.grammar.length < 1 ||
    new Set(unit.grammar.map((form) => form.id)).size !== unit.grammar.length ||
    unit.grammar.some((form) => !form.id?.trim() || (form.visualContract !== undefined && !form.visualContract.trim()))) {
    throw new Error('Las formas de la unidad deben ser únicas y válidas.');
  }
  for (const form of unit.grammar) {
    if (form.lesson) validateGrammarLesson(form.lesson);
    if (form.spanish === 'forma funcional' || form.subjects?.some((subject) => subject.phrase?.trim() === subject.en?.trim())) throw new Error('La gramática contiene marcadores provisionales; necesita una transformación real.');
    if (form.memoryTrick && (!form.memoryTrick.cue?.trim() || !form.memoryTrick.explanation?.trim())) throw new Error('El truco gramatical necesita una señal y una explicación breve.');
    if (!form.spanish || !form.spanishStem || !form.englishRoot || !form.englishNut || !form.english || !Array.isArray(form.subjects) || !form.subjects.length) {
      throw new Error(`La forma ${form.id} está incompleta.`);
    }
    if (form.id === 'ing' && form.subjects.some((subject) => !subject.en?.trim() || !getSpanishSubjectLabel(subject.es, form.spanish))) {
      throw new Error(`La forma ${form.id} contiene una persona vacía o mal recortada.`);
    }
    for (const pieces of [form.spanishPieces, form.englishPieces]) {
      if (pieces !== undefined && (!Array.isArray(pieces) || !pieces.length || pieces.some((piece) =>
        !piece.id?.trim() || !piece.text?.trim() || !['root', 'ending', 'auxiliary', 'participle', 'negation', 'connector'].includes(piece.role)))) {
        throw new Error(`La forma ${form.id} contiene piezas visuales inválidas.`);
      }
    }
    if (form.visualContract && (!form.spanishPieces?.length || !form.englishPieces?.length)) {
      throw new Error(`La forma ${form.id} necesita piezas visuales explícitas.`);
    }
    if (form.subjects.some((subject) => subject.expandedEn !== undefined && !subject.expandedEn.trim())) {
      throw new Error(`La forma ${form.id} contiene una contracción sin forma expandida.`);
    }
  }
  if (unit.practiceSentences !== undefined && !Array.isArray(unit.practiceSentences)) throw new Error('Las frases de práctica deben ser una lista.');
  if (unit.communication !== undefined && (
    !['observe', 'act', 'converse'].includes(unit.communication.layer) ||
    !unit.communication.intent?.trim() || !unit.communication.interlocutor?.trim() ||
    !unit.communication.userTurn?.trim() || !unit.communication.reply?.trim() ||
    !['target', 'receptive_chunk'].includes(unit.communication.replyMode)
  )) throw new Error('El intercambio comunicativo está incompleto.');
  if (unit.communication && (unit.communication.practicePrompt !== undefined || unit.communication.acceptedAnswers !== undefined)) {
    if (!unit.communication.practicePrompt?.trim() || !Array.isArray(unit.communication.acceptedAnswers) || !unit.communication.acceptedAnswers.length || unit.communication.acceptedAnswers.some((answer) => typeof answer !== 'string' || !answer.trim())) throw new Error('La práctica de conversación necesita una pregunta y respuestas revisadas.');
  }
  const dialogue = unit.communication?.dialogue;
  if (dialogue?.continueMode !== undefined && !['manual', 'automatic'].includes(dialogue.continueMode)) throw new Error('La continuidad del diálogo no es válida.');
  if (dialogue?.roleSwap !== undefined && typeof dialogue.roleSwap !== 'boolean' || dialogue?.progressiveHints !== undefined && (!Array.isArray(dialogue.progressiveHints) || dialogue.progressiveHints.length !== 3 || dialogue.progressiveHints.some((hint) => typeof hint !== 'string' || !hint.trim()))) throw new Error('El chat necesita un cambio de papel válido y pistas completas.');
  if (dialogue?.questionSkillId !== undefined && (typeof dialogue.questionSkillId !== 'string' || !dialogue.questionSkillId.trim())) throw new Error('La pregunta necesita una habilidad gramatical identificable.');
  if (dialogue?.reply && (!dialogue.reply.en?.trim() || !dialogue.reply.es?.trim()) || dialogue?.partner !== undefined && !dialogue.partner.trim()) throw new Error('El chat necesita un personaje y una réplica completos.');
  if (dialogue && (!dialogue.context?.trim() || !dialogue.rhythmTip?.trim() || !Array.isArray(dialogue.turns) || dialogue.turns.length !== 2 || dialogue.turns[0].role !== 'A' || dialogue.turns[1].role !== 'B' || dialogue.turns.some((turn) => !turn.en?.trim() || !turn.es?.trim() || !Array.isArray(turn.acceptedAnswers) || !turn.acceptedAnswers.includes(turn.en)))) throw new Error('El diálogo necesita dos papeles, traducciones y respuestas revisadas.');
  if (dialogue && (dialogue.transfer !== undefined || dialogue.transferContext !== undefined) && (!dialogue.transferContext?.trim() || !dialogue.transfer?.en?.trim() || !dialogue.transfer.es?.trim() || !['A', 'B'].includes(dialogue.transfer.role) || !Array.isArray(dialogue.transfer.acceptedAnswers) || !dialogue.transfer.acceptedAnswers.includes(dialogue.transfer.en))) throw new Error('La transferencia necesita una situación nueva y una respuesta revisada.');
  if (unit.mirror) {
    const target = unit.mirror.examples.find((example) => example.id === unit.mirror!.conversationExampleId)!;
    if (!dialogue || !target.acceptedAnswers.some((answer) => dialogue.turns[1].acceptedAnswers.includes(answer) || dialogue.turns[1].acceptedAnswers.includes(`${answer}.`))) throw new Error('La conversación debe aplicar el ejemplo enseñado por la ficha espejo.');
  }
  if (unit.location && Object.values(unit.location).some((value) => typeof value !== 'string' || !value.trim())) throw new Error('La escena necesita un lugar completo y estable.');
  const sentences = [unit.sentence, ...(unit.practiceSentences ?? [])];
  for (const sentence of sentences) {
    for (const slot of sentence?.slots ?? []) {
      if (slot.preparation !== undefined && (!Array.isArray(slot.preparation) || !slot.preparation.length || slot.preparation.length > 3 || slot.preparation.some((step) => !step.en?.trim() || !step.es?.trim() || !step.explanation?.trim() || step.explanation.split(/\s+/).length > 35))) throw new Error('La preparación de cada bloque necesita entre uno y tres pasos breves con español e inglés.');
    }
    if (unit.kind === 'vocabulary-pack' || unit.kind === 'grammar-lesson') {
      if (!sentence?.en?.trim() || !sentence.es?.trim() || !Array.isArray(sentence.slots) || sentence.slots.length) throw new Error('El paquete de palabras usa ejemplos de escucha, no ejercicios sintéticos de gramática.');
      continue;
    }
    if (!sentence || sentence.en?.trim().split(/\s+/).length < 2 || !sentence.es?.trim() ||
      !Array.isArray(sentence.slots) || sentence.slots.length < 2 || sentence.slots.some((slot) =>
        !slot?.en?.trim() || !slot?.es?.trim() || !Array.isArray(slot.choices) || slot.choices.length !== 2 ||
        slot.choices[0] === slot.choices[1] || !slot.choices.includes(slot.en))) {
      throw new Error('Cada frase necesita segmentos alineados y dos opciones por hueco.');
    }
    if (sentence.slots.map((slot) => slot.en).join(' ').replace(/\s+/g, ' ').trim() !== sentence.en.trim()) {
      throw new Error('Los segmentos no reconstruyen exactamente la frase inglesa.');
    }
  }
  return unit as AtomicUnit;
}

/** La recuperación se programa desde el último intento, nunca desde la mera exposición. */
export function nextReviewAt(completedAt: Date, successfulReviews: number): Date {
  if (successfulReviews < 0) return new Date(completedAt.getTime() + 10 * 60 * 1000);
  const hours = [1, 24, 72, 168, 336, 720];
  const index = Math.max(0, Math.min(successfulReviews, hours.length - 1));
  return new Date(completedAt.getTime() + hours[index] * 60 * 60 * 1000);
}

export function makeRecallChoices(unit: AtomicUnit, wordIndex: number, sessionSeed: number): AtomicWord[] {
  const correct = unit.words[wordIndex];
  const choices = [correct, ...unit.words.filter((_, index) => index !== wordIndex)];
  let state = (sessionSeed + wordIndex * 2654435761) >>> 0;
  for (let index = choices.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [choices[index], choices[target]] = [choices[target], choices[index]];
  }
  return choices.length <= 3 ? choices : choices.slice(0, 3).some((word) => word.id === correct.id)
    ? choices.slice(0, 3) : [correct, ...choices.slice(0, 2)];
}
