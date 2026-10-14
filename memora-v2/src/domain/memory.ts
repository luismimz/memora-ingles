import type { AtomicWord, SentenceSlot, UnitSentence } from './unit';
import { appendProgress, progressStorage } from './progressJournal';

export type RecallGrade = 'quick' | 'hesitant' | 'missed';
export type RecallDirection = 'recognition' | 'auditory' | 'recall' | 'production';
export type RecallError = 'meaning' | 'auditory' | 'pronunciation' | 'writing' | 'scene' | 'confuser';
export interface ReviewThresholds {
  minAttempts: number;
  noCueAccuracyBelow: number;
  maxCueDependency: number;
  sevenDayFailureCount: number;
}

export interface AssociationComparison {
  previousAccuracy: number | null;
  currentAccuracy: number | null;
  previousAttempts: number;
  currentAttempts: number;
  basis: 'recall' | 'overall';
  currentImproved: boolean | null;
}

export interface FatigueSignals {
  consecutiveMisses: number;
  averageResponseMs: number;
  cueDependency: number;
  abandonedPrompts: number;
}

export function associationsNeedingReview(
  userId: string,
  thresholds = defaultReviewThresholds,
): WordMemory[] {
  return readWordMemories(userId)
    .filter((memory) => associationNeedsReview(memory, thresholds))
    .sort((left, right) => {
      const failureDelta = (right.sevenDayFailures ?? 0) - (left.sevenDayFailures ?? 0);
      if (failureDelta !== 0) return failureDelta;
      const leftRecall = left.capabilities?.recall;
      const rightRecall = right.capabilities?.recall;
      const leftAccuracy = leftRecall?.attempts ? leftRecall.correct / leftRecall.attempts : 1;
      const rightAccuracy = rightRecall?.attempts ? rightRecall.correct / rightRecall.attempts : 1;
      return leftAccuracy - rightAccuracy || right.lapses - left.lapses;
    });
}

export function compareAssociationVersions(memory: WordMemory | null | undefined): AssociationComparison | null {
  const previous = memory?.associationHistory?.at(-1);
  if (!memory || !previous) return null;
  const previousRecall = previous.capabilities?.recall;
  const currentRecall = memory.capabilities?.recall;
  const basis = previousRecall && currentRecall ? 'recall' as const : 'overall' as const;
  const previousAttempts = previousRecall && currentRecall ? previousRecall.attempts : previous.attempts;
  const currentAttempts = previousRecall && currentRecall ? currentRecall.attempts : memory.attempts;
  const previousAccuracy = previousRecall && currentRecall
    ? previousAttempts ? previousRecall.correct / previousAttempts : null
    : previousAttempts ? previous.correct / previousAttempts : null;
  const currentAccuracy = previousRecall && currentRecall
    ? currentAttempts ? currentRecall.correct / currentAttempts : null
    : currentAttempts ? memory.correct / currentAttempts : null;
  return {
    previousAccuracy,
    currentAccuracy,
    previousAttempts,
    currentAttempts,
    basis,
    currentImproved: previousAccuracy === null || currentAccuracy === null
      ? null
      : currentAccuracy > previousAccuracy,
  };
}

export const defaultReviewThresholds: ReviewThresholds = {
  minAttempts: 3, noCueAccuracyBelow: 0.8, maxCueDependency: 0.5, sevenDayFailureCount: 2,
};

export function shouldReduceDifficulty(signals: FatigueSignals): boolean {
  return signals.consecutiveMisses >= 3 || signals.averageResponseMs >= 10_000 ||
    signals.cueDependency >= 0.7 || signals.abandonedPrompts >= 2;
}

export function associationNeedsReview(
  memory: WordMemory | undefined,
  thresholds = defaultReviewThresholds,
): boolean {
  if (!memory) return false;
  const recall = memory.capabilities?.recall;
  const noCueAccuracy = recall && recall.attempts >= thresholds.minAttempts
    ? recall.correct / recall.attempts
    : null;
  return (noCueAccuracy !== null && noCueAccuracy < thresholds.noCueAccuracyBelow) ||
    (memory.sevenDayFailures ?? 0) >= thresholds.sevenDayFailureCount;
}

export interface RecallCapability {
  attempts: number;
  correct: number;
  lastAttemptAt: string;
  nextReviewAt?: string;
  step?: number;
  independentAttempts?: number;
  independentCorrect?: number;
  deferredCorrect?: number;
  errors?: Partial<Record<RecallError, number>>;
}

export interface AssociationHistoryEntry {
  associationId?: string;
  associationVersion?: number;
  supersededBy?: string;
  changeReason?: string;
  attempts: number;
  correct: number;
  lapses: number;
  capabilities?: Partial<Record<RecallDirection, RecallCapability>>;
  archivedAt: string;
}

export interface WordMemory {
  key: string;
  word: AtomicWord;
  firstSeenAt: string;
  lastAttemptAt: string;
  nextReviewAt: string;
  step: number;
  attempts: number;
  correct: number;
  lapses: number;
  capabilities?: Partial<Record<RecallDirection, RecallCapability>>;
  associationId?: string;
  associationVersion?: number;
  supersedes?: string;
  changeReason?: string;
  cueAttempts?: number;
  cueCorrect?: number;
  sevenDayFailures?: number;
  lastSevenDayReviewAt?: string;
  associationHistory?: AssociationHistoryEntry[];
}

const intervalsHours = [1, 24, 72, 168, 336, 720];
const retryMinutes = 10;
const storageKey = (userId: string) => `memora-v2.memory.${userId}`;
const chunkStorageKey = (userId: string) => `memora-v2.chunks.${userId}`;
const sentenceStorageKey = (userId: string) => `memora-v2.sentences.${userId}`;

export interface ChunkMemory {
  key: string;
  unitId: string;
  sentenceEn: string;
  sentenceEs: string;
  slot: SentenceSlot;
  firstSeenAt: string;
  lastAttemptAt: string | null;
  nextReviewAt: string;
  step: number;
  attempts: number;
  correct: number;
  lapses: number;
}

export interface SentenceMemory {
  key: string;
  unitId: string;
  sentenceEn: string;
  sentenceEs: string;
  firstSeenAt: string;
  lastAttemptAt: string | null;
  nextReviewAt: string;
  step: number;
  attempts: number;
  correct: number;
  lapses: number;
}

export function wordKey(word: Pick<AtomicWord, 'en'>): string {
  return word.en.trim().toLocaleLowerCase('en-US');
}

export function scheduleWord(previous: WordMemory | null, word: AtomicWord, grade: RecallGrade, now = new Date()): WordMemory {
  const at = now.toISOString();
  const early = previous !== null && Date.parse(previous.nextReviewAt) > now.getTime();
  const step = grade === 'missed' ? Math.max(0, (previous?.step ?? 0) - 1)
    : early ? previous.step : Math.min((previous?.step ?? -1) + 1, intervalsHours.length - 1);
  const hours = intervalsHours[step] * (grade === 'hesitant' ? 0.5 : 1);
  const next = grade === 'missed'
    ? new Date(now.getTime() + retryMinutes * 60_000)
    : early ? new Date(previous.nextReviewAt) : new Date(now.getTime() + hours * 3_600_000);
  return {
    key: wordKey(word), word, firstSeenAt: previous?.firstSeenAt ?? at, lastAttemptAt: at,
    nextReviewAt: next.toISOString(), step,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + Number(grade !== 'missed'),
    lapses: (previous?.lapses ?? 0) + Number(grade === 'missed'),
  };
}

export function readWordMemories(userId: string): WordMemory[] {
  try {
    const parsed: unknown = JSON.parse(progressStorage().getItem(storageKey(userId)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WordMemory => Boolean(item && typeof item.key === 'string' &&
      item.word?.en && Number.isFinite(Date.parse(item.nextReviewAt)) && Number.isFinite(item.step)));
  } catch { return []; }
}

function associationLabel(memory: Pick<WordMemory, 'key' | 'associationId' | 'associationVersion'>): string {
  return [memory.associationId, memory.associationVersion ? `v${memory.associationVersion}` : '']
    .filter(Boolean).join(':') || memory.key;
}

function archiveAssociation(previous: WordMemory, replacement: AtomicWord, reason: string, now: Date): WordMemory {
  const currentAssociation = associationLabel({
    key: previous.key,
    associationId: replacement.associationId,
    associationVersion: replacement.associationVersion,
  });
  return {
    key: previous.key,
    word: replacement,
    firstSeenAt: now.toISOString(),
    lastAttemptAt: now.toISOString(),
    nextReviewAt: now.toISOString(),
    step: 0,
    attempts: 0,
    correct: 0,
    lapses: 0,
    associationId: replacement.associationId,
    associationVersion: replacement.associationVersion,
    supersedes: associationLabel(previous),
    changeReason: reason,
    associationHistory: [
      ...(previous.associationHistory ?? []),
      {
        associationId: previous.associationId,
        associationVersion: previous.associationVersion,
        supersededBy: currentAssociation,
        changeReason: reason,
        attempts: previous.attempts,
        correct: previous.correct,
        lapses: previous.lapses,
        capabilities: previous.capabilities,
        archivedAt: now.toISOString(),
      },
    ],
  };
}

/**
 * Installs an already-approved association without waiting for the next recall.
 * Content approval happens outside the memory domain; this function only
 * preserves history and resets the active association's schedule.
 */
export function replaceAssociation(
  userId: string,
  word: AtomicWord,
  changeReason: string,
  now = new Date(),
): WordMemory | null {
  if (!word.associationId || typeof word.associationVersion !== 'number' ||
    !Number.isInteger(word.associationVersion) || word.associationVersion < 1 || !changeReason.trim()) return null;
  const records = readWordMemories(userId);
  const key = wordKey(word);
  const previous = records.find((item) => item.key === key);
  if (!previous || (previous.associationId === word.associationId && previous.associationVersion === word.associationVersion)) return null;
  const replacement = archiveAssociation(previous, word, changeReason.trim(), now);
  appendProgress(userId, 'replacement', [word, changeReason], now.toISOString());
  try { progressStorage().setItem(storageKey(userId), JSON.stringify([...records.filter((item) => item.key !== key), replacement])); }
  catch { return null; }
  return replacement;
}

export function recordWordRecall(
  userId: string,
  word: AtomicWord,
  grade: RecallGrade,
  now = new Date(),
  direction: RecallDirection = 'recall',
  error?: RecallError,
  usedCue = false,
): WordMemory {
  appendProgress(userId, 'word', [word, grade, direction, error, usedCue], now.toISOString());
  const records = readWordMemories(userId);
  const key = wordKey(word);
  const previous = records.find((item) => item.key === key) ?? null;
  const associationChanged = Boolean(
    previous && (word.associationId !== undefined || word.associationVersion !== undefined) &&
    (previous.associationId !== undefined || previous.associationVersion !== undefined) &&
    (word.associationId !== previous.associationId || word.associationVersion !== previous.associationVersion),
  );
  const updated = scheduleWord(associationChanged ? null : previous, word, grade, now);
  const daysSincePrevious = previous ? (now.getTime() - Date.parse(previous.lastAttemptAt)) / 86_400_000 : 0;
  const deferredReview = !associationChanged && daysSincePrevious >= 7 &&
    previous?.lastSevenDayReviewAt !== now.toISOString();
  const previousCapability = associationChanged ? undefined : previous?.capabilities?.[direction];
  const delayed = previousCapability ? now.getTime() - Date.parse(previousCapability.lastAttemptAt) >= 86_400_000 : false;
  const earlyCapability = previousCapability?.nextReviewAt && Date.parse(previousCapability.nextReviewAt) > now.getTime();
  const capabilityStep = grade === 'missed' ? Math.max(0, (previousCapability?.step ?? 0) - 1)
    : usedCue || earlyCapability ? previousCapability?.step ?? 0 : Math.min((previousCapability?.step ?? -1) + 1, intervalsHours.length - 1);
  const capability: RecallCapability = {
    attempts: (previousCapability?.attempts ?? 0) + 1,
    correct: (previousCapability?.correct ?? 0) + Number(grade !== 'missed'),
    lastAttemptAt: now.toISOString(),
    step: capabilityStep,
    nextReviewAt: grade === 'missed' ? new Date(now.getTime() + retryMinutes * 60_000).toISOString()
      : earlyCapability ? previousCapability!.nextReviewAt : new Date(now.getTime() + intervalsHours[capabilityStep] * 3_600_000).toISOString(),
    independentAttempts: (previousCapability?.independentAttempts ?? 0) + Number(!usedCue),
    independentCorrect: (previousCapability?.independentCorrect ?? 0) + Number(!usedCue && grade !== 'missed'),
    deferredCorrect: (previousCapability?.deferredCorrect ?? 0) + Number(delayed && !usedCue && grade !== 'missed'),
    errors: {
      ...previousCapability?.errors,
      ...(error ? { [error]: (previousCapability?.errors?.[error] ?? 0) + 1 } : {}),
    },
  };
  updated.capabilities = {
    ...(associationChanged ? undefined : previous?.capabilities),
    [direction]: capability,
  };
  updated.nextReviewAt = Object.values(updated.capabilities).map((item) => item?.nextReviewAt).filter((at): at is string => Boolean(at)).sort()[0] ?? updated.nextReviewAt;
  updated.associationId = word.associationId ?? previous?.associationId;
  updated.associationVersion = word.associationVersion ?? previous?.associationVersion;
  updated.sevenDayFailures = (previous?.sevenDayFailures ?? 0) + Number(deferredReview && grade === 'missed');
  updated.lastSevenDayReviewAt = deferredReview ? now.toISOString() : previous?.lastSevenDayReviewAt;
  if (associationChanged && previous) {
    const previousAssociation = associationLabel(previous);
    const currentAssociation = associationLabel(updated);
    updated.supersedes = previousAssociation;
    updated.changeReason = word.changeReason ?? 'association_updated';
    updated.associationHistory = [
      ...(previous.associationHistory ?? []),
      {
        associationId: previous.associationId,
        associationVersion: previous.associationVersion,
        supersededBy: currentAssociation,
        changeReason: updated.changeReason,
        attempts: previous.attempts,
        correct: previous.correct,
        lapses: previous.lapses,
        capabilities: previous.capabilities,
        archivedAt: now.toISOString(),
      },
    ];
  } else {
    updated.associationHistory = previous?.associationHistory;
    updated.supersedes = previous?.supersedes;
    updated.changeReason = previous?.changeReason;
  }
  try { progressStorage().setItem(storageKey(userId), JSON.stringify([...records.filter((item) => item.key !== key), updated])); }
  catch { /* El juego sigue si el navegador no permite guardar. */ }
  return updated;
}

export function isKnownForDirection(
  memory: WordMemory | undefined,
  direction: RecallDirection,
  minAttempts = 3,
  accuracy = defaultReviewThresholds.noCueAccuracyBelow,
): boolean {
  const capability = memory?.capabilities?.[direction];
  if (!capability || (capability.independentAttempts ?? 0) < minAttempts || !capability.deferredCorrect) return false;
  return (capability.independentCorrect ?? 0) / capability.independentAttempts! >= accuracy;
}

export function adaptivePriority(memory: WordMemory | undefined, now = Date.now()): number {
  if (!memory) return 1;
  const weak = (['recognition', 'auditory', 'recall', 'production'] as RecallDirection[])
    .reduce((score, direction) => score + (isKnownForDirection(memory, direction) ? 0 : 1), 0);
  const due = Date.parse(memory.nextReviewAt) <= now ? 2 : 0;
  const forgettingRisk = Math.min(2, memory.lapses / Math.max(1, memory.attempts));
  const reviewRisk = associationNeedsReview(memory) ? 2 : 0;
  return weak + due + forgettingRisk + reviewRisk;
}

export function isKnownWord(memory: WordMemory | undefined): boolean {
  return (['recognition', 'auditory', 'recall', 'production'] as RecallDirection[])
    .every((direction) => isKnownForDirection(memory, direction));
}

export function dueWordMemories(userId: string, now = Date.now()): WordMemory[] {
  return readWordMemories(userId).filter((item) => Date.parse(item.nextReviewAt) <= now)
    .sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
}

export function nextWordReview(userId: string): string | null {
  return readWordMemories(userId).map((item) => item.nextReviewAt).sort()[0] ?? null;
}

export function chunkKey(unitId: string, sentence: UnitSentence, slotIndex: number): string {
  return `${unitId}:${sentence.en}:${slotIndex}`;
}

export function readChunkMemories(userId: string): ChunkMemory[] {
  try {
    const parsed: unknown = JSON.parse(progressStorage().getItem(chunkStorageKey(userId)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChunkMemory => Boolean(item && typeof item.key === 'string' &&
      item.slot?.en && item.slot?.es && Number.isFinite(Date.parse(item.nextReviewAt)) && Number.isFinite(item.step)));
  } catch { return []; }
}

function saveChunkMemories(userId: string, records: ChunkMemory[]) {
  try { progressStorage().setItem(chunkStorageKey(userId), JSON.stringify(records)); }
  catch { /* El juego sigue si el navegador no permite guardar. */ }
}

/** Elegir una pieza en Construye presenta el material; todavía no cuenta como recuerdo autónomo. */
export function recordChunkExposure(userId: string, unitId: string, sentence: UnitSentence, slotIndex: number, now = new Date()): void {
  const records = readChunkMemories(userId);
  const key = chunkKey(unitId, sentence, slotIndex);
  if (records.some((item) => item.key === key)) return;
  appendProgress(userId, 'chunkExposure', [unitId, sentence, slotIndex], now.toISOString());
  records.push({ key, unitId, sentenceEn: sentence.en, sentenceEs: sentence.es, slot: sentence.slots[slotIndex],
    firstSeenAt: now.toISOString(), lastAttemptAt: null, nextReviewAt: new Date(now.getTime() + 3_600_000).toISOString(),
    step: 0, attempts: 0, correct: 0, lapses: 0 });
  saveChunkMemories(userId, records);
}

export function recordChunkRecall(userId: string, key: string, grade: RecallGrade, now = new Date()): ChunkMemory | null {
  const records = readChunkMemories(userId);
  const previous = records.find((item) => item.key === key);
  if (!previous) return null;
  appendProgress(userId, 'chunkRecall', [key, grade], now.toISOString());
  const early = Date.parse(previous.nextReviewAt) > now.getTime();
  const step = grade === 'missed' ? Math.max(0, previous.step - 1)
    : early ? previous.step : Math.min(previous.step + 1, intervalsHours.length - 1);
  const nextReviewAt = grade === 'missed'
    ? new Date(now.getTime() + retryMinutes * 60_000).toISOString()
    : early ? previous.nextReviewAt
      : new Date(now.getTime() + intervalsHours[step] * (grade === 'hesitant' ? 0.5 : 1) * 3_600_000).toISOString();
  const updated: ChunkMemory = { ...previous, lastAttemptAt: now.toISOString(), nextReviewAt, step,
    attempts: previous.attempts + 1, correct: previous.correct + Number(grade !== 'missed'),
    lapses: previous.lapses + Number(grade === 'missed') };
  saveChunkMemories(userId, records.map((item) => item.key === key ? updated : item));
  return updated;
}

export function dueChunkMemories(userId: string, now = Date.now()): ChunkMemory[] {
  return readChunkMemories(userId).filter((item) => Date.parse(item.nextReviewAt) <= now)
    .sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
}

export function sentenceKey(unitId: string, sentence: UnitSentence): string {
  return `${unitId}:${sentence.en}`;
}

export function readSentenceMemories(userId: string): SentenceMemory[] {
  try {
    const parsed: unknown = JSON.parse(progressStorage().getItem(sentenceStorageKey(userId)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SentenceMemory => Boolean(item && typeof item.key === 'string' &&
      item.sentenceEn && item.sentenceEs && Number.isFinite(Date.parse(item.nextReviewAt)) && Number.isFinite(item.step)));
  } catch { return []; }
}

function saveSentenceMemories(userId: string, records: SentenceMemory[]) {
  try { progressStorage().setItem(sentenceStorageKey(userId), JSON.stringify(records)); }
  catch { /* La práctica sigue si el navegador no permite guardar. */ }
}

/** Construir con opciones solo expone la frase: no demuestra que se pueda escribir de memoria. */
export function recordSentenceExposure(userId: string, unitId: string, sentence: UnitSentence, now = new Date()): void {
  const records = readSentenceMemories(userId);
  const key = sentenceKey(unitId, sentence);
  if (records.some((item) => item.key === key)) return;
  appendProgress(userId, 'sentenceExposure', [unitId, sentence], now.toISOString());
  records.push({ key, unitId, sentenceEn: sentence.en, sentenceEs: sentence.es,
    firstSeenAt: now.toISOString(), lastAttemptAt: null, nextReviewAt: new Date(now.getTime() + 3_600_000).toISOString(),
    step: 0, attempts: 0, correct: 0, lapses: 0 });
  saveSentenceMemories(userId, records);
}

export function recordSentenceRecall(userId: string, key: string, grade: RecallGrade, now = new Date()): SentenceMemory | null {
  const records = readSentenceMemories(userId);
  const previous = records.find((item) => item.key === key);
  if (!previous) return null;
  appendProgress(userId, 'sentenceRecall', [key, grade], now.toISOString());
  const early = Date.parse(previous.nextReviewAt) > now.getTime();
  const step = grade === 'missed' ? Math.max(0, previous.step - 1)
    : early ? previous.step : Math.min(previous.step + 1, intervalsHours.length - 1);
  const nextReviewAt = grade === 'missed'
    ? new Date(now.getTime() + retryMinutes * 60_000).toISOString()
    : early ? previous.nextReviewAt
      : new Date(now.getTime() + intervalsHours[step] * (grade === 'hesitant' ? 0.5 : 1) * 3_600_000).toISOString();
  const updated: SentenceMemory = { ...previous, lastAttemptAt: now.toISOString(), nextReviewAt, step,
    attempts: previous.attempts + 1, correct: previous.correct + Number(grade !== 'missed'),
    lapses: previous.lapses + Number(grade === 'missed') };
  saveSentenceMemories(userId, records.map((item) => item.key === key ? updated : item));
  return updated;
}

export function dueSentenceMemories(userId: string, now = Date.now()): SentenceMemory[] {
  return readSentenceMemories(userId).filter((item) => Date.parse(item.nextReviewAt) <= now)
    .sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
}

/** A sentence is generated only after every chunk survived two delayed recalls. */
export function isSentenceReady(chunks: ChunkMemory[], unitId: string, sentence: UnitSentence): boolean {
  return sentence.slots.every((_, index) => {
    const chunk = chunks.find((item) => item.key === chunkKey(unitId, sentence, index));
    return Boolean(chunk && chunk.step >= 2 && chunk.correct >= 2);
  });
}
