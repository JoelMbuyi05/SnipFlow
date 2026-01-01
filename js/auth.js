// ==========================================
// AUTHENTICATION HANDLER - FIREBASE AUTH
// ==========================================

let authInitialized = false;

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
    console.log('Redirecting to Google...');
    await auth.signInWithRedirect(provider);
    
  } catch (error) {
    console.error('❌ Sign-in error:', error);
    alert('Sign-in failed. Please try again.');
  }
};

// Initialize auth on page load
function initializeAuth() {
  const auth = window.getAuth();
  
  if (!auth) {
    console.warn('Auth not ready yet, retrying...');
    setTimeout(initializeAuth, 100);
    return;
  }
  
  if (authInitialized) return;
  authInitialized = true;
  
  console.log('🔐 Initializing authentication...');
  
  // Check for redirect result FIRST
  auth.getRedirectResult()
    .then((result) => {
      if (result && result.user) {
        // User just signed in via redirect!
        console.log('✅ Sign-in successful via redirect:', result.user.email);
        
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          photoURL: result.user.photoURL
        };
        
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
        
        // Force redirect to dashboard
        console.log('Redirecting to dashboard...');
        window.location.href = 'app.html';
        return;
      }
      
      // No redirect result, check current auth state
      return auth.currentUser;
    })
    .then((user) => {
      if (user) {
        console.log('✅ User already signed in:', user.email);
        
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL
        };
        
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
        
        // If on index page, go to dashboard
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
          console.log('Redirecting to dashboard...');
          window.location.href = 'app.html';
        }
      }
    })
    .catch((error) => {
      if (error.code !== 'auth/network-request-failed') {
        console.error('❌ Auth error:', error);
      }
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
      
      // If on index page, redirect to dashboard
      const currentPath = window.location.pathname;
      if (currentPath.includes('index.html') || currentPath === '/' || currentPath === '') {
        console.log('Auth state changed - redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = 'app.html';
        }, 500);
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
}

// Start auth initialization when page loads
window.addEventListener('load', initializeAuth);

// Also try immediately in case load already fired
if (document.readyState === 'complete') {
  initializeAuth();
}

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