import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { isLoggedIn, logout } from './lib/api';
import { StoreProvider, useStore } from './store';
import { Login, ResetPassword } from './pages/Login';
import { Today } from './pages/Today';
import { Session } from './pages/Session';
import { Review } from './pages/Review';
import { Practice } from './pages/Practice';
import { Stats } from './pages/Stats';
import { Words } from './pages/Words';
import { Verbs } from './pages/Verbs';
import { Settings } from './pages/Settings';
import { Ladder } from './pages/practice/Ladder';
import { Sentences } from './pages/practice/Sentences';
import { Chat } from './pages/practice/Chat';
import { Story } from './pages/practice/Story';
import { Dictation } from './pages/practice/Dictation';
import { Speak } from './pages/practice/Speak';
import { Match } from './pages/practice/Match';
import { ConversationPath } from './pages/practice/ConversationPath';
import { Path } from './pages/Path';
import { Library } from './pages/Library';
import { Spinner, ToastHost } from './components/common';
import './styles.css';

try {
  const theme = localStorage.getItem('memora.theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* sin almacenamiento */ }

const NAV = [
  { to: '/', ico: '🏠', label: 'Hoy' },
  { to: '/ruta', ico: '🧭', label: 'Ruta' },
  { to: '/repaso', ico: '🔁', label: 'Repaso' },
  { to: '/practica', ico: '🎯', label: 'Practicar' },
  { to: '/progreso', ico: '📈', label: 'Progreso' },
  { to: '/palabras', ico: '📖', label: 'Palabras' },
];

function Shell() {
  const { ready } = useStore();
  if (!ready) return <div style={{ paddingTop: '40vh' }}><Spinner /></div>;
  return (
    <div className="app">
      <nav className="nav">
        <div className="brand"><img src="/icon.svg" alt="" width={32} height={32} style={{ borderRadius: 9 }} /> Memora</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="ico">{n.ico}</span>{n.label}</NavLink>
        ))}
        <NavLink to="/verbos" className="nav-extra"><span className="ico">🔀</span>Irregulares</NavLink>
        <NavLink to="/biblioteca" className="nav-extra"><span className="ico">📚</span>Biblioteca</NavLink>
        <NavLink to="/ajustes" className="nav-extra"><span className="ico">⚙️</span>Ajustes</NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/ruta" element={<Path />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/sesion" element={<Session />} />
          <Route path="/repaso" element={<Review />} />
          <Route path="/practica" element={<Practice />} />
          <Route path="/practica/hablar" element={<ConversationPath />} />
          <Route path="/practica/escalera" element={<Ladder />} />
          <Route path="/practica/frases" element={<Sentences />} />
          <Route path="/practica/conversacion" element={<Chat />} />
          <Route path="/practica/historia" element={<Story />} />
          <Route path="/practica/dictado" element={<Dictation />} />
          <Route path="/practica/pronunciacion" element={<Speak />} />
          <Route path="/practica/contrarreloj" element={<Match />} />
          <Route path="/verbos" element={<Verbs />} />
          <Route path="/progreso" element={<Stats />} />
          <Route path="/palabras" element={<Words />} />
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
