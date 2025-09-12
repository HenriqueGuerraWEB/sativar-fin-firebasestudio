
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "sativar-firebase",
  appId: "1:741613626340:web:3d17f6cad0c3d187641df1",
  storageBucket: "sativar-firebase.appspot.com",
  apiKey: "AIzaSyAHAX7P-E2jZIOUZMC1A08AuAAltiXDrOI",
  authDomain: "sativar-firebase.firebaseapp.com",
  messagingSenderId: "741613626340",
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
