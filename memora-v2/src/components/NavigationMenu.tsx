import type { ReactNode } from 'react';
import { useDisclosureDismissal } from './useDisclosureDismissal';

/** Keep native disclosure/Tab behavior; Escape dismisses and restores its trigger. */
export function NavigationMenu({ label, children }: { label: string; children: ReactNode }) {
  const { trigger, onKeyDown } = useDisclosureDismissal();
  return <details className="home-navigation" onKeyDown={onKeyDown}><summary ref={trigger}>Menú <span aria-hidden="true">☰</span></summary><nav aria-label={label}>{children}</nav></details>;
}
