import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

// Firebase Web API keys identify a Firebase project and are intentionally public.
// The OpenAI API key is never stored here; Cloud Functions reads OPENAI_API_KEY
// only from Firebase Secret Manager.
const firebaseConfig = {
  apiKey: "AIzaSyBC_25qHeBdzs3XlMoAKX-uH2VQO0-_FTU",
  authDomain: "g5-remedial-action-verbs.firebaseapp.com",
  projectId: "g5-remedial-action-verbs",
  storageBucket: "g5-remedial-action-verbs.firebasestorage.app",
  messagingSenderId: "784461106980",
  appId: "1:784461106980:web:57f6ccf7aa210ce7a4edb1",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const functions = getFunctions(firebaseApp, "asia-east1");
