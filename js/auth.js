// ============================================
// GOOGLE AUTHENTICATION FOR FIREBASE
// ============================================

import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  getAuth
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

const auth = getAuth();
const db = getFirestore();


// ============================================
// GOOGLE PROVIDER
// ============================================

const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({ prompt: 'select_account' });


// ============================================
// SIGN IN
// ============================================
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save user to Firestore if first time
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });
    }

    // Save locally for UI
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
    localStorage.setItem('snipflow_user', JSON.stringify(userData));

    // Redirect to dashboard
    window.location.href = '/app.html';
  } catch (err) {
    console.error('Sign-in failed', err);
    alert('Sign-in failed or cancelled');
  }
}

// ============================================
// DASHBOARD AUTH GUARD
// ============================================
function requireAuthOnDashboard() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = '/';
      return;
    }

    // User is logged in → setup profile icon
    createOrUpdateProfileIcon(user);
  });
}

// ============================================
// CLICKABLE PROFILE ICON + LOGOUT
// ============================================
function createOrUpdateProfileIcon(user) {
  const container = document.getElementById('userMenu');
  if (!container) return;

  const initial = (user.displayName || user.email)[0].toUpperCase();

  container.innerHTML = `
    <div class="relative">
      <button id="userBtn"
        class="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
        ${initial}
      </button>

      <div id="userDropdown"
        class="hidden absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border z-50">
        <div class="px-4 py-3 border-b">
          <div class="font-semibold text-sm">${user.displayName || 'User'}</div>
          <div class="text-xs text-gray-500 break-all">${user.email}</div>
        </div>

        <button id="logoutBtn"
          class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50">
          Sign out
        </button>
      </div>
    </div>
  `;

  document.getElementById('userBtn').onclick = () => {
    document.getElementById('userDropdown').classList.toggle('hidden');
  };
  document.getElementById('logoutBtn').onclick = signOutUser;

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!container.contains(e.target)) {
      document.getElementById('userDropdown')?.classList.add('hidden');
    }
  });
}

// ============================================
// SIGN OUT
// ============================================

async function signOutUser() {
  await signOut(auth);
  localStorage.clear();
  window.location.href = '/';
}

// ============================================
// HELPERS
// ============================================
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('snipflow_user'));
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Only protect dashboard
  if (window.location.pathname.includes('app.html')) {
    requireAuthOnDashboard();
  }

  const googleBtn = document.getElementById('googleSignInBtn');
  if (googleBtn) googleBtn.onclick = signInWithGoogle;
});

// ============================================
// EXPORT
// ============================================
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.getCurrentUser = getCurrentUser;