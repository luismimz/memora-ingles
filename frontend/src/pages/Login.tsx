import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, register, request } from '../lib/api';
import { ErrorBox } from '../components/common';

function Brand() {
  return (
    <div className="center">
      <img src="/icon.svg" alt="" width={84} height={84} style={{ borderRadius: 22 }} />
      <h1 style={{ marginTop: 12 }}>Memora</h1>
      <p className="muted">Inglés en 30 días: 100 palabras al día con historias absurdas que no se olvidan.</p>
    </div>
  );
}

const Page = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
    <div className="stack" style={{ width: '100%', maxWidth: 420 }}><Brand />{children}</div>
  </div>
);

export function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === 'forgot') {
        await request('POST', '/auth/password/request', { email, reset_url: `${location.origin}/reset` });
        setSent(true);
      } else {
        if (mode === 'login') await login(email, password);
        else await register(email, password, name);
        onDone();
      }
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const go = (m: typeof mode) => { setMode(m); setError(null); setSent(false); };

  return (
    <Page>
      <form className="card stack" onSubmit={submit}>
        {mode === 'forgot' && <h2 style={{ margin: 0 }}>Recuperar contraseña</h2>}
        {mode === 'register' && (
          <label className="field">Tu nombre
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
          </label>
        )}
        <label className="field">Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        {mode !== 'forgot' && (
          <label className="field">Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
        )}
        {sent ? (
          <div className="feedback ok">📬 Si ese email tiene cuenta, te hemos enviado un enlace para crear una contraseña nueva. Mira también en spam.</div>
        ) : (
          <>
            <ErrorBox error={error} />
            <button className="btn big" disabled={busy}>
              {busy ? '⏳' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta y empezar' : 'Enviarme el enlace'}
            </button>
          </>
        )}
        {mode === 'login' && <button type="button" className="btn ghost" onClick={() => go('forgot')}>¿Has olvidado la contraseña?</button>}
        <button type="button" className="btn ghost" onClick={() => go(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '¿Primera vez? Crea tu cuenta' : '← Volver a entrar'}
        </button>
      </form>
    </Page>
  );
}

/** Página del enlace del email: /reset?token=… */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) { setError(new Error('Las dos contraseñas no coinciden.')); return; }
    setBusy(true); setError(null);
    try {
      await request('POST', '/auth/password/reset', { token, password });
      setDone(true);
    } catch (err) {
      setError((err as { status?: number }).status === 401 || (err as { status?: number }).status === 403
        ? new Error('El enlace ha caducado o ya se usó. Pide otro desde «¿Has olvidado la contraseña?».') : err);
    } finally { setBusy(false); }
  };

  return (
    <Page>
      <form className="card stack" onSubmit={submit}>
        <h2 style={{ margin: 0 }}>Nueva contraseña</h2>
        {!token && <div className="error">Falta el código del enlace. Ábrelo directamente desde el email.</div>}
        {done ? (
          <>
            <div className="feedback ok">✅ Contraseña cambiada. Ya puedes entrar.</div>
            <button type="button" className="btn big" onClick={() => { onDone(); nav('/'); }}>Ir a entrar</button>
          </>
        ) : (
          <>
            <label className="field">Contraseña nueva
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </label>
            <label className="field">Repítela
              <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required minLength={8} autoComplete="new-password" />
            </label>
            <ErrorBox error={error} />
            <button className="btn big" disabled={busy || !token}>{busy ? '⏳' : 'Guardar contraseña'}</button>
          </>
        )}
      </form>
    </Page>
  );
}
