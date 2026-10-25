import { useRef, type ReactNode } from 'react';

/** Keep native disclosure/Tab behavior; Escape dismisses and restores its trigger. */
export function NavigationMenu({ label, children }: { label: string; children: ReactNode }) {
  const trigger = useRef<HTMLElement>(null);
  return <details className="home-navigation" onKeyDown={(event) => {
    if (event.key !== 'Escape' || !event.currentTarget.open) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.open = false;
    trigger.current?.focus({ preventScroll: true });
  }}><summary ref={trigger}>Menú <span aria-hidden="true">☰</span></summary><nav aria-label={label}>{children}</nav></details>;
}
