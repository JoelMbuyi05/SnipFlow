// ==========================================
// SIMPLE AUTHENTICATION - DIRECT APPROACH
// ==========================================

// Handle Google Sign-In - SIMPLE VERSION
window.handleGoogleSignIn = async function() {
  console.log('🔐 Starting sign-in...');
  
  const auth = window.getAuth();
  
  if (!auth) {
    alert('Please wait and try again');
    return;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Sign in with POPUP (simpler than redirect)
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    
    console.log('✅ Signed in:', user.email);
    
    // Save user data
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL
    };
    
    localStorage.setItem('snipflow_user', JSON.stringify(userData));
    
    // FORCE REDIRECT TO DASHBOARD
    console.log('Redirecting to dashboard...');
    window.location.href = 'app.html';
    
  } catch (error) {
    console.error('Sign-in error:', error);
    
    // If popup was blocked, try redirect
    if (error.code === 'auth/popup-blocked') {
      console.log('Popup blocked, trying redirect...');
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithRedirect(provider);
    } else if (error.code !== 'auth/popup-closed-by-user') {
      alert('Sign-in failed: ' + error.message);
    }
  }
};

// Simple auth check on page load
window.addEventListener('load', () => {
  console.log('Checking auth...');
  
  // If on app.html, check if user exists
  if (window.location.pathname.includes('app.html')) {
    const savedUser = localStorage.getItem('snipflow_user');
    if (!savedUser) {
      console.log('No user, redirecting to home');
      window.location.href = 'index.html';
      return;
    }
    console.log('User exists, staying on dashboard');
  }
  
  // Listen for auth state
  const auth = window.getAuth();
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('✅ User signed in:', user.email);
        
        // Update localStorage
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL
        };
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
      }
    });
  }
});

// Logout
window.firebaseLogout = async function() {
  const auth = window.getAuth();
  if (auth) {
    await auth.signOut();
  }
  localStorage.clear();
  window.location.href = 'index.html';
};

console.log('✅ Auth ready');