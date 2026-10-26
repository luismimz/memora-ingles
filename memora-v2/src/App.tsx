import { ScreenHeading } from './components/ScreenHeading';
import { lazy, useEffect, useRef, useState, type FormEvent } from 'react';
import { DeferredScreen } from './components/DeferredScreen';
import { LanguageGame } from './LanguageGame';
import { LearningLibrary, type LibraryBrowseState } from './components/LearningLibrary';
import { journeyEntryMode, missingGrammarWords } from './domain/learningModes';
import { readWordMemories } from './domain/memory';
import type { LearningMode } from './domain/game';
import { JourneyHome } from './components/JourneyHomeV2';
import { completedVocabularyStop } from './domain/journeyMap';
import { ArcadeExperience, eligibleGrammarUnits } from './components/ArcadeExperience';
import { readLearningActivities } from './domain/learningActivity';
import { shouldOfferMicroArcade, microRounds, arcadeCandidateIds } from './domain/microArcade';
import { completeArcadeCadence, consumeAutomaticArcade, pendingAutomaticArcade, separatedArcadeUnits, type AutomaticArcadeMode } from './domain/arcadeCadence';
import { MirrorLessonExperience } from './components/MirrorLessonExperience';
import { PlayingGrammarReview } from './components/PlayingGrammarReview';
import type { AtomicUnit } from './domain/unit';
import type { MeatPreparationTarget } from './domain/meatCookingPractice';
import { nextPlayableUnit, orderedJourneyUnits, readUnitProgress } from './domain/journey';
import { previewUnit, reviewUnits } from './preview/previewUnit';
import { DirectusError, endSession, hasSession, loadPublishedUnitSummaries, loadUnit, loadKeysPilot, loadMirrorPilot, logIn, loadIdentity, clearAssetCache, type UnitSummary } from './services/directus';
import { prefetchSpeech, stopSpeech } from './services/audio';
import { useAppearance } from './useAppearance';
import { startProgressSync, type SyncStatus } from './services/progressSync';
import { buildJourneyRoute, grammarTricks, missingTrickWords, nextJourneyStop, trickStop } from './domain/journeyTricks';
import { JourneyTrickExperience } from './components/JourneyTrickExperience';
import { loadLearningLibrary } from './services/directus';
import { GrammarJourney } from './components/GrammarJourney';
import { grammarJourney, grammarPreparationCandidate, missingGrammarStop, nextGrammarStop, readGrammarPosition, writeGrammarPosition } from './domain/grammarJourney';

const ContentManager = lazy(() => import('./components/ContentManager').then((module) => ({ default: module.ContentManager })));
const PhrasalFusionDemo = lazy(() => import('./components/PhrasalFusionDemo').then((module) => ({ default: module.PhrasalFusionDemo })));
const GrammarWorkshop = lazy(() => import('./components/GrammarWorkshop').then((module) => ({ default: module.GrammarWorkshop })));
const ProfileView = lazy(() => import('./components/ProfileView').then((module) => ({ default: module.ProfileView })));
const EvolutionView = lazy(() => import('./components/EvolutionView').then((module) => ({ default: module.EvolutionView })));

const previewAllowed = import.meta.env.DEV;
const previewRequested = previewAllowed && new URLSearchParams(window.location.search).has('preview');
const fusionDemoRequested = previewAllowed && new URLSearchParams(window.location.search).has('fusion-demo');
const playingReviewRequested = previewRequested && new URLSearchParams(window.location.search).get('grammar-review') === 'playing';
const previewSummaries: UnitSummary[] = reviewUnits.map((unit) => ({ id: unit.id, title: unit.title, kind: unit.kind, contentVersion: unit.contentVersion, location: unit.location, hasDialogue: Boolean(unit.communication?.dialogue), teaser: unit.communication?.dialogue?.context, words: unit.words.map(({ en, es }) => ({ en, es })), sentence: { en: unit.sentence.en, es: unit.sentence.es }, grammarTricks: grammarTricks(unit) }));
export default function App() {
  const { appearance, toggleAppearance } = useAppearance();
  const [preview, setPreview] = useState(previewRequested);
  const [authenticated, setAuthenticated] = useState(hasSession());
  const [unit, setUnit] = useState<AtomicUnit | null>(playingReviewRequested ? previewUnit : null);
  const [learningMode, setLearningMode] = useState<LearningMode>(playingReviewRequested ? 'grammar' : 'adventure');
  const [libraryMode, setLibraryMode] = useState<'vocabulary' | 'grammar' | null>(null);
  const [libraryUnits, setLibraryUnits] = useState<AtomicUnit[]>([]);
  const libraryBrowse = useRef<Record<string, LibraryBrowseState>>({});
  const [conversationStart, setConversationStart] = useState(false);
  const [lastOpenedUnitId, setLastOpenedUnitId] = useState<string | null>(null);
  const [resumeMode, setResumeMode] = useState<LearningMode>('adventure');
  const [profileOpen, setProfileOpen] = useState(false);
  // Read-only visual QA of the real history view, without accounts or fixture writes.
  // previewRequested is false in production, so this cannot expose a learner's data.
  const [evolutionOpen, setEvolutionOpen] = useState(previewRequested && new URLSearchParams(window.location.search).get('view') === 'evolution');
  const [pilot, setPilot] = useState<AtomicUnit | null>(null);
  const [mirrorPilot, setMirrorPilot] = useState<AtomicUnit | null>(null);
  const [contentOpen, setContentOpen] = useState(false);
  const [microSession, setMicroSession] = useState<{ units: AtomicUnit[]; inspection: boolean; automatic?: boolean; initialMode?: AutomaticArcadeMode; resumeCurrent?: boolean; requestId: number } | null>(null);
  const [units, setUnits] = useState<UnitSummary[]>(previewRequested ? previewSummaries : []);
  const [userId, setUserId] = useState('preview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [expansionTest, setExpansionTest] = useState<{ missionId: string; unit: AtomicUnit } | null>(null);
  const [fusionOpen, setFusionOpen] = useState(fusionDemoRequested);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [loading, setLoading] = useState(!previewRequested && hasSession());
  const [error, setError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [, refreshProgress] = useState(0);
  const [activeTrick, setActiveTrick] = useState<UnitSummary | null>(null);
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);
  const [preparingGrammar, setPreparingGrammar] = useState<UnitSummary | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);
  const [arcadeLoading, setArcadeLoading] = useState(false);
  const [catalogueAttempt, setCatalogueAttempt] = useState(0);
  const arcadeOpening = useRef(false);
  const arcadeRequest = useRef(0);
  const lessonRequest = useRef(0);

  function cancelArcadeLaunch() {
    arcadeRequest.current++;
    arcadeOpening.current = false;
    setArcadeLoading(false);
  }
  function leaveLesson() {
    lessonRequest.current++;
    cancelArcadeLaunch();
    stopSpeech(); setMicroSession(null); setUnit(null); setActiveTrick(null);
    setReviewMode(false); setExpansionTest(null); setPreparingGrammar(null); setLoading(false);
    setLoadingActivity(null);
  }
  function beginActivityLoad(label: string) { setLoadingActivity(label); setLoading(true); }
  useEffect(() => () => { lessonRequest.current++; cancelArcadeLaunch(); }, []);

  // A delayed clip belongs to the screen that requested it, not the next one.
  useEffect(() => () => stopSpeech(), [unit?.id, libraryMode, grammarOpen, fusionOpen, Boolean(microSession)]);

  useEffect(() => {
    try { setLastOpenedUnitId(localStorage.getItem(`memora-v2.resume.${userId}`)); const mode = localStorage.getItem(`memora-v2.resume-mode.${userId}`); setResumeMode(mode === 'vocabulary' || mode === 'grammar' ? mode : 'adventure'); }
    catch { setLastOpenedUnitId(null); }
  }, [userId]);

  function rememberUnit(id: string | null, mode: LearningMode = 'adventure') {
    if (libraryMode === 'grammar') {
      if (!preview) writeGrammarPosition(userId, id);
      refreshProgress((version) => version + 1);
      return;
    }
    setLastOpenedUnitId(id);
    setResumeMode(mode);
    try {
      if (id) localStorage.setItem(`memora-v2.resume.${userId}`, id);
      else localStorage.removeItem(`memora-v2.resume.${userId}`);
      localStorage.setItem(`memora-v2.resume-mode.${userId}`, mode);
    } catch { /* La navegación sigue funcionando sin almacenamiento local. */ }
  }

  useEffect(() => {
    if (preview || !authenticated || userId === 'preview') return;
    const sync = startProgressSync(userId, setSyncStatus);
    const refresh = () => refreshProgress((version) => version + 1);
    window.addEventListener('memora-progress-restored', refresh);
    window.addEventListener('memora-learning-activity', refresh);
    return () => { sync.stop(); window.removeEventListener('memora-progress-restored', refresh); window.removeEventListener('memora-learning-activity', refresh); };
  }, [preview, authenticated, userId, isAdmin]);

  useEffect(() => {
    if (preview || !authenticated) return undefined;
    const controller = new AbortController();
    setLoadingActivity(null);
    setLoading(true);
    setError(null);
    void loadIdentity(controller.signal).then(async (user) => {
      if (controller.signal.aborted) return;
      setUserId(user.id);
      setIsAdmin(user.isAdmin);
      const loaded = await loadPublishedUnitSummaries(controller.signal);
      if (controller.signal.aborted) return;
      // La home del alumno solo recibe el catálogo publicado. Los pilotos se
      // conservan para sus herramientas específicas, pero no deben mezclarse
      // con las misiones publicadas.
      setUnits(loaded);
      // Optional history metadata/editorial tools must not hold the published
      // learner route behind slow pilot requests. They retain the same gates.
      void Promise.all([
        loadKeysPilot(controller.signal).catch(() => null),
        loadMirrorPilot(controller.signal).catch(() => null),
      ]).then(([loadedPilot, loadedMirror]) => {
        if (controller.signal.aborted) return;
        setPilot(loadedPilot);
        setMirrorPilot(loadedMirror);
      });
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      if (reason instanceof DirectusError && reason.status === 403) {
        setError('Directus no permite leer el catálogo de V2. Hay que comprobar que exista Learning Units y que tu cuenta tenga permiso de lectura.');
      } else {
        setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las unidades publicadas desde Directus.');
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authenticated, preview, catalogueAttempt]);

  if (fusionOpen) return <DeferredScreen label="el laboratorio" onBack={() => setFusionOpen(false)}><PhrasalFusionDemo onBack={() => setFusionOpen(false)} onPractice={(family) => { void import('./preview/phrasalPacks').then(({ makePhrasalPacks }) => {
    const packs = makePhrasalPacks(family);
    setLearningMode('vocabulary'); setLibraryUnits(packs); setLibraryMode('vocabulary');
    setConversationStart(false); setExpansionTest(null); setContentOpen(false);
    setReviewMode(true); setUnit(packs[0]); setFusionOpen(false);
  }).catch(() => setUnitError('No se pudo preparar esta familia.')); }} /></DeferredScreen>;
  if (grammarOpen) return <DeferredScreen label="el taller de gramática" onBack={() => setGrammarOpen(false)}><GrammarWorkshop onBack={() => setGrammarOpen(false)} /></DeferredScreen>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoadingActivity(null);
    setLoading(true);
    try { await logIn(email, password); setAuthenticated(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); setLoading(false); }
  }

  function usePreview() {
    lessonRequest.current++; cancelArcadeLaunch();
    setActiveTrick(null);
    if (!previewAllowed) return;
    setMicroSession(null);
    setPreview(true);
    setUnits(previewSummaries);
    setUnit(null);
    setProfileOpen(false);
    setContentOpen(false);
    setUserId('preview');
    setLibraryMode(null); setLearningMode('adventure');
    setIsAdmin(false);
    setReviewMode(false);
    setFusionOpen(false);
    setLoading(false);
    setError(null);
  }

  function exit() {
    lessonRequest.current++; cancelArcadeLaunch();
    setPreparingGrammar(null);
    setActiveTrick(null);
    setMicroSession(null);
    setLibraryMode(null); setLearningMode('adventure');
    stopSpeech();
    clearAssetCache();
    endSession();
    setAuthenticated(false);
    setPreview(false);
    setUnit(null);
    setProfileOpen(false);
    setEvolutionOpen(false); setPilot(null); setMirrorPilot(null);
    setContentOpen(false);
    setUnits([]);
    setUserId('preview');
    setIsAdmin(false);
    setReviewMode(false);
    setFusionOpen(false);
  }

  async function openUnit(summary: UnitSummary, directConversation = false, requestedMode?: LearningMode) {
    const request = ++lessonRequest.current;
    cancelArcadeLaunch();
    setPreparingGrammar(null);
    if (summary.routeTrick) {
      const missing = missingTrickWords(summary, readWordMemories(userId), userId);
      if (!preview && missing.length) { setUnitError(`Prepara primero estas palabras: ${missing.join(', ')}.`); return; }
      beginActivityLoad('Abriendo el truco…'); setUnit(null); setLibraryMode(null); setUnitError(null); setReviewMode(false); setConversationStart(false); setExpansionTest(null);
      try {
        const source = preview ? reviewUnits.find((candidate) => candidate.id === summary.routeTrick!.sourceId) : await loadUnit(summary.routeTrick.sourceId);
        if (request !== lessonRequest.current) return;
        if (!source || !grammarTricks(source).some((trick) => trick.formId === summary.routeTrick!.formId && trick.skill === summary.routeTrick!.skill)) throw new Error('Este truco ha cambiado y necesita recargar el recorrido.');
        // Recheck current content, not just potentially stale Home metadata.
        const current = { ...summary, words: source.words, contentVersion: source.contentVersion, routeTrick: grammarTricks(source).find((trick) => trick.formId === summary.routeTrick!.formId)! };
        if (!preview && missingTrickWords(current, readWordMemories(userId), userId).length) throw new Error('Este truco necesita palabras que aún no has practicado. Puedes seguir con las palabras.');
        setActiveTrick(current); setLearningMode('grammar'); rememberUnit(current.id, 'grammar'); setUnit(source);
        resumeAutomaticArcade(source);
      } catch (reason) { if (request === lessonRequest.current) { setActiveTrick(null); setUnitError(reason instanceof Error ? reason.message : 'No se pudo abrir el truco.'); } }
      finally { if (request === lessonRequest.current) setLoading(false); }
      return;
    }
    setActiveTrick(null);
    const mode = requestedMode ?? (directConversation ? 'adventure' : summary.id === lastOpenedUnitId ? resumeMode : journeyEntryMode(summary));
    setLearningMode(mode); setLibraryMode(null);
    setConversationStart(directConversation);
    setExpansionTest(null);
    setUnitError(null);
    setReviewMode(false);
    if (preview) { rememberUnit(summary.id, mode); setUnit(reviewUnits.find((item) => item.id === summary.id) ?? previewUnit); return; }
    setUnit(null);
    beginActivityLoad('Abriendo tu actividad…');
    try {
      const loaded = summary.id === pilot?.id ? pilot : summary.id === mirrorPilot?.id ? mirrorPilot : await loadUnit(summary.id);
      if (request !== lessonRequest.current) return;
      const enteringScene = mode === 'adventure' && !directConversation && (requestedMode === 'adventure' || summary.id !== lastOpenedUnitId && journeyEntryMode(summary) === 'adventure');
      if (enteringScene && journeyEntryMode({ ...loaded, hasDialogue: Boolean(loaded.communication?.dialogue), grammarTricks: grammarTricks(loaded) }) !== 'adventure') throw new Error('Esta escena ha cambiado y ya no contiene el recorrido completo. Tu práctica sigue guardada; puedes retomarla.');
      const firstWord = loaded.words.find((word) => word.learningRole !== 'review') ?? loaded.words[0];
      prefetchSpeech(firstWord.en.toLowerCase(), firstWord.audioUrl); rememberUnit(summary.id, mode); setUnit(loaded);
      resumeAutomaticArcade(loaded);
    }
    catch (reason) { if (request === lessonRequest.current) setUnitError(reason instanceof Error ? reason.message : 'No se pudo abrir esta escena.'); }
    finally { if (request === lessonRequest.current) setLoading(false); }
  }

  function prepareFoodSource(target: MeatPreparationTarget) {
    const source = units.find((candidate) => candidate.id === target.unitId);
    const trick = target.mode === 'grammar' ? source?.grammarTricks?.find((candidate) => candidate.formId === 'ing') : undefined;
    if (!source || target.mode === 'grammar' && !trick) { setUnitError('No está disponible la preparación de esta escena. Tu progreso se conserva.'); return; }
    if (trick) void openUnit(trickStop(source, trick));
    else void openUnit(source, false, 'vocabulary');
  }

  function openReview(id: string) {
    lessonRequest.current++; cancelArcadeLaunch();
    setActiveTrick(null);
    setLearningMode('adventure'); setLibraryMode(null);
    if (!isAdmin && !preview) return;
    const draft = reviewUnits.find((item) => item.id === id);
    if (!draft) return;
    setReviewMode(true);
    setUnit(draft);
  }

  function reviewManagedUnit(draft: AtomicUnit) {
    lessonRequest.current++; cancelArcadeLaunch();
    const standalone = draft.kind === 'grammar-lesson' ? grammarTricks(draft)[0] : null;
    setActiveTrick(standalone ? trickStop(draft, standalone) : null);
    setExpansionTest(null);
    setContentOpen(true);
    setLibraryMode(null);
    setLearningMode(standalone ? 'grammar' : draft.kind === 'vocabulary-pack' ? 'vocabulary' : 'adventure');
    setConversationStart(false);
    setReviewMode(true);
    setUnit(draft);
  }

  function testExpansionMission(missionId: string, candidate: AtomicUnit) {
    lessonRequest.current++; cancelArcadeLaunch();
    setActiveTrick(null);
    setContentOpen(false);
    setExpansionTest({ missionId, unit: candidate });
    setReviewMode(true);
    setUnit(candidate);
  }

  function openMirrorFromHome() {
    lessonRequest.current++; cancelArcadeLaunch();
    setActiveTrick(null);
    setLearningMode('adventure'); setLibraryMode(null);
    setExpansionTest(null);
    setConversationStart(false);
    setReviewMode(false);
    const mirror = preview ? reviewUnits.find((candidate) => candidate.mirror) : mirrorPilot;
    if (!mirror) {
      setUnitError('La Ficha Espejo todavía no está disponible.');
      return;
    }
    rememberUnit(mirror.id);
    setUnit(mirror);
  }

  function finishExpansionTest(result: { correct: number; attempted: number }) {
    if (!expansionTest) return;
    let tests: Record<string, unknown> = {};
    try { const saved: unknown = JSON.parse(localStorage.getItem('memora-v2.world1-expansion-tests') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) tests = saved as Record<string, unknown>; } catch { /* El dato dañado no bloquea el final. */ }
    tests[expansionTest.missionId] = {
      missionId: expansionTest.missionId,
      completedAt: new Date().toISOString(),
      correct: result.correct,
      attempted: result.attempted,
      passed: result.attempted === 3,
    };
    try { localStorage.setItem('memora-v2.world1-expansion-tests', JSON.stringify(tests)); }
    catch { setUnitError('La prueba terminó, pero el navegador no pudo guardar su resultado.'); }
    setExpansionTest(null);
    setUnit(null);
    setReviewMode(false);
    setContentOpen(true);
  }

  async function refreshPublishedUnits() {
    const loaded = await loadPublishedUnitSummaries();
    setUnits(loaded);
  }

  function resumeAutomaticArcade(current: AtomicUnit) {
    const pending = !preview && !reviewMode && pendingAutomaticArcade(userId);
    if (pending) void openArcade(true, pending, current);
  }

  async function openArcade(automatic = false, initialMode: AutomaticArcadeMode = 'associations', resumedUnit?: AtomicUnit, advanceIfEmpty = false) {
    if (arcadeOpening.current || microSession) return;
    arcadeOpening.current = true;
    setArcadeLoading(true);
    const request = ++arcadeRequest.current;
    setUnitError(null);
    try {
      const current = resumedUnit ?? unit;
      const candidateIds = arcadeCandidateIds(units, readWordMemories(userId), readLearningActivities(userId), current?.id);
      const loaded = preview ? [] : await Promise.allSettled(
        candidateIds.map((id) => id === current?.id ? Promise.resolve(current) : id === pilot?.id ? Promise.resolve(pilot) : id === mirrorPilot?.id ? Promise.resolve(mirrorPilot) : loadUnit(id)),
      );
      if (request !== arcadeRequest.current) return;
      const candidates = preview ? (current ? [current] : reviewUnits) : loaded.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
      const practiceCandidates = automatic && !preview && !reviewMode ? separatedArcadeUnits(candidates, readLearningActivities(userId)) : candidates;
      // No synthetic recall or exposure is inferred from a completion flag.
      // Opening/closing the modal keeps the underlying lesson mounted.
      const hasGrammar = initialMode === 'grammar' && eligibleGrammarUnits(userId, practiceCandidates).length > 0;
      if (automatic && !hasGrammar && !microRounds(userId, practiceCandidates).some((round) => round.options.length >= 2)) {
        // Keep the pending round if content is temporarily unavailable. Never manufacture exposure.
        if (loaded.some((result) => result.status === 'rejected')) setUnitError('El repaso aún no se pudo cargar. Tu ronda sigue guardada; puedes reintentar al continuar.');
        // Finishing an activity may prepare a surprise, but must not remove its
        // feedback. Only the learner's explicit continuation can leave it.
        else if (advanceIfEmpty && !resumedUnit) advanceAfterUnit();
        return;
      }
      // Opening is not finishing: reload must keep an interrupted surprise pending.
      setMicroSession({ units: candidates, inspection: preview || reviewMode, automatic, initialMode, resumeCurrent: Boolean(resumedUnit), requestId: request });
    } catch (reason) {
      if (request === arcadeRequest.current) setUnitError(reason instanceof Error ? reason.message : 'No se pudo preparar la ronda.');
    } finally { if (request === arcadeRequest.current) { arcadeOpening.current = false; setArcadeLoading(false); } }
  }

  async function openLibrary(mode: 'vocabulary' | 'grammar') {
    const request = ++lessonRequest.current;
    cancelArcadeLaunch();
    setPreparingGrammar(null);
    setUnitError(null); beginActivityLoad(mode === 'vocabulary' ? 'Abriendo las tandas de palabras…' : 'Abriendo el recorrido de gramática…'); setActiveTrick(null); setLibraryNotice(null);
    try {
      const result = preview ? { units: mode === 'vocabulary' ? [...reviewUnits, ...(await import('./preview/vocabularyPacks')).vocabularyPreviewPacks, ...(await import('./preview/phrasalPacks')).phrasalPreviewPacks] : reviewUnits, failed: [] } : await loadLearningLibrary(units, mode);
      if (request !== lessonRequest.current) return;
      const loaded = result.units;
      if (result.failed.length) setLibraryNotice(`${result.failed.length} ${result.failed.length === 1 ? 'misión no se pudo cargar' : 'misiones no se pudieron cargar'}. Puedes usar las demás; tu progreso se conserva.`);
      setLibraryUnits(loaded); setLibraryMode(mode);
      setUnit(null); setEvolutionOpen(false); setProfileOpen(false);
    } catch (reason) { if (request === lessonRequest.current) setUnitError(reason instanceof Error ? reason.message : 'No se pudo abrir este apartado.'); }
    finally { if (request === lessonRequest.current) setLoading(false); }
  }
  function openLibraryUnit(candidate: AtomicUnit, mode: LearningMode) {
    lessonRequest.current++; cancelArcadeLaunch();
    if (candidate.kind === 'grammar-lesson' && mode === 'grammar') { openGrammarStop(trickStop(candidate, grammarTricks(candidate)[0])); return; }
    setActiveTrick(null);
    if (candidate.kind === 'vocabulary-pack' && mode !== 'vocabulary') { setUnitError('Este paquete prepara palabras; no contiene una lección de gramática.'); return; }
    const missing = mode === 'grammar' ? missingGrammarWords(candidate, readWordMemories(userId)) : [];
    if (!preview && missing.length) { setLibraryNotice(`Prepara primero estas palabras: ${missing.join(', ')}.`); return; }
    if (mode === 'vocabulary') { const firstWord = candidate.words.find((word) => word.learningRole !== 'review') ?? candidate.words[0]; prefetchSpeech(firstWord.en.toLowerCase(), firstWord.audioUrl); }
    setLearningMode(mode); setConversationStart(false); setExpansionTest(null); setReviewMode(false);
    rememberUnit(candidate.id, mode); setUnit(candidate);
    resumeAutomaticArcade(candidate);
  }

  function openGrammarStop(stop: UnitSummary) {
    lessonRequest.current++; cancelArcadeLaunch();
    setPreparingGrammar(null);
    const source = libraryUnits.find((candidate) => candidate.id === (stop.routeTrick?.sourceId ?? stop.id));
    if (!source) { setLibraryNotice('No se pudo abrir este truco. Recarga el recorrido para intentarlo de nuevo.'); return; }
    const missing = missingGrammarStop(stop, libraryUnits, readWordMemories(userId), userId);
    if (!preview && missing.length) { setLibraryNotice(`Prepara primero en Inicio: ${missing.join(', ')}.`); return; }
    if (!stop.routeTrick) { openLibraryUnit(source, 'grammar'); return; }
    setActiveTrick(stop); setLearningMode('grammar'); setConversationStart(false); setExpansionTest(null); setReviewMode(false); setLibraryNotice(null);
    rememberUnit(stop.id, 'grammar'); setUnit(source);
    resumeAutomaticArcade(source);
  }

  async function prepareGrammarStop(stop: UnitSummary) {
    const request = ++lessonRequest.current;
    cancelArcadeLaunch();
    const missing = missingGrammarStop(stop, libraryUnits, readWordMemories(userId), userId);
    if (!missing.length) { openGrammarStop(stop); return; }
    const candidate = grammarPreparationCandidate(stop, units, libraryUnits, readWordMemories(userId));
    if (!candidate) {
      setUnit(null); setPreparingGrammar(null); setActiveTrick(null);
      setLibraryNotice(`Este truco necesita fichas de vocabulario que aún no están disponibles: ${missing.join(', ')}. Puedes seguir con las otras paradas; no se ha cambiado tu progreso.`);
      return;
    }
    beginActivityLoad('Preparando las palabras del truco…'); setUnit(null); setActiveTrick(null); setLibraryNotice(null);
    try {
      const loaded = preview ? reviewUnits.find((item) => item.id === candidate.id) : await loadUnit(candidate.id);
      if (request !== lessonRequest.current) return;
      if (!loaded) throw new Error('No se encontró una ficha publicada para estas palabras.');
      setPreparingGrammar(stop); setLearningMode('vocabulary'); setConversationStart(false); setExpansionTest(null); setReviewMode(false);
      if (!preview) writeGrammarPosition(userId, stop.id);
      setUnit(loaded);
      const firstWord = loaded.words.find((word) => word.learningRole !== 'review') ?? loaded.words[0];
      prefetchSpeech(firstWord.en.toLowerCase(), firstWord.audioUrl);
      resumeAutomaticArcade(loaded);
    } catch (reason) { if (request === lessonRequest.current) { setPreparingGrammar(null); setLibraryNotice(reason instanceof Error ? reason.message : 'No se pudieron abrir las palabras del truco.'); } }
    finally { if (request === lessonRequest.current) setLoading(false); }
  }

  function continueAfterUnit() {
    if (microSession || arcadeOpening.current) return;
    const pending = !preview && !reviewMode && pendingAutomaticArcade(userId);
    if (pending) { void openArcade(true, pending, undefined, true); return; }
    advanceAfterUnit();
  }

  function advanceAfterUnit() {
    if (!unit) return;
    stopSpeech();
    if (preparingGrammar) { void prepareGrammarStop(preparingGrammar); return; }
    if (contentOpen && reviewMode) { setUnit(null); setReviewMode(false); return; }
    const following = libraryMode === 'grammar' ? followingGrammarStop(activeTrick?.id ?? unit.id) : !libraryMode && !reviewMode ? followingJourneyStop(activeTrick?.id ?? unit.id) : nextScene;
    if (following) {
      if (libraryMode === 'grammar') openGrammarStop(following);
      else if (libraryMode) openLibraryUnit(following as AtomicUnit, learningMode);
      else if (reviewMode) openReview(following.id);
      else void openUnit(following);
      return;
    }
    setUnit(null);
    setActiveTrick(null);
    if (libraryMode !== 'grammar') setLibraryMode(null);
    setReviewMode(false);
  }

  const journeyRoute = buildJourneyRoute(units, readWordMemories(userId));
  const grammarRoute = libraryMode === 'grammar' ? grammarJourney(libraryUnits) : [];
  function followingGrammarStop(id: string) {
    return nextGrammarStop(id, grammarRoute, libraryUnits, readWordMemories(userId), readLearningActivities(userId), preview);
  }
  function followingJourneyStop(id: string) {
    const activities = readLearningActivities(userId);
    const memories = readWordMemories(userId);
    const completedIds = new Set(units.filter((candidate) => readUnitProgress(userId, candidate.id) || completedVocabularyStop(candidate, activities)).map((candidate) => candidate.id));
    return nextJourneyStop(id, buildJourneyRoute(units, memories), memories, activities, completedIds);
  }
  const playableUnits: readonly (UnitSummary | AtomicUnit)[] = libraryMode === 'grammar' ? grammarRoute : libraryMode
    ? libraryUnits
    : reviewMode ? reviewUnits : journeyRoute;
  const nextScene = unit ? libraryMode === 'grammar' ? followingGrammarStop(activeTrick?.id ?? unit.id) : !libraryMode && !reviewMode ? followingJourneyStop(activeTrick?.id ?? unit.id) : nextPlayableUnit(unit.id, playableUnits) : undefined;
  const nextLabel = preparingGrammar ? missingGrammarStop(preparingGrammar, libraryUnits, readWordMemories(userId), userId).length ? 'Seguir preparando palabras →' : 'Entrar al truco →' : nextScene ? 'Continuar jugando →' : 'Volver al recorrido →';
  const routePosition = unit ? (libraryMode || reviewMode ? orderedJourneyUnits(playableUnits) : playableUnits).findIndex((candidate) => candidate.id === (activeTrick?.id ?? unit.id)) : -1;
  function rememberAfterCompletion(launchArcade = true) {
    if (preview || reviewMode) return;
    const arcadeMode = unit ? completeArcadeCadence(userId, activeTrick?.id ?? unit.id, unit.contentVersion ?? '1', Boolean(activeTrick) || learningMode === 'grammar') : null;
    if (preparingGrammar) { writeGrammarPosition(userId, preparingGrammar.id); refreshProgress((version) => version + 1); if (arcadeMode && launchArcade) void openArcade(true, arcadeMode); return; }
    const following = libraryMode === 'grammar' ? followingGrammarStop(activeTrick?.id ?? unit?.id ?? '') : !libraryMode ? followingJourneyStop(activeTrick?.id ?? unit?.id ?? '') : nextScene;
    const nextMode = libraryMode || !following ? learningMode : journeyEntryMode(following);
    rememberUnit(following?.id ?? activeTrick?.id ?? unit?.id ?? null, nextMode);
    refreshProgress((version) => version + 1);
    if (arcadeMode && launchArcade) void openArcade(true, arcadeMode);
  }

  const microOverlay = microSession ? <ArcadeExperience userId={userId} units={microSession.units} inspection={microSession.inspection} initialMode={microSession.initialMode} automatic={microSession.automatic} onExit={() => {
    if (microSession.requestId !== arcadeRequest.current) return;
    arcadeRequest.current++;
    stopSpeech(); setMicroSession(null);
    if (microSession.automatic) {
      consumeAutomaticArcade(userId);
      // A resumed round overlays the already saved next stop; do not skip that stop.
      if (!microSession.resumeCurrent) advanceAfterUnit();
    }
  }} /> : arcadeLoading ? <aside className="lesson-notice" aria-label="Preparación de Arcade"><p role="status">Preparando una ronda con tus palabras practicadas…</p><button type="button" onClick={cancelArcadeLaunch}>Cancelar preparación</button></aside> : null;
  const lessonNotice = unitError ? <aside className="lesson-notice" role="alert"><p>{unitError}</p><button type="button" onClick={() => setUnitError(null)}>Entendido</button></aside> : null;
  const offerArcade = unit && (preview || shouldOfferMicroArcade(userId, unit.id));
  if (unit) {
    // Admins playing from Home are learners too. Only explicit editorial review is read-only.
    const inspectionMode = reviewMode || preview;
    if (activeTrick) return <><JourneyTrickExperience continuous={!inspectionMode} key={`${activeTrick.id}-${userId}`} unit={unit} stop={activeTrick} preparationSources={units} onPrepare={prepareFoodSource} userId={userId} inspection={inspectionMode} onFinished={() => rememberAfterCompletion(false)} onNext={continueAfterUnit} nextLabel={nextLabel} onExit={leaveLesson} syncStatus={syncStatus} appearance={appearance} onToggleAppearance={toggleAppearance} />{microOverlay}{lessonNotice}</>;
    if (preview && learningMode === 'grammar' && unit.grammar.some((form) => form.englishBase === 'play')) return <PlayingGrammarReview key={`playing-review-${unit.id}`} unit={previewUnit} mirrorUnit={reviewUnits.find((item) => item.mirror)!} onExit={() => { stopSpeech(); setUnit(null); setLibraryMode('grammar'); setLibraryUnits(reviewUnits); }} />;
    if (unit.mirror && learningMode !== 'vocabulary') return <><MirrorLessonExperience grammarOnly={learningMode === 'grammar'} key={`${unit.id}-${userId}-${inspectionMode}-${learningMode}`} unit={unit} userId={userId} inspection={inspectionMode} syncStatus={syncStatus} onFinished={rememberAfterCompletion} onExit={leaveLesson} onNext={continueAfterUnit} nextLabel={nextLabel} onEvolution={() => { leaveLesson(); setLibraryMode(null); if (!inspectionMode) setEvolutionOpen(true); }} onPractice={offerArcade ? () => void openArcade() : undefined} appearance={appearance} onToggleAppearance={toggleAppearance} />{microOverlay}{lessonNotice}</>;
return <><LanguageGame continuous={!inspectionMode} learningMode={learningMode} key={`${unit.id}-${userId}-${inspectionMode}-${learningMode}`} unit={unit} userId={userId} preview={preview} reviewMode={inspectionMode} startInConversation={conversationStart} nextLabel={nextLabel} positionLabel={preparingGrammar ? 'PREPARA EL TRUCO' : routePosition >= 0 ? `PARADA ${routePosition + 1}` : undefined} syncStatus={syncStatus} onFinished={() => rememberAfterCompletion(false)} onNext={continueAfterUnit} onComplete={expansionTest ? finishExpansionTest : undefined} onExit={leaveLesson} onEvolution={!inspectionMode ? () => { leaveLesson(); setLibraryMode(null); setEvolutionOpen(true); } : undefined} onPractice={offerArcade ? () => void openArcade() : undefined} appearance={appearance} onToggleAppearance={toggleAppearance} />{microOverlay}{lessonNotice}</>;
  }
  if (loading) return <main className="gate-screen"><section className="gate-card" aria-labelledby="activity-loading-title"><p className="eyebrow">MEMORA</p><ScreenHeading id="activity-loading-title" focusKey="loading">{loadingActivity ?? (authenticated ? 'Abriendo tu recorrido…' : 'Comprobando el acceso…')}</ScreenHeading><p role="status">{loadingActivity ? 'Estamos cargando el contenido. Puedes volver sin esperar; no se completará ninguna actividad por salir.' : 'Estamos comprobando el acceso y cargando el catálogo publicado.'}</p>{loadingActivity ? <button type="button" className="primary-action" onClick={leaveLesson}>Volver sin esperar</button> : null}</section></main>;
  if (authenticated && error && !profileOpen && !contentOpen) return <main className="gate-screen"><section className="gate-card"><p className="eyebrow">MEMORA</p><ScreenHeading focusKey="error">No pudimos abrir tu recorrido</ScreenHeading><p role="alert">No se pudo cargar el contenido publicado. Tu progreso no se ha borrado. Puedes volver a intentarlo sin cerrar sesión.</p><button type="button" className="primary-action" onClick={() => { setError(null); setCatalogueAttempt((attempt) => attempt + 1); }}>Volver a intentar</button>{isAdmin ? <details><summary>Detalles para administración</summary><p>{error}</p><button type="button" className="quiet-action" onClick={() => setProfileOpen(true)}>Perfil y gestión de contenido</button></details> : null}<button type="button" className="quiet-action" onClick={() => { setAuthenticated(false); setError(null); }}>Volver al acceso</button>{previewAllowed ? <button type="button" className="quiet-action" onClick={usePreview}>Ver la experiencia de prueba</button> : null}</section></main>;
  if (libraryMode === 'grammar' && !unit && (preview || authenticated)) return <GrammarJourney units={libraryUnits} userId={userId} inspection={preview} resumeId={readGrammarPosition(userId) || (resumeMode === 'grammar' ? lastOpenedUnitId : null)} notice={libraryNotice} onRetry={() => void openLibrary('grammar')} onOpen={openGrammarStop} onPrepare={(stop) => void prepareGrammarStop(stop)} onBack={() => setLibraryMode(null)} onArcade={() => { setLibraryMode(null); void openArcade(); }} onEvolution={!preview ? () => { setLibraryMode(null); setEvolutionOpen(true); } : undefined} appearance={appearance} onToggleAppearance={toggleAppearance} />;
  if (libraryMode && !unit && (preview || authenticated)) return <LearningLibrary mode={libraryMode} units={libraryUnits} userId={userId} inspection={preview} initialBrowse={libraryBrowse.current[`${userId}:${libraryMode}`]} onBrowseChange={(state) => { libraryBrowse.current[`${userId}:${libraryMode}`] = state; }} notice={libraryNotice} onRetry={() => void openLibrary(libraryMode)} onOpen={openLibraryUnit} onBack={() => setLibraryMode(null)} onWords={() => void openLibrary('vocabulary')} />;
  if (preview || authenticated) return <>{evolutionOpen
    ? <DeferredScreen label="Mi evolución" onBack={() => setEvolutionOpen(false)}><EvolutionView userId={userId} units={units} pilot={pilot} syncStatus={syncStatus} inspectionMode={preview} onBack={() => setEvolutionOpen(false)} onPractice={() => void openArcade()} onProfile={() => { setEvolutionOpen(false); setProfileOpen(true); }} onExit={exit} appearance={appearance} onToggleAppearance={toggleAppearance} /></DeferredScreen>
    : contentOpen && isAdmin && !preview
    ? <DeferredScreen label="el gestor de contenido" onBack={() => setContentOpen(false)}><ContentManager userId={userId} onBack={() => setContentOpen(false)} onReview={reviewManagedUnit} onPublished={refreshPublishedUnits} onTest={testExpansionMission} /></DeferredScreen>
    : profileOpen
    ? <DeferredScreen label="tu perfil" onBack={() => setProfileOpen(false)}><ProfileView key={userId} userId={userId} syncStatus={preview ? undefined : syncStatus} appearance={appearance} onToggleAppearance={toggleAppearance} onBack={() => setProfileOpen(false)} onExit={exit} onEvolution={!preview ? () => { setProfileOpen(false); setEvolutionOpen(true); } : undefined} onManageContent={isAdmin && !preview ? () => { setProfileOpen(false); setContentOpen(true); } : undefined} /></DeferredScreen>
    : <JourneyHome onStartScene={(summary) => void openUnit(summary, false, 'adventure')} resumeLearningMode={resumeMode} onWords={() => void openLibrary('vocabulary')} onGrammar={() => void openLibrary('grammar')} units={units} userId={userId} resumeUnitId={lastOpenedUnitId} error={unitError} onOpen={(summary) => void openUnit(summary)} onConverse={(summary) => void openUnit(summary, true)} onArcade={() => void openArcade()} onManageContent={isAdmin && !preview ? () => setContentOpen(true) : undefined} onMirror={preview || isAdmin && mirrorPilot ? openMirrorFromHome : undefined} onGrammarReview={preview || isAdmin ? () => setGrammarOpen(true) : undefined} onFusionDemo={preview || isAdmin ? () => setFusionOpen(true) : undefined} onTryPreview={previewAllowed && !preview ? usePreview : undefined} onExit={exit} onEvolution={!preview ? () => setEvolutionOpen(true) : undefined} onProfile={() => setProfileOpen(true)} appearance={appearance} onToggleAppearance={toggleAppearance} />}{microOverlay}</>;
  return <main className="gate-screen"><form className="gate-card" onSubmit={submit}><div className="gate-card-top"><span className="brand-mark">M</span><button type="button" className="appearance-toggle" onClick={toggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`} title={`Modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button></div><p className="eyebrow">MEMORA · NUEVA EXPERIENCIA</p><h1>Recuerda palabras. Úsalas en frases tuyas.</h1><label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error ? <p className="gate-error" role="alert">{error}</p> : null}<button type="submit" className="primary-action">Entrar a la unidad →</button>{previewAllowed ? <button type="button" className="quiet-action" onClick={usePreview}>Probar diseño sin tocar Directus</button> : null}</form></main>;
}
