// ============================================
// FIREBASE AUTH - EMAIL/PASSWORD (TEMPORARY)
// ============================================

console.log('🔐 Auth module loading...');

let currentUser = null;
let authReady = false;

const FIREBASE_API_KEY = "AIzaSyBgxvD7XNhIX_yHg2vVPa9tzfMC6zwCN_g";

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
// SIGN UP WITH EMAIL/PASSWORD
// ============================================
async function signUpWithEmail(email, password) {
  try {
    console.log('📝 Signing up with email:', email);
    
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      // If user exists, try to sign in instead
      if (data.error.message === 'EMAIL_EXISTS') {
        console.log('📧 Email exists, signing in instead...');
        return await signInWithEmail(email, password);
      }
      throw new Error(data.error.message);
    }

    if (!data.idToken) {
      throw new Error('No token received');
    }

    currentUser = {
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      displayName: email.split('@')[0]
    };

    localStorage.setItem('snipflow_user', JSON.stringify(currentUser));
    localStorage.setItem('snipflow_token', data.idToken);

    console.log('✅ Signed up and logged in:', email);
    return currentUser;

  } catch (error) {
    console.error('❌ Sign up error:', error.message);
    throw error;
  }
}

// ============================================
// SIGN IN WITH EMAIL/PASSWORD
// ============================================
async function signInWithEmail(email, password) {
  try {
    console.log('🔐 Signing in with email:', email);
    
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.idToken) {
      throw new Error('No token received');
    }

    currentUser = {
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      displayName: data.displayName || email.split('@')[0]
    };

    localStorage.setItem('snipflow_user', JSON.stringify(currentUser));
    localStorage.setItem('snipflow_token', data.idToken);

    console.log('✅ Signed in:', email);
    return currentUser;

  } catch (error) {
    console.error('❌ Sign in error:', error.message);
    throw error;
  }
}

// ============================================
// HANDLE AUTH FORM
// ============================================
async function handleAuthSubmit(e) {
  e.preventDefault();

  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const btn = document.getElementById('authBtn');

  const email = emailInput?.value?.trim();
  const password = passwordInput?.value;

  if (!email || !password) {
    window.showNotification?.('Please enter email and password', 'error');
    return;
  }

  if (password.length < 6) {
    window.showNotification?.('Password must be at least 6 characters', 'error');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    }

    const user = await signUpWithEmail(email, password);

    window.showNotification?.('✅ Welcome to Snipflow!', 'success');
    updateUI(user);

    // Close modal
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');

    // Clear form
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // Redirect
    setTimeout(() => {
      window.location.href = '/app.html';
    }, 1000);

  } catch (error) {
    console.error('Auth error:', error);
    window.showNotification?.('❌ ' + error.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  }
}

// ============================================
// SIGN OUT
// ============================================
async function signOutUser() {
  try {
    if (!confirm('Sign out?')) return;

    console.log('🔓 Signing out...');

    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_token');

    currentUser = null;
    authReady = true;

    console.log('✅ Signed out');
    window.showNotification?.('Signed out', 'success');

    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('Sign out error:', error);
    window.showNotification?.('Sign-out failed', 'error');
  }
}

// ============================================
// GET CURRENT USER
// ============================================
function getCurrentUser() {
  if (!currentUser) {
    try {
      const stored = localStorage.getItem('snipflow_user');
      const token = localStorage.getItem('snipflow_token');
      
      if (stored && token) {
        currentUser = JSON.parse(stored);
        currentUser.idToken = token;
        console.log('✅ Loaded user from storage:', currentUser.email);
      }
    } catch (e) {
      console.warn('Could not load user:', e.message);
    }
  }

  if (currentUser?.email) {
    console.log('✅ getCurrentUser() → ', currentUser.email);
    return currentUser;
  }

  console.log('❌ getCurrentUser() → null');
  return null;
}

// ============================================
// UPDATE UI
// ============================================
function updateUI(user) {
  if (!user) return;

  console.log('📝 Updating UI for:', user.email);

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
window.handleAuthSubmit = handleAuthSubmit;

// ============================================
// INITIALIZE
// ============================================
console.log('🚀 Auth module starting...');

function initAuth() {
  console.log('📄 Initializing auth...');
  
  // Check for existing user
  const existingUser = checkExistingUser();
  
  if (existingUser) {
    console.log('✅ User already logged in, showing profile');
    authReady = true;
  } else {
    console.log('❌ No user logged in');
    authReady = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// Also init after a small delay
setTimeout(initAuth, 100);

console.log('✅ Auth module ready');