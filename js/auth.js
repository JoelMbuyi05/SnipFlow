// ============================================
// FIREBASE AUTH - GOOGLE OAUTH + REST API
// ============================================

console.log('🔐 Auth module loading...');

let currentUser = null;
let authReady = false;

const FIREBASE_API_KEY = "AIzaSyBgxvD7XNhIX_yHg2vVPa9tzfMC6zwCN_g";
const GOOGLE_CLIENT_ID = "927323615328-hiq8b6kmijv55v7pe8qrp7g0k9cjs632.apps.googleusercontent.com";

// ============================================
// CHECK FOR EXISTING USER ON PAGE LOAD
// ============================================
function checkExistingUser() {
  console.log('🔍 Checking for existing user in localStorage...');
  try {
    const stored = localStorage.getItem('snipflow_user');
    if (stored) {
      currentUser = JSON.parse(stored);
      console.log('✅ Found existing user:', currentUser.email);
      updateUI(currentUser);
      return true;
    }
  } catch (e) {
    console.warn('⚠️ Could not load user from localStorage:', e);
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');
  }
  return false;
}

// ============================================
// LOAD GOOGLE SIGN-IN LIBRARY
// ============================================
function loadGoogleSignIn() {
  return new Promise((resolve) => {
    if (window.google) {
      console.log('✅ Google Sign-In already loaded');
      resolve();
      return;
    }

    console.log('📥 Loading Google Sign-In library...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Sign-In library loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google Sign-In library');
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ============================================
// INITIALIZE GOOGLE SIGN-IN
// ============================================
async function initializeGoogleSignIn() {
  // Check for existing user first
  if (checkExistingUser()) {
    console.log('✅ User already logged in, skipping Google init');
    return;
  }

  await loadGoogleSignIn();

  if (!window.google) {
    console.error('❌ Google library not available');
    return;
  }

  console.log('🔐 Initializing Google Sign-In...');

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: false
    });

    // Render the button
    const btn = document.getElementById('googleSignInBtn');
    if (btn && !btn.hasAttribute('data-google-initialized')) {
      window.google.accounts.id.renderButton(btn, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with'
      });
      btn.setAttribute('data-google-initialized', 'true');
      console.log('✅ Google Sign-In button rendered');
    }

  } catch (error) {
    console.error('❌ Google Sign-In init error:', error);
  }
}

// ============================================
// HANDLE GOOGLE SIGN-IN
// ============================================
async function handleGoogleSignIn(response) {
  try {
    console.log('🎉 Google response received');

    if (!response.credential) {
      throw new Error('No credential received from Google');
    }

    // Decode JWT to get user info
    const credential = response.credential;
    const parts = credential.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    let decoded;
    try {
      decoded = JSON.parse(atob(parts[1]));
    } catch (e) {
      throw new Error('Could not decode JWT');
    }

    console.log('✅ Decoded user:', decoded.email);

    // Sign in with Firebase using the Google ID token
    console.log('🔥 Signing in with Firebase...');
    
    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postBody: `id_token=${credential}&providerId=google.com`,
          requestUri: window.location.href,
          returnSecureToken: true
        })
      }
    );

    if (!signInResponse.ok) {
      const error = await signInResponse.json();
      throw new Error(error.error?.message || 'Firebase sign-in failed');
    }

    const data = await signInResponse.json();

    if (!data.idToken) {
      throw new Error('No idToken received from Firebase');
    }

    // Create user object
    currentUser = {
      uid: data.localId,
      email: decoded.email,
      idToken: data.idToken,
      displayName: decoded.name || decoded.email.split('@')[0],
      photoUrl: decoded.picture
    };

    // Save to localStorage IMMEDIATELY
    console.log('💾 Saving user to localStorage...');
    localStorage.setItem('snipflow_user', JSON.stringify(currentUser));
    localStorage.setItem('snipflow_token', data.idToken);
    localStorage.setItem('snipflow_expires', Date.now() + (3600 * 1000)); // 1 hour

    console.log('✅ User saved! Email:', currentUser.email);
    authReady = true;

    // Update UI
    updateUI(currentUser);

    // Show success message
    window.showNotification?.('✅ Welcome to Snipflow!', 'success');

    // Redirect after delay
    setTimeout(() => {
      console.log('🚀 Redirecting to /app.html');
      window.location.href = '/app.html';
    }, 1500);

  } catch (error) {
    console.error('❌ Sign-in error:', error.message);
    window.showNotification?.('❌ Sign-in failed: ' + error.message, 'error');
  }
}

// ============================================
// SIGN OUT
// ============================================
async function signOutUser() {
  try {
    if (!confirm('Sign out?')) return;

    console.log('🔓 Signing out...');

    // Clear Google session
    if (window.google && currentUser?.email) {
      try {
        window.google.accounts.id.revoke(currentUser.email, () => {
          console.log('✅ Google session revoked');
        });
      } catch (e) {
        console.log('⚠️ Could not revoke Google session:', e.message);
      }
    }

    // Clear localStorage
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');
    localStorage.removeItem('snipflow_expires');

    currentUser = null;
    authReady = true;

    console.log('✅ Signed out');
    window.showNotification?.('Signed out successfully', 'success');

    // Redirect to home
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('❌ Sign-out error:', error);
    window.showNotification?.('Sign-out failed', 'error');
  }
}

// ============================================
// GET CURRENT USER
// ============================================
function getCurrentUser() {
  // Try to load from localStorage if not in memory
  if (!currentUser) {
    try {
      const stored = localStorage.getItem('snipflow_user');
      const token = localStorage.getItem('snipflow_token');
      
      if (stored && token) {
        currentUser = JSON.parse(stored);
        currentUser.idToken = token;
        console.log('📋 Loaded user from storage:', currentUser.email);
      }
    } catch (e) {
      console.warn('⚠️ Could not load user from storage:', e.message);
      localStorage.removeItem('snipflow_user');
      localStorage.removeItem('snipflow_token');
    }
  }

  if (currentUser && currentUser.email) {
    console.log('✅ getCurrentUser() returning:', currentUser.email);
    return currentUser;
  } else {
    console.log('❌ getCurrentUser() returning: null (no user)');
    return null;
  }
}

// ============================================
// UPDATE UI
// ============================================
function updateUI(user) {
  if (!user) return;

  console.log('📝 Updating UI for:', user.email);

  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');

  if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'User';
  if (userEmailEl) userEmailEl.textContent = user.email || '';

  createProfileDropdown(user);
}

// ============================================
// CREATE PROFILE DROPDOWN
// ============================================
function createProfileDropdown(user) {
  if (!user) return;

  const userProfileBtn = document.getElementById('userProfileBtn');
  if (!userProfileBtn) return;

  const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();

  const dropdownHTML = `
    <div class="relative group" id="profileDropdown">
      <button class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg flex items-center justify-center hover:shadow-lg transition text-sm font-bold border-2 border-blue-400" title="User Profile">
        ${initial}
      </button>

      <div class="hidden group-hover:block absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">

        <div class="bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-4 text-white">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
              ${initial}
            </div>
            <div class="flex-1">
              <div class="font-semibold text-sm">${user.displayName || 'User'}</div>
              <div class="text-xs text-blue-100 break-all">${user.email || ''}</div>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-700"></div>

        <div class="py-2">
          <button onclick="signOutUser(); event.stopPropagation();" class="w-full text-left px-6 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 flex items-center gap-3 transition font-medium">
            <i class="fas fa-sign-out-alt w-4"></i>
            <span class="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  `;

  userProfileBtn.outerHTML = dropdownHTML;
  console.log('✅ Profile dropdown created');
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info') {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'fixed top-6 right-6 z-[999] space-y-3 pointer-events-none';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  const bgColor =
    type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
        'bg-blue-500';

  notification.className = `
    ${bgColor} text-white rounded-lg px-6 py-4 text-sm font-medium shadow-lg pointer-events-auto
    transition-all duration-300
  `;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================
window.signOutUser = signOutUser;
window.getCurrentUser = getCurrentUser;
window.showNotification = showNotification;

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
console.log('🚀 Auth module starting...');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing...');
    initializeGoogleSignIn();
  });
} else {
  console.log('📄 DOM already loaded, initializing...');
  initializeGoogleSignIn();
}

// Also try to init after a small delay to ensure DOM is ready
setTimeout(() => {
  initializeGoogleSignIn();
}, 500);

console.log('✅ Auth module ready');