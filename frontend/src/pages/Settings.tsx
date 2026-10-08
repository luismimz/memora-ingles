import { useEffect, useState } from 'react';
import { ErrorBox, toast } from '../components/common';
import { playNaturalAudio } from '../lib/audioPlayer';
import { items, logout, naturalVoices } from '../lib/api';
import { localDate } from '../lib/stats';
import { useStore } from '../store';
import type { Profile } from '../types';

export function Settings() {
  const store = useStore();
  const p = store.profile!;
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('memora.theme') || 'auto'; } catch { return 'auto'; } });
  const [error, setError] = useState<unknown>(null);
  const [testingNatural, setTestingNatural] = useState(false);
  const [naturalVoiceList, setNaturalVoiceList] = useState<{ id: string; name: string }[]>([]);
  const ttsReported = store.aiInfo.tts !== undefined;
  const naturalReady = Boolean(store.aiInfo.tts?.enabled);
  const naturalProvider = store.aiInfo.tts?.provider || 'none';

  useEffect(() => {
    naturalVoices().then((out) => {
      const voices = out.voices || [];
      setNaturalVoiceList(voices);
      if (p.voice && !voices.some((voice) => voice.id === p.voice)) store.updateProfile({ voice: null }).catch(() => {});
    }).catch(() => setNaturalVoiceList([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = async (patch: Partial<Profile>) => {
    try { await store.updateProfile(patch); } catch (e) { setError(e); }
  };
  const applyTheme = (t: string) => {
    setTheme(t);
    try { t === 'auto' ? localStorage.removeItem('memora.theme') : localStorage.setItem('memora.theme', t); } catch { /* nada */ }
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  };
  const testNatural = async () => {
    setTestingNatural(true);
    try {
      await playNaturalAudio('Hello! This is your natural Memora voice.', { rate: p.rate ?? .88 });
      toast(`✅ Voz natural conectada (${naturalProvider})`);
    } catch (e) { setError(e); }
    finally { setTestingNatural(false); }
  };
  const backup = async () => {
    const [attempts, sentences, verbProgress] = await Promise.all([items.list('attempts'), items.list('sentences'), items.list('verb_progress')]);
    const data = { exported_at: new Date().toISOString(), profile: p, days: store.days, progress: [...store.progress.values()], attempts, sentences, verbProgress };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `memora-copia-${localDate()}.json`; a.click(); toast('💾 Copia descargada');
  };

  return (
    <div className="stack settings-page">
      <div className="page-heading"><div><span className="eyebrow">PERSONALIZA TU MÉTODO</span><h1>Ajustes</h1><p className="muted">Haz que Memora se adapte a tu ritmo, tu oído y tu forma de recordar.</p></div><div className="settings-orb">⚙️</div></div>

      <div className="settings-status"><div><span className="eyebrow">ESTADO DEL ENTORNO</span><h3>Todo listo para tu próxima sesión</h3></div><div className="status-list"><span className={naturalReady ? 'status-ok' : 'status-warn'}><i /> Voz natural: {!ttsReported ? 'backend sin actualizar' : naturalReady ? `${naturalProvider} configurado` : 'Kokoro no disponible'}</span><span className={store.aiInfo.enabled ? 'status-ok' : 'status-warn'}><i /> IA: {store.aiInfo.enabled ? 'conectada' : 'desactivada'}</span></div></div>

      <div className="settings-layout">
        <div className="settings-main stack">
          <section className="settings-card card stack"><div className="settings-card-title"><span className="settings-icon teal">🎯</span><div><h2>Tu dosis diaria</h2><p className="muted small">Poco, sólido y repetido. Puedes cambiarlo cuando quieras.</p></div></div><label className="field">Unidades nuevas al día<select value={p.daily_goal} onChange={(e) => set({ daily_goal: Number(e.target.value) })}>{[25, 50, 75, 100, 150].map((n) => <option key={n} value={n}>{n} unidades</option>)}</select></label><label className="field">Cómo quieres responder<select value={p.answer_mode ?? 'type'} onChange={(e) => set({ answer_mode: e.target.value as Profile['answer_mode'] })}><option value="type">Escribir — recomendado para producir inglés</option><option value="flash">Tarjeta — repaso rápido</option></select></label></section>

          <section className="settings-card card stack"><div className="settings-card-title"><span className="settings-icon orange">🔊</span><div><h2>Voces y oído</h2><p className="muted small">Una sola voz natural de Kokoro para toda la aplicación.</p></div></div><div className={`voice-provider ${naturalReady ? 'ready' : 'not-ready'}`}><div className="voice-provider-icon">{naturalReady ? '✨' : '🛟'}</div><div className="grow"><b>{naturalReady ? `Kokoro conectado · ${naturalProvider}` : !ttsReported ? 'Directus aún no anuncia TTS' : 'Kokoro aún no responde'}</b><span>{naturalReady ? 'Voz natural activada para la app.' : !ttsReported ? 'Redeploya también el servicio backend para que aparezca el estado de Kokoro.' : 'La app no cambiará silenciosamente a la voz del navegador: activa Kokoro para escuchar la voz natural.'}</span></div><button className="btn small secondary" disabled={testingNatural} onClick={testNatural}>{testingNatural ? 'Probando…' : 'Probar'}</button></div>{naturalReady && <label className="field">Voz natural de Kokoro<select value={p.voice ?? ''} onChange={(e) => set({ voice: e.target.value || null })}><option value="">Predeterminada del servidor</option>{naturalVoiceList.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.id})</option>)}</select></label>}{naturalReady && naturalVoiceList.length === 0 && <p className="small muted">Kokoro está conectado, pero no ha devuelto su lista de voces. Se usará la voz configurada en el servidor.</p>}<label className="row setting-check"><input type="checkbox" checked={Boolean(p.auto_speak)} onChange={(e) => set({ auto_speak: e.target.checked })} /> Pronunciar automáticamente cada palabra</label><label className="field">Velocidad de aprendizaje</label><div className="speed-options">{[[.70, 'Lenta'], [.88, 'Estudio'], [1, 'Natural']].map(([rate, label]) => <button key={String(rate)} type="button" className={`choice ${Math.abs((p.rate ?? .88) - Number(rate)) < .01 ? 'selected' : ''}`} onClick={() => set({ rate: Number(rate) })}><b>{label}</b><small>{Number(rate).toFixed(2)}×</small></button>)}</div><p className="small muted">Esta velocidad se aplica a palabras, historias y ejemplos.</p></section>

          <section className="settings-card card stack"><div className="settings-card-title"><span className="settings-icon purple">🤖</span><div><h2>Inteligencia para ayudarte</h2><p className="muted small">Genera historias, explica palabras y corrige tus frases.</p></div></div>{store.aiInfo.enabled ? <label className="field">Modelo de OpenRouter<select value={p.ai_model ?? ''} onChange={(e) => set({ ai_model: e.target.value || null })}><option value="">Por defecto ({store.aiInfo.default})</option>{store.aiInfo.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label> : <div className="notice">Añade <code>OPENROUTER_API_KEY</code> en el servidor para activar historias y conversación.</div>}</section>
        </div>
        <aside className="settings-side stack"><section className="settings-card card stack"><div className="settings-card-title"><span className="settings-icon blue">🎨</span><div><h2>Ambiente</h2><p className="muted small">Elige cómo quieres sentir la sesión.</p></div></div><div className="theme-options">{[['auto', 'Sistema', '◐'], ['light', 'Claro', '☀️'], ['dark', 'Oscuro', '🌙']].map(([k, l, ico]) => <button key={k} className={theme === k ? 'theme-choice selected' : 'theme-choice'} onClick={() => applyTheme(k)}><span>{ico}</span>{l}</button>)}</div></section><section className="settings-card card stack"><div className="settings-card-title"><span className="settings-icon sand">💾</span><div><h2>Tus datos</h2><p className="muted small">Cuenta: {store.user?.email}</p></div></div><button className="btn secondary block" onClick={() => backup().catch(setError)}>Descargar copia JSON</button><button className="btn fail block" onClick={async () => { await logout(); location.href = '/'; }}>Cerrar sesión</button></section></aside>
      </div>
      <ErrorBox error={error} />
    </div>
  );
}
