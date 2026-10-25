import { useEffect, useRef, useState } from 'react';
import { playEnglish, stopSpeech } from '../services/audio';

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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      playback.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  async function start() {
    if (opening.current || recorder.current?.state === 'recording') return;
    opening.current = true; setPreparing(true);
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
          window.setTimeout(() => { if (mounted.current) void playEnglish(reply); }, 350);
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
    stopSpeech();
    playback.current?.pause();
    const audio = new Audio(recordedUrl);
    playback.current = audio;
    void audio.play().catch(() => setError('Toca de nuevo para escuchar tu voz.'));
  }

  function listenFirst() {
    playback.current?.pause();
    void playEnglish(phrase);
  }

  return <div className="echo-practice">
    {required && !recordedUrl && !error ? <p className="echo-required">Última tarea: di la frase para completar la escena.</p> : null}
    {parts.length > 1 ? <div className="echo-parts" aria-label="Escuchar la frase por partes">
      <small>ESCUCHA POR PARTES</small>
      <div>{parts.map((part) => <button type="button" key={part} onClick={() => void playEnglish(part)} disabled={recording}>🔊 {part}</button>)}</div>
    </div> : null}
    <button type="button" className="echo-listen" onClick={listenFirst} disabled={recording}>🔊 Frase completa</button>
    <button type="button" className={`echo-record ${recording ? 'is-recording' : ''}`} disabled={preparing} aria-busy={preparing} onClick={recording ? stop : () => void start()}>{preparing ? 'Preparando micrófono…' : recording ? '■ Terminar eco' : '🎙️ Di la frase'}</button>
    {recordedUrl ? <div className="echo-compare"><button type="button" onClick={playMine}>Oír mi voz</button></div> : null}
    {reply && replyReady ? <div className="echo-reply"><small>TE RESPONDEN</small><button type="button" onClick={() => void playEnglish(reply)}>🔊 {reply}</button></div> : null}
    {error ? <small role="status">{error}</small> : null}
  </div>;
}
