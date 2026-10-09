import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SpeakBtn } from '../../components/common';
import type { AlchemyChallenge as AlchemyChallengeData, AlchemyToken } from './alchemy.types';
import { useAlchemyChallenge } from './useAlchemyChallenge';

export interface AlchemyChallengeProps {
  challenge: AlchemyChallengeData;
  onComplete?: (challenge: AlchemyChallengeData) => void;
  onNext?: () => void;
  onExit?: () => void;
  /** Discovery already mounts the dock at controller level. */
  showDock?: boolean;
}

const TOKEN_SPRINGS = { type: 'spring' as const, stiffness: 420, damping: 24 };

export function AlchemyChallenge({ challenge, onComplete, onNext, onExit }: AlchemyChallengeProps) {
  const engine = useAlchemyChallenge(challenge, onComplete);
  const { status, fused, feedback, activeTokenId, registerToken, startDrag, dropToken, reset } = engine;
  const primary = useMemo(() => challenge.tokens.filter((token) => token.role === 'primary'), [challenge.tokens]);

  return (
    <main className={`alchemy-stage ${status === 'success' ? 'is-success' : ''}`}>
      <header className="alchemy-topbar">
        <button type="button" className="alchemy-exit mission-exit" onClick={onExit}>✕ Salir al Inicio</button>
        <div className="alchemy-brand"><span>MEMORA</span> ALQUIMIA</div>
        <span className="alchemy-xp">⚡ +{challenge.xp} XP</span>
      </header>

      <section className="alchemy-intro">
        <p className="alchemy-kicker">FUSIÓN {challenge.sourceKind === 'compound' ? 'DE PALABRAS' : 'DE PHRASAL VERB'}</p>
        <h1>{fused ? challenge.targetEn : `Construye «${challenge.targetEs}»`}</h1>
        <p>{fused ? 'Dos piezas. Una unidad que puedes reconocer y usar.' : 'Arrastra una pieza principal sobre la otra. Los distractores solo quieren despistarte.'}</p>
      </section>

      <section className="alchemy-board" aria-label="Tablero de fusión">
        <div className="alchemy-orbit alchemy-orbit-one" />
        <div className="alchemy-orbit alchemy-orbit-two" />
        <AnimatePresence mode="wait" initial={false}>
          {!fused ? (
            <motion.div key="tokens" className="alchemy-token-field" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: .82, filter: 'blur(5px)' }}>
              {challenge.tokens.map((token, index) => (
                <AlchemyTokenCard
                  key={token.id}
                  token={token}
                  index={index}
                  active={activeTokenId === token.id}
                  register={registerToken(token.id)}
                  onStart={() => startDrag(token.id)}
                  onDrop={() => dropToken(token)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div key="fused" className="alchemy-fused-card" initial={{ opacity: 0, scale: .35, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={TOKEN_SPRINGS}>
              <span className="alchemy-fused-symbol">✦</span>
              <span className="alchemy-fused-parts">{primary.map((token) => token.label).join(' + ')}</span>
              <strong>{challenge.targetEn}</strong>
              <small>{challenge.targetEs}</small>
              <SpeakBtn text={challenge.targetEn} title="Repetir la fusión" />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className={`alchemy-feedback ${feedback ? 'is-visible' : ''}`} role="status">{feedback || 'Las piezas principales brillan cuando están listas para unirse.'}</div>

      {fused ? (
        <motion.section className="alchemy-success" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div><b>🎉 Conexión guardada en tu memoria</b><span>{challenge.exampleEn || 'Ahora di una frase propia con esta unidad.'}</span></div>
          <div className="alchemy-actions"><button type="button" className="btn big" onClick={onNext}>Siguiente fusión →</button><button type="button" className="btn secondary" onClick={reset}>Repetir esta</button></div>
        </motion.section>
      ) : (
        <p className="alchemy-hint">Toca y arrastra con decisión. La colisión correcta hace que las dos piezas se conviertan en una.</p>
      )}
    </main>
  );
}

function AlchemyTokenCard({ token, index, active, register, onStart, onDrop }: { token: AlchemyToken; index: number; active: boolean; register: (element: HTMLDivElement | null) => void; onStart: () => void; onDrop: () => void }) {
  const isPrimary = token.role === 'primary';
  return (
    <motion.div
      ref={register}
      className={`alchemy-token ${isPrimary ? 'is-primary' : 'is-distractor'} alchemy-token-${index} ${active ? 'is-active' : ''}`}
      drag
      dragSnapToOrigin
      dragElastic={0.22}
      dragMomentum={false}
      whileDrag={{ scale: 1.12, rotate: 4, zIndex: 10, boxShadow: '0 20px 45px rgba(0,0,0,.28)' }}
      whileTap={{ scale: .96 }}
      onDragStart={onStart}
      onDragEnd={onDrop}
      transition={TOKEN_SPRINGS}
      role="button"
      tabIndex={0}
      aria-label={`Ficha ${token.label}`}
    >
      <span>{token.label}</span>
      <small>{isPrimary ? 'pieza clave' : 'distractor'}</small>
    </motion.div>
  );
}

export function AlchemyEmpty({ children, onExit }: { children?: ReactNode; onExit?: () => void }) {
  return (
    <main className="alchemy-stage alchemy-empty">
      <header className="alchemy-topbar">
        <button type="button" className="alchemy-exit mission-exit" onClick={onExit}>✕ Salir al Inicio</button>
        <div className="alchemy-brand"><span>MEMORA</span> ALQUIMIA</div>
        <span className="alchemy-xp">⚗️ RUTA</span>
      </header>
      <div className="alchemy-empty-card"><span>🧪</span><h1>Aún no hay piezas para fusionar</h1><p>Cuando el catálogo phrasal esté cargado, aquí podrás convertir dos palabras en una unidad que recuerdes.</p>{children}</div>
    </main>
  );
}
