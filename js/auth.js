// ==========================================
// AUTHENTICATION HANDLER - FIREBASE UI
// ==========================================

let ui = null;

// Handle Google Sign-In with Firebase UI
window.handleGoogleSignIn = function() {
  console.log('🔐 Starting Google Sign-In with Firebase UI...');
  
  const auth = window.getAuth();
  
  if (!auth) {
    console.error('Firebase Auth not initialized yet');
    alert('Please wait a moment and try again');
    return;
  }
  
  // Create Firebase UI instance if not exists
  if (!ui) {
    ui = new firebaseui.auth.AuthUI(auth);
  }
  
  // Firebase UI configuration
  const uiConfig = {
    signInSuccessUrl: 'app.html',
    signInOptions: [
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        customParameters: {
          prompt: 'select_account'
        }
      }
    ],
    tosUrl: 'index.html',
    privacyPolicyUrl: 'index.html'
  };
  
  // Start Firebase UI
  ui.start('#firebaseui-auth-container', uiConfig);
};

// Check authentication state
window.addEventListener('load', () => {
  const auth = window.getAuth();
  
  if (!auth) {
    console.warn('Auth not ready yet');
    setTimeout(() => window.location.reload(), 1000);
    return;
  }
  
  console.log('🔐 Checking authentication state...');
  
  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      console.log('✅ User authenticated:', user.email);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL
      };
      
      localStorage.setItem('snipflow_user', JSON.stringify(userData));
      
      // If on index page, go to dashboard
      const path = window.location.pathname;
      if (path.includes('index.html') || path === '/' || path === '') {
        console.log('Redirecting to dashboard...');
        window.location.href = 'app.html';
      }
      
    } else {
      // User is signed out
      console.log('👤 No user signed in');
      
      // If on app.html, redirect to index
      if (window.location.pathname.includes('app.html')) {
        const savedUser = localStorage.getItem('snipflow_user');
        if (!savedUser) {
          console.log('No auth - redirecting to home...');
          window.location.href = 'index.html';
        }
      }
    }
  });
});

// Logout function
window.firebaseLogout = async function() {
  try {
    const auth = window.getAuth();
    await auth.signOut();
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_snippets');
    console.log('✅ Logged out successfully');
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
};

console.log('✅ Auth module loaded');