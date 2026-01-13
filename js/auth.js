// ==========================================
// AUTHENTICATION 
// ==========================================

let isSigningIn = false;

// Handle Google Sign-In
window.handleGoogleSignIn = async function() {
  // Prevent multiple clicks
  if (isSigningIn) {
    console.log('Already signing in...');
    return;
  }
  
  isSigningIn = true;
  console.log('Starting sign-in...');
  
  const auth = window.getAuth();
  
  if (!auth) {
    alert('Please wait and try again');
    isSigningIn = false;
    return;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account' // Always show account chooser
    });
    
    // Close modal immediately and go straight to Google
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // Sign in with POPUP - goes directly to Google account chooser
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    
    console.log('Signed in:', user.email);
    
    // Save user data
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL
    };
    
    localStorage.setItem('snipflow_user', JSON.stringify(userData));
    console.log('User data saved to localStorage');

    // REDIRECT TO DASHBOARD
    console.log('Redirecting to dashboard...');
    window.location.href = '/dashboard';
    
  } catch (error) {
    isSigningIn = false;
    console.error('Sign-in error:', error);
    
    // If popup was blocked, try redirect
    if (error.code === 'auth/popup-blocked') {
      console.log('Popup blocked, trying redirect...');
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithRedirect(provider);
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.log('Popup cancelled, you can try again');
    } else if (error.code !== 'auth/popup-closed-by-user') {
      // Show modal again if sign-in failed
      const modal = document.getElementById('authModal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    }
  }

  trackEvent('sign_up', { method: 'email' });
};


// Handle redirect result (in case popup was blocked)
window.addEventListener('load', async () => {
  console.log('Checking auth and redirect result...');
  
  const auth = window.getAuth();
  if (auth) {
    try {
      const result = await auth.getRedirectResult();
      if (result.user) {
        console.log('Sign-in via redirect successful:', result.user.email);
        
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          photoURL: result.user.photoURL
        };
        
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
        
        // Show loading screen
        showLoadingScreen();
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
        return;
      }
    } catch (error) {
      console.error('Redirect result error:', error);
    }
  }
  
  // If on dashboard, check if user exists
  if (window.location.pathname.includes('dashboard')) {
    const savedUser = localStorage.getItem('snipflow_user');
    if (!savedUser) {
      console.log('No user, redirecting to home');
      window.location.href = '/';
      return;
    }
    console.log('User exists, staying on dashboard');
    console.log('Saved user:', JSON.parse(savedUser));
  }
  
  // Listen for auth state changes
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        console.log('User UID:', user.uid);
        
        // Update localStorage with fresh data
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL
        };
        localStorage.setItem('snipflow_user', JSON.stringify(userData));
        console.log('User data refreshed in localStorage');
      } else {
        console.log('No user signed in');
      }
    });
  }

  trackEvent('login', { method: 'email' });
});

// Logout with confirmation
window.firebaseLogout = async function() {
  // Show confirmation dialog
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }
  
  console.log('Logging out...');
  const auth = window.getAuth();
  
  try {
    if (auth) {
      await auth.signOut();
      console.log('Firebase sign out successful');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // ONLY clear user data, keep snippets for next login
  localStorage.removeItem('snipflow_user');
  
  console.log('User logged out (snippets preserved in localStorage)');
  window.location.href = '/';
};

// Show loading screen during sign-in
function showLoadingScreen() {
  const loader = document.createElement('div');
  loader.id = 'authLoader';
  loader.className = 'fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center';
  loader.innerHTML = `
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
        <i class="fas fa-code text-white text-3xl"></i>
      </div>
      <p class="text-white text-lg font-semibold">Signing you in...</p>
      <div class="mt-4 flex gap-2 justify-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      </div>
    </div>
  `;
  document.body.appendChild(loader);
}

console.log('Auth ready');