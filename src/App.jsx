// src/App.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase/firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import LoginScreen from "./componentes/Login";
import CrearCuenta from "./componentes/CrearCuenta";
import CrearPerfil from "./componentes/CrearPerfil";
import Home from "./componentes/home";
import Perfil from "./componentes/Perfil";

const App = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await checkUserProfile(firebaseUser);
      } else {
        setUser(null);
        setCurrentView("login");
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUserProfile = async (firebaseUser) => {
    const perfilRef = doc(db, "perfil", firebaseUser.uid);
    const perfilSnap = await getDoc(perfilRef);

    if (perfilSnap.exists()) {
      setCurrentView("home");
    } else {
      setCurrentView("crearPerfil");
    }
  };

  const handleLoginSuccess = (firebaseUser, forceCrearPerfil = false) => {
    setUser(firebaseUser);
    if (forceCrearPerfil) {
      setCurrentView("crearPerfil");
    } else {
      checkUserProfile(firebaseUser);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView("login");
  };

  const handlePerfilCreated = () => {
    setCurrentView("home");
  };

  return (
    <>
      {currentView === "login" && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === "crearCuenta" && <CrearCuenta />}
      {currentView === "crearPerfil" && (
        <CrearPerfil user={user} onPerfilCreated={handlePerfilCreated} />
      )}
      {currentView === "home" && (
        <Home
          user={user}
          onLogout={handleLogout}
          onShowPerfil={() => setCurrentView("perfil")}
        />
      )}
      {currentView === "perfil" && (
        <Perfil user={user} onBack={() => setCurrentView("home")} />
      )}
    </>
  );
};

export default App;
