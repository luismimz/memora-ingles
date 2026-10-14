import { useEffect, useState, type ChangeEvent } from 'react';
import { associationsNeedingReview, compareAssociationVersions, replaceAssociation, type WordMemory } from '../domain/memory';
import { validateApprovedAssociation, validateAssociationQuality, validateUnit, type AssociationQualityReport, type AtomicUnit, type AtomicWord } from '../domain/unit';
import { loadManagedUnitSummaries, loadManagedUnit, publishUnit, unpublishUnit, approveUnitReview, saveUnitDraft, type ManagedUnitSummary } from '../services/directus';
import expansionBacklog from '../../../backend/curriculum/world1-expansion-backlog.json';
import { reviewUnits } from '../preview/previewUnit';

type ExpansionMission = {
  id: string;
  zone: string;
  locus: string;
  layer: 'observe' | 'act' | 'converse';
  grammar: string;
  newWords: string[];
  target: string;
};

type ExpansionBlock = {
  id: string;
  purpose: string;
  missions: ExpansionMission[];
};

const expansionBlocks = expansionBacklog.blocks as ExpansionBlock[];
const expansionMissions = expansionBlocks.flatMap((block) => block.missions);
type ExpansionTest = { completedAt: string; correct: number; attempted: number; passed: boolean };
type ExpansionDecision = { decision: 'approved_for_next_phase' | 'rejected'; reviewer: string; decidedAt: string };

function readExpansionTests(): Record<string, ExpansionTest> {
  try { return JSON.parse(localStorage.getItem('memora-v2.world1-expansion-tests') || '{}') as Record<string, ExpansionTest>; }
  catch { return {}; }
}

function readExpansionDecisions(): Record<string, ExpansionDecision> {
  try { return JSON.parse(localStorage.getItem('memora-v2.world1-expansion-decisions') || '{}') as Record<string, ExpansionDecision>; }
  catch { return {}; }
}

export function ContentManager({ userId, onBack, onReview, onPublished, onTest }: {
  userId: string;
  onBack: () => void;
  onReview: (unit: AtomicUnit) => void;
  onPublished: () => Promise<void>;
  onTest: (missionId: string, unit: AtomicUnit) => void;
}) {
  const [items, setItems] = useState<ManagedUnitSummary[]>([]);
  const [candidate, setCandidate] = useState<AtomicUnit | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const matchingItems = items.filter((item) => `${item.id} ${item.title}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  const [replacement, setReplacement] = useState<{ target: WordMemory; word: AtomicWord } | null>(null);
  const [replacementQuality, setReplacementQuality] = useState<AssociationQualityReport | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [expansionCandidates, setExpansionCandidates] = useState<Record<string, AtomicUnit>>(() => {
    try { return JSON.parse(localStorage.getItem('memora-v2.world1-expansion-candidates') || '{}') as Record<string, AtomicUnit>; }
    catch { return {}; }
  });
  const [expansionTests, setExpansionTests] = useState<Record<string, ExpansionTest>>(() => readExpansionTests());
  const [expansionDecisions, setExpansionDecisions] = useState<Record<string, ExpansionDecision>>(() => readExpansionDecisions());
  const reviewQueue = associationsNeedingReview(userId).slice(0, 8);

  async function reload() {
    setItems(await loadManagedUnitSummaries());
  }

  useEffect(() => {
    void reload().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'No se pudo leer el contenido.'));
  }, []);

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    try {
      const unit = validateUnit(JSON.parse(await file.text()) as unknown);
      setCandidate(unit);
    } catch (error) {
      setCandidate(null);
      setMessage(error instanceof Error ? error.message : 'El archivo no contiene una escena válida.');
    }
  }

  async function pickAssociation(event: ChangeEvent<HTMLInputElement>, target: WordMemory) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const quality = validateAssociationQuality(parsed);
      setReplacementQuality(quality);
      const value = validateApprovedAssociation(parsed);
      if (!value.en || value.en.trim().toLocaleLowerCase('en-US') !== target.word.en.trim().toLocaleLowerCase('en-US')) {
        throw new Error(`La asociación debe corresponder a ${target.word.en}.`);
      }

      const version = value.associationVersion;
      if (!value.associationId || !Number.isInteger(version) || version === undefined || version < 1) {
        throw new Error('La asociación necesita associationId y una associationVersion entera positiva.');
      }

      setReplacement({ target, word: value });
      setChangeReason('');
      setConfirmReplacement(false);
    } catch (error) {
      setReplacement(null);
      setReplacementQuality(null);
      setMessage(error instanceof Error ? error.message : 'El archivo no contiene una asociación válida.');
    }
  }

  async function pickExpansionCandidate(event: ChangeEvent<HTMLInputElement>, mission: ExpansionMission) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const unit = validateUnit(JSON.parse(await file.text()) as unknown);
      const actual = new Set(unit.words.map((word) => word.en.toLocaleLowerCase('en-US')));
      const expected = new Set(mission.newWords.map((word) => word.toLocaleLowerCase('en-US')));
      if (actual.size !== expected.size || [...expected].some((word) => !actual.has(word))) {
        throw new Error(`${mission.id}: la escena debe contener exactamente ${mission.newWords.join(', ')}.`);
      }
      if (!unit.grammar.some((form) => form.id === mission.grammar || form.visualContract === mission.grammar)) {
        throw new Error(`${mission.id}: la escena debe incluir la forma gramatical "${mission.grammar}".`);
      }
      const sentenceText = [unit.sentence.en, ...(unit.practiceSentences ?? []).map((sentence) => sentence.en)]
        .join(' ')
        .toLocaleLowerCase('en-US');
      const tokens = new Set(sentenceText.replace(/[.,!?;:]/g, ' ').split(/\s+/));
      const missingWords = mission.newWords.filter((word) => {
        const lemma = word.toLocaleLowerCase('en-US');
        const taughtForms = unit.grammar.filter((form) => form.englishBase?.toLocaleLowerCase('en-US') === lemma).map((form) => form.english.toLocaleLowerCase('en-US'));
        return ![lemma, ...taughtForms].some((form) => tokens.has(form));
      });
      if (missingWords.length) {
        throw new Error(`${mission.id}: las frases deben usar ${missingWords.join(', ')}.`);
      }

      const tests = readExpansionTests();
      const decisions = readExpansionDecisions();
      delete tests[mission.id];
      delete decisions[mission.id];
      localStorage.setItem('memora-v2.world1-expansion-tests', JSON.stringify(tests));
      localStorage.setItem('memora-v2.world1-expansion-decisions', JSON.stringify(decisions));
      setExpansionTests(tests);
      setExpansionDecisions(decisions);
      const next = { ...expansionCandidates, [mission.id]: unit };
      setExpansionCandidates(next);
      localStorage.setItem('memora-v2.world1-expansion-candidates', JSON.stringify(next));
      setMessage(`${mission.id}: escena real cargada. Ya se puede jugar la misión completa.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'La escena no es válida.');
    }
  }

  function decideExpansionMission(missionId: string, decision: ExpansionDecision['decision']) {
    if (!expansionTests[missionId]) {
      setMessage('Primero hay que jugar la misión completa y revisar su resultado.');
      return;
    }
    if (decision === 'approved_for_next_phase' && !expansionTests[missionId].passed) {
      setMessage('Completa el recorrido sin saltar fases con el selector. Los errores de aprendizaje no impiden la revisión editorial.');
      return;
    }
    const next = {
      ...expansionDecisions,
      [missionId]: { decision, reviewer: userId, decidedAt: new Date().toISOString() },
    };
    setExpansionDecisions(next);
    localStorage.setItem('memora-v2.world1-expansion-decisions', JSON.stringify(next));
    setMessage(decision === 'rejected'
      ? `${missionId} queda rechazada y fuera del siguiente lote.`
      : `${missionId} queda aceptada para la siguiente fase; todavía no se publica.`);
  }

  function installReplacement() {
    if (!replacement || !changeReason.trim() || !confirmReplacement || busy) return;
    const installed = replaceAssociation(userId, replacement.word, changeReason);
    if (!installed) {
      setMessage('No se pudo instalar la asociación. Comprueba que sea una versión nueva y que exista memoria previa.');
      return;
    }
    setReplacement(null);
    setReplacementQuality(null);
    setChangeReason('');
    setConfirmReplacement(false);
    setMessage(`${replacement.word.en}: versión ${replacement.word.associationVersion} instalada. Su calendario empieza de nuevo.`);
  }

  async function save() {
    if (!candidate || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await saveUnitDraft(candidate);
      await reload();
      setMessage(`${candidate.title} guardada como borrador.`);
      setCandidate(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el borrador.');
    } finally { setBusy(false); }
  }

  async function review(id: string) {
    setBusy(true);
    setMessage('');
    try { onReview(await loadManagedUnit(id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo abrir la escena.'); }
    finally { setBusy(false); }
  }

  async function publish(id: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await publishUnit(id);
      await reload();
      await onPublished();
      setMessage('Escena publicada. Ya aparece en el recorrido.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar la escena.');
    } finally { setBusy(false); }
  }

  function download(unit: AtomicUnit) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(unit, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${unit.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportUnit(id: string) {
    setBusy(true);
    try { download(await loadManagedUnit(id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { setBusy(false); }
  }

  async function editorialAction(id: string, action: 'approve' | 'unpublish') {
    if (busy || !window.confirm(action === 'approve' ? '¿Has probado esta escena y comprobado el contenido y su usabilidad? Aprobar no publica ni aprueba automáticamente sus imágenes y audio.' : '¿Retirar esta escena del catálogo publicado? Se conservarán el contenido y los intentos.')) return;
    setBusy(true);
    try {
      if (action === 'approve') await approveUnitReview(id); else await unpublishUnit(id);
      await reload(); await onPublished();
      setMessage(action === 'approve' ? 'Revisión aprobada. La publicación sigue exigiendo asociaciones y medios aprobados.' : 'Escena retirada: conservada como borrador.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el cambio.'); }
    finally { setBusy(false); }
  }

  return <main className="content-manager-screen">
    <header className="content-manager-header"><button type="button" onClick={onBack}>← Recorrido</button><span>MEMORA · CONTENIDO</span></header>
    <section className="content-manager-card">
      <p className="eyebrow">GESTIÓN DE ESCENAS</p>
      <h1>Prepara la siguiente partida.</h1>
      <div className="content-manager-candidate">{reviewUnits.slice(0, 3).map((example) => <button type="button" key={example.id} onClick={() => download(example)}>Descargar ejemplo: {example.title}</button>)}</div>
      <div className="content-manager-candidate">{reviewUnits.map((example) => <button type="button" key={example.id} onClick={() => onReview(example)}>Probar: {example.title}</button>)}</div>
      <p>Carga una escena en JSON. Se guarda como borrador para poder jugarla y revisarla antes de publicarla.</p>
      <label className="content-manager-upload">Elegir archivo JSON<input type="file" accept=".json,application/json" onChange={(event) => void pickFile(event)} /></label>
      {candidate ? <div className="content-manager-candidate"><strong>{candidate.title}</strong><span>{candidate.words.map((word) => word.en).join(' · ')}</span><button type="button" disabled={busy} onClick={() => void save()}>Guardar borrador →</button></div> : null}
      {message ? <p className="content-manager-message" role="status">{message}</p> : null}
    </section>
    <section className="content-manager-card"><p className="eyebrow">EN DIRECTUS</p><h2>{items.length} {items.length === 1 ? 'escena' : 'escenas'}</h2>
      <p>Probar no registra aprendizaje. Aprobar es una decisión editorial; publicar es un paso independiente.</p>
      <label>Buscar contenido<input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(20); }} placeholder="Llaves, cognados, cocina…" /></label>
      {matchingItems.slice(0, visibleCount).map((item) => {
        const approved = item.ux_verdict === 'approved' && item.curriculum_verdict === 'approved';
        return <div className="content-manager-row" key={item.id}><div><strong>{item.title}</strong><span>{item.status === 'published' ? 'Publicada' : 'Borrador'} · {approved ? 'Revisión aprobada' : 'Pendiente de revisión'}</span></div><div>
          <button type="button" disabled={busy} onClick={() => void review(item.id)}>Probar</button>
          <button type="button" disabled={busy} onClick={() => void exportUnit(item.id)}>Exportar JSON</button>
          {item.status === 'draft' ? <><button type="button" disabled={busy || approved} onClick={() => void editorialAction(item.id, 'approve')}>Aprobar revisión</button><button type="button" disabled={busy || !approved} onClick={() => void publish(item.id)}>Publicar</button></> : <button type="button" disabled={busy} onClick={() => void editorialAction(item.id, 'unpublish')}>Despublicar</button>}
        </div></div>;
      })}
      {matchingItems.length > visibleCount ? <button type="button" onClick={() => setVisibleCount((count) => count + 20)}>Ver más</button> : null}
      {!items.length ? <p>Aún no hay escenas cargadas en Directus.</p> : null}
    </section>
    <section className="content-manager-card">
      <p className="eyebrow">AMPLIACIÓN DEL MUNDO 1</p>
      <h2>{expansionMissions.length} misiones candidatas · no publicables</h2>
      <p>
        Este backlog amplía el recorrido desde {expansionBacklog.currentExecutableWords} palabras
        ejecutables hacia {expansionBacklog.targetUniqueWords.minimum}–{expansionBacklog.targetUniqueWords.maximum}.
        Las candidatas no aparecen en Arcade ni cuentan como aprendidas.
      </p>
      {expansionBlocks.map((block) => <div className="content-manager-expansion-block" key={block.id}>
        <div className="content-manager-expansion-heading">
          <div><strong>{block.id}</strong><span>{block.purpose}</span></div>
          <b>{block.missions.length} misiones</b>
        </div>
        {block.missions.map((mission) => <div className="content-manager-row" key={mission.id}>
          <div>
            <strong>{mission.id}</strong>
            <span>{mission.zone} · {mission.locus} · {mission.layer} · {mission.grammar}</span>
            <span>{mission.newWords.join(' · ')}</span>
            <span className="content-manager-muted">{mission.target}</span>
          </div>
          <div className="content-manager-expansion-actions">
            <label className="content-manager-upload">Cargar escena real
              <input type="file" accept=".json,application/json" onChange={(event) => void pickExpansionCandidate(event, mission)} />
            </label>
            {expansionCandidates[mission.id] ? <button type="button" onClick={() => onTest(mission.id, expansionCandidates[mission.id])}>Jugar misión completa</button> : null}
            {expansionTests[mission.id] ? <span className={`audit-state is-${expansionTests[mission.id].passed ? 'approved' : 'rejected'}`}>
              Probada · {expansionTests[mission.id].correct}/{expansionTests[mission.id].attempted}
            </span> : <span className="audit-state is-pending">Pendiente de prueba</span>}
            {expansionDecisions[mission.id] ? <span className={`audit-state is-${expansionDecisions[mission.id].decision === 'rejected' ? 'rejected' : 'approved'}`}>
              {expansionDecisions[mission.id].decision === 'rejected' ? 'Rechazada' : 'Aceptada para siguiente fase'}
            </span> : null}
            <button type="button" disabled={!expansionTests[mission.id]?.passed} onClick={() => decideExpansionMission(mission.id, 'approved_for_next_phase')}>Aceptar</button>
            <button type="button" disabled={!expansionTests[mission.id]} onClick={() => decideExpansionMission(mission.id, 'rejected')}>Rechazar</button>
          </div>
        </div>)}
      </div>)}
    </section>
    <section className="content-manager-card"><p className="eyebrow">CALIDAD DE ASOCIACIONES</p><h2>{reviewQueue.length ? `${reviewQueue.length} asociaciones requieren atención` : 'Sin asociaciones pendientes'}</h2>
      <p>Esta cola usa fallos diferidos y recuperación sin pista. No crea puentes: sirve para elegir una escena aprobada y sustituir la versión anterior.</p>
      {reviewQueue.map((memory) => {
        const recall = memory.capabilities?.recall;
        const comparison = compareAssociationVersions(memory);
        const comparisonText = comparison
          ? ` · comparación ${comparison.basis}: anterior ${comparison.previousAccuracy === null ? 'sin datos' : `${Math.round(comparison.previousAccuracy * 100)}%`} (${comparison.previousAttempts}) → actual ${comparison.currentAccuracy === null ? 'sin datos' : `${Math.round(comparison.currentAccuracy * 100)}%`} (${comparison.currentAttempts})`
          : '';
        return <div className="content-manager-row" key={memory.key}><div><strong>{memory.word.en}</strong><span>v{memory.associationVersion ?? 'legacy'} · {memory.sevenDayFailures ?? 0} fallos a 7 días · {recall?.attempts ? `${Math.round(recall.correct / recall.attempts * 100)}% recuperación` : 'sin recuperación registrada'}{comparisonText}{comparison?.currentImproved === false ? ' · nueva versión sin mejora' : comparison?.currentImproved === true ? ' · nueva versión mejorada' : ''}</span></div><label className="content-manager-upload">Cargar asociación aprobada<input type="file" accept=".json,application/json" onChange={(event) => void pickAssociation(event, memory)} /></label></div>;
      })}
      {replacementQuality ? <div className="content-manager-quality" aria-label="Controles automáticos de asociación">
        <strong>Controles automáticos · {replacementQuality.automatedGate === 'pass' ? 'listo para revisión humana' : 'bloqueado'}</strong>
        <ul>
          {replacementQuality.checks.map((check) => <li key={check.rule} className={`quality-check is-${check.status}`}>
            <b>{check.status === 'pass' ? 'Superado' : check.status === 'warn' ? 'Aviso' : check.status === 'blocked' ? 'Bloqueado' : 'No aplica'}</b>
            <span>{check.message}</span>
          </li>)}
        </ul>
      </div> : null}
      {replacement ? <div className="content-manager-candidate">
        <strong>{replacement.word.en} · versión {replacement.word.associationVersion}</strong>
        <span>Sustituye v{replacement.target.associationVersion ?? 'legacy'} y conserva su historial de rendimiento.</span>
        <div className="association-preview">
          <b>Vista previa editorial</b>
          <span>Ruta: {replacement.word.associationMode ?? 'acoustic_bridge'} · Audio: {replacement.word.audioProvenance?.source}</span>
          <span>Guía: {replacement.word.audioProvenance?.pronunciationGuide}</span>
          <span>Escena: {replacement.word.scene}</span>
          {replacement.word.imageUrl ? <span>Imagen: {replacement.word.imageProvenance?.source} · licencia registrada</span> : <span>Imagen: pendiente o no incluida</span>}
        </div>
        <label>Motivo del cambio<input value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Qué se ha mejorado" /></label>
        <label><input type="checkbox" checked={confirmReplacement} onChange={(event) => setConfirmReplacement(event.target.checked)} /> He revisado y aprobado esta asociación.</label>
        <button type="button" disabled={busy || !changeReason.trim() || !confirmReplacement} onClick={installReplacement}>Instalar versión →</button>
      </div> : null}
    </section>
  </main>;
}
