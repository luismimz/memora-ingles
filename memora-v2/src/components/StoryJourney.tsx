import { useEffect, useRef, useState } from 'react';
import { storyAccepts, storyBank, storyCards, storyChapters, storyJourney, storySentence, type StoryCard } from '../domain/storyJourney';
import { readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint } from '../domain/trickCheckpoint';
import { recordLearningActivity } from '../domain/learningActivity';
import { dueSentenceMemories, recordSentenceExposure, recordSentenceRecall, sentenceKey } from '../domain/memory';
import { sentenceSpellingRepair } from '../domain/sentenceAnswer';
import { readArcadeCalm, writeArcadeCalm } from '../domain/arcadeCadence';
import { playSnap, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { PlayViewport } from './PlayViewport';
import { GrammarOrder } from './GrammarOrder';
import { AnswerStudio } from './AnswerStudio';
import { SpeechModelButton } from './SpeechModelButton';
import { WritingSpellingRepair } from './WritingSpellingRepair';
import { ArcadeClock } from './ArcadeClock';
import { useArcadeClock } from './useArcadeClock';
import { EchoPractice } from './EchoPractice';
import './storyJourney.css';

function fresh(stage = 0): TrickCheckpoint {
  return { stage, checkIndex:0, checkId:storyCards[stage]?.id ?? 'end', input:'', order:[], feedback:'idle', helped:false, checkFailures:0, episodeId:crypto.randomUUID(), promptStartedAt:new Date().toISOString() };
}
function resume(userId: string, inspection: boolean) {
  const saved = !inspection && readTrickCheckpoint(userId,storyJourney.id,storyJourney.version);
  if (!saved) return fresh();
  if (saved.checkId === 'end') return { ...saved, stage:storyCards.length };
  const stage = storyCards.findIndex(card => card.id === saved.checkId);
  if (stage < 0 || (saved.order ?? []).some(index => index >= (storyCards[stage].chunks?.length ?? 0))) return fresh();
  return { ...saved, stage };
}

/** A new authored journey. Persistence, attempts, audio and memory remain shared. */
export function StoryJourney({ userId, inspection = false, onExit }: { userId:string; inspection?:boolean; onExit:()=>void }) {
  const [state,setState] = useState(() => resume(userId,inspection));
  const live = useRef(state); live.current = state;
  const [calm,setCalm] = useState(() => readArcadeCalm(userId));
  const [paused,setPaused] = useState(false);
  const [menu,setMenu] = useState(false);
  const [oral,setOral] = useState(false);
  const original = storyCards[state.stage];
  const card: StoryCard | undefined = original && state.review ? {...original,kind:'write',title:'En otra ocasión, necesitas decirlo.',scene:['🧳',...original.scene.slice(-1)],answer:undefined,timed:false} : original;
  const solved = state.feedback === 'correct';
  const model = (state.checkFailures ?? 0) >= 2;
  const teach = card?.kind === 'discover' || card?.kind === 'mirror';
  const bank = card ? storyBank(card) : [];
  const revealed = card?.kind === 'discover' ? state.input === 'seen' : card?.kind === 'mirror' ? state.order?.length === card.chunks?.length : false;
  const chapter = storyChapters[card?.chapter ?? 2];
  const clock = useArcadeClock(state.stage,solved || model,Boolean(card?.timed),() => help(true),() => {},0,12000,0,calm || paused || menu || oral,true);

  function save(patch: Partial<TrickCheckpoint>) {
    const next = {...live.current,...patch}; live.current=next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId,storyJourney.id,storyJourney.version,next);
  }
  function record(response:string, correct:boolean|null, helped:boolean, source:'learner'|'authored'='learner') {
    if (inspection || !card) return undefined;
    return recordLearningActivity(userId,{ unitId:storyJourney.id,unitTitle:storyJourney.title,contentVersion:storyJourney.version,
      activityId:`story:${state.episodeId}:${card.id}`,skill:`story:${card.id}`,phase:teach?'grammar':card.timed?'arcade':card.kind==='write'?'dialogue':'construction',
      source,modality:card.kind==='write' && !helped?'writing':'choice',prompt:card.es,response,expected:card.answer ?? card.en,correct,helped,
      promptLanguage:'es',responseLanguage:card.options?'es':'en',parentAttemptId:live.current.previousAttemptId,
      responseDelayMs:Math.max(0,Date.now()-Date.parse(live.current.promptStartedAt ?? new Date().toISOString())) });
  }
  function expose() {
    if (!card) return;
    record(card.en,null,true,'authored');
    if (!inspection && card.kind !== 'discover') recordSentenceExposure(userId,storyJourney.id,storySentence(card));
  }
  function advance() {
    if (!card || live.current.checkId !== card.id || paused || menu || oral) return;
    if (!solved && !teach && !model) record('Pasó a otra escena; práctica pendiente.',null,live.current.helped);
    stopSpeech();
    const pending = live.current.review?.pending.slice(1);
    const nextStage = pending ? (pending.length ? storyCards.findIndex(item=>item.id===pending[0]) : storyCards.length) : state.stage+1;
    save({...fresh(nextStage),episodeId:state.episodeId,continuation:undefined,previousAttemptId:undefined,correctionResponse:undefined,...(pending ? {review:{pending,total:state.review!.total}} : {review:undefined})});
  }
  function answer(value:string, assisted=false) {
    if (!card || live.current.checkId !== card.id || live.current.feedback === 'correct' || (live.current.checkFailures ?? 0)>=2 || paused || menu) return;
    const correct=storyAccepts(value,card.answer ?? card.en);
    const helped=live.current.helped || assisted || card.kind!=='write';
    const event=record(value,correct,helped);
    if (!inspection && correct && card.kind==='build') recordSentenceExposure(userId,storyJourney.id,storySentence(card));
    if (!inspection && card.kind==='write' && !helped) {
      if (correct) recordSentenceExposure(userId,storyJourney.id,storySentence(card));
      recordSentenceRecall(userId,sentenceKey(storyJourney.id,storySentence(card)),correct?'hesitant':'missed');
    }
    save({feedback:correct?'correct':'help',helped:helped || !correct,correctionResponse:value,previousAttemptId:event?.id,
      checkFailures:correct ? live.current.checkFailures : Math.min(2,(live.current.checkFailures ?? 0)+1)});
    if (correct) playSnap();
    else if ((live.current.checkFailures ?? 0)>=2) expose();
  }
  function help(full=false) {
    if (!card || solved || model) return;
    expose();
    save({helped:true,feedback:'help',...(full?{checkFailures:2}:card.kind==='write'?{continuation:{phase:'build',sentenceIndex:0,filledSlots:0,modelUsed:true}}:{})});
  }
  function reveal(index?:number) {
    if (!card || paused || menu) return;
    if (card.kind==='discover') { if (live.current.input!=='seen') { expose(); save({input:'seen'}); } return; }
    const order=live.current.order ?? [];
    if (index===undefined || order.includes(index)) return;
    const next=[...order,index]; save({order:next});
    if (next.length===card.chunks?.length) expose();
  }
  useEffect(()=>{if(!inspection) writeTrickCheckpoint(userId,storyJourney.id,storyJourney.version,live.current);},[]);
  useEffect(()=>()=>stopSpeech(),[state.stage]);
  useEffect(()=>{if(paused || menu) stopSpeech();},[paused,menu]);
  useEffect(()=>{
    if(!solved || calm || paused || menu || oral) return;
    const timer=window.setTimeout(advance,1450);
    return ()=>window.clearTimeout(timer);
  },[state.stage,solved,calm,paused,menu,oral]);

  const due = !card && !inspection ? dueSentenceMemories(userId).filter(item=>item.unitId===storyJourney.id) : [];
  function reviewDue() {
    const pending=due.flatMap(memory=>{const match=storyCards.find(item=>item.chunks && storyAccepts(item.en,memory.sentenceEn));return match?[match.id]:[];}).filter((id,index,all)=>all.indexOf(id)===index).slice(0,8);
    if (!pending.length) return;
    save({...fresh(storyCards.findIndex(item=>item.id===pending[0])),review:{pending,total:pending.length}});
  }
  const scene = <div className={`story-scene${solved?' is-alive':''}`} aria-label={card?.scene.join(' ')}>{card?.scene.map((emoji,index)=><span key={index} style={{'--actor':index} as React.CSSProperties}>{emoji}</span>)}<i aria-hidden="true" /></div>;
  const spelling = card?.kind==='write' && state.feedback==='help' ? sentenceSpellingRepair(state.input,card.en) : undefined;
  return <PlayViewport><main className={`story-world${card?.timed?' is-arcade':''}`} style={{'--story-accent':chapter.color,'--story-bg':chapter.background} as React.CSSProperties}>
    <header className="story-header"><span className="story-logo">m<span>memora</span></span><span>{card ? `${card.chapter+1} / ${storyChapters.length}`:'Tus historias'}</span><button aria-label="Pausa y opciones" onClick={()=>setMenu(!menu)}>•••</button></header>
    {menu ? <nav className="story-menu" onKeyDown={event=>{if(event.key==='Escape')setMenu(false);}}><button onClick={()=>{setPaused(!paused);setMenu(false);}}>{paused?'Reanudar':'Pausar'}</button><button aria-pressed={calm} onClick={()=>{setCalm(!calm);if(!inspection)writeArcadeCalm(userId,!calm);}}>Modo tranquilo {calm?'✓':''}</button>{card?<button onClick={()=>{if(!teach&&!solved)help();setOral(true);setMenu(false);}}>Practicar esta frase con mi voz</button>:null}<button onClick={()=>{stopSpeech();onExit();}}>Mi recorrido y herramientas</button><button onClick={()=>setMenu(false)}>Cerrar</button></nav>:null}
    {oral && card ? <section className="story-rest"><h1>Escucha. Prueba tu voz.</h1><p lang="en">{card.en}</p><EchoPractice phrase={card.en} parts={card.chunks?.map(part=>part.en)}/><small>Escucha y compara. No es una evaluación de pronunciación.</small><button onClick={()=>{stopSpeech();setOral(false);}}>Volver a la escena</button></section> : paused ? <section className="story-rest"><h1>Tu historia te espera.</h1><button onClick={()=>setPaused(false)}>Volver</button></section> : !card ? <section className="story-rest"><span className="story-end-art">☕ 🔑 🚆</span><h1>Ya has vivido tres historias.</h1><p>Pedidos, necesidades y preguntas. La próxima comprobación será recordarlos después.</p>{due.length ? <button onClick={reviewDue}>Recuperar lo que toca hoy</button>:<p>Este tramo termina aquí. Los repasos aparecerán cuando correspondan; el resto del curso aún conserva el recorrido anterior.</p>}<button onClick={onExit}>Abrir mi recorrido</button></section> : <GameCard vertical showAdvanceButton={false} onAdvance={advance} key={`${state.episodeId}:${card.id}`} stepKey={card.id} className="story-card" feedback={solved?'correct':model?'model':state.feedback==='help'?'retry':undefined}>
      <article className={`story-stage kind-${card.kind}`}>
        <div className="story-context"><span>{chapter.title}</span><span>{card.timed?'⚡ ARCADE':state.review?'RECUERDA':card.kind==='mirror'?'EL TRUCO':card.kind==='build'?'CREA':card.kind==='listen'?'ESCUCHA':card.kind==='write'?'SIN PIEZAS':'DESCUBRE'}</span></div>
        <h1>{card.title}</h1>
        {card.kind==='write' ? null : scene}
        {card.timed && !calm ? <ArcadeClock durationMs={12000} remaining={clock.remaining} paused={paused || menu} revealed={solved || model} />:null}
        {card.kind==='discover' ? <div className="story-discover"><button className="story-reveal" data-feed-surface="true" onClick={()=>reveal()}><span>{revealed?card.en:'Toca para descubrir'}</span><small>{revealed?card.es:card.bridge}</small></button>{revealed?<><p>{card.hint}</p><SpeechModelButton text={card.en} label="Escuchar el inglés" /></>:null}</div>
        : card.kind==='mirror' ? <div className="story-mirror"><p className="story-target">{card.es}</p><div className="story-mirror-pieces">{card.chunks?.map((part,index)=><button key={index} className={`story-piece role-${index}${state.order?.includes(index)?' is-turned':''}`} onClick={()=>reveal(index)} data-feed-surface="true"><strong lang={state.order?.includes(index)?'en':'es'}>{state.order?.includes(index)?part.en:part.es}</strong><small>{state.order?.includes(index)?part.es:'toca ↻'}</small></button>)}</div><p className="story-insight">{revealed?card.hint:'Gira las piezas: el español se convierte en inglés.'}</p>{revealed?<SpeechModelButton text={card.en} label="Escuchar la frase"/>:null}</div>
        : model ? <div className="story-model"><span>Vamos con ayuda</span><strong lang="en">{card.en}</strong><p>{card.hint}</p><SpeechModelButton text={card.en}/><small>Puedes deslizar y seguir. Queda como práctica con ayuda.</small></div>
        : card.kind==='build' || card.kind==='write' && state.continuation ? <div className="story-builder"><p className="story-target">{card.es}</p>{state.helped?<p className="story-insight">{card.hint}</p>:null}<GrammarOrder puzzle autoCheck pieces={bank.map((part,index)=>({text:part.en,role:index===bank.length-1?'subject':'context'}))} selected={state.order ?? []} locked={solved} onChange={order=>save({order})} onAnswer={value=>answer(value,true)}/></div>
        : card.kind==='write' ? <AnswerStudio id="story-write" taskKey={card.id} scene={scene} target={card.es} instruction="Dilo en inglés" value={state.input} onChange={input=>save({input,feedback:'idle'})} accepts={value=>storyAccepts(value,card.en)} onAnswer={value=>answer(value)} disabled={solved} repeatDraftCues draftCue={value=>sentenceSpellingRepair(value,card.en)?card.hint:undefined} onDraftCue={(value,cue)=>{if(live.current.input!==value)return;record(cue,null,true,'authored');save({feedback:'help',helped:true});}} feedback={spelling?<WritingSpellingRepair repair={spelling} onApply={()=>answer(spelling.corrected,true)}/>:state.feedback==='help'?card.hint:undefined}/>
        : <div className="story-choice">{card.kind==='listen'?<SpeechModelButton text={card.en} label="Escucha el pedido"/>:<p className="story-target" lang="en">{card.en}</p>}<div className="story-options">{card.options?.map(option=><button key={option.value} disabled={solved} onClick={()=>answer(option.value)} className={solved && option.value===card.answer?'is-right':state.correctionResponse===option.value?'is-wrong':''}><span>{option.image}</span><strong>{option.text}</strong></button>)}</div></div>}
        <div className="story-response" aria-live="polite">{solved?<p>✓ {state.helped && card.kind==='write'?'Mensaje construido con ayuda.':card.reaction}</p>:state.feedback==='help' && !model && card.kind!=='write'?<p>{card.hint}</p>:null}</div>
        {!teach && !solved && !model?<button className="story-help" onClick={()=>help(card.kind!=='write')}>{card.kind==='write'?'Armar juntos':'Enséñame cómo'}</button>:null}
        <footer className="story-gesture"><span aria-hidden="true">↑</span> {teach?'Desliza cuando quieras':solved?'Tu historia sigue':model?'Sigue con otra escena':'Puedes deslizar; este reto quedará pendiente'}</footer>
      </article>
    </GameCard>}
  </main></PlayViewport>;
}
