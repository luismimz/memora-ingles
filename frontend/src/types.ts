export type Result = 'ok' | 'doubt' | 'fail';
export type Status = 'known' | 'learning' | 'review' | 'mastered';
export type Mode = 'es_en_type' | 'en_es_choice' | 'listen_type' | 'cloze' | 'flash' | 'rescue_keyword' | 'rescue_sound';
export type Kind = 'cognate' | 'easy' | 'keyword' | 'chunk' | 'phrasal' | 'irregular';

export interface Word {
  id: number;
  rank: number;
  day: number;
  en: string;
  es: string;
  pos: string | null;
  ipa: string | null;
  pron_es: string | null;
  example_en: string | null;
  example_es: string | null;
  topic: string | null;
  kind: Kind | null;
  hint_es: string | null;
  arpabet: string | null;
  examples: { en: string; es: string; source?: string }[] | null;
  pilot: number | null;
}

export interface Mnemonic {
  id: number;
  word: number;
  owner: string | null;
  source: 'seed' | 'ai' | 'user';
  keyword: string | null;
  scene_es: string | null;
  story_en: string | null;
  emoji: string | null;
  image: string | null;
  phon_score: number | null;
  focus: string | null;
  created_at?: string;
}

export interface Progress {
  id: number;
  word: number;
  status: Status;
  study_day: number | null;
  step: number;
  learned_at: string | null;
  due_at: string | null;
  relearn_at: string | null;
  reps: number;
  lapses: number;
  ok: number;
  doubt: number;
  fail: number;
  avg_ms: number | null;
  last_seen: string | null;
  mnemonic: number | null;
  mnemonic_mode: 'auto' | 'none' | null;
}

export interface Attempt {
  id?: number;
  word: number;
  study_day: number | null;
  step: number | null;
  kind: 'exam' | 'review' | 'retry' | 'practice' | 'expose' | 'rescue';
  mode: Mode | string;
  result: Result;
  ms: number;
  hours_since_learned: number | null;
  mnemonic?: number | null;
  hints?: number;
  created_at?: string;
}

export interface StudyDay {
  id: number;
  day: number;
  date: string;
  started_at: string | null;
  finished_at: string | null;
  goal: number;
  learned: number;
  known: number;
  exam_ok: number;
  exam_total: number;
  seconds: number;
  chains: Record<string, { story_es: string; story_en: string }> | null;
}

export interface Profile {
  id: number;
  start_date: string | null;
  level: string | null;
  round_size: number;
  daily_goal: number;
  ai_model: string | null;
  voice: string | null;
  rate: number;
  answer_mode: 'type' | 'flash' | null;
  auto_speak: boolean | number;
}

export interface Sentence {
  id: number;
  kind: 'ladder' | 'mine' | 'chat';
  en: string;
  es: string | null;
  words: string[] | null;
  feedback: string | null;
  score: number | null;
  favorite: boolean | number;
  created_at?: string;
}

export interface IrregularVerb {
  id: number;
  base: string;
  past: string;
  participle: string;
  es: string;
  family: string;
  sort: number;
  mnemonic_es: string | null;
  example_en: string | null;
}

export interface VerbProgress {
  id: number;
  verb: number;
  box: number;
  due_at: string | null;
  ok: number;
  fail: number;
}

export interface PilotReport {
  id: number;
  data: Record<string, unknown>;
  ratings: Record<string, number>;
  comment: string | null;
  created_at?: string;
}

export interface PersonalVocabulary {
  id: number;
  term: string;
  meaning_es: string;
  note_es: string | null;
  example_en: string | null;
  context_en: string | null;
  source: string | null;
  created_at?: string;
}
