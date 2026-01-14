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
let appDb = null;
let auth = null;
let firebaseInitialized = false;
let analytics = null;

function initFirebase() {
  if (firebaseInitialized) return;
  
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded yet');
    setTimeout(initFirebase, 100);
    return;
  }
  
  try {
    // Check if already initialized
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
    } else {
      console.log('Firebase already initialized');
    }
    
    // Initialize services
    auth = firebase.auth();
    db = firebase.firestore();

    //Initialize analytics
    if (firebase.analytics) {
      analytics = firebase.analytics();
      console.log('Analytics initialized');
    }
    
    firebaseInitialized = true;
    console.log('Auth and Firestore ready');
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Try to initialize immediately
initFirebase();

// Also try after DOM loads
document.addEventListener('DOMContentLoaded', initFirebase);

// Helper function to track events
function trackEvent(eventName, params = {}) {
  if(!analytics){
    console.warn('Analytics not ready, skipping event:', eventName);
    return;
  }
  analytics.logEvent(eventName, params);
}

// Export for global access
window.firebaseConfig = firebaseConfig;
window.getAuth = () => auth;
window.getDb = () => db;
window.isFirebaseReady = () => firebaseInitialized;
window.trackEvent = trackEvent;