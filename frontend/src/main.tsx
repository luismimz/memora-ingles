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
import { Journey } from './pages/Journey';
import { Library } from './pages/Library';
import { Challenges } from './pages/Challenges';
import { PhrasalVerbs } from './pages/PhrasalVerbs';
import { MediaLab } from './pages/MediaLab';
import { PerfectWord } from './pages/PerfectWord';
import { Spinner, ToastHost } from './components/common';
import './styles.css';

try {
  const theme = localStorage.getItem('memora.theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* sin almacenamiento */ }

const NAV = [
  { to: '/', ico: '🧠', label: 'Aprender' },
  { to: '/repaso', ico: '🔁', label: 'Repaso' },
  { to: '/biblioteca', ico: '📚', label: 'Historias' },
  { to: '/progreso', ico: '📈', label: 'Progreso' },
  { to: '/ajustes', ico: '⚙️', label: 'Ajustes' },
];

function Shell() {
  const { ready } = useStore();
  if (!ready) return <div style={{ paddingTop: '40vh' }}><Spinner /></div>;
  return (
    <div className="app">
      <nav className="nav">
        <div className="brand"><span className="brand-mark">M</span><span><b>Memora</b><small>English by memory</small></span></div>
        <div className="nav-section-label">TU APRENDIZAJE</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="ico">{n.ico}</span>{n.label}</NavLink>
        ))}
        <div className="nav-footer nav-extra"><span className="status-dot" /> Método Memora · activo</div>
      </nav>
      <main className="main">
        <div className="mobile-topbar"><div className="mobile-brand"><span className="brand-mark">M</span><b>Memora</b></div><NavLink to="/ajustes" className="mobile-settings" aria-label="Ajustes">⚙️</NavLink></div>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/ruta" element={<Path />} />
          <Route path="/recorrido" element={<Journey />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/desafios" element={<Challenges />} />
          <Route path="/desafios/ordenar" element={<Challenges mode="scramble" />} />
          <Route path="/desafios/historias" element={<Challenges mode="story" />} />
          <Route path="/desafios/listening" element={<Challenges mode="listen" />} />
          <Route path="/desafios/imagen" element={<Challenges mode="image" />} />
          <Route path="/contenido-real" element={<MediaLab />} />
          <Route path="/sesion" element={<Session />} />
          <Route path="/palabra-perfecta" element={<PerfectWord />} />
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
          <Route path="/phrasal-verbs" element={<PhrasalVerbs />} />
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
