import { useEffect, useRef, type ReactNode } from 'react';

/** A screen entry landmark, never an activity completion or a scroll command. */
export function ScreenHeading({ children, id, className, autoFocus = true, focusKey }: {
  children: ReactNode; id?: string; className?: string; autoFocus?: boolean; focusKey?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) heading.current?.focus({ preventScroll: true });
  }, [autoFocus, focusKey]);
  return <h1 ref={heading} tabIndex={-1} id={id} className={['screen-heading', className].filter(Boolean).join(' ')}>{children}</h1>;
}
