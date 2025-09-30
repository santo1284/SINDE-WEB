import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { useAuth } from '../context/AuthContext';

const ProfileFlashIndicator = ({ userId, className = "" }) => {
  const [hasActiveFlashPlan, setHasActiveFlashPlan] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!userId) return;

    // Query para verificar si el usuario tiene Flash Plans activos
    const now = Timestamp.now();
    const q = query(
      collection(db, 'flashPlans'),
      where('userId', '==', userId),
      where('expiresAt', '>', now),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasActiveFlashPlan(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [userId]);

  if (!hasActiveFlashPlan) {
    return null;
  }

  return (
    <div className={`absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white ${className}`}>
      <div className="w-full h-full bg-blue-500 rounded-full animate-pulse"></div>
    </div>
  );
};

// Hook personalizado para usar en cualquier componente
export const useHasActiveFlashPlan = (userId) => {
  const [hasActiveFlashPlan, setHasActiveFlashPlan] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const now = Timestamp.now();
    const q = query(
      collection(db, 'flashPlans'),
      where('userId', '==', userId),
      where('expiresAt', '>', now),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasActiveFlashPlan(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [userId]);

  return hasActiveFlashPlan;
};

export default ProfileFlashIndicator;