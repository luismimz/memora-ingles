import { useEffect, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { loadAsset } from '../services/directus';
import { KeysScene } from './KeysScene';
import { CognateScene } from './CognateScene';
import { cognateSceneKind, wordVisual } from '../domain/wordVisual';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function MnemonicSceneText({ word }: { word: AtomicWord }) {
  const terms = word.highlightTerms?.length ? word.highlightTerms : [word.bridge, word.es].filter(Boolean);
  if (!terms.length) return <>{word.scene}</>;
  const matcher = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu');
  return <>{word.scene.split(matcher).map((part, index) => {
    const isBridge = Boolean(word.bridge) && part.localeCompare(word.bridge, 'es', { sensitivity: 'base' }) === 0;
    const isMeaning = !isBridge && terms.some((term) => part.localeCompare(term, 'es', { sensitivity: 'base' }) === 0);
    return isBridge || isMeaning ? <strong className={isBridge ? 'mnemonic-bridge' : 'mnemonic-meaning'} key={`${part}-${index}`}>{part.toUpperCase()}</strong> : part;
  })}</>;
}

export function SceneVisual({ word, compact = false, showMemoryLink = false, hideAnswer = false }: { word: AtomicWord; compact?: boolean; showMemoryLink?: boolean; hideAnswer?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const sceneKind = cognateSceneKind(word);
  const visual = wordVisual(word);

  useEffect(() => {
    const image = word.imageUrl;
    if (!image) { setUrl(null); return undefined; }
    if (/^(https?:|blob:|data:)/.test(image)) { setUrl(image); return undefined; }
    const controller = new AbortController();
    setUrl(null);
    void loadAsset(image, controller.signal).then((value) => { if (!controller.signal.aborted) setUrl(value); }).catch(() => undefined);
    return () => controller.abort();
  }, [word.imageUrl]);

  return (
    <div className={`scene-visual ${compact ? 'is-compact' : ''}`} role="img" aria-label={hideAnswer ? 'Recuerda la imagen aprendida' : word.scene}>
      {word.associationId?.startsWith('keys-cycle-') ? <KeysScene focus={word.en === 'PHONE' ? 'phone' : word.en === 'POCKET' ? 'pocket' : word.en === 'LOCK' ? 'lock' : 'key'} /> : url ? <img src={url} alt={hideAnswer ? '' : word.scene} loading="eager" draggable={false} onError={() => setUrl(null)} />
        : sceneKind ? <CognateScene kind={sceneKind} /> : <div className="scene-fallback"><div className="scene-emoji" aria-hidden="true"><span>{visual.emojis[0] || '🖼️'}</span>{visual.emojis[1] ? <span>{visual.emojis[1]}</span> : null}</div></div>}
      {showMemoryLink ? <div className="scene-memory-link">{(word.memoryChain?.length ? word.memoryChain : [word.bridge, word.en, word.es].filter(Boolean)).map((part, index, chain) => <span className={index === 0 && Boolean(word.bridge) ? 'memory-bridge' : index === chain.length - 1 ? 'memory-meaning' : 'memory-english'} key={`${part}-${index}`}>{part.toUpperCase()}{index < chain.length - 1 ? <i aria-hidden="true">→</i> : null}</span>)}</div> : null}
    </div>
  );
}
