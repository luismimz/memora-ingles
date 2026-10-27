import { AnswerStudio } from './AnswerStudio';
import { useRef, useState } from 'react';
import { evaluateMirrorAnswer, mirrorHint, mirrorText, nextMirrorHint, type MirrorExample, type MirrorLessonData } from '../domain/mirrorLesson';
import type { AtomicUnit } from '../domain/unit';
import { recordLearningActivity } from '../domain/learningActivity';
import { recordGrammarAttempt } from '../domain/grammarMemory';
import { recordSentenceExposure } from '../domain/memory';
import { playEnglish, playSnap } from '../services/audio';
import { MirrorText } from './MirrorPieces';

export function MirrorWriteTest({ unit, example, lesson, userId, inspection, activityId, nextLabel, onSuccess, recall = false }: { unit: AtomicUnit; example: MirrorExample; lesson: MirrorLessonData; userId: string; inspection: boolean; activityId: string; nextLabel: string; onSuccess: () => void; recall?: boolean }) {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correct, setCorrect] = useState(false);
  const previous = useRef<string>();
  const lock = useRef(false);
  const last = useRef<string>();
  const advanced = useRef(false);
  const hints = recall ? { ...lesson, hints: lesson.recallHints } : lesson;
  function clue(response = input) {
    const next = nextMirrorHint(level);
    const cue = mirrorHint(hints, response, next);
    setLevel(next); setFeedback(cue);
    if (!inspection) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `${activityId}:hint-${next}`, skill: lesson.id, phase: 'grammar', source: 'authored', modality: 'choice', prompt: example.natural, response: cue, expected: '', correct: null, helped: true, feedback: `Pista ${next} de 3 · no revela la frase completa.`, parentAttemptId: previous.current });
    return cue;
  }
  function answer() {
    if (lock.current || !input.trim() || last.current === input) return;
    last.current = input;
    const ok = evaluateMirrorAnswer(example, input);
    const correction = ok ? 'Has escrito la frase completa. También se admite la contracción.' : mirrorHint(hints, input, nextMirrorHint(level));
    if (!inspection) {
      const attempt = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId, skill: lesson.id, phase: recall ? 'arcade' : 'grammar', source: 'learner', modality: 'writing', prompt: example.natural, response: input, expected: mirrorText(example.english), correct: ok, helped: level > 0, feedback: correction, parentAttemptId: previous.current });
      previous.current = attempt.id;
      recordGrammarAttempt(userId, { unitId: unit.id, skill: lesson.id, check: activityId, kind: 'write', correct: ok, helped: level > 0, at: attempt.at });
      if (ok) recordSentenceExposure(userId, unit.id, { en: example.contracted + '.', es: example.natural, slots: [], pronunciationTip: unit.sentence.pronunciationTip });
    }
    if (!ok) { clue(input); return; }
    lock.current = true; setCorrect(true); setFeedback(correction); playSnap(); void playEnglish(example.contracted);
  }
  return <div className="mirror-test">
    <p className="eyebrow">{recall ? 'RECORDAR · SIN MODELO' : 'PROBAR · SIN MODELO'}</p>
    {correct ? <h1>{example.natural}</h1> : null}
    {!correct ? <><AnswerStudio id="mirror-answer" taskKey={`${unit.id}:${activityId}`} target={example.natural} value={input} onChange={(value) => { setInput(value); last.current = undefined; }} onAnswer={() => answer()} accepts={(value) => evaluateMirrorAnswer(example, value)} /><button type="button" className="quiet-action" onClick={() => clue()}>Una pista{level ? ` · ${level}/3` : ''}</button></> : <><p className="mirror-correct" lang="en"><MirrorText text={input} lesson={lesson} /></p><button type="button" className="quiet-action" onClick={() => void playEnglish(example.contracted)}>🔊 Escuchar la frase</button></>}
    <p className="mirror-feedback" role="status">{feedback || 'Sin reloj ni penalización. Puedes probar otra vez.'}</p>
    {correct ? <button type="button" className="primary-action" onClick={() => { if (!advanced.current) { advanced.current = true; onSuccess(); } }}>{nextLabel}</button> : null}
  </div>;
}
