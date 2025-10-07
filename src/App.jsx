import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './componentes/login.jsx';
import CrearCuenta from './componentes/CrearCuenta.jsx';
import Home from './componentes/home.jsx';
import CrearPerfil from './componentes/CrearPerfil.jsx';
import Perfil from './componentes/Perfil.jsx';
import MisFavoritos from './componentes/MisFavoritos.jsx';
import MisParticipaciones from './componentes/MisParticipaciones.jsx';
import VerifyEmailModal from './componentes/VerifyEmailModal';
import { AuthProvider } from './context/AuthContext';
import { auth, db } from './firebase/firebase-config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import logoSinde from './image/logo.sinde.png';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const logoRef = useRef(null);
  const verifyIntervalRef = useRef(null);

  // 🔹 Animación del logo
  useEffect(() => {
    const interval = setInterval(() => {
      if (logoRef.current) {
        logoRef.current.classList.add('animate-flip-once');
        setTimeout(() => logoRef.current.classList.remove('animate-flip-once'), 1000);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 🔹 Polling verificación email
  const startVerifyPolling = (ms = 3000) => {
    if (verifyIntervalRef.current) return;
    verifyIntervalRef.current = setInterval(async () => {
      try {
        if (!auth.currentUser) return;
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          clearInterval(verifyIntervalRef.current);
          verifyIntervalRef.current = null;
          setUser(auth.currentUser);
          setShowVerifyModal(false);
          setCurrentView('crearPerfil');
        }
      } catch (err) {
        console.warn('Error en verify polling:', err);
      }
    }, ms);
  };

  const stopVerifyPolling = () => {
    if (verifyIntervalRef.current) {
      clearInterval(verifyIntervalRef.current);
      verifyIntervalRef.current = null;
    }
  };

  // 🔹 Verificar si el usuario ya tiene perfil en Firestore
  const checkUserProfile = async (firebaseUser) => {
    try {
      const perfilRef = doc(db, 'perfil', firebaseUser.uid);
      const perfilSnap = await getDoc(perfilRef);

      if (perfilSnap.exists()) {
        setHasProfile(true);
        setCurrentView('home');
      } else {
        setHasProfile(false);
        setCurrentView('crearPerfil');
      }
    } catch (err) {
      console.warn('Error al verificar perfil:', err);
      setCurrentView('home');
    }
  };

  // 🔹 Manejo cambios sesión Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try { await firebaseUser.reload(); } catch (err) { console.warn('reload inicial error:', err); }
        setUser(firebaseUser);

        if (!firebaseUser.emailVerified) {
          setShowVerifyModal(true);
          setCurrentView('login');
          startVerifyPolling();
        } else {
          setShowVerifyModal(false);
          checkUserProfile(firebaseUser);
        }
      } else {
        setUser(null);
        setShowVerifyModal(false);
        setCurrentView('login');
        stopVerifyPolling();
      }
      setIsLoading(false);
    });

    return () => { unsubscribe(); stopVerifyPolling(); };
  }, []);

  // 🔹 Cuando login o registro es exitoso
  const handleLoginSuccess = async (passedUser) => {
    const current = auth.currentUser ?? passedUser;
    if (!current) return;

    try { await current.reload(); } catch (err) { console.warn('reload error:', err); }
    setUser(current);

    if (!current.emailVerified) {
      setShowVerifyModal(true);
      startVerifyPolling();
      setCurrentView('login');
    } else {
      setShowVerifyModal(false);
      stopVerifyPolling();
      checkUserProfile(current);
    }
  };

  // 🔹 Logout
  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.warn('Error signOut:', err); }
    setUser(null);
    setCurrentView('login');
    setShowVerifyModal(false);
    stopVerifyPolling();
  };

  // 🔹 Funciones para cambiar vistas
  const showCrearCuenta = () => setCurrentView('crearCuenta');
  const showLogin = () => setCurrentView('login');
  const showPerfil = () => setCurrentView('crearPerfil');
  const showHome = () => setCurrentView('home');
  const showVerPerfil = () => setCurrentView('perfil');
  const showMisFavoritos = () => setCurrentView('favoritos');
  const showMisParticipaciones = () => setCurrentView('participaciones');

  // 🔹 Pantalla de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Cargando...</p>
        </div>
      </div>
    );
  }

  // 🔹 Modal de verificación
  if (user && !user.emailVerified && showVerifyModal) {
    return (
      <VerifyEmailModal
        email={user.email}
        onClose={() => { setShowVerifyModal(false); stopVerifyPolling(); }}
        onVerifyCheck={async () => {
          try {
            await auth.currentUser?.reload();
            if (auth.currentUser?.emailVerified) {
              setUser(auth.currentUser);
              setShowVerifyModal(false);
              stopVerifyPolling();
              setCurrentView('crearPerfil');
            }
          } catch (err) { console.warn('onVerifyCheck error:', err); }
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <div className="App relative min-h-screen">
        {/* 🔹 Vistas */}
        {currentView === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onShowCrearCuenta={showCrearCuenta}
          />
        )}
        {currentView === 'crearCuenta' && (
          <CrearCuenta
            onCrearCuentaSuccess={() => {
              setShowVerifyModal(true);
              setCurrentView('login');
            }}
            onShowLogin={showLogin}
          />
        )}
        {currentView === 'crearPerfil' && (
          <CrearPerfil user={user} onPerfilCreado={showHome} />
        )}
        {currentView === "home" && (
          <Home 
            user={user} 
            onLogout={handleLogout} 
            onShowPerfil={() => setCurrentView("perfil")}
            onShowFavoritos={showMisFavoritos}
            onShowParticipaciones={showMisParticipaciones}
          />
        )}
        {currentView === 'perfil' && (
          <Perfil user={user} onBack={showHome} />
        )}
        {currentView === 'favoritos' && (
          <MisFavoritos user={user} onBack={showHome} onShowPerfil={showVerPerfil} />
        )}
        {currentView === 'participaciones' && (
          <MisParticipaciones user={user} onBack={showHome} onShowPerfil={showVerPerfil} />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;