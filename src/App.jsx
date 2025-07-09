import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config'; // Corregido: importar desde firebase-config
import LoginScreen from './login'; // Corregido: nombre del componente
import Home from './home'; // Corregido: nombre del componente

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listener para cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    // Cleanup del listener
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Pantalla de carga mientras se verifica el estado de autenticación
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

  // Renderizar la pantalla apropiada según el estado de autenticación
  return (
    <div className="App">
      {user ? (
        <Home user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;