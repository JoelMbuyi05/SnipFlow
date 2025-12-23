// ============================================
// GOOGLE AUTHENTICATION FOR FIREBASE
// ============================================

import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';

let auth = null;
const provider = new GoogleAuthProvider();

// Wait for Firebase to be initialized
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.firebase && window.firebase.auth) {
        auth = window.firebase.auth;
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    setTimeout(() => clearInterval(checkInterval), 5000);
  });
}

// ============================================
// CONFIGURE GOOGLE PROVIDER
// ============================================
provider.addScopes([
  'profile',
  'email'
]);

// Force account picker EVERY time
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

// ============================================
// SETUP ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 Auth module loading...');
  
  // Wait for Firebase to initialize
  await waitForFirebase();
  console.log('✅ Firebase ready');
  
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await signInWithGoogle();
    });
  }

  // Check auth status
  checkAuthStatus();
  
  // Setup profile menu if on dashboard
  if (window.location.pathname.includes('app.html') || window.location.pathname === '/app.html') {
    setupProfileMenuDashboard();
  }
});

// ============================================
// SIGN IN WITH GOOGLE
// ============================================
async function signInWithGoogle() {
  try {
    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Opening Google Sign-In...';
    }

    console.log('🔐 Starting Google Sign-In with account picker...');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('✅ Authenticated:', user.email);
    
    const token = await user.getIdToken();
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'User',
      photoURL: user.photoURL,
      lastSignIn: new Date().toISOString()
    };
    
    localStorage.setItem('snipflow_user', JSON.stringify(userData));
    localStorage.setItem('snipflow_token', token);

    showNotification('✅ Welcome to Snipflow!', 'success');

    setTimeout(() => {
      window.location.href = '/app.html';
    }, 1200);
    
  } catch (error) {
    console.error('❌ Error:', error.code, error.message);
    
    if (error.code === 'popup_closed_by_user') {
      console.log('User closed popup');
      return;
    }

    if (error.code === 'popup_blocked') {
      showNotification('❌ Popup blocked. Allow popups in browser settings.', 'error');
      return;
    }

    showNotification('❌ Sign-in failed: ' + error.message, 'error');
    
    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg> Sign in with Google
      `;
    }
  }
}

// ============================================
// SIGN OUT
// ============================================
async function signOutUser() {
  try {
    if (!confirm('Are you sure you want to sign out?')) {
      return;
    }

    showNotification('⏳ Signing out...', 'info');
    await signOut(auth);
    
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');
    
    console.log('✅ Signed out');
    
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
    
  } catch (error) {
    console.error('❌ Sign-out error:', error);
    showNotification('❌ Sign-out failed', 'error');
  }
}

// ============================================
// CHECK AUTH STATUS
// ============================================
function checkAuthStatus() {
  if (!auth) {
    setTimeout(checkAuthStatus, 100);
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ User authenticated:', user.email);
      updateUserProfile(user);
    } else {
      console.log('❌ No user authenticated');
      
      if (window.location.pathname.includes('app.html')) {
        window.location.href = '/';
      }
    }
  });
}

// ============================================
// SETUP PROFILE MENU
// ============================================
function setupProfileMenuDashboard() {
  const checkInterval = setInterval(() => {
    const user = getCurrentUser();
    if (user) {
      clearInterval(checkInterval);
      createProfileDropdown(user);
    }
  }, 300);

  setTimeout(() => clearInterval(checkInterval), 10000);
}

// ============================================
// CREATE PROFILE DROPDOWN
// ============================================
function createProfileDropdown(user) {
  const userIconButton = document.querySelector('nav .flex.items-center.gap-3:last-child button:last-child');
  
  if (!userIconButton) {
    console.warn('Could not find user button');
    return;
  }

  const dropdownHTML = `
    <div class="relative group" id="profileDropdown">
      <button class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg flex items-center justify-center hover:shadow-lg hover:from-blue-600 hover:to-blue-800 transition duration-200 text-sm font-bold border-2 border-blue-400 cursor-pointer" title="User Profile">
        <span id="profileInitial">U</span>
      </button>

      <div class="hidden group-hover:block absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
        
        <div class="bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-4 text-white">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
              <span id="profileInitialLarge">U</span>
            </div>
            <div class="flex-1">
              <div id="dropdownName" class="font-semibold text-sm">User</div>
              <div id="dropdownEmail" class="text-xs text-blue-100 break-all">user@example.com</div>
            </div>
          </div>
        </div>

        <div class="py-2 text-slate-700 dark:text-slate-300">
          <button onclick="event.preventDefault(); event.stopPropagation(); alert('Coming soon!')" class="w-full text-left px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition duration-150">
            <i class="fas fa-user-circle w-4 text-blue-500"></i>
            <span class="text-sm font-medium">My Profile</span>
          </button>

          <button onclick="event.preventDefault(); event.stopPropagation(); alert('Coming soon!')" class="w-full text-left px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition duration-150">
            <i class="fas fa-cog w-4 text-blue-500"></i>
            <span class="text-sm font-medium">Settings</span>
          </button>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-700"></div>

        <div class="py-2">
          <button onclick="event.preventDefault(); event.stopPropagation(); signOutUser()" class="w-full text-left px-6 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 flex items-center gap-3 transition duration-150 font-medium">
            <i class="fas fa-sign-out-alt w-4"></i>
            <span class="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  `;

  userIconButton.outerHTML = dropdownHTML;
  updateProfileDropdownInfo(user);
  console.log('✅ Profile dropdown created');
}

// ============================================
// UPDATE PROFILE DROPDOWN INFO
// ============================================
function updateProfileDropdownInfo(user) {
  const initial = (user.displayName || user.email).charAt(0).toUpperCase();
  
  const profileInitial = document.getElementById('profileInitial');
  const profileInitialLarge = document.getElementById('profileInitialLarge');
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');

  if (profileInitial) profileInitial.textContent = initial;
  if (profileInitialLarge) profileInitialLarge.textContent = initial;
  if (dropdownName) dropdownName.textContent = user.displayName || 'User';
  if (dropdownEmail) dropdownEmail.textContent = user.email;
}

// ============================================
// UPDATE USER PROFILE
// ============================================
function updateUserProfile(user) {
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  
  if (userNameEl) userNameEl.textContent = user.displayName || user.email;
  if (userEmailEl) userEmailEl.textContent = user.email;

  if (document.getElementById('profileDropdown')) {
    updateProfileDropdownInfo(user);
  } else {
    createProfileDropdown(user);
  }
}

// ============================================
// GET CURRENT USER
// ============================================
function getCurrentUser() {
  const user = localStorage.getItem('snipflow_user');
  return user ? JSON.parse(user) : null;
}

// ============================================
// GET CURRENT TOKEN
// ============================================
function getCurrentToken() {
  return localStorage.getItem('snipflow_token');
}

// ============================================
// VERIFY USER IS LOGGED IN
// ============================================
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/';
    return false;
  }
  return true;
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
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ============================================
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.getCurrentUser = getCurrentUser;
window.getCurrentToken = getCurrentToken;
window.requireAuth = requireAuth;
window.showNotification = showNotification;

console.log('🚀 Auth module ready for Vercel + Firebase');