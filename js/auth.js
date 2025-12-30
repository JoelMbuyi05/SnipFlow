// ============================================
// FIREBASE AUTH - GOOGLE OAUTH
// ============================================

console.log('🔐 Auth module loading...');

let currentUser = null;
let authReady = false;

const FIREBASE_API_KEY = "AIzaSyBgxvD7XNhIX_yHg2vVPa9tzfMC6zwCN_g";
const GOOGLE_CLIENT_ID = "927323615328-hiq8b6kmijv55v7pe8qrp7g0k9cjs632.apps.googleusercontent.com";

// ============================================
// CHECK FOR EXISTING USER
// ============================================
function checkExistingUser() {
  console.log('🔍 Checking for existing user...');
  try {
    const stored = localStorage.getItem('snipflow_user');
    if (stored) {
      currentUser = JSON.parse(stored);
      console.log('✅ Found user:', currentUser.email);
      updateUI(currentUser);
      return true;
    }
  } catch (e) {
    console.warn('⚠️ Could not load user:', e);
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
      console.log('✅ Google already loaded');
      resolve();
      return;
    }

    console.log('📥 Loading Google library...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google library loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google');
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ============================================
// HANDLE GOOGLE SIGN-IN
// ============================================
async function handleGoogleSignIn() {
  try {
    console.log('🔐 Starting Google sign-in...');

    if (!window.google) {
      throw new Error('Google library not loaded');
    }

    // Initialize if not already done
    if (!window.google.accounts?.id) {
      console.log('Initializing Google...');
      await loadGoogleSignIn();
      
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: processGoogleResponse
      });
    }

    // Show Google One Tap
    window.google.accounts.id.prompt((notification) => {
      console.log('Google prompt:', notification);
    });

  } catch (error) {
    console.error('❌ Google sign-in error:', error);
    window.showNotification?.('❌ ' + error.message, 'error');
  }
}

// ============================================
// PROCESS GOOGLE RESPONSE
// ============================================
async function processGoogleResponse(response) {
  try {
    console.log('🎉 Google response received');

    if (!response.credential) {
      throw new Error('No credential');
    }

    // Decode JWT
    const parts = response.credential.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT');

    const decoded = JSON.parse(atob(parts[1]));
    console.log('✅ User:', decoded.email);

    // Sign in with Firebase
    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: `id_token=${response.credential}&providerId=google.com`,
          requestUri: window.location.href,
          returnSecureToken: true
        })
      }
    );

    const data = await firebaseResponse.json();

    if (!data.idToken) {
      throw new Error('Firebase sign-in failed');
    }

    // Save user
    currentUser = {
      uid: data.localId,
      email: decoded.email,
      idToken: data.idToken,
      displayName: decoded.name || decoded.email.split('@')[0],
      photoUrl: decoded.picture
    };

    localStorage.setItem('snipflow_user', JSON.stringify(currentUser));
    localStorage.setItem('snipflow_token', data.idToken);

    console.log('✅ Signed in:', currentUser.email);
    authReady = true;

    updateUI(currentUser);
    window.showNotification?.('✅ Welcome to Snipflow!', 'success');

    setTimeout(() => {
      window.location.href = '/app.html';
    }, 1500);

  } catch (error) {
    console.error('❌ Error:', error);
    window.showNotification?.('❌ Sign-in failed: ' + error.message, 'error');
  }
}

// ============================================
// SIGN OUT
// ============================================
async function signOutUser() {
  try {
    if (!confirm('Sign out?')) return;

    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');
    currentUser = null;

    console.log('✅ Signed out');
    window.showNotification?.('Signed out', 'success');

    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('❌ Sign out error:', error);
  }
}

// ============================================
// GET CURRENT USER
// ============================================
function getCurrentUser() {
  try {
    const stored = localStorage.getItem('snipflow_user');
    const token = localStorage.getItem('snipflow_token');
    
    if (stored && token) {
      const parsed = JSON.parse(stored);
      return {
        uid: parsed.uid,
        email: parsed.email,
        idToken: token,
        displayName: parsed.displayName,
        photoUrl: parsed.photoUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error:', error.message);
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');
    return null;
  }
}

// ============================================
// UPDATE UI
// ============================================
function updateUI(user) {
  if (!user) return;

  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');

  if (userNameEl) userNameEl.textContent = user.displayName || user.email;
  if (userEmailEl) userEmailEl.textContent = user.email;

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
      <button class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg flex items-center justify-center hover:shadow-lg transition text-sm font-bold border-2 border-blue-400">
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
              <div class="text-xs text-blue-100 break-all">${user.email}</div>
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
window.handleGoogleSignIn = handleGoogleSignIn;
window.processGoogleResponse = processGoogleResponse;

// ============================================
// INITIALIZE
// ============================================
console.log('🚀 Auth module starting...');

function initAuth() {
  const existingUser = checkExistingUser();
  
  if (existingUser) {
    console.log('✅ User already logged in');
  } else {
    console.log('📥 Loading Google library...');
    loadGoogleSignIn();
  }
  
  authReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

console.log('✅ Auth module ready');