import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WordUsageExample } from './WordUsageExample';
import { previewUnit } from '../preview/previewUnit';
import { playEnglish } from '../services/audio';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn() }));
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); vi.clearAllMocks(); });
it('no inventa un ejemplo donde el contenido no lo tiene', () => {
  expect(renderToStaticMarkup(<WordUsageExample word={{ ...previewUnit.words[0], usageExample: undefined }} />)).toBe('');
});
it('presenta el modelo autoral con traducción y audio recuperable, no una pregunta ni un acierto', async () => {
  const example = { en: 'A long neck.', es: 'Un cuello largo.' };
  const word = { ...previewUnit.words[0], en: 'NECK', es: 'cuello', usageExample: example };
  const original = JSON.stringify(word);
  await act(async () => { tree = create(<WordUsageExample word={word} />); });
  expect(playEnglish).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ lang: 'en' }).children).toEqual([example.en]);
  expect(tree.root.findByProps({ lang: 'es' }).children).toEqual([example.es]);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  await act(async () => tree.root.findByType('button').props.onClick());
  expect(playEnglish).toHaveBeenLastCalledWith(example.en, undefined, true, expect.any(Function));
  expect(tree.root.findByProps({ className: 'association-audio-status' }).children).toEqual(['Audio no disponible · toca 🔊']);
  expect(JSON.stringify(word)).toBe(original);
});
