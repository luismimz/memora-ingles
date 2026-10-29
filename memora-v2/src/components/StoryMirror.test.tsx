import {act,create} from 'react-test-renderer';
import {expect,it,vi} from 'vitest';
import {StoryMirror} from './StoryMirror';
import {storyCards} from '../domain/storyJourney';
vi.mock('./SpeechModelButton',()=>({SpeechModelButton:({text}:{text:string})=><span>{text}</span>}));
it('cambiar intención transforma ambas lenguas y registra solo la exposición elegida',()=>{
  const onExplore=vi.fn();
  let tree:ReturnType<typeof create>;
  act(()=>{tree=create(<StoryMirror card={storyCards.find(card=>card.id==='need')!} onExplore={onExplore}/>);});
  expect(onExplore).not.toHaveBeenCalled();
  act(()=>tree.root.findAllByType('button').find(button=>button.children.includes('Lo tengo'))!.props.onClick());
  expect(JSON.stringify(tree!.toJSON())).toContain('Tengo una llave.');
  expect(JSON.stringify(tree!.toJSON())).toContain('I have a key.');
  expect(onExplore).toHaveBeenCalledWith(expect.objectContaining({id:'have'}));
  act(()=>tree.root.findAllByType('button').find(button=>button.children.includes('Lo tengo'))!.props.onClick());
  expect(onExplore).toHaveBeenCalledTimes(1);
  act(()=>tree.unmount());
});
