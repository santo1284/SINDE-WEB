import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from "../firebase/firebase-config"; // Ajusta la ruta según tu configuración
import { useAuth } from '../context/AuthContext'; // Ajusta según tu contexto de autenticación
import FlashPlanItem from './FlashPlanItem';
import CreateFlashPlan from './CreateFlashPlan';

const FlashPlansSection = () => {
  const [flashPlans, setFlashPlans] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { currentUser } = useAuth();

  // Función para limpiar Flash Plans expirados (ya no es necesaria, se hace en el useEffect)
  const cleanExpiredFlashPlans = async () => {
    // Esta función ya no se usa, la limpieza se hace en el useEffect
  };

  useEffect(() => {
    if (!currentUser) return;

    // Query simplificada usando la estructura real de tus datos
    const q = query(
      collection(db, 'flashPlans'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plans = [];
      const currentTime = Date.now();
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Calcular si el plan ha expirado (24 horas después del timestamp)
        const createdTime = data.timestamp?.toDate?.()?.getTime() || data.timestamp?.seconds * 1000 || 0;
        const expirationTime = createdTime + (24 * 60 * 60 * 1000); // 24 horas en milisegundos
        
        // Solo mostrar planes que no han expirado
        if (expirationTime > currentTime) {
          plans.push({ 
            id: docSnapshot.id, 
            ...data,
            // Agregar campo calculado para compatibilidad
            expiresAt: new Date(expirationTime),
            createdAt: data.timestamp?.toDate?.() || new Date(data.timestamp?.seconds * 1000)
          });
        }
      });
      
      setFlashPlans(plans);
      console.log(`Cargados ${plans.length} Flash Plans activos (de ${snapshot.docs.length} totales)`);
    }, (error) => {
      console.error('Error escuchando Flash Plans:', error);
    });

    // Limpiar Flash Plans expirados cada hora
    const cleanupInterval = setInterval(async () => {
      // Limpiar documentos expirados de Firebase
      const allDocsSnapshot = await getDocs(collection(db, 'flashPlans'));
      const currentTime = Date.now();
      
      const deletePromises = [];
      allDocsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const createdTime = data.timestamp?.toDate?.()?.getTime() || data.timestamp?.seconds * 1000 || 0;
        const expirationTime = createdTime + (24 * 60 * 60 * 1000);
        
        if (expirationTime <= currentTime) {
          deletePromises.push(deleteDoc(doc(db, 'flashPlans', docSnapshot.id)));
        }
      });
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`Eliminados ${deletePromises.length} Flash Plans expirados`);
      }
    }, 60 * 60 * 1000); // Cada hora

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [currentUser]);

  // Separar Flash Plans propios y de otros usuarios
  const myFlashPlans = flashPlans.filter(plan => plan.userId === currentUser?.uid);
  const otherUsersPlans = flashPlans.filter(plan => plan.userId !== currentUser?.uid);

  // Agrupar Flash Plans de otros usuarios para mostrar solo el más reciente de cada uno
  const groupedOtherPlans = otherUsersPlans.reduce((acc, plan) => {
    const planTime = plan.timestamp?.toDate?.()?.getTime() || plan.timestamp?.seconds * 1000 || 0;
    const existingTime = acc[plan.userId]?.timestamp?.toDate?.()?.getTime() || acc[plan.userId]?.timestamp?.seconds * 1000 || 0;
    
    if (!acc[plan.userId] || planTime > existingTime) {
      acc[plan.userId] = plan;
    }
    return acc;
  }, {});

  const otherUniqueFlashPlans = Object.values(groupedOtherPlans);
  
  // Combinar: primero los míos, luego los de otros
  const allFlashPlans = [...myFlashPlans, ...otherUniqueFlashPlans];

  return (
    <div className="w-full mb-8">
      
      
      {/* Flash Plans horizontales */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Tu propio Flash Plan */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold hover:scale-105 transition-transform"
          >
            +
          </button>
          <p className="text-xs text-center text-white mt-2 w-16">Tu Flash Plan</p>
        </div>

        {/* Flash Plans de todos los usuarios (incluidos los propios) */}
        {allFlashPlans.map((plan) => (
          <FlashPlanItem key={plan.id} flashPlan={plan} />
        ))}
        
        {/* Mensaje si no hay planes */}
        {allFlashPlans.length === 0 && (
          <div className="flex-shrink-0 flex items-center justify-center text-gray-400 text-sm">
            No hay Flash Plans activos
          </div>
        )}
      </div>

      {/* Modal para crear Flash Plan */}
      {showCreateModal && (
        <CreateFlashPlan
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default FlashPlansSection;