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
    
    // Use REDIRECT instead of popup (more reliable)
    await auth.signInWithRedirect(provider);
    
  } catch (error) {
    console.error('❌ Sign-in error:', error);
    alert('Sign-in failed. Please try again.');
  }
};

// Check for redirect result on page load
window.addEventListener('load', () => {
  const auth = window.getAuth();
  
  if (!auth) {
    console.warn('Auth not ready yet');
    return;
  }
  
  // Check if returning from redirect
  auth.getRedirectResult()
    .then((result) => {
      if (result.user) {
        // User just signed in via redirect
        console.log('✅ Sign-in successful:', result.user.email);
        
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          photoURL: result.user.photoURL
        };
        
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
        
        // Redirect to dashboard if on index page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
          window.location.href = 'app.html';
        }
      }
    })
    .catch((error) => {
      console.error('Redirect error:', error);
    });
  
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
        const savedUser = localStorage.getItem('snipflow_user');
        if (!savedUser) {
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