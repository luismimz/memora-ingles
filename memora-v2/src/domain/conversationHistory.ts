import type { LearningActivity } from './learningActivity';
import { normalizeSentenceAnswer } from './sentenceAnswer';

export interface HistoryBubble {
  id: string; who: 'partner' | 'learner' | 'coach'; speaker: string; text: string;
  feedback?: string; expected?: string; correct: boolean | null; helped: boolean;
  modality: LearningActivity['modality']; phase: LearningActivity['phase'];
  attempts: string[]; at: string; unitTitle: string;
  parentAttemptId?: string;
}
export interface HistoryConversation { id: string; title: string; practice: boolean; messages: HistoryBubble[]; lastAt: string }
/** Projection only. All raw events, including repeated answers, remain immutable. */
export function projectConversations(records: LearningActivity[], knownPartners: Record<string, string> = {}): HistoryConversation[] {
  const unique = [...new Map(records.map((record) => [record.id, record])).values()].sort((a, b) => a.at.localeCompare(b.at));
  const partners = { ...knownPartners };
  for (const record of unique) if (record.activityId.startsWith('partner-')) {
    const speaker = record.speaker ?? record.feedback?.match(/^([^:]+):/u)?.[1];
    if (speaker) partners[record.unitId] = speaker;
  }
  const threads = new Map<string, HistoryConversation>();
  const indexes = new Map<string, Map<string, HistoryBubble>>();
  function append(thread: HistoryConversation, message: HistoryBubble, signature: string) {
    const index = indexes.get(thread.id)!;
    const previous = index.get(signature);
    if (previous) {
      previous.attempts = [...new Set([...previous.attempts, ...message.attempts])];
      previous.at = message.at;
      previous.feedback ??= message.feedback;
      previous.parentAttemptId ??= message.parentAttemptId;
      return;
    }
    thread.messages.push(message); index.set(signature, message);
  }
  for (const record of unique) {
    if (record.phase === 'completion') continue;
    const practice = !['dialogue', 'transfer'].includes(record.phase);
    const partner = partners[record.unitId];
    const id = practice ? 'practice' : record.conversationId ?? (partner ? `person:${partner.normalize('NFKC').trim().toLocaleLowerCase('es')}` : `mission:${record.unitId}`);
    if (!threads.has(id)) { threads.set(id, { id, title: practice ? 'Mi práctica' : partner ?? record.unitTitle, practice, messages: [], lastAt: record.at }); indexes.set(id, new Map()); }
    const thread = threads.get(id)!; thread.lastAt = record.at;
    const isPartner = record.source === 'authored' && record.activityId.startsWith('partner-');
    // Older attempts carry their actual incoming prompt, even without a partner event.
    if (!practice && record.source === 'learner' && record.prompt.trim()) append(thread, { id: `prompt:${record.id}`, who: 'partner', speaker: partner ?? 'Personaje', text: record.prompt, correct: null, helped: true, modality: 'choice', phase: record.phase, attempts: [record.id], at: record.at, unitTitle: record.unitTitle }, `partner:${normalizeSentenceAnswer(record.prompt)}`);
    const who = record.source === 'learner' ? 'learner' : isPartner ? 'partner' : 'coach';
    const textIdentity = who === 'partner' ? normalizeSentenceAnswer(record.response) : record.response.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/gu, ' ');
    const signature = `${who}:${textIdentity}:${who === 'partner' ? '' : `${normalizeSentenceAnswer(record.prompt)}:${record.phase}:${record.skill}:${record.correct}:${record.helped}:${record.modality}`}`;
    append(thread, { id: record.id, who, speaker: record.speaker ?? (who === 'learner' ? 'Tú' : who === 'partner' ? partner ?? 'Personaje' : 'Memora'), text: record.response, feedback: record.feedback, expected: record.expected, correct: record.correct, helped: record.helped, modality: record.modality, phase: record.phase, attempts: [record.id], at: record.at, unitTitle: record.unitTitle, parentAttemptId: record.parentAttemptId }, signature);
  }
  return [...threads.values()].sort((a, b) => Number(a.practice) - Number(b.practice) || b.lastAt.localeCompare(a.lastAt));
}
