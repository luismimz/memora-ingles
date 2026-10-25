import { useRef, type KeyboardEvent } from 'react';

export function useDisclosureDismissal() {
  const trigger = useRef<HTMLElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== 'Escape' || !event.currentTarget.open) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.open = false;
    trigger.current?.focus({ preventScroll: true });
  }
  return { trigger, onKeyDown };
}
