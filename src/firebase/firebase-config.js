// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyCxjuEfWAO73CCvvkWyNA3dXGHc_EXOBMo",
  authDomain: "sindesparches-1ebbd.firebaseapp.com",
  projectId: "sindesparches-1ebbd",
  storageBucket: "sindesparches-1ebbd.firebasestorage.app", // IMPORTANTE: Debe coincidir con tu consola
  messagingSenderId: "1022521936843",
  appId: "1:1022521936843:web:46a97acb2553787451844e",
  measurementId: "G-794723RWZ9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;