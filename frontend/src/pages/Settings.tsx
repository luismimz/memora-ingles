import { useEffect, useState } from 'react';
import { ErrorBox, toast } from '../components/common';
import { items, logout } from '../lib/api';
import { englishVoices, speak } from '../lib/speech';
import { localDate } from '../lib/stats';
import { useStore } from '../store';
import type { Profile } from '../types';

export function Settings() {
  const store = useStore();
  const p = store.profile!;
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('memora.theme') || 'auto'; } catch { return 'auto'; } });
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const load = () => setVoices(englishVoices());
    load();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', load);
    return () => { if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', load); };
  }, []);

  const set = async (patch: Partial<Profile>) => {
    try { await store.updateProfile(patch); } catch (e) { setError(e); }
  };

  const applyTheme = (t: string) => {
    setTheme(t);
    try { t === 'auto' ? localStorage.removeItem('memora.theme') : localStorage.setItem('memora.theme', t); } catch { /* nada */ }
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  };

  const backup = async () => {
    const [attempts, sentences, verbProgress] = await Promise.all([
      items.list('attempts'), items.list('sentences'), items.list('verb_progress'),
    ]);
    const data = { exported_at: new Date().toISOString(), profile: p, days: store.days, progress: [...store.progress.values()], attempts, sentences, verbProgress };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `memora-copia-${localDate()}.json`;
    a.click();
    toast('💾 Copia descargada');
  };

  return (
    <div className="stack">
      <h1>⚙️ Ajustes</h1>
      <div className="card stack">
        <h3>🎯 Objetivo</h3>
        <label className="field">Palabras nuevas al día
          <select value={p.daily_goal} onChange={(e) => set({ daily_goal: Number(e.target.value) })}>
            {[25, 50, 75, 100, 150].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">Forma de responder en exámenes y repasos
          <select value={p.answer_mode ?? 'type'} onChange={(e) => set({ answer_mode: e.target.value as Profile['answer_mode'] })}>
            <option value="type">Escribir la palabra (más exigente, recomendado)</option>
            <option value="flash">Tarjeta: la dices mentalmente y te autoevalúas (más rápido)</option>
          </select>
        </label>
      </div>

      <div className="card stack">
        <h3>🔊 Voz</h3>
        <label className="row"><input type="checkbox" checked={Boolean(p.auto_speak)} onChange={(e) => set({ auto_speak: e.target.checked })} /> Pronunciar automáticamente cada palabra</label>
        <label className="field">Voz en inglés
          <select value={p.voice ?? ''} onChange={(e) => set({ voice: e.target.value || null })}>
            <option value="">Automática</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
        </label>
        <label className="field">Velocidad: {p.rate?.toFixed(2)}
          <input type="range" min={0.6} max={1.2} step={0.05} value={p.rate ?? 0.95} onChange={(e) => set({ rate: Number(e.target.value) })} />
        </label>
        <button className="btn secondary" onClick={() => speak('Hello! I am learning a hundred words a day.')}>Probar voz</button>
      </div>

      <div className="card stack">
        <h3>🤖 Inteligencia artificial</h3>
        {store.aiInfo.enabled ? (
          <label className="field">Modelo (OpenRouter)
            <select value={p.ai_model ?? ''} onChange={(e) => set({ ai_model: e.target.value || null })}>
              <option value="">Por defecto ({store.aiInfo.default})</option>
              {store.aiInfo.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        ) : <p className="small muted" style={{ margin: 0 }}>Desactivada: falta <code>OPENROUTER_API_KEY</code> en el servidor. La app funciona igual con las asociaciones precargadas.</p>}
      </div>

      <div className="card stack">
        <h3>🎨 Tema</h3>
        <div className="row">
          {[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => (
            <button key={k} className={`btn small ${theme === k ? '' : 'secondary'}`} onClick={() => applyTheme(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>💾 Datos</h3>
        <p className="small muted" style={{ margin: 0 }}>Cuenta: {store.user?.email}</p>
        <button className="btn secondary" onClick={() => backup().catch(setError)}>Descargar copia de seguridad (JSON)</button>
        <button className="btn fail" onClick={async () => { await logout(); location.href = '/'; }}>Cerrar sesión</button>
      </div>
      <ErrorBox error={error} />
    </div>
  );
}
