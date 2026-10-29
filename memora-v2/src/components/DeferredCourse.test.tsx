import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { LanguageGame, JourneyTrickExperience, MirrorLessonExperience } from './DeferredCourse';

vi.mock('../LanguageGame', () => new Promise(() => {}));
vi.mock('./JourneyTrickExperience', () => new Promise(() => {}));
vi.mock('./MirrorLessonExperience', () => new Promise(() => {}));

it.each([LanguageGame, JourneyTrickExperience, MirrorLessonExperience])('mantiene una salida durante la descarga del curso sin llamar a finalización', async (Screen) => {
  const exit = vi.fn(), finished = vi.fn();
  let tree!: ReturnType<typeof create>;
  // The module has not loaded, so only navigation callbacks are needed here.
  await act(async () => { tree = create(<Screen {...({ onExit: exit, onFinished: finished } as any)}/>); });
  expect(tree.root.findByProps({ role: 'status' }).children.join('')).toContain('volver');
  act(() => tree.root.findByType('button').props.onClick());
  expect(exit).toHaveBeenCalledOnce();
  expect(finished).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
