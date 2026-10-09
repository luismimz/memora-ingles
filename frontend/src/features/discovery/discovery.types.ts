import type { IrregularFormExamples, IrregularForms, Kind, Mnemonic } from '../../types';

export type DiscoveryQueueStatus = 'idle' | 'loading' | 'ready' | 'complete' | 'empty' | 'error';

/** Fases mutuamente excluyentes del bucle principal de Memora. */
export type MissionPhase = 'WARMUP' | 'DISCOVERY' | 'SENTENCE' | 'ARCADE' | 'LOOT';

export interface DiscoveryWord {
  id: number;
  en: string;
  es: string;
  ipa: string | null;
  pronEs: string | null;
  kind: Kind | null;
  exampleEn: string | null;
  exampleEs?: string | null;
  audioUrl?: string | null;
  bridgeWord: string | null;
  sceneEs: string | null;
  targetSentenceEs: string | null;
  targetSentenceEn: string | null;
  distractor: string | null;
  irregularForms: IrregularForms | null;
  irregularExamples: IrregularFormExamples | null;
  verbFamily: string | null;
  definitionEn: string | null;
  hintEs: string | null;
}

export interface DiscoveryAssociation {
  id: number;
  keyword: string;
  sceneEs: string;
  storyEn: string | null;
  emoji: string | null;
  imageId: string | null;
  imageUrl: string | null;
  phoneticScore: number | null;
  focus: string | null;
  source: Mnemonic['source'];
}

export interface DiscoveryCard {
  /** Por ahora una unidad de descubrimiento corresponde a una Word de Directus. */
  unitId: number;
  position: number;
  total: number;
  word: DiscoveryWord;
  association: DiscoveryAssociation;
  alternativeIndex: number;
  alternativesTotal: number;
  audioText: string;
  audioReady: boolean;
  /** Las unidades phrasal/compound se abren como una fusión dentro del mazo. */
  special?: 'alchemy';
}

export interface RecoveryQueueItem {
  unitId: number;
  wordId: number;
  associationId: number;
  en: string;
  es: string;
  exampleEn?: string | null;
  exampleEs?: string | null;
  audioUrl?: string | null;
  ipa?: string | null;
  /** Datos de la escena que el reto debe recuperar sin volver a consultar Directus. */
  keyword?: string;
  sceneEs?: string;
  storyEn?: string | null;
  bridgeWord?: string | null;
  targetSentenceEs?: string | null;
  targetSentenceEn?: string | null;
  distractor?: string | null;
  irregularForms?: IrregularForms | null;
  acceptedAt: string;
  /** Índice de descubrimiento a partir del cual puede aparecer el reto sorpresa. */
  unlockAfterIndex: number;
}

export type RecoveryResolution =
  | { type: 'recovered'; wordId: number; xp: number }
  | { type: 'requeued'; wordId: number }
  | { type: 'not-found'; wordId: number };

export type DiscoverySwipeResult =
  | { type: 'accepted'; wordId: number; associationId: number; batchComplete: boolean }
  | { type: 'alternative'; wordId: number; rejectedAssociationId: number; nextAssociationId: number }
  | { type: 'alternatives-exhausted'; wordId: number; rejectedAssociationId: number }
  | { type: 'skipped'; wordId: number; associationId: number; batchComplete: boolean }
  | { type: 'not-ready' };

export type DiscoveryGenerationResult =
  | { type: 'generated'; wordId: number; associationId: number }
  | { type: 'unavailable'; wordId: number; reason: string }
  | { type: 'error'; wordId: number; reason: string };

export interface DiscoveryQueueOptions {
  batchSize?: number;
  /** Número de tarjetas posteriores que deben estar preparadas. */
  preloadAhead?: number;
  /** Alternativas preparadas por palabra, incluida la asociación inicial. */
  minimumAlternatives?: number;
  storageKey?: string;
  /** Ignora la ronda guardada y abre el siguiente lote del cursor. */
  startNewBatch?: boolean;
  /** Identifica cada petición de ronda nueva aunque la ruta no se desmonte. */
  batchKey?: string;
}

export interface DiscoveryQueueResult {
  status: DiscoveryQueueStatus;
  current: DiscoveryCard | null;
  /** Las próximas tarjetas ya materializadas; la UI no debe pedir datos al animar. */
  preloaded: DiscoveryCard[];
  recoveryQueue: RecoveryQueueItem[];
  readyForRecovery: RecoveryQueueItem[];
  progress: { current: number; total: number; accepted: number };
  error: Error | null;
  swipeRight(): DiscoverySwipeResult;
  swipeLeft(): DiscoverySwipeResult;
  /** Descarta la tarjeta cuando el usuario no quiere guardar ninguna asociación. */
  skipCurrent(): DiscoverySwipeResult;
  /** Consolida o vuelve a poner en cola una palabra aceptada tras el micro-reto. */
  resolveRecovery(wordId: number, result: 'ok' | 'fail', ms: number): Promise<RecoveryResolution>;
  /** Genera una asociación adicional sin abandonar la tarjeta actual. */
  generateAlternative(): Promise<DiscoveryGenerationResult>;
  retryPreload(): void;
  completeAlchemy(): Promise<DiscoverySwipeResult>;
}
