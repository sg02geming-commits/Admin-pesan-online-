// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Ganti dengan konfigurasi Firebase kamu
firebase.initializeApp({
  apiKey: "AIzaSyCmCV7fhnbFu_4VGQQ-94dDx583ShFvFxM",
  authDomain: "aplikasi-pesan-online.firebaseapp.com",
  projectId: "aplikasi-pesan-online",
  storageBucket: "aplikasi-pesan-online.firebasestorage.app",
  messagingSenderId: "95082582630",
  appId: "1:95082582630:web:4530fcdea5a24fec1cd3a7"
});

const messaging = firebase.messaging();

// Menangani pesan yang masuk saat aplikasi di latar belakang / tertutup
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Pesan latar belakang diterima: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Pesanan Baru!';
  const notificationOptions = {
    body: payload.notification?.body || 'Ada pesanan masuk ke warungmu.',
    icon: '/icon.png' // Opsional: ganti dengan logo warungmu jika ada
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});