import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyABB1dw20Mz_8HgWmdWGF9Rx8aDsCUNb0Y",
  authDomain: "afroditi-s-delicacies.firebaseapp.com",
  projectId: "afroditi-s-delicacies",
  storageBucket: "afroditi-s-delicacies.firebasestorage.app",
  messagingSenderId: "735789284752",
  appId: "1:735789284752:web:38d92240f89bcda0b08715",
  measurementId: "G-PJENKKNPNL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };