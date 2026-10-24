import type { MnemonicSceneKind } from '../domain/wordVisual';
import computer from '../assets/mnemonic-computer-compota-v1.svg';
import desk from '../assets/mnemonic-desk-disco-v1.svg';

/** The outer SceneVisual owns the accessible label, including the hidden-answer mode. */
export function MnemonicScene({ kind }: { kind: MnemonicSceneKind }) {
  return <img className="cognate-scene" data-mnemonic-scene={kind} src={kind === 'computer-compota' ? computer : desk} alt="" aria-hidden="true" draggable={false} loading="eager" />;
}
