import { useState, type ChangeEvent } from 'react';
import { loadLearningProfile, readAvatar, saveAvatar } from '../domain/learningProfile';
import type { UnitSummary } from '../services/directus';
import type { Appearance } from '../useAppearance';
import { syncLabels, type SyncStatus } from '../services/progressSync';

export function ProfileView({ userId, units, appearance, onToggleAppearance, onBack, onExit, onArcade, onEvolution, onManageContent, syncStatus }: {
  userId: string;
  units: UnitSummary[];
  appearance: Appearance;
  onToggleAppearance: () => void;
  onBack: () => void;
  onExit: () => void;
  onArcade?: () => void;
  onEvolution?: () => void;
  onManageContent?: () => void;
  syncStatus?: SyncStatus;
}) {
  const [avatar, setAvatar] = useState(() => readAvatar(userId));
  const [avatarError, setAvatarError] = useState('');
  const profile = loadLearningProfile(userId, units);
  const nextReview = profile.nextReviewAt ? new Date(profile.nextReviewAt) : null;
  const due = profile.dueReviews > 0;
  const duePieces = profile.dueWords + profile.dueChunks + profile.dueSentences;
  const capabilityLabels = { recognition: 'reconocimiento escrito', auditory: 'comprensión auditiva', recall: 'recuperación', production: 'producción' } as const;

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500_000) {
      setAvatarError('Elige una imagen JPG, PNG o WebP de menos de 500 KB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!saveAvatar(userId, dataUrl)) { setAvatarError('No se pudo guardar la imagen en este navegador.'); return; }
      setAvatar(dataUrl);
      setAvatarError('');
    };
    reader.onerror = () => setAvatarError('No se pudo leer esta imagen.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  return <main className="journey-screen profile-screen">
    <header className="journey-header"><button type="button" className="journey-brand journey-brand-button" onClick={onBack} aria-label="Ir al inicio"><span className="brand-mark">M</span><span>MEMORA</span></button><nav className="journey-menu" aria-label="Navegación principal"><button type="button" onClick={onBack}>Inicio</button>{onEvolution ? <button type="button" onClick={onEvolution}>Mi evolución</button> : null}<button type="button" aria-current="page"><span>Perfil</span></button></nav><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><button type="button" className="journey-exit" onClick={onExit}>Salir</button></header>
    <section className="profile-hero"><div className="profile-avatar-wrap"><span className="profile-avatar" aria-label="Tu imagen de perfil">{avatar ? <img src={avatar} alt="" /> : 'M'}</span><label className="profile-upload">Cambiar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label></div><div><p className="eyebrow">TU MEMORIA EN MOVIMIENTO</p><h1>{profile.sessions ? 'Cada regreso cuenta.' : 'Tu historia empieza aquí.'}</h1><p>{profile.sessions ? `Has vuelto ${profile.activeDays} ${profile.activeDays === 1 ? 'día' : 'días'} a entrenar. Cada repaso mantiene vivas tus conexiones.` : 'Juega tu primera escena para descubrir cómo crece tu memoria.'}</p><small>La foto se guarda solo en este navegador.</small>{avatarError ? <p className="profile-error" role="alert">{avatarError}</p> : null}</div></section>
    <section className="profile-metrics" aria-label="Tu avance"><div><strong>{profile.activeDays}</strong><span>{profile.activeDays === 1 ? 'día activo' : 'días activos'}</span></div><div><strong>{profile.streakDays}</strong><span>{profile.streakDays === 1 ? 'día seguido' : 'días seguidos'}</span></div><div><strong>{profile.learnedUnits}</strong><span>{profile.learnedUnits === 1 ? 'escena completada' : 'escenas completadas'}</span></div><div><strong>{profile.accuracy === null ? '—' : `${profile.accuracy}%`}</strong><span>aciertos al recordar</span></div></section>
    <section className="profile-detail"><div className="profile-week"><p className="eyebrow">TUS ÚLTIMOS 7 DÍAS</p><div className="profile-days">{profile.recentDays.map((item) => <div key={item.day} title={item.day} aria-label={`${item.day}: ${item.active ? 'entrenaste' : 'sin sesión'}`}><span className={item.active ? 'is-active' : ''} /><small>{new Date(`${item.day}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2)}</small></div>)}</div><p>Una sesión breve también mantiene la racha.</p></div>
      <div className="profile-review"><p className="eyebrow">TU PRÓXIMO MOVIMIENTO</p><h2>{duePieces ? `${duePieces} ${duePieces === 1 ? 'pieza pide' : 'piezas piden'} repaso` : due ? `${profile.dueReviews} ${profile.dueReviews === 1 ? 'escena pide' : 'escenas piden'} repaso` : nextReview ? 'El recuerdo sigue fresco' : 'Primero, crea una conexión'}</h2><p>{duePieces || due ? `${profile.daysSinceLastSession ? `Llevas ${profile.daysSinceLastSession} ${profile.daysSinceLastSession === 1 ? 'día' : 'días'} sin jugar. ` : ''}Una ráfaga corta puede reactivar lo que cuesta recordar.` : nextReview ? `Volverá a tocar repasarla ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(nextReview)}.` : 'Cuando completes una escena, te mostraremos cuándo conviene volver.'}</p>{profile.hardestWord ? <p className="profile-focus">🎯 Una palabra a reforzar: <strong>{profile.hardestWord.word}</strong> · {profile.hardestWord.correct}/{profile.hardestWord.attempted} aciertos</p> : null}{profile.weakestCapability ? <p className="profile-focus">🧭 Tu siguiente foco: <strong>{capabilityLabels[profile.weakestCapability.direction]}</strong> · {profile.weakestCapability.accuracy}% en {profile.weakestCapability.attempted} intentos</p> : null}{profile.associationsNeedingReview ? <p className="profile-focus">🔁 {profile.associationsNeedingReview} {profile.associationsNeedingReview === 1 ? 'asociación necesita' : 'asociaciones necesitan'} una escena mejor.</p> : null}{profile.associationsImproved ? <p className="profile-focus">✦ {profile.associationsImproved} {profile.associationsImproved === 1 ? 'asociación mejoró' : 'asociaciones mejoraron'} tras cambiar la escena.</p> : null}{onArcade && (profile.recalledWords >= 3 || duePieces > 0) ? <button type="button" className="profile-arcade-button" onClick={onArcade}>Jugar una ráfaga →</button> : null}</div></section>
    <p className="profile-footnote" role="status">{syncStatus ? syncLabels[syncStatus] : 'Vista de revisión: no registra aprendizaje.'} · Los aciertos con ayuda y sin ayuda se distinguen al programar tus repasos.</p>
    {onManageContent ? <section className="content-manager-card"><p className="eyebrow">ADMINISTRACIÓN</p><h2>Mi contenido</h2><p>Prueba, revisa, importa y exporta ejemplos. Publica o retira escenas sin borrar sus datos.</p><button type="button" className="primary-action" onClick={onManageContent}>Gestionar contenido →</button></section> : null}
  </main>;
}
