import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isLoggedIn, logout } from './lib/api';
import { StoreProvider, useStore } from './store';
import { Login, ResetPassword } from './pages/Login';
import { Today } from './pages/Today';
import { Settings } from './pages/Settings';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { ArcadeMode } from './features/arcade/ArcadeMode';
import { GalleryDeck } from './features/gallery/GalleryDeck';
import { Spinner, ToastHost } from './components/common';
import { ImmersiveDock } from './components/ImmersiveDock';
import { installNaturalAudioUnlock } from './lib/audioPlayer';
import './styles.css';

installNaturalAudioUnlock();

try {
  const theme = localStorage.getItem('memora.theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* sin almacenamiento */ }

function Shell() {
  const { ready } = useStore();
  if (!ready) return <div style={{ paddingTop: '40vh' }}><Spinner /></div>;
  return (
    <div className="app app-immersive">
      <ImmersiveDock />
      <main className="main">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/descubrir" element={<DiscoveryPage />} />
          <Route path="/arcade" element={<ArcadeMode />} />
          <Route path="/galeria" element={<GalleryDeck />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const onAuthLost = useCallback(() => { logout(); setAuthed(false); }, []);
  return (
    <BrowserRouter>
      {authed ? <StoreProvider onAuthLost={onAuthLost}><Shell /></StoreProvider> : (
        <Routes>
          <Route path="/reset" element={<ResetPassword onDone={() => {}} />} />
          <Route path="*" element={<Login onDone={() => setAuthed(true)} />} />
        </Routes>
      )}
      <ToastHost />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
