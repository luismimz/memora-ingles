import { useEffect, useRef, useState } from 'react';
import { storyAccepts, storyBank, storyCards, storyChapters, storyJourney, storySentence, type StoryCard } from '../domain/storyJourney';
import { readTrickCheckpoint, writeTrickCheckpoint, type TrickCheckpoint } from '../domain/trickCheckpoint';
import { readLearningActivities, recordLearningActivity } from '../domain/learningActivity';
import { pendingStoryReturns, storyTransfer } from '../domain/storyReturn';
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
import { StoryMirror } from './StoryMirror';
import { StoryScene } from './StoryScene';
import { storyRole, storyWritingCue } from '../domain/storyLanguage';
import './storyJourney.css';

function fresh(stage = 0): TrickCheckpoint {
  return { stage, checkIndex:0, checkId:storyCards[stage]?.id ?? 'end', input:'', order:[], feedback:'idle', helped:false, checkFailures:0, episodeId:crypto.randomUUID(), promptStartedAt:new Date().toISOString() };
}
function resume(userId: string, inspection: boolean) {
  const saved = !inspection && readTrickCheckpoint(userId,storyJourney.id,storyJourney.version);
  if (!saved) return fresh();
  if (saved.checkId === 'end') return saved.stage < storyCards.length ? fresh(saved.stage) : { ...saved, stage:storyCards.length };
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
  const [audioBusy,setAudioBusy] = useState(false);
  const [exploration,setExploration] = useState<{source:string;card:StoryCard}>();
  const original = storyCards[state.stage];
  const card: StoryCard | undefined = original && state.review ? state.review.mode==='transfer' ? storyTransfer(original) ?? original : {...original,kind:'write',title:'En otra ocasión, necesitas decirlo.',scene:['🧳',...original.scene.slice(-1)],answer:undefined,timed:false} : original;
  const solved = state.feedback === 'correct';
  const model = (state.checkFailures ?? 0) >= 2;
  const teach = card?.kind === 'discover' || card?.kind === 'mirror';
  const bank = card ? storyBank(card) : [];
  const chapter = storyChapters[card?.chapter ?? 2];
  const clock = useArcadeClock(state.stage,solved || model,Boolean(card?.timed),() => help(true),() => {},0,12000,0,calm || paused || menu || oral,true);

  function save(patch: Partial<TrickCheckpoint>) {
    const next = {...live.current,...patch}; live.current=next; setState(next);
    if (!inspection) writeTrickCheckpoint(userId,storyJourney.id,storyJourney.version,next);
  }
  function record(response:string, correct:boolean|null, helped:boolean, source:'learner'|'authored'='learner', shown=card, feedback?:string) {
    if (inspection || !card || !shown) return undefined;
    const selected=source==='learner' ? shown.options?.find(option=>option.value===response) : undefined;
    const expected=selected ? shown.options?.find(option=>option.value===shown.answer)?.text : shown.en;
    return recordLearningActivity(userId,{ unitId:storyJourney.id,unitTitle:storyJourney.title,contentVersion:storyJourney.version,
      activityId:`story:${state.episodeId}:${card.id}`,skill:`story:${card.id}`,phase:state.review?.mode==='transfer'?'transfer':teach?'grammar':card.timed?'arcade':card.kind==='write'?'dialogue':'construction',feedback,
      source,modality:!feedback && card.kind==='write' && !helped?'writing':'choice',prompt:shown.es,response:selected?.text ?? response,expected:expected ?? shown.en,correct,helped,
      promptLanguage:'es',responseLanguage:feedback?'es':selected?(shown.choiceLanguage ?? 'es'):'en',parentAttemptId:live.current.previousAttemptId,
      responseDelayMs:Math.max(0,Date.now()-Date.parse(live.current.promptStartedAt ?? new Date().toISOString())) });
  }
  function expose(shown=card) {
    if (!shown) return;
    record(shown.en,null,true,'authored',shown);
    if (!inspection && shown.kind !== 'discover') recordSentenceExposure(userId,storyJourney.id,storySentence(shown));
  }
  function advance() {
    if (!card || live.current.checkId !== card.id || paused || menu || oral) return;
    // Visible teaching is an exposure, never a successful recall. Older revealed
    // checkpoints already recorded it; leaving must not duplicate that event.
    if (teach && live.current.input !== 'seen' && !(card.kind==='mirror' && live.current.order?.length===card.chunks?.length)) expose();
    if(state.review?.mode==='transfer') record('Terminó la oportunidad de volver al mensaje.',null,live.current.helped,'learner',card,'story:returned');
    else if (!solved && !teach && !model) record('Pasó a otra escena; práctica pendiente.',null,live.current.helped,'learner',card,'story:omitted');
    stopSpeech();
    const pending = live.current.review?.pending.slice(1);
    const returnStage=live.current.resumeAfter ? storyCards.findIndex(item=>item.id===live.current.resumeAfter) : storyCards.length;
    let nextStage = pending ? (pending.length ? storyCards.findIndex(item=>item.id===pending[0]) : returnStage<0?storyCards.length:returnStage) : state.stage+1;
    let review:TrickCheckpoint['review']=pending?.length ? {...state.review!,pending} : undefined;
    let resumeAfter=pending?.length ? live.current.resumeAfter : undefined;
    // A small due-memory interlude connects chapters. Timing belongs to the
    // existing SRS; swiping never marks a memory recalled or manufactures work.
    if(!pending && !inspection && (!storyCards[nextStage] || storyCards[nextStage].chapter!==card.chapter)) {
      const due=dueReviews(state.stage,2);
      const returns=due.length?[]:pendingStoryReturns(readLearningActivities(userId),state.stage);
      const interlude=due.length?due:returns;
      if(interlude.length) { resumeAfter=storyCards[nextStage]?.id ?? 'end'; review={pending:interlude,total:interlude.length,...(returns.length?{mode:'transfer' as const}:{})}; nextStage=storyCards.findIndex(item=>item.id===interlude[0]); }
    }
    save({...fresh(nextStage),episodeId:state.episodeId,continuation:undefined,previousAttemptId:undefined,correctionResponse:undefined,review,resumeAfter});
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
  useEffect(()=>{if(!inspection) writeTrickCheckpoint(userId,storyJourney.id,storyJourney.version,live.current);},[]);
  useEffect(()=>()=>stopSpeech(),[state.stage]);
  useEffect(()=>{if(paused || menu) stopSpeech();},[paused,menu]);
  useEffect(()=>{
    if(!solved || calm || paused || menu || oral || audioBusy) return;
    const timer=window.setTimeout(advance,1450);
    return ()=>window.clearTimeout(timer);
  },[state.stage,solved,calm,paused,menu,oral,audioBusy]);

  const due = !card && !inspection ? dueSentenceMemories(userId).filter(item=>item.unitId===storyJourney.id) : [];
  function dueReviews(through:number,limit:number) {
    return dueSentenceMemories(userId).filter(item=>item.unitId===storyJourney.id)
      .flatMap(memory=>{const match=storyCards.slice(0,through+1).find(item=>item.chunks && storyAccepts(item.en,memory.sentenceEn));return match?[match.id]:[];})
      .filter((id,index,all)=>all.indexOf(id)===index).slice(0,limit);
  }
  function reviewDue() {
    const pending=dueReviews(storyCards.length,8);
    if (!pending.length) return;
    save({...fresh(storyCards.findIndex(item=>item.id===pending[0])),review:{pending,total:pending.length}});
  }
  const scene = card ? <StoryScene card={exploration?.source===`${state.episodeId}:${card.id}`?exploration.card:card} solved={solved}/> : null;
  const spelling = card?.kind==='write' && state.feedback==='help' ? sentenceSpellingRepair(state.input,card.en) : undefined;
  return <PlayViewport><main className={`story-world${card?.timed?' is-arcade':''}`} style={{'--story-accent':chapter.color,'--story-bg':chapter.background} as React.CSSProperties}>
    <button className="story-options-toggle" aria-label="Pausa y opciones" aria-expanded={menu} onClick={()=>setMenu(!menu)}>•••</button>
    {menu ? <nav className="story-menu" onKeyDown={event=>{if(event.key==='Escape')setMenu(false);}}><button onClick={()=>{setPaused(!paused);setMenu(false);}}>{paused?'Reanudar':'Pausar'}</button><button aria-pressed={calm} onClick={()=>{setCalm(!calm);if(!inspection)writeArcadeCalm(userId,!calm);}}>Modo tranquilo {calm?'✓':''}</button>{card?<button onClick={()=>{if(!teach&&!solved)help();setOral(true);setMenu(false);}}>Practicar esta frase con mi voz</button>:null}<button onClick={()=>{stopSpeech();onExit();}}>Mi recorrido y herramientas</button><button onClick={()=>setMenu(false)}>Cerrar</button></nav>:null}
    {oral && card ? <section className="story-rest"><h1>Escucha. Prueba tu voz.</h1><p lang="en">{card.en}</p><EchoPractice phrase={card.en} parts={card.chunks?.map(part=>part.en)}/><small>Escucha y compara. No es una evaluación de pronunciación.</small><button onClick={()=>{stopSpeech();setOral(false);}}>Volver a la escena</button></section> : paused ? <section className="story-rest"><h1>Tu historia te espera.</h1><button onClick={()=>setPaused(false)}>Volver</button></section> : !card ? <section className="story-rest"><span className="story-end-art">☕ 🔑 🚆</span><h1>Has llegado al final de este tramo.</h1><p>Pedidos, necesidades y preguntas, con nuevas combinaciones. Volverás a practicarlos cuando toque repasarlos.</p>{due.length ? <button onClick={reviewDue}>Recuperar lo que toca hoy</button>:<p>Este tramo termina aquí. Los repasos aparecerán cuando correspondan; el resto del curso aún conserva el recorrido anterior.</p>}<button onClick={onExit}>Abrir mi recorrido</button></section> : <GameCard vertical immersive showAdvanceButton={false} onAdvance={advance} key={`${state.episodeId}:${card.id}`} stepKey={card.id} className="story-card" feedback={solved?'correct':model?'model':state.feedback==='help'?'retry':undefined}>
      <article className={`story-stage kind-${card.kind}`}>
        <div className="story-context"><span>{chapter.title}</span><span>{card.timed?'⚡ ARCADE':state.review?'RECUERDA':card.kind==='mirror'?'EL TRUCO':card.kind==='build'?'CREA':card.kind==='listen'?'ESCUCHA':card.kind==='write'?'SIN PIEZAS':'DESCUBRE'}</span></div>
        <h1>{card.title}</h1>
        {card.kind==='write' ? null : scene}
        {card.timed && !calm ? <ArcadeClock durationMs={12000} remaining={clock.remaining} paused={paused || menu} revealed={solved || model} />:null}
        {card.kind==='discover' ? <div className="story-discover"><div className="story-word"><strong lang="en">{card.en}</strong><span>{card.es}</span></div>{card.bridge?<p className="story-bridge">{card.bridge}</p>:null}<p>{card.hint}</p><SpeechModelButton text={card.en} label="Escuchar el inglés" idleLabel="Oír la palabra" onBusyChange={setAudioBusy}/></div>
        : card.kind==='mirror' ? <StoryMirror key={card.id} card={card} onAudioBusy={setAudioBusy} onExplore={variant=>{stopSpeech();setExploration({source:`${state.episodeId}:${card.id}`,card:variant});expose(variant);}}/>
        : model ? <div className="story-model"><span>Vamos con ayuda</span><strong lang="en">{card.en}</strong><p>{card.hint}</p><SpeechModelButton text={card.en} onBusyChange={setAudioBusy}/><small>Puedes deslizar y seguir. Queda como práctica con ayuda.</small></div>
        : card.kind==='build' || card.kind==='write' && state.continuation ? <div className="story-builder"><p className="story-target">{card.es}</p>{state.helped?<p className="story-insight">{card.hint}</p>:null}<GrammarOrder puzzle autoCheck pieces={bank.map(part=>({text:part.en,role:storyRole(part.en)}))} translations={state.helped?bank.map(part=>part.es):undefined} selected={state.order ?? []} locked={solved} onChange={order=>save({order})} onAnswer={value=>answer(value,true)}/></div>
        : card.kind==='write' ? <AnswerStudio id="story-write" taskKey={card.id} scene={scene} target={card.es} instruction="Dilo en inglés" value={state.input} onChange={input=>save({input,feedback:'idle'})} accepts={value=>storyAccepts(value,card.en)} onAnswer={value=>answer(value)} disabled={solved} repeatDraftCues draftCue={value=>storyWritingCue(value,card)} onDraftCue={(value,cue)=>{if(live.current.input!==value)return;record(cue,null,true,'authored');save({feedback:'help',helped:true});}} feedback={spelling?<WritingSpellingRepair repair={spelling} onApply={()=>answer(spelling.corrected,true)}/>:state.feedback==='help'?storyWritingCue(state.input,card) ?? card.hint:undefined}/>
        : <div className="story-choice">{card.kind==='listen'?<SpeechModelButton text={card.en} label="Escucha el pedido" onBusyChange={setAudioBusy}/>:card.kind==='repair'?<><p className="story-target">{card.es}</p><p className="story-repair-line" lang="en">{card.frame?.split('___')[0]}<span className={solved?'is-filled':''}>{solved?card.answer:'…'}</span>{card.frame?.split('___')[1]}</p></>:<p className="story-target" lang="en">{card.en}</p>}<div className="story-options">{card.options?.map(option=><button key={option.value} disabled={solved} onClick={()=>answer(option.value)} className={solved && option.value===card.answer?'is-right':state.correctionResponse===option.value?'is-wrong':''}><span>{option.image}</span><strong>{option.text}</strong></button>)}</div></div>}
        <div className="story-response" aria-live="polite">{solved?<p>✓ {state.helped && card.kind==='write'?'Mensaje construido con ayuda.':card.reaction}</p>:state.feedback==='help' && !model && card.kind!=='write'?<p>{card.hint}</p>:null}</div>
        {!teach && !solved && !model?<button className="story-help" onClick={()=>help(card.kind!=='write')}>{card.kind==='write'?'Armar juntos':'Enséñame cómo'}</button>:null}
        <footer className="story-gesture"><span aria-hidden="true">↑</span><span className={state.stage===0?'':'sr-only'}>{state.stage===0?'Desliza para seguir':!teach&&!solved&&!model?'Puedes pasar; queda pendiente':'Siguiente escena'}</span></footer>
      </article>
    </GameCard>}
  </main></PlayViewport>;
}
