// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from '../firebase/firebase-config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 🔹 función para refrescar usuario (útil tras verificar correo)
  const refreshUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setCurrentUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
