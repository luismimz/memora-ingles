import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ErrorBox, Rich, SpeakBtn, playNaturalFast } from '../../components/common';
import { useGallery, type GalleryItem, type GalleryState } from './useGallery';
import { localDate, streak } from '../../lib/stats';
import { useStore } from '../../store';

type GalleryFilter = 'all' | GalleryState;

/** Álbum visual de asociaciones: el resultado que el usuario quiere completar. */
export function GalleryDeck() {
  const store = useStore();
  const gallery = useGallery();
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const currentStreak = streak(store.days.filter((day) => day.learned > 0 || day.exam_total > 0).map((day) => day.date), localDate());
  const level = Math.max(1, Math.floor(store.xp / 500) + 1);
  const trophies = [gallery.counts.mastered >= 1, gallery.counts.mastered >= 10, currentStreak >= 3, store.xp >= 500].filter(Boolean).length;

  const visible = filter === 'all' ? gallery.items : gallery.items.filter((item) => item.state === filter);
  const repeated = gallery.repeatedWords
    .map((entry) => ({ ...entry, word: store.wordById.get(entry.wordId) }))
    .filter((entry): entry is typeof entry & { word: NonNullable<typeof entry.word> } => Boolean(entry.word));

  useEffect(() => {
    if (!selected) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  useEffect(() => {
    if (!selected) return undefined;
    return playNaturalFast(selected.word.en, false, 8000, true, selected.word.audio_url);
  }, [selected?.id]);

  if (gallery.status === 'loading') return <div className="gallery-page"><GalleryLoading /></div>;
  if (gallery.status === 'error') return <div className="gallery-page gallery-centered"><div className="gallery-empty-card"><span>🧩</span><h1>No pudimos abrir tu álbum</h1><ErrorBox error={gallery.error} /><button type="button" className="btn primary" onClick={gallery.retry}>Reintentar</button></div></div>;
  if (gallery.status === 'empty') return <div className="gallery-page gallery-centered"><div className="gallery-empty-card"><span>📖</span><h1>Tu galería está esperando su primera palabra</h1><p>Primero ve a Descubrir, elige una asociación y supera su mini-reto. Después volverás aquí para verla crecer.</p><Link to="/descubrir" className="btn primary">Empezar en Descubrir →</Link></div></div>;

  return (
    <div className="gallery-page">
      <header className="gallery-hero">
        <div>
          <span className="gallery-eyebrow">ÁLBUM DE MEMORIA</span>
          <h1>Tu Pokédex de inglés</h1>
          <p>Cada tarjeta es una palabra que ya has recuperado. Llena las siluetas, estabiliza los colores y consigue las cartas legendarias.</p>
        </div>
        <div className="gallery-hero-badge">🧠<strong>{gallery.items.length}</strong><span>conexiones</span></div>
      </header>

      <section className="gallery-profile-strip" aria-label="Perfil Memora">
        <div className="gallery-profile-main"><span className="gallery-profile-avatar">{store.user?.first_name?.slice(0, 1).toUpperCase() || 'M'}</span><div><strong>{store.user?.first_name || 'Alumno Memora'}</strong><small>Nivel {level} · ⚡ {store.xp} XP</small></div></div>
        <div className="gallery-profile-stat"><b>🔥 {currentStreak}</b><small>racha</small></div>
        <div className="gallery-profile-stat"><b>🏆 {trophies}</b><small>trofeos</small></div>
        <div className="gallery-profile-stat"><b>🔁 {gallery.repeatTotal}</b><small>interacciones</small></div>
      </section>

      {repeated.length ? <section className="gallery-repeat-card" aria-label="Palabras con más exposiciones"><div><strong>🔁 Seguimiento de repeticiones</strong><small>Estas asociaciones han vuelto a aparecer durante tu recorrido.</small></div><div className="gallery-repeat-list">{repeated.slice(0, 5).map((entry) => <span key={entry.wordId}><b>{entry.word.en}</b> · {entry.count} veces</span>)}</div></section> : null}

      <div className="gallery-stats" aria-label="Progreso del álbum">
        <GalleryStat icon="🌑" label="Descubiertas" value={gallery.counts.discovered} active={filter === 'discovered'} onClick={() => setFilter('discovered')} />
        <GalleryStat icon="🌈" label="Estables" value={gallery.counts.stable} active={filter === 'stable'} onClick={() => setFilter('stable')} />
        <GalleryStat icon="✨" label="Dominadas" value={gallery.counts.mastered} active={filter === 'mastered'} onClick={() => setFilter('mastered')} />
        <button type="button" className={`gallery-filter-all ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>Todas <b>{gallery.items.length}</b></button>
      </div>

      <div className="gallery-legend"><span><i className="discovered" /> Primeras conexiones</span><span><i className="stable" /> +7 días</span><span><i className="mastered" /> +30 días · legendarias</span></div>

      {visible.length ? (
        <motion.div layout className="gallery-grid">
          {visible.map((item) => <GalleryThumbnail key={item.id} item={item} onOpen={() => setSelected(item)} />)}
        </motion.div>
      ) : <div className="gallery-empty-filter">No hay tarjetas en esta categoría todavía. <button type="button" onClick={() => setFilter('all')}>Ver todas</button></div>}

      <AnimatePresence>{selected ? <GalleryHero item={selected} onClose={() => setSelected(null)} /> : null}</AnimatePresence>
    </div>
  );
}

function GalleryThumbnail({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  return (
    <motion.button layout layoutId={`gallery-card-${item.id}`} type="button" className={`gallery-card gallery-card-${item.state}`} onClick={onOpen} whileTap={{ scale: .96 }}>
      <div className="gallery-card-art">
        <GalleryArt item={item} />
        <span className="gallery-card-state">{item.state === 'mastered' ? '✦' : item.state === 'stable' ? '●' : '◌'}</span>
      </div>
      <div className="gallery-card-copy"><strong>{item.word.en}</strong><span>{item.stateLabel}</span>{item.keyword ? <small>{item.keyword}</small> : null}</div>
    </motion.button>
  );
}

function GalleryHero({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const date = item.learnedAt ? formatDate(item.learnedAt) : 'hoy';
  return (
    <motion.div className="gallery-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.article layoutId={`gallery-card-${item.id}`} className={`gallery-hero-card gallery-card-${item.state}`} role="dialog" aria-modal="true" aria-label={`Detalle de ${item.word.en}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="gallery-close" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="gallery-hero-art"><GalleryArt item={item} /></div>
        <div className="gallery-hero-copy">
          <span className="gallery-card-state-label">{item.state === 'mastered' ? '✦ CARTA LEGENDARIA' : item.stateLabel.toUpperCase()}</span>
          <div className="gallery-hero-word"><div><h2>{item.word.en}</h2><p>{item.word.ipa || item.word.pron_es || item.word.es}</p></div><SpeakBtn text={item.word.en} title="Escuchar palabra" /></div>
          {item.keyword ? <p className="gallery-hero-keyword">🧠 {item.keyword}</p> : null}
          {item.sceneEs ? <p className="gallery-hero-scene"><Rich text={item.sceneEs} /></p> : <p className="gallery-hero-scene">{item.word.es}</p>}
          {item.storyEn ? <p className="gallery-hero-story">“{item.storyEn}”</p> : null}
          <div className="gallery-hero-meta"><span>{item.state === 'mastered' ? 'Dominada' : 'Descubierta'} el {date}</span><span>{item.recentFailures} fallos recientes</span><span>{item.checkpointLabel}</span><span>{item.intervalHours ? `${item.intervalHours} h de intervalo` : 'Primer contacto'}</span></div>
        </div>
      </motion.article>
    </motion.div>
  );
}

function GalleryArt({ item }: { item: GalleryItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.imageUrl]);
  return item.imageUrl && !failed
    ? <img src={item.imageUrl} alt="" onError={() => setFailed(true)} />
    : <span className="gallery-art-emoji" aria-hidden="true">{item.emoji}</span>;
}

function GalleryStat({ icon, label, value, active, onClick }: { icon: string; label: string; value: number; active: boolean; onClick: () => void }) {
  return <button type="button" className={`gallery-stat ${active ? 'is-active' : ''}`} onClick={onClick}><span>{icon}</span><b>{value}</b><small>{label}</small></button>;
}

function GalleryLoading() {
  return <div className="gallery-page gallery-loading-page"><div className="gallery-loading-orb">🧠</div><h1>Ordenando tus conquistas…</h1><p>Estamos recuperando tus asociaciones y su fuerza en el SRS.</p><div className="gallery-loading-grid">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div></div>;
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
  catch { return 'hoy'; }
}
