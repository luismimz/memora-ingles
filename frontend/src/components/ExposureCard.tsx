import { useEffect, useMemo, useRef, useState } from 'react';
import { KIND_LABEL } from '../../../shared/classify.mjs';
import { englishPhones, scoreKeyword, verdictFor } from '../../../shared/phonetics.mjs';
import { ai, assetUrl, items } from '../lib/api';
import { USES_KEYWORD, useStore } from '../store';
import type { Mnemonic, Word } from '../types';
import { ErrorBox, Modal, playNaturalFast, Rich, SpeakBtn, Spinner, toast } from './common';

export interface MnemonicChoice { mode: 'auto' | 'none'; mnemonic: Mnemonic | null }

interface Props {
  word: Word;
  spot?: string;
  /** learn = primera exposición rápida; detail = ficha completa (diccionario). */
  variant?: 'learn' | 'detail' | 'compact';
  autoSpeak?: boolean;
  /** Elección ya hecha en esta sesión (aún no hay progreso guardado). */
  choice?: MnemonicChoice;
  onChoice?: (c: MnemonicChoice) => void;
  onDone?: (ms: number) => void;
}

const TARGET_S = 15;

export function soundBadge(score: number | null | undefined) {
  if (score == null) return null;
  const v = verdictFor(score);
  return <span className={`chip ${v === 'good' ? 'ok' : v === 'weak' ? 'doubt' : 'fail'}`} title="Parecido fonético con la sílaba fuerte real">🔊 {Math.round(score * 100)}%</span>;
}

export function ExposureCard({ word, spot, variant = 'learn', autoSpeak, choice, onChoice, onDone }: Props) {
  const store = useStore();
  const [notWorking, setNotWorking] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [more, setMore] = useState(variant === 'detail');
  const started = useRef(Date.now());
  const [secs, setSecs] = useState(0);

  const list = store.mnemonicCache.get(word.id) ?? [];
  const usesKeyword = USES_KEYWORD(word);
  const noneChosen = choice ? choice.mode === 'none' : store.progress.get(word.id)?.mnemonic_mode === 'none';
  const m = noneChosen ? null : (choice?.mnemonic ?? store.activeMnemonic(word.id));

  useEffect(() => { started.current = Date.now(); setSecs(0); setShowEn(false); setMore(variant === 'detail'); }, [word.id, variant]);
  useEffect(() => { if (autoSpeak) return playNaturalFast(word.en); return undefined; }, [word.id, autoSpeak, word.en]);
  useEffect(() => {
    if (variant !== 'learn') return;
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [word.id, variant]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!store.mnemonicCache.has(word.id)) store.mnemonicsFor([word.id], { fill: true }); }, [word.id]);

  const apply = async (c: MnemonicChoice, action: 'another' | 'own' | 'none' | 'pick') => {
    items.create('mnemonic_feedback', { word: word.id, mnemonic: m?.id ?? null, action }).catch(() => {});
    if (c.mnemonic) store.addMnemonic(c.mnemonic);
    if (onChoice) onChoice(c);
    else if (store.progress.has(word.id)) await store.saveProgress(word.id, { mnemonic_mode: c.mode, mnemonic: c.mnemonic?.id ?? null });
    setNotWorking(false);
  };

  return (
    <div className={`card word-card ${variant === 'learn' ? 'pop' : ''}`}>
      <div className="spread small">
        <span className="chip">{KIND_LABEL[word.kind ?? 'keyword']}</span>
        {spot && <span className="spot">📍 {spot}</span>}
        {variant === 'learn' && <span className={`chip ${secs > TARGET_S ? 'doubt' : ''}`}>⏱ {secs}s</span>}
      </div>

      <div className="en" style={{ marginTop: '.4rem' }}>{word.en}</div>
      <div className="es" style={{ margin: '.1rem 0 .6rem' }}>{word.es}</div>

      {/* Pronunciación REAL: nunca se mezcla con el truco */}
      <div className="pron-box">
        <div className="lbl">🗣️ Pronunciación real</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {word.ipa && <span className="chip">{word.ipa}</span>}
          {word.pron_es && <span className="pron">≈ {word.pron_es}</span>}
          <SpeakBtn text={word.en} />
          <SpeakBtn text={word.en} slow title="Escuchar despacio" />
        </div>
      </div>

      {/* Truco para recordar */}
      {m ? (
        <div className="trick-box">
          <div className="lbl">🧠 Truco para recordar · <span className="muted">no es la pronunciación</span></div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="small muted">Palabra puente</span>
            <span className="keyword">{m.keyword}</span>
            {soundBadge(m.phon_score)}
          </div>
          {m.image ? <img src={assetUrl(m.image)} alt={m.keyword ?? ''} className="scene-img" loading="lazy" /> : m.emoji && <div className="scene-emoji">{m.emoji}</div>}
          <div className="scene-text"><Rich text={showEn ? m.story_en : m.scene_es} /></div>
          {m.story_en && (
            <button className="btn ghost small" onClick={() => setShowEn((v) => !v)}>{showEn ? '🇪🇸 En español' : '🇬🇧 La escena en inglés'}</button>
          )}
        </div>
      ) : word.hint_es ? (
        <div className="trick-box plain">
          <div className="lbl">{word.kind === 'cognate' ? '🔗 Ya la conoces' : word.kind === 'easy' ? '🧩 Piezas que ya sabes' : word.kind === 'chunk' ? '📦 Bloque' : word.kind === 'phrasal' ? '➕ Phrasal verb' : '💡 Clave'}</div>
          <div className="scene-text"><Rich text={word.hint_es} /></div>
        </div>
      ) : usesKeyword && !noneChosen ? (
        <div className="trick-box plain muted small">{store.aiInfo.enabled ? 'Preparando la asociación…' : 'Sin asociación todavía: créala tú con «No me funciona → Crear la mía».'}</div>
      ) : null}

      {m && word.kind === 'irregular' && word.hint_es && <div className="small muted" style={{ marginTop: '.5rem' }}>🔀 {word.hint_es}</div>}

      {/* Ejemplo: en la primera exposición va plegado para no pasar de 15 s */}
      {(more || word.kind === 'chunk' || word.kind === 'phrasal') && <Examples word={word} full={variant === 'detail'} />}
      {!more && variant === 'learn' && word.kind !== 'chunk' && word.kind !== 'phrasal' && word.example_en && (
        <button className="btn ghost small" onClick={() => setMore(true)}>＋ Ver ejemplo</button>
      )}

      {variant === 'detail' && list.length > 1 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: '.5rem' }}>
          {list.map((x) => (
            <button key={x.id} className={`chip ${x.id === m?.id ? 'primary' : ''}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => apply({ mode: 'auto', mnemonic: x }, 'pick')}>
              {x.source === 'user' ? '✍️' : x.source === 'ai' ? '🤖' : '⭐'} {x.keyword}
            </button>
          ))}
        </div>
      )}

      {variant !== 'compact' && (
        <div className="row" style={{ marginTop: '.75rem' }}>
          <button className="btn secondary grow" onClick={() => setNotWorking(true)}>😕 No me funciona</button>
          {variant === 'learn' && onDone && (
            <button className="btn big grow" onClick={() => onDone(Date.now() - started.current)} autoFocus>Lo tengo ✓</button>
          )}
        </div>
      )}
      {variant === 'detail' && m && !m.image && <ImageButton mnemonic={m} onDone={(img) => apply({ mode: 'auto', mnemonic: img }, 'pick')} />}

      {notWorking && (
        <Modal onClose={() => setNotWorking(false)}>
          <NotWorking word={word} current={m} onApply={apply} />
        </Modal>
      )}
    </div>
  );
}

function Examples({ word, full }: { word: Word; full: boolean }) {
  const [list, setList] = useState(word.examples ?? (word.example_en ? [{ en: word.example_en, es: word.example_es ?? '' }] : []));
  useEffect(() => {
    if (!full || (word.examples?.length ?? 0) > 1) return;
    ai<{ examples: { en: string; es: string }[] }>('examples', { word: word.id })
      .then((r) => { if (r.examples.length) setList(r.examples); }).catch(() => {});
  }, [full, word.id, word.examples]);
  if (!list.length) return null;
  return (
    <div className="stack" style={{ gap: '.4rem', marginTop: '.6rem' }}>
      {list.slice(0, full ? 5 : 1).map((ex) => (
        <div key={ex.en} className="example">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><strong>{ex.en}</strong><SpeakBtn text={ex.en} /></div>
          <div className="muted small">{ex.es}</div>
        </div>
      ))}
      {full && list.length > 1 && <div className="small muted">Frases reales de Tatoeba (CC BY)</div>}
    </div>
  );
}

function ImageButton({ mnemonic, onDone }: { mnemonic: Mnemonic; onDone: (m: Mnemonic) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async () => {
    setBusy(true); setError(null);
    try {
      let target = mnemonic;
      if (!mnemonic.owner) {
        target = await items.create<Mnemonic>('mnemonics', { word: mnemonic.word, source: 'user', keyword: mnemonic.keyword, scene_es: mnemonic.scene_es, story_en: mnemonic.story_en, emoji: mnemonic.emoji, phon_score: mnemonic.phon_score, focus: mnemonic.focus });
      }
      const { image } = await ai<{ image: string }>('image', { mnemonic: target.id });
      onDone({ ...target, image });
      toast('🖼️ Imagen creada');
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return (
    <div className="stack" style={{ marginTop: '.5rem' }}>
      <button className="btn secondary small" disabled={busy} onClick={run}>{busy ? '⏳ Dibujando (hasta 1 min)…' : '🖼️ Dibujar la escena (gratis)'}</button>
      <ErrorBox error={error} />
    </div>
  );
}

/** «No me funciona»: otra asociación, crear la mía o seguir sin mnemotecnia. */
function NotWorking({ word, current, onApply }: { word: Word; current: Mnemonic | null; onApply: (c: MnemonicChoice, action: 'another' | 'own' | 'none') => void }) {
  const store = useStore();
  const [tab, setTab] = useState<'menu' | 'another' | 'own'>('menu');
  const [proposal, setProposal] = useState<Mnemonic | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const tried = useRef<string[]>((store.mnemonicCache.get(word.id) ?? []).map((x) => x.keyword ?? '').filter(Boolean));

  const another = async () => {
    setTab('another'); setBusy(true); setError(null); setProposal(null);
    try {
      const out = await ai<Mnemonic>('keyword', { word: word.id, model: store.aiModel, avoid: tried.current });
      tried.current.push(out.keyword ?? '');
      setProposal(out);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  if (tab === 'own') return <OwnKeyword word={word} onSaved={(mn) => onApply({ mode: 'auto', mnemonic: mn }, 'own')} onBack={() => setTab('menu')} />;

  if (tab === 'another') {
    return (
      <div className="stack">
        <h2 style={{ margin: 0 }}>🤖 Otra asociación para «{word.en}»</h2>
        {busy && <><Spinner /><p className="center small muted">Buscando palabras que suenen como su sílaba fuerte…</p></>}
        {proposal && (
          <div className="trick-box">
            <div className="row" style={{ justifyContent: 'center' }}><span className="keyword">{proposal.keyword}</span>{soundBadge(proposal.phon_score)}</div>
            {proposal.emoji && <div className="scene-emoji">{proposal.emoji}</div>}
            <div className="scene-text"><Rich text={proposal.scene_es} /></div>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="row">
          <button className="btn secondary grow" disabled={busy} onClick={another}>🎲 Otra más</button>
          <button className="btn grow" disabled={!proposal} onClick={() => onApply({ mode: 'auto', mnemonic: proposal }, 'another')}>Usar esta</button>
        </div>
        <button className="btn ghost" onClick={() => setTab('menu')}>← Volver</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>😕 «{word.en}» no te funciona</h2>
      <p className="small muted" style={{ margin: 0 }}>Es normal: una asociación sirve si a ti te dice algo. Elige qué hacer{current ? ` con «${current.keyword}»` : ''}:</p>
      <button className="choice-row" onClick={store.aiInfo.enabled ? another : () => setTab('own')}>
        <b>🤖 Otra asociación</b><span className="small muted">{store.aiInfo.enabled ? 'La IA propone otra palabra puente que suene igual.' : 'Necesita la IA (falta la clave): te muestro candidatas para crear la tuya.'}</span>
      </button>
      <button className="choice-row" onClick={() => setTab('own')}>
        <b>✍️ Crear la mía</b><span className="small muted">Las que inventas tú se recuerdan mejor. Te ayudo con palabras que suenan parecido.</span>
      </button>
      <button className="choice-row" onClick={() => onApply({ mode: 'none', mnemonic: null }, 'none')}>
        <b>➡️ Seguir sin mnemotecnia</b><span className="small muted">La aprendes a pelo, con repetición. También medimos qué funciona mejor para ti.</span>
      </button>
    </div>
  );
}

/** Crear la asociación propia con medidor fonético en directo. */
function OwnKeyword({ word, onSaved, onBack }: { word: Word; onSaved: (m: Mnemonic) => void; onBack: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [scene, setScene] = useState('');
  const [cands, setCands] = useState<{ word: string; score: number; noun: boolean }[] | null>(null);
  const [focus, setFocus] = useState('');
  const [error, setError] = useState<unknown>(null);
  const phones = useMemo(() => englishPhones(word), [word]);
  const sc = keyword.trim() && phones.length ? scoreKeyword(phones, keyword) : null;

  useEffect(() => {
    ai<{ candidates: { word: string; score: number; noun: boolean }[]; focus: string }>('candidates', { word: word.id })
      .then((r) => { setCands(r.candidates); setFocus(r.focus); }).catch(() => setCands([]));
  }, [word.id]);

  const save = async () => {
    try {
      const m = await items.create<Mnemonic>('mnemonics', {
        word: word.id, source: 'user', keyword: keyword.trim().toUpperCase(), scene_es: scene, emoji: '✍️',
        phon_score: sc?.score ?? null, focus: sc?.focusText ?? null,
      });
      onSaved(m);
    } catch (e) { setError(e); }
  };

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>✍️ Tu asociación para «{word.en}»</h2>
      <div className="small">Suena <b>{word.pron_es}</b>{focus && <> · sílaba fuerte <b>«{focus}»</b></>}. <SpeakBtn text={word.en} /></div>
      <ol className="small muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
        <li>Busca una palabra española <b>que suene</b> como la sílaba fuerte.</li>
        <li>Que se pueda <b>ver</b>: un objeto, un animal o un personaje.</li>
        <li>Una sola escena donde esa palabra <b>haga</b> «{word.es}», exagerada y contigo dentro.</li>
      </ol>
      {cands === null ? <Spinner /> : cands.length > 0 && (
        <div className="row">{cands.map((c) => (
          <button key={c.word} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => setKeyword(c.word)}>
            {c.word} {Math.round(c.score * 100)}%{c.noun ? ' 🖼️' : ''}
          </button>
        ))}</div>
      )}
      <label className="field">Palabra puente
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ej.: FOGATA" />
      </label>
      {sc && (
        <div className={`feedback ${sc.verdict === 'good' ? 'ok' : sc.verdict === 'weak' ? 'doubt' : 'fail'}`}>
          {sc.verdict === 'good' ? '✅ Suena bien' : sc.verdict === 'weak' ? '🤏 Se parece poco' : '❌ No suena como la palabra inglesa'} · {Math.round(sc.score * 100)}%
        </div>
      )}
      <label className="field">Tu escena (una imagen)
        <textarea value={scene} onChange={(e) => setScene(e.target.value)} placeholder={`Ej.: Tiras tu agenda a una FOGATA y, según arde, OLVIDAS todo.`} />
      </label>
      <ErrorBox error={error} />
      <div className="row">
        <button className="btn ghost" onClick={onBack}>← Volver</button>
        <button className="btn grow" disabled={!keyword.trim() || !scene.trim()} onClick={save}>
          {sc?.verdict === 'bad' ? 'Guardar igualmente' : 'Guardar mi asociación'}
        </button>
      </div>
    </div>
  );
}
