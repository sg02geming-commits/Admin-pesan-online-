// Import SDK Firebase dari CDN (versi modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmCV7fhnbFu_4VGQQ-94dDx583ShFvFxM",
  authDomain: "aplikasi-pesan-online.firebaseapp.com",
  projectId: "aplikasi-pesan-online",
  storageBucket: "aplikasi-pesan-online.firebasestorage.app",
  messagingSenderId: "95082582630",
  appId: "1:95082582630:web:4530fcdea5a24fec1cd3a7",
  measurementId: "G-8HB7TZLEXC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);