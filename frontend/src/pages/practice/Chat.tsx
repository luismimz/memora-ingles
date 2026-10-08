import { useEffect, useRef, useState } from 'react';
import { ErrorBox, playNaturalFast, SpeakBtn } from '../../components/common';
import { ai } from '../../lib/api';
import { canListen, listen } from '../../lib/speech';
import { useStore } from '../../store';
import { BackHeader, NeedsAi, useLearnedWords } from './shared';

interface Msg { role: 'user' | 'assistant'; content: string; es?: string; fix?: string }
const TOPICS = ['Presentarte', 'Tu trabajo', 'Tu familia', 'Un viaje', 'Pedir en un restaurante', 'Tu fin de semana', 'Tus aficiones', 'Tu casa', 'Libre'];

export function Chat() {
  const store = useStore();
  const words = useLearnedWords().slice(0, 40).map((w) => w.en);
  const [topic, setTopic] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<null | (() => void)>(null);
  const [showEs, setShowEs] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (history: Msg[]) => {
    setBusy(true); setError(null);
    try {
      const out = await ai<{ reply_en: string; reply_es: string; correction_es: string }>('chat', {
        topic, words, model: store.aiModel, messages: history.map((m) => ({ role: m.role, content: m.content })),
      });
      setMsgs((m) => {
        const copy = [...m];
        const lastUser = copy.map((x) => x.role).lastIndexOf('user');
        if (lastUser >= 0 && out.correction_es) copy[lastUser] = { ...copy[lastUser], fix: out.correction_es };
        return [...copy, { role: 'assistant', content: out.reply_en, es: out.reply_es }];
      });
      playNaturalFast(out.reply_en);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  const start = (t: string) => {
    setTopic(t);
    const first: Msg[] = [{ role: 'user', content: `Hi! Let's talk about: ${t}. Please start with an easy question.` }];
    setMsgs([]);
    send(first);
  };

  const submit = () => {
    if (!text.trim()) return;
    const next = [...msgs, { role: 'user' as const, content: text.trim() }];
    setMsgs(next); setText('');
    send(next);
  };

  const mic = async () => {
    if (rec) { rec(); setRec(null); return; }
    const r = listen();
    setRec(() => r.stop);
    try { const alts = await r.promise; if (alts[0]) setText((t) => `${t}${t ? ' ' : ''}${alts[0]}`); }
    catch (e) { setError(e); } finally { setRec(null); }
  };

  if (!store.aiInfo.enabled) return <div className="stack"><BackHeader title="💬 Conversación" /><NeedsAi /></div>;

  if (!topic) {
    return (
      <div className="stack">
        <BackHeader title="💬 Conversación" subtitle="Una charla corta en inglés sencillo. La IA usa las palabras que estás aprendiendo y te corrige con suavidad." />
        <div className="grid2">{TOPICS.map((t) => <button key={t} className="card link" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => start(t)}><b>{t}</b></button>)}</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="spread">
        <button className="btn ghost" onClick={() => { setTopic(null); setMsgs([]); }}>← Temas</button>
        <label className="row small"><input type="checkbox" checked={showEs} onChange={(e) => setShowEs(e.target.checked)} /> Ver traducción</label>
      </div>
      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'ai'}`}>
            {m.content}
            {m.role === 'assistant' && <div className="row" style={{ marginTop: 4 }}><SpeakBtn text={m.content} /></div>}
            {m.role === 'assistant' && showEs && m.es && <div className="tr">{m.es}</div>}
            {m.fix && <div className="fix">✏️ {m.fix}</div>}
          </div>
        ))}
        {busy && <div className="bubble ai muted">…</div>}
        <div ref={endRef} />
      </div>
      <ErrorBox error={error} />
      <form className="row" style={{ flexWrap: 'nowrap', position: 'sticky', bottom: 'calc(var(--nav-h) + 8px)' }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {canListen() && <button type="button" className="icon-btn" onClick={mic} title="Hablar">{rec ? '⏹️' : '🎤'}</button>}
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write in English…" autoComplete="off" />
        <button className="btn" disabled={busy || !text.trim()}>➤</button>
      </form>
    </div>
  );
}
