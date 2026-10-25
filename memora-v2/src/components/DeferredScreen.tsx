import { ScreenHeading } from './ScreenHeading';
import { Component, Suspense, type ReactNode } from 'react';

type Props = { label: string; onBack: () => void; children: ReactNode };

function ScreenNotice({ label, onBack, failed = false }: Omit<Props, 'children'> & { failed?: boolean }) {
  return <main className="gate-screen"><section className="gate-card">
    <p className="eyebrow">MEMORA</p>
    <ScreenHeading focusKey={failed ? 'error' : 'loading'}>{failed ? `No se pudo abrir ${label}` : `Abriendo ${label}…`}</ScreenHeading>
    <p role={failed ? 'alert' : 'status'}>{failed ? 'La pantalla no está disponible. Puedes volver; si persiste, recarga la aplicación.' : 'Puedes volver sin esperar a que termine la carga.'}</p>
    <button type="button" className="primary-action" onClick={onBack}>Volver</button>
  </section></main>;
}

class ScreenBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ScreenNotice label={this.props.label} onBack={this.props.onBack} failed /> : this.props.children; }
}

/** Only the requested screen suspends. Its parent keeps session and navigation state. */
export function DeferredScreen({ label, onBack, children }: Props) {
  return <ScreenBoundary label={label} onBack={onBack}><Suspense fallback={<ScreenNotice label={label} onBack={onBack} />}>{children}</Suspense></ScreenBoundary>;
}
