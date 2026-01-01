// ==========================================
// DATABASE MODULE
// ==========================================

// Firebase Configuration
const firebaseConfig = {

  apiKey: "AIzaSyBgxvD7XNhIX_yHg2vVPa9tzfMC6zwCN_g",
  authDomain: "snipflow-951ed.firebaseapp.com",
  projectId: "snipflow-951ed",
  storageBucket: "snipflow-951ed.firebasestorage.app",
  messagingSenderId: "927323615328",
  appId: "1:927323615328:web:783be2c9e269c56966d305",
  measurementId: "G-WE89Y4MDVF"

};

// Initialize Firebase
let db = null;
let auth = null;

// Wait for Firebase SDK to load
window.addEventListener('load', () => {
  if (typeof firebase !== 'undefined') {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize services
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log('✅ Firebase initialized successfully');
  } else {
    console.error('❌ Firebase SDK not loaded');
  }
});

// Export for global access
window.firebaseConfig = firebaseConfig;
window.getAuth = () => auth;
window.getDb = () => db;