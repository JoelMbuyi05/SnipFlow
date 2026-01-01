// ==========================================
// AUTHENTICATION HANDLER - FIREBASE AUTH
// ==========================================

// Handle Google Sign-In
window.handleGoogleSignIn = async function() {
  console.log('🔐 Starting Google Sign-In...');
  
  try {
    const auth = window.getAuth();
    
    if (!auth) {
      console.error('Firebase Auth not initialized yet');
      alert('Please wait a moment and try again');
      return;
    }
    
    // Create Google Auth Provider
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Sign in with popup
    const result = await auth.signInWithPopup(provider);
    
    // Get user info
    const user = result.user;
    
    // Save user data to localStorage
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL
    };
    
    localStorage.setItem('snipflow_user', JSON.stringify(userData));
    
    console.log('✅ Login successful:', user.email);
    
    // Redirect to dashboard
    window.location.href = 'app.html';
    
  } catch (error) {
    console.error('❌ Sign-in error:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      // User closed the popup, do nothing
      return;
    }
    
    alert('Sign-in failed. Please try again.');
  }
};

// Check authentication state
window.addEventListener('load', () => {
  const auth = window.getAuth();
  
  if (!auth) {
    console.warn('Auth not ready yet');
    return;
  }
  
  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      console.log('✅ User authenticated:', user.email);
      
      // Update localStorage
      const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL
      };
      
      localStorage.setItem('snipflow_user', JSON.stringify(userData));
      
    } else {
      // User is signed out
      console.log('👤 No user signed in');
      
      // If on app.html, redirect to index
      if (window.location.pathname.includes('app.html')) {
        localStorage.removeItem('snipflow_user');
        window.location.href = 'index.html';
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