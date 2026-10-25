import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { readAvatar, saveAvatar } from '../domain/learningProfile';
import type { Appearance } from '../useAppearance';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import './profileSettings.css';
import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';

export function ProfileView({ userId, appearance, onToggleAppearance, onBack, onExit, onEvolution, onManageContent, syncStatus }: {
  userId: string; appearance: Appearance; onToggleAppearance: () => void;
  onBack: () => void; onExit: () => void; onEvolution?: () => void;
  onManageContent?: () => void; syncStatus?: SyncStatus;
}) {
  const [avatar, setAvatar] = useState(() => readAvatar(userId));
  const [avatarError, setAvatarError] = useState('');
  const [avatarStatus, setAvatarStatus] = useState('');
  const [calm, setCalm] = useState(() => readArcadeCalm(userId));
  const [rhythmStatus, setRhythmStatus] = useState('');
  const [rhythmError, setRhythmError] = useState('');
  const reader = useRef<FileReader | null>(null);
  const avatarRequest = useRef(0);
  useEffect(() => {
    setAvatar(readAvatar(userId)); setAvatarError(''); setAvatarStatus('');
    setCalm(readArcadeCalm(userId)); setRhythmStatus(''); setRhythmError('');
    return () => { avatarRequest.current++; reader.current?.abort(); reader.current = null; };
  }, [userId]);

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const request = ++avatarRequest.current;
    reader.current?.abort(); reader.current = null;
    setAvatarStatus(''); setAvatarError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500_000) {
      setAvatarError('Elige una imagen JPG, PNG o WebP de hasta 500 KB.');
      event.target.value = ''; return;
    }
    const current = new FileReader();
    reader.current = current;
    setAvatarStatus('Preparando tu foto…');
    current.onload = () => {
      if (request !== avatarRequest.current) return;
      reader.current = null;
      const dataUrl = typeof current.result === 'string' ? current.result : '';
      if (!saveAvatar(userId, dataUrl)) { setAvatarStatus(''); setAvatarError('No se pudo guardar la imagen en este navegador.'); return; }
      setAvatar(dataUrl); setAvatarError(''); setAvatarStatus('Foto guardada en este navegador.');
    };
    current.onerror = () => {
      if (request !== avatarRequest.current) return;
      reader.current = null; setAvatarStatus(''); setAvatarError('No se pudo leer esta imagen.');
    };
    current.readAsDataURL(file);
    event.target.value = '';
  }

  return <main className="journey-screen profile-screen">
    <header className="journey-header"><button type="button" className="journey-brand journey-brand-button" onClick={onBack} aria-label="Ir al inicio"><span className="brand-mark">M</span><span>MEMORA</span></button><nav className="journey-menu" aria-label="Navegación principal"><button type="button" onClick={onBack}>Inicio</button>{onEvolution ? <button type="button" onClick={onEvolution}>Mi evolución</button> : null}<button type="button" aria-current="page">Perfil</button></nav></header>
    <section className="profile-settings-heading"><p className="eyebrow">TU ESPACIO</p><h1>Perfil y ajustes</h1><p>{onEvolution ? 'Personaliza la aplicación. Tu práctica e historial están en Mi evolución.' : 'Personaliza la apariencia de la aplicación y vuelve al recorrido cuando quieras.'}</p></section>
    <div className="profile-settings-grid">
      <section className="profile-settings-card" aria-labelledby="profile-photo-title"><h2 id="profile-photo-title">Tu foto</h2><div className="profile-photo-row"><span className="profile-avatar" aria-label="Tu imagen de perfil">{avatar ? <img src={avatar} alt="" /> : 'M'}</span><div><label className="profile-upload">Cambiar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label><p>JPG, PNG o WebP · hasta 500 KB.</p></div></div><small>Se guarda solo en este navegador, no en tu cuenta.</small>{avatarError ? <p className="profile-error" role="alert">{avatarError}</p> : null}{avatarStatus ? <p role="status">{avatarStatus}</p> : null}</section>
      <section className="profile-settings-card" aria-labelledby="profile-appearance-title"><h2 id="profile-appearance-title">Apariencia</h2><p>Estás usando el modo {appearance === 'light' ? 'claro' : 'oscuro'}.</p><button type="button" className="quiet-action" onClick={onToggleAppearance}>Cambiar a modo {appearance === 'light' ? 'oscuro' : 'claro'}</button></section>
      <section className="profile-settings-card profile-settings-storage" aria-labelledby="profile-rhythm-title"><h2 id="profile-rhythm-title">Ritmo de Arcade</h2><p>{calm ? 'Sin cuenta atrás. Tú decides cuándo avanzar.' : 'Con reloj en los retos que lo permiten.'}</p><button type="button" className="quiet-action" aria-label="Jugar sin cuenta atrás" aria-pressed={calm} onClick={() => {
        setRhythmStatus(''); setRhythmError('');
        const next = !calm;
        if (!writeArcadeCalm(userId, next)) { setRhythmError('No se pudo guardar el ritmo. Puedes activar «Sin reloj» dentro de Arcade para esa sesión.'); return; }
        setCalm(next); setRhythmStatus('Ritmo guardado en este navegador.');
      }}>{calm ? 'Sin reloj activado' : 'Activar sin reloj'}</button><p><small>Usa la misma preferencia que Arcade de palabras y gramática. Solo afecta a retos con reloj; la enseñanza sigue a tu ritmo.</small></p>{rhythmStatus ? <p role="status">{rhythmStatus}</p> : null}{rhythmError ? <p role="alert" className="profile-error">{rhythmError}</p> : null}</section>
      <section className="profile-settings-card profile-settings-storage" aria-labelledby="profile-storage-title"><h2 id="profile-storage-title">Guardado de tu práctica</h2><p role="status">{syncStatus ? syncLabels[syncStatus] : 'Vista de revisión: no registra aprendizaje.'}</p><p>Los ajustes de esta pantalla no completan actividades ni cambian tus intentos.</p>{onEvolution ? <button type="button" className="quiet-action" onClick={onEvolution}>Ver Mi evolución</button> : null}</section>
    </div>
    <div className="profile-settings-return"><button type="button" className="primary-action" onClick={onBack}>Volver a mi recorrido</button></div>
    <details className="profile-settings-extra"><summary>Sesión</summary><p>{syncStatus ? 'Cerrar sesión es distinto de volver al recorrido.' : 'Puedes salir de la revisión sin registrar aprendizaje.'}</p><button type="button" className="quiet-action" onClick={onExit}>{syncStatus ? 'Cerrar sesión' : 'Salir de la revisión'}</button></details>
    {onManageContent ? <details className="profile-settings-extra"><summary>Administración de contenido</summary><p>Herramientas de revisión y publicación. No forman parte de tu práctica como alumno.</p><button type="button" className="quiet-action" onClick={onManageContent}>Gestionar contenido</button></details> : null}
  </main>;
}
