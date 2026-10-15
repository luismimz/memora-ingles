/** Size against the card, not the viewport; keep long words readable and complete. */
export function WordHeading({ en, es }: { en: string; es: string }) {
  const size = Math.min(18, 125 / Math.max(1, Array.from(en.trim()).length));
  return <div className="word-heading"><h1 lang="en" style={{ fontSize: `clamp(1.5rem, ${size.toFixed(2)}cqi, 6rem)` }}>{en}</h1><strong lang="es">{es}</strong></div>;
}
