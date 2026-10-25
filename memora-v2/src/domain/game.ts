import type { TrickCheckpoint } from './trickCheckpoint';
export type Phase = 'associate' | 'recall' | 'reward' | 'grammar' | 'build' | 'conversation' | 'complete';
export type LearningMode = 'adventure' | 'vocabulary' | 'grammar';
export interface WordAssemblyPosition { selected: number[]; hinted: boolean; modelUsed: boolean }
export interface GrammarFallbackPosition { step: number; subjectIndex: number; checkIndex: number; prepared: boolean; outcome: 'pending' | 'correct' | 'model'; failures: number }

export interface GameState {
  phase: Phase;
  wordIndex: number;
  recallIndex: number;
  recallAnswered: boolean;
  /** Restores the visible feedback, not a new attempt or memory score. */
  recallOutcome?: 'correct' | 'wrong' | 'modeled';
  /** Opt-in for fresh vocabulary sessions; absent means keep the legacy task. */
  recognitionStyle?: 'scene-delivery-v1';
  /** Neutral consultations excluded from session attempts; not a memory score. */
  recognitionModels?: number;
  recallChoice?: string;
  correct: number;
  combo: number;
  maxCombo: number;
  recallRuns: number;
  grammarIndex: number;
  grammarPlayed: boolean;
  filledSlots: number;
  sentenceIndex: number;
  /** Navigation inside the active slot's explanation, not a learning result. */
  preparationStep?: number;
  /** Current construction repair, restored without replaying a learner attempt. */
  buildRepair?: { failures: number; choice: string; previousAttemptId?: string };
  buildModelUsed?: boolean;
  /** Local spelling rehearsal position only, never evidence of recall. */
  wordAssembly?: WordAssemblyPosition;
  fallbackLesson?: GrammarFallbackPosition;
  coach?: { lessonId: string; position: TrickCheckpoint };
  sessionStartedAt?: string;
}

export type GameAction =
  | { type: 'connected'; isLast?: boolean; nextWordIndex?: number; wordCount?: number }
  | { type: 'answered'; correct: boolean; choice?: string }
  | { type: 'recognitionModel' }
  | { type: 'nextRecall'; wordCount?: number }
  | { type: 'continue'; grammarCount?: number; sentenceCount?: number; slotCount?: number; conversation?: boolean; wordCount?: number; grammarOnly?: boolean }
  | { type: 'reviewJump'; phase: Phase; index?: number }
  | { type: 'grammarPlayed' }
  | { type: 'assemblyProgress'; wordIndex: number; position: WordAssemblyPosition }
  | { type: 'fallbackProgress'; grammarIndex: number; position: GrammarFallbackPosition }
  | { type: 'coachProgress'; grammarIndex: number; lessonId: string; position: TrickCheckpoint }
  | { type: 'prepareSlot'; sentenceIndex: number; slotIndex: number; step: number; stepCount: number }
  | { type: 'constructionError'; slotIndex: number; choice: string; previousAttemptId?: string }
  | { type: 'chooseSlot'; correct: boolean; slotCount: number; withModel?: boolean }
  | { type: 'restart' };

export const initialGame: GameState = {
  phase: 'associate', wordIndex: 0, recallIndex: 0, recallAnswered: false, correct: 0, combo: 0,
  maxCombo: 0, recallRuns: 0, grammarIndex: 0, grammarPlayed: false, filledSlots: 0, sentenceIndex: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'connected':
      if (state.phase !== 'associate') return state;
      return (action.isLast ?? state.wordIndex >= (action.wordCount ?? 3) - 1)
        ? { ...state, wordAssembly: undefined, phase: 'recall', recallIndex: 0 }
        : { ...state, wordAssembly: undefined, phase: 'associate', wordIndex: action.nextWordIndex ?? state.wordIndex + 1 };
    case 'assemblyProgress':
      return state.phase === 'associate' && state.wordIndex === action.wordIndex ? { ...state, wordAssembly: action.position } : state;
    case 'fallbackProgress':
      return state.phase === 'grammar' && state.grammarIndex === action.grammarIndex ? { ...state, fallbackLesson: action.position } : state;
    case 'coachProgress':
      return state.phase === 'grammar' && state.grammarIndex === action.grammarIndex ? { ...state, coach: { lessonId: action.lessonId, position: action.position } } : state;
    case 'answered': {
      if (state.phase !== 'recall' || state.recallAnswered) return state;
      const combo = action.correct ? state.combo + 1 : 0;
      return { ...state, recallAnswered: true, recallOutcome: action.correct ? 'correct' : 'wrong', recallChoice: action.choice, correct: state.correct + Number(action.correct), combo, maxCombo: Math.max(state.maxCombo, combo) };
    }
    case 'recognitionModel':
      if (state.phase !== 'recall' || state.recallAnswered || state.recognitionStyle !== 'scene-delivery-v1') return state;
      return { ...state, recallAnswered: true, recallOutcome: 'modeled', recallChoice: undefined, recognitionModels: (state.recognitionModels ?? 0) + 1 };
    case 'nextRecall':
      if (state.phase !== 'recall' || !state.recallAnswered) return state;
      return state.recallIndex >= (action.wordCount ?? 3) - 1
        ? { ...state, phase: 'reward' }
        : { ...state, recallIndex: state.recallIndex + 1, recallAnswered: false, recallOutcome: undefined, recallChoice: undefined };
    case 'continue':
      if (state.phase === 'reward') return { ...state, phase: 'grammar', grammarIndex: 0 };
      if (state.phase === 'grammar' && state.grammarPlayed) return state.grammarIndex >= (action.grammarCount ?? 4) - 1
        ? { ...state, fallbackLesson: undefined, coach: undefined, phase: action.grammarOnly ? 'complete' : 'build' }
        : { ...state, fallbackLesson: undefined, coach: undefined, grammarIndex: state.grammarIndex + 1, grammarPlayed: false };
      if (state.phase === 'build' && state.filledSlots === action.slotCount) return state.sentenceIndex >= (action.sentenceCount ?? 1) - 1
        ? { ...state, phase: action.conversation ? 'conversation' : 'complete' }
        : { ...state, sentenceIndex: state.sentenceIndex + 1, filledSlots: 0, buildRepair: undefined, buildModelUsed: undefined };
      if (state.phase === 'conversation') return { ...state, phase: 'complete' };
      return state;
    case 'grammarPlayed': return state.phase === 'grammar' ? { ...state, grammarPlayed: true } : state;
    case 'prepareSlot':
      if (state.phase !== 'build' || action.sentenceIndex !== state.sentenceIndex || action.slotIndex !== state.filledSlots
        || !Number.isInteger(action.stepCount) || action.stepCount < 1 || action.stepCount > 3
        || action.step !== (state.preparationStep ?? 0) + 1 || action.step > action.stepCount) return state;
      return { ...state, preparationStep: action.step };
    case 'constructionError':
      if (state.phase !== 'build' || action.slotIndex !== state.filledSlots || (state.buildRepair?.failures ?? 0) >= 2) return state;
      return { ...state, buildRepair: { failures: (state.buildRepair?.failures ?? 0) + 1, choice: action.choice, previousAttemptId: action.previousAttemptId } };
    case 'chooseSlot': {
      if (state.phase !== 'build' || state.filledSlots >= action.slotCount || !action.correct) return state;
      if (action.withModel ? (state.buildRepair?.failures ?? 0) < 2 : (state.buildRepair?.failures ?? 0) >= 2) return state;
      const { preparationStep: _preparation, buildRepair: _repair, ...rest } = state;
      return { ...rest, filledSlots: state.filledSlots + 1, ...(action.withModel ? { buildModelUsed: true } : {}) };
    }
    case 'reviewJump': {
      const index = Math.max(0, Math.floor(action.index ?? 0));
      return { ...initialGame, phase: action.phase,
        wordIndex: index, recallIndex: index, grammarIndex: index, sentenceIndex: index,
        recallAnswered: false, grammarPlayed: false };
    }
    case 'restart': return initialGame;
  }
}
