import { useEffect, useRef, useState } from 'react';
import { stopSpeech } from '../services/audio';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { sentenceSpeechParts } from '../domain/sentenceAnswer';

/** Ensayo oral opcional y local: la grabación nunca sale del dispositivo. */
export function EchoPractice({ phrase, parts = [], reply, required = false, onResolved }: { phrase: string; parts?: string[]; reply?: string; required?: boolean; onResolved?: () => void }) {
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const opening = useRef(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [replyReady, setReplyReady] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const playback = useRef<HTMLAudioElement | null>(null);
  const chunks = useRef<Blob[]>([]);
  const url = useRef<string | null>(null);
  const mounted = useRef(true);
  const model = useSpeechPlayback();
  const sequence = useRef(0);
  const replyTimer = useRef<ReturnType<typeof setTimeout>>();
  const [activePart, setActivePart] = useState<number | null>(null);
  const [sequencing, setSequencing] = useState(false);
  const spokenParts = sentenceSpeechParts(phrase, parts);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current++; model.reset(); stopSpeech();
      clearTimeout(replyTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      playback.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  function cancelModel() {
    clearTimeout(replyTimer.current);
    sequence.current++; model.reset(); stopSpeech(); setActivePart(null); setSequencing(false);
  }
  async function listenModel(text: string, part: number | null = null) {
    if (recording || preparing) return;
    playback.current?.pause(); cancelModel(); setActivePart(part);
    await model.listen(text);
  }
  async function listenParts() {
    if (recording || preparing || spokenParts.length < 2) return;
    playback.current?.pause(); cancelModel();
    const token = sequence.current;
    setSequencing(true);
    // Follow real playback completion, not estimated syllable timers. A failed
    // channel stops the sequence but never locks the oral activity or records it.
    for (const [index, part] of [...spokenParts, phrase].entries()) {
      if (!mounted.current || token !== sequence.current) return;
      setActivePart(index < spokenParts.length ? index : -1);
      const result = await model.listen(part);
      if (!mounted.current || token !== sequence.current) return;
      if (result?.status !== 'played') break;
    }
    if (mounted.current && token === sequence.current) { setSequencing(false); setActivePart(null); }
  }

  async function start() {
    if (opening.current || recorder.current?.state === 'recording') return;
    opening.current = true; setPreparing(true);
    cancelModel();
    let acquired: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('El micrófono no está disponible aquí. Puedes seguir jugando.');
        onResolved?.(); return;
      }
      setError('');
      stopSpeech();
      playback.current?.pause();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      acquired = media;
      if (!mounted.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      chunks.current = [];
      const next = new MediaRecorder(media);
      recorder.current = next;
      next.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (!mounted.current || !chunks.current.length) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(new Blob(chunks.current, { type: next.mimeType || 'audio/webm' }));
        setRecordedUrl(url.current);
        onResolved?.();
        if (reply) {
          setReplyReady(true);
          replyTimer.current = setTimeout(() => { if (mounted.current) void model.listen(reply); }, 350);
        }
      };
      next.start();
      setRecording(true);
    } catch {
      acquired?.getTracks().forEach((track) => track.stop());
      if (stream.current === acquired) stream.current = null;
      if (mounted.current) { setError('No se pudo usar el micrófono. Puedes seguir sin grabarte.'); onResolved?.(); }
    } finally {
      opening.current = false;
      if (mounted.current) setPreparing(false);
    }
  }

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  }

  function playMine() {
    if (!recordedUrl) return;
    cancelModel();
    playback.current?.pause();
    const audio = new Audio(recordedUrl);
    playback.current = audio;
    void audio.play().catch(() => setError('Toca de nuevo para escuchar tu voz.'));
  }

  return <div className="echo-practice">
    {required && !recordedUrl && !error ? <p className="echo-required">Última tarea: di la frase para completar la escena.</p> : null}
    {spokenParts.length > 1 ? <div className="echo-parts" aria-label="Escuchar la frase por partes">
      <small>ESCUCHA POR PARTES</small>
      <div>{spokenParts.map((part, index) => <button type="button" key={index} className={activePart === index && model.audio?.status === 'playing' ? 'is-speaking' : undefined} aria-busy={activePart === index && model.audio?.status === 'preparing'} onClick={() => void listenModel(part, index)} disabled={recording || preparing}>🔊 {part}</button>)}</div>
      <button type="button" className="echo-sequence" aria-label={sequencing ? 'Detener escucha por piezas' : 'Escuchar piezas y frase completa'} aria-pressed={sequencing} onClick={() => sequencing ? cancelModel() : void listenParts()} disabled={recording || preparing}>{sequencing ? '■ Detener escucha' : '🔊 Piezas → frase'}</button>
    </div> : null}
    <button type="button" className={`echo-listen${activePart === -1 && model.audio?.status === 'playing' ? ' is-speaking' : ''}`} aria-busy={activePart === -1 && model.audio?.status === 'preparing'} onClick={() => void listenModel(phrase, -1)} disabled={recording || preparing}>🔊 Frase completa</button>
    <AssociationAudioStatus compact state={model.audio} />
    <button type="button" className={`echo-record ${recording ? 'is-recording' : ''}`} disabled={preparing} aria-busy={preparing} onClick={recording ? stop : () => void start()}>{preparing ? 'Preparando micrófono…' : recording ? '■ Terminar eco' : '🎙️ Di la frase'}</button>
    {recordedUrl ? <div className="echo-compare"><button type="button" onClick={playMine}>Oír mi voz</button></div> : null}
    {reply && replyReady ? <div className="echo-reply"><small>TE RESPONDEN</small><button type="button" disabled={recording || preparing} onClick={() => void listenModel(reply)}>🔊 {reply}</button></div> : null}
    {error ? <small role="status">{error}</small> : null}
  </div>;
}
