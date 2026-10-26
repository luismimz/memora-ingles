import { useEffect, useRef, useState } from 'react';
import type { GrammarLessonData } from '../domain/grammarLesson';
import type { GrammarForm } from '../domain/unit';
import type { SyncStatus } from '../services/progressSync';
import type { Appearance } from '../useAppearance';
import { stopSpeech } from '../services/audio';
import { GrammarCoach } from './GrammarCoach';
import { PlayHeader } from './PlayHeader';

/** Presentation/return only. The owning activity saves help and keeps its progress. */
export function useGrammarReminder() {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);
  const open = () => { stopSpeech(); setOpen(true); };
  const close = () => { stopSpeech(); returning.current = true; setOpen(false); };
  useEffect(() => {
    if (!isOpen && returning.current) { returning.current = false; trigger.current?.focus(); }
  }, [isOpen]);
  return { isOpen, trigger, open, close };
}

export function GrammarReminder({ lesson, form, userId, unitId, onClose, appearance, onToggleAppearance, syncStatus }: {
  lesson: GrammarLessonData; form?: GrammarForm; userId: string; unitId: string; onClose: () => void;
  appearance: Appearance; onToggleAppearance: () => void; syncStatus?: SyncStatus;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main className="game-screen play-flow" onKeyDown={(event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onClose(); }
  }}>
    <h1 ref={heading} tabIndex={-1} className="sr-only">Recordar el truco</h1>
    <PlayHeader title="Recordar el truco" backLabel="← Mi mensaje" onExit={onClose} appearance={appearance} onToggleAppearance={onToggleAppearance} syncStatus={syncStatus} />
    <section className="game-stage"><GrammarCoach explanationOnly puzzle lesson={lesson} form={form} userId={userId} unitId={unitId} reviewMode onReady={() => {}} onContinue={onClose} /></section>
  </main>;
}
