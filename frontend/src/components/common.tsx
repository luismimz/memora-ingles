import { useEffect, useState, type ReactNode } from 'react';
import { speak } from '../lib/speech';
import { naturalSpeech } from '../lib/api';

/** Voz natural de Kokoro. El navegador solo se usa cuando se pide explícitamente. */
export function playNaturalFast(text: string, slow = false, timeout = 8000, allowBrowserFallback = false) {
  let fallbackUsed = false;
  let cancelled = false;
  const fallback = () => {
    if (cancelled || fallbackUsed) return;
    fallbackUsed = true;
    if (allowBrowserFallback) speak(text, slow ? { rate: 0.6 } : {});
    else toast('🔊 La voz natural no está disponible. Revisa Ajustes → Voces y oído.');
  };
  const timer = window.setTimeout(fallback, timeout);
  naturalSpeech(text, { rate: slow ? 0.65 : 1 }).then((url) => {
    if (cancelled) return;
    window.clearTimeout(timer);
    if (fallbackUsed) return;
    if (url) new Audio(url).play().catch(() => fallback());
    else fallback();
  }).catch(() => { if (cancelled) return; window.clearTimeout(timer); if (!fallbackUsed) fallback(); });
  return () => { cancelled = true; window.clearTimeout(timer); };
}

export function SpeakBtn({ text, title = 'Escuchar', slow = false, natural = true }: { text: string | null | undefined; title?: string; slow?: boolean; natural?: boolean }) {
  if (!text) return null;
  return (
    <button type="button" className="icon-btn" title={title} aria-label={title}
      onClick={(e) => { e.stopPropagation(); if (natural) playNaturalFast(text, slow); else speak(text, slow ? { rate: 0.6 } : {}); }}>
      {slow ? '🐢' : '🔊'}
    </button>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}><div style={{ width: `${w}%` }} /></div>;
}

export const Spinner = () => <div className="spinner" aria-label="Cargando" />;

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal pop" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

let toastSetter: ((m: string | null) => void) | null = null;
export function toast(msg: string) { toastSetter?.(msg); }
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSetter = setMsg; return () => { toastSetter = null; }; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3200); return () => clearTimeout(t); }, [msg]);
  return msg ? <div className="toast pop" role="status">{msg}</div> : null;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="error">{error instanceof Error ? error.message : String(error)}</div>;
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Resalta en negrita lo que va entre **asteriscos** o en MAYÚSCULAS (palabras clave de las escenas). */
export function Rich({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\b[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'¡!-]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'¡!-]{1,})*\b)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
    : /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'¡!\s-]{2,}$/.test(p) ? <strong key={i} style={{ color: 'var(--primary)' }}>{p}</strong> : p))}</>;
}
