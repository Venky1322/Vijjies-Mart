import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

// ✅ FIREBASE CONFIG
const firebaseConfig = {

  apiKey: "AIzaSyCCnxFRJe5gd6G0q9giKx7S-5rF5oTqil8",

  authDomain: "vejjies-10.firebaseapp.com",

  projectId: "vejjies-10",

  storageBucket: "vejjies-10.firebasestorage.app",

  messagingSenderId: "536769583344",

  appId: "1:536769583344:web:be5fbd0d04e48fe3d5ca35",

  measurementId: "G-DKGV4DF30C"
};

// ✅ INITIALIZE APP
const app = initializeApp(firebaseConfig);

// ✅ ANALYTICS
const analytics = getAnalytics(app);

// ✅ AUTH
const auth = getAuth(app);

// ✅ EXPORTS
export {
  auth,
  analytics,
  RecaptchaVerifier,
  signInWithPhoneNumber,
};