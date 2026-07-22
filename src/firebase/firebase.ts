import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./config";

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Get Firestore
export const db = getFirestore(app);
