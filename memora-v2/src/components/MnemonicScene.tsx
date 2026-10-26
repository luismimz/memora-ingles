import type { MnemonicSceneKind } from '../domain/wordVisual';
import { CausalPillowScene } from './CausalPillowScene';
import { CausalPhoneScene } from './CausalPhoneScene';
import computer from '../assets/mnemonic-computer-compota-v1.svg?no-inline';
import desk from '../assets/mnemonic-desk-disco-v1.svg?no-inline';
import pan from '../assets/mnemonic-pan-panda-v1.svg?no-inline';
import egg from '../assets/mnemonic-egg-ego-v1.svg?no-inline';
import meat from '../assets/mnemonic-meat-mitin-v1.svg?no-inline';

const scenes: Record<Exclude<MnemonicSceneKind, 'pillow-piloto' | 'phone-fondo'>, string> = { 'computer-compota': computer, 'desk-disco': desk, 'pan-panda': pan, 'egg-ego': egg, 'meat-mitin': meat };

/** The outer SceneVisual owns the accessible label, including the hidden-answer mode. */
export function MnemonicScene({ kind }: { kind: MnemonicSceneKind }) {
  if (kind === 'pillow-piloto') return <CausalPillowScene active animate={false} decorative />;
  if (kind === 'phone-fondo') return <CausalPhoneScene active={false} animate={false} decorative />;
  return <img className="cognate-scene" data-mnemonic-scene={kind} src={scenes[kind]} alt="" aria-hidden="true" draggable={false} loading="eager" />;
}
