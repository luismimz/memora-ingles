/** The entrance previews actual situations in the authored journey. */
export function StoryWelcome() {
  return <div className="story-welcome" aria-label="Pedir en una terraza, hablar en un hotel y viajar en tren">
    <div><span aria-hidden="true">☕</span><strong>Tu primer pedido</strong><small>I want coffee.</small></div>
    <div><span aria-hidden="true">🔑</span><strong>Una puerta abierta</strong><small>Can I have a key?</small></div>
    <div><span aria-hidden="true">🚆</span><strong>Tu próximo viaje</strong><small>Where is the train?</small></div>
  </div>;
}
