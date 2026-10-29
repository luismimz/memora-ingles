import { lazy, type ComponentProps } from 'react';
import { DeferredScreen } from './DeferredScreen';

// Keep the retained course out of the initial story download. Props, checkpoints
// and callbacks stay owned by App; failure never traps the learner in a loader.
const Game = lazy(() => import('../LanguageGame').then(module => ({ default: module.LanguageGame })));
const Trick = lazy(() => import('./JourneyTrickExperience').then(module => ({ default: module.JourneyTrickExperience })));
const Mirror = lazy(() => import('./MirrorLessonExperience').then(module => ({ default: module.MirrorLessonExperience })));

export function LanguageGame(props: ComponentProps<typeof Game>) {
  return <DeferredScreen label="tu actividad" onBack={props.onExit}><Game {...props}/></DeferredScreen>;
}
export function JourneyTrickExperience(props: ComponentProps<typeof Trick>) {
  return <DeferredScreen label="el truco" onBack={props.onExit}><Trick {...props}/></DeferredScreen>;
}
export function MirrorLessonExperience(props: ComponentProps<typeof Mirror>) {
  return <DeferredScreen label="el espejo" onBack={props.onExit}><Mirror {...props}/></DeferredScreen>;
}
