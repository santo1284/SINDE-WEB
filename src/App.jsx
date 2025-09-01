import React, { useState, useEffect } from 'react';
import LoginScreen from './componentes/login.jsx';
import CrearCuenta from './componentes/CrearCuenta';
import Home from './componentes/Home';
import { auth } from './firebase/firebase-config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setUser(user);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView('login');
  };

  const showCrearCuenta = () => setCurrentView('crearCuenta');
  const showLogin = () => setCurrentView('login');

  // Mientras Firebase verifica sesión (evita parpadeos)
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

  // Si ya hay usuario autenticado, mostrar Home
  if (user) {
    return <Home user={user} onLogout={handleLogout} />;
  }

  // Si no hay usuario, mostrar Login o CrearCuenta
  return (
    <div className="App">
      {currentView === 'login' ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onShowCrearCuenta={showCrearCuenta}
        />
      ) : (
        <CrearCuenta
          onCrearCuentaSuccess={handleLoginSuccess}
          onShowLogin={showLogin}
        />
      )}
    </div>
  );
}

export default App;
