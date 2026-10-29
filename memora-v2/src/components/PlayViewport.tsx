import { useEffect, useRef, type ReactNode } from 'react';
import './playViewport.css';

/** Follow the visible screen, not the layout viewport hidden behind a keyboard.
 * No scroll/focus commands: Safari remains in charge of editing and zooming.
 * https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
 */
export function PlayViewport({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = box.current, viewport = window.visualViewport;
    if (!node || !viewport) return;
    const update = () => {
      // Never counteract pinch zoom or squeeze enlarged text into a tiny shell.
      const usable = Math.abs(viewport.scale - 1) < .01 && Number.isFinite(viewport.height) && viewport.height > 0 && Number.isFinite(viewport.offsetTop);
      node.dataset.viewportAnchored = String(usable);
      if (!usable) return;
      node.style.setProperty('--play-visible-height', `${viewport.height}px`);
      node.style.setProperty('--play-visible-top', `${Math.max(0, viewport.offsetTop)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener?.('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener?.('resize', update);
    };
  }, []);
  return <div ref={box} className="play-viewport">{children}</div>;
}
