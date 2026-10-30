import { useEffect, useRef, useState } from 'react';
import { useSpeechPlayback } from './useSpeechPlayback';

/** Same audio service; a failed playback becomes a readable task, not a dead end. */
export function StoryListeningPrompt({ text, onTextReveal, onBusyChange }: {
  text: string; onTextReveal: () => void; onBusyChange: (busy:boolean) => void;
}) {
  const playback=useSpeechPlayback();
  const [reading,setReading]=useState(false);
  const revealed=useRef(false);
  const busy=playback.audio?.status==='preparing'||playback.audio?.status==='playing';
  useEffect(()=>{onBusyChange(busy);},[busy,onBusyChange]);
  useEffect(()=>()=>onBusyChange(false),[onBusyChange]);
  function reveal() {
    if(revealed.current)return;
    revealed.current=true; setReading(true); onTextReveal();
  }
  return <div className="story-listening">
    <button type="button" className="quiet-action" aria-label="Escucha el pedido" aria-busy={busy} onClick={()=>{
      void playback.listen(text).then(result=>{
        if(result?.status==='blocked'||result?.status==='unavailable')reveal();
      });
    }}>🔊 {busy?playback.label:'Escucha el pedido'}</button>
    {reading?<><p className="story-target" lang="en">{text}</p><p className="story-listening-note" role="status">Lee el mensaje y elige. Cuenta como práctica con texto.</p></>:<button type="button" className="story-help" onClick={reveal}>Prefiero leer el mensaje</button>}
  </div>;
}
