// ==========================================
// SNIPPET MANAGER - FIRESTORE INTEGRATION
// ==========================================

// Global State
let snippets = [];
let currentUser = null;
let currentFilter = 'all';
let editingSnippetId = null;
let firestoreDb = null;
let currentScreenshot = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Snipflow App Initialized');
  
  // Check if user is logged in
  checkAuth();
  
  // Wait for Firebase to be ready
  const checkFirebase = setInterval(() => {
    firestoreDb = window.getDb();
    if (firestoreDb && currentUser) {
      clearInterval(checkFirebase);
      console.log('Firestore ready');
      
      // Load snippets from Firestore
      loadSnippetsFromFirestore();
    }
  }, 100);
  
  // Setup event listeners
  setupEventListeners();
});

// ==========================================
// AUTH FUNCTIONS
// ==========================================

function checkAuth() {
  const savedUser = localStorage.getItem('snipflow_user');
  
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    console.log('User logged in:', currentUser.email);
    console.log('User UID:', currentUser.uid);
    updateUserProfile();
  } else {
    // Redirect to index if not logged in
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('app.html')) {
      console.log('No user found, redirecting to home');
      window.location.href = '/';
    }
  }
}

function updateUserProfile() {
  const profileBtn = document.getElementById('userProfileBtn');
  if (!profileBtn || !currentUser) return;
  
  // If user has photo, show it
  if (currentUser.photoURL) {
    profileBtn.innerHTML = `<img src="${currentUser.photoURL}" alt="${currentUser.name}" class="w-10 h-10 rounded-lg object-cover">`;
  } else {
    // Show initials
    const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    profileBtn.innerHTML = `<div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">${initials}</div>`;
  }
  
  // Add dropdown toggle
  profileBtn.onclick = (e) => {
    e.stopPropagation();
    toggleProfileDropdown();
  };
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !profileBtn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

function toggleProfileDropdown() {
  let dropdown = document.getElementById('profileDropdown');
  
  // Create dropdown if it doesn't exist
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'profileDropdown';
    dropdown.className = 'absolute right-6 top-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-64 z-50 hidden';
    dropdown.innerHTML = `
      <div class="p-4 border-b border-slate-200 dark:border-slate-700">
        <div class="font-semibold text-slate-900 dark:text-white">${currentUser.name}</div>
        <div class="text-sm text-slate-500 dark:text-slate-400">${currentUser.email}</div>
      </div>
      <button onclick="logout()" class="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3 transition">
        <i class="fas fa-sign-out-alt text-slate-400"></i>
        <span>Logout</span>
      </button>
    `;
    document.body.appendChild(dropdown);
  }
  
  // Toggle visibility
  dropdown.classList.toggle('hidden');
}

function logout() {
  // Show confirmation dialog
  if (typeof window.firebaseLogout === 'function') {
    window.firebaseLogout();
  } else {
    if (confirm('Are you sure you want to logout?')){
    localStorage.removeItem('snipflow_user');
    window.location.href = '/';
    }
  }
}

// ==========================================
// SCREENSHOT FUNCTIONS
// ==========================================

function handleScreenshotUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    currentScreenshot = e.target.result;
    document.getElementById('previewImage').src = e.target.result;
    document.getElementById('screenshotPreview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearScreenshot() {
  currentScreenshot = null;
  document.getElementById('snippetScreenshot').value = '';
  document.getElementById('screenshotPreview').classList.add('hidden');
}

// ==========================================
// FIRESTORE FUNCTIONS
// ==========================================

async function loadSnippetsFromFirestore() {
  if (!currentUser) {
    console.warn('User not ready');
    return;
  }
  
  // ALWAYS load from localStorage FIRST (instant)
  const localKey = `snipflow_snippets_${currentUser.uid}`;
  const savedLocal = localStorage.getItem(localKey);
  
  if (savedLocal) {
    try {
      snippets = JSON.parse(savedLocal);
      console.log(`Loaded ${snippets.length} snippets from localStorage (instant)`);
      renderSnippets();
    } catch (error) {
      console.error('Error parsing localStorage:', error);
      snippets = [];
    }
  }
  
  // Then sync with Firestore in background
  if (!firestoreDb) {
    console.warn('Firestore not ready, using localStorage only');
    return;
  }
  
  try {
    console.log('Syncing with Firestore...');
    
    const querySnapshot = await firestoreDb.collection('snippets')
      .where('userId', '==', currentUser.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const firestoreSnippets = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      firestoreSnippets.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Synced ${firestoreSnippets.length} snippets from Firestore`);
    
    // Update with Firestore data
    if (firestoreSnippets.length > 0) {
      snippets = firestoreSnippets;
      saveToLocalStorage();
      renderSnippets();
      console.log('Firestore sync complete');
    } else if (snippets.length > 0) {
      console.log('Pushing localStorage snippets to Firestore...');
      for (const snippet of snippets) {
        await saveSnippetToFirestore(snippet);
      }
    }
    
  } catch (error) {
    console.error('Firestore sync failed:', error);
    console.log('Using localStorage data (offline mode)');
    if (snippets.length === 0 && savedLocal) {
      snippets = JSON.parse(savedLocal);
      renderSnippets();
    }
  }
}

async function saveSnippetToFirestore(snippet) {
  if (!firestoreDb) {
    console.warn('DB not ready, saving to localStorage only');
    saveToLocalStorage();
    return;
  }
  
  if (!currentUser) {
    console.error('No user logged in');
    return;
  }
  
  try {
    // Always ensure userId is set
    snippet.userId = currentUser.uid;
    
    if (snippet.id && snippet.id.startsWith('snip_')) {
      // New snippet - add to Firestore
      console.log('Adding new snippet to Firestore...');
      
      const docRef = await firestoreDb.collection('snippets').add({
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        tags: snippet.tags,
        screenshot: snippet.screenshot || null,
        isPinned: snippet.isPinned,
        isFavorite: snippet.isFavorite,
        userId: currentUser.uid,
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt
      });
      
      // Update local snippet with Firestore ID
      const oldId = snippet.id;
      snippet.id = docRef.id;
      
      // Update in local array
      const index = snippets.findIndex(s => s.id === oldId);
      if (index !== -1) {
        snippets[index] = snippet;
      }
      
      console.log('Snippet saved to Firestore with ID:', docRef.id);
      
    } else if (snippet.id) {
      // Existing snippet - update in Firestore
      console.log('Updating snippet in Firestore:', snippet.id);
      
      await firestoreDb.collection('snippets').doc(snippet.id).update({
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        tags: snippet.tags,
        screenshot: snippet.screenshot || null,
        isPinned: snippet.isPinned,
        isFavorite: snippet.isFavorite,
        updatedAt: snippet.updatedAt
      });
      
      console.log('Snippet updated in Firestore:', snippet.id);
    }
    
    // Always save to localStorage as backup
    saveToLocalStorage();
    
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    // Fallback to localStorage
    saveToLocalStorage();
  }
}

async function deleteSnippetFromFirestore(snippetId) {
  if (!firestoreDb) {
    console.warn('DB not ready');
    return;
  }
  
  try {
    // Only delete from Firestore if it's not a temporary ID
    if (!snippetId.startsWith('snip_')) {
      console.log('Deleting snippet from Firestore:', snippetId);
      await firestoreDb.collection('snippets').doc(snippetId).delete();
      console.log('Snippet deleted from Firestore');
    }
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
  }
}

function saveToLocalStorage() {
  if (currentUser) {
    const key = `snipflow_snippets_${currentUser.uid}`;
    localStorage.setItem(key, JSON.stringify(snippets));
    console.log('Saved', snippets.length, 'snippets to localStorage with key:', key);
  } else {
    console.warn('Cannot save to localStorage: no current user');
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
  // Create button
  const createBtn = document.getElementById('createBtn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateModal);
  }
  
  // Snippet form
  const snippetForm = document.getElementById('snippetForm');
  if (snippetForm) {
    snippetForm.addEventListener('submit', handleSnippetSubmit);
  }
  
  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Feedback form
  const feedbackBtn = document.getElementById('feedbackBtn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', openFeedbackModal);
  }
  
  const feedbackForm = document.getElementById('feedbackForm');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', handleFeedbackSubmit);
  }
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================

function openCreateModal() {
  editingSnippetId = null;
  currentScreenshot = null;
  document.getElementById('createModal').classList.remove('hidden');
  document.querySelector('#createModal h2').textContent = 'Create New Snippet';
  document.getElementById('snippetForm').reset();
  document.getElementById('screenshotPreview').classList.add('hidden');
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
  editingSnippetId = null;
  currentScreenshot = null;
}

function openEditModal(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  editingSnippetId = snippetId;
  currentScreenshot = snippet.screenshot || null;
  document.getElementById('createModal').classList.remove('hidden');
  document.querySelector('#createModal h2').textContent = 'Edit Snippet';
  
  document.getElementById('snippetTitle').value = snippet.title;
  document.getElementById('snippetLanguage').value = snippet.language;
  document.getElementById('snippetCode').value = snippet.code;
  document.getElementById('snippetTags').value = snippet.tags.join(', ');
  
  // Show screenshot if exists
  if (snippet.screenshot) {
    document.getElementById('previewImage').src = snippet.screenshot;
    document.getElementById('screenshotPreview').classList.remove('hidden');
  } else {
    document.getElementById('screenshotPreview').classList.add('hidden');
  }
}

function openFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('hidden');
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('hidden');
  document.getElementById('feedbackForm').reset();
}

// ==========================================
// SNIPPET CRUD OPERATIONS
// ==========================================

async function handleSnippetSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('snippetTitle').value.trim();
  const language = document.getElementById('snippetLanguage').value;
  const code = document.getElementById('snippetCode').value.trim();
  const tagsInput = document.getElementById('snippetTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
  
  if (!title || !language || !code) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (editingSnippetId) {
    // Update existing snippet
    const snippet = snippets.find(s => s.id === editingSnippetId);
    if (snippet) {
      snippet.title = title;
      snippet.language = language;
      snippet.code = code;
      snippet.tags = tags;
      snippet.screenshot = currentScreenshot;
      snippet.updatedAt = Date.now();
      
      await saveSnippetToFirestore(snippet);
      showToast('Snippet updated!');
      console.log('Snippet updated:', title);
    }
  } else {
    // Create new snippet
    const newSnippet = {
      id: 'snip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      language,
      code,
      tags,
      screenshot: currentScreenshot,
      isPinned: false,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: currentUser?.uid || 'guest'
    };
    
    snippets.unshift(newSnippet);
    await saveSnippetToFirestore(newSnippet);
    showToast('Snippet created!');
    console.log('New snippet created:', title);
  }
  
  renderSnippets();
  closeCreateModal();

  // When user CREATES a snippet
  trackEvent('snippet_created', { language: language });
}

async function deleteSnippet(snippetId) {
  if (!confirm('Are you sure you want to delete this snippet?')) return;
  
  snippets = snippets.filter(s => s.id !== snippetId);
  await deleteSnippetFromFirestore(snippetId);
  saveToLocalStorage();
  renderSnippets();
  showToast('Snippet deleted');
  console.log('Snippet deleted');
}

async function togglePin(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (snippet) {
    snippet.isPinned = !snippet.isPinned;
    snippet.updatedAt = Date.now();
    await saveSnippetToFirestore(snippet);
    renderSnippets();
    showToast(snippet.isPinned ? 'Snippet pinned' : 'Snippet unpinned');
  }
}

async function toggleFavorite(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (snippet) {
    snippet.isFavorite = !snippet.isFavorite;
    snippet.updatedAt = Date.now();
    await saveSnippetToFirestore(snippet);
    renderSnippets();
    showToast(snippet.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  }
}

function copySnippet(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  navigator.clipboard.writeText(snippet.code)
    .then(() => {
      showToast('Code copied to clipboard!');
      console.log('Code copied');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy code', 'error');
    });
}

function shareSnippet(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  // Get the base URL without any paths
  const baseUrl = window.location.origin;
  const shareLink = `${baseUrl}/share.html?id=${snippetId}`;
  
  navigator.clipboard.writeText(shareLink)
    .then(() => {
      showToast(shareLink);
      console.log('Share link copied:', shareLink);
    })
    .catch(err => {
      console.error('Failed to copy link:', err);
      showToast('Failed to copy share link', 'error');
    });
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================

function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up ${
    type === 'error' 
      ? 'bg-red-500 text-white' 
      : 'bg-green-500 text-white'
  }`;
  
  const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon} text-xl"></i>
    <span class="font-medium">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slide-down 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-down {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;
document.head.appendChild(style);

// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderSnippets() {
  const snippetsGrid = document.getElementById('snippetsGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (!snippetsGrid || !emptyState) return;
  
  // Filter snippets based on current filter
  let filteredSnippets = [...snippets];
  
  if (currentFilter === 'favorites') {
    filteredSnippets = filteredSnippets.filter(s => s.isFavorite);
  } else if (currentFilter === 'recent') {
    filteredSnippets = filteredSnippets.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  }
  
  // Sort: pinned first, then by updated date
  filteredSnippets.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
  
  // Update counts
  updateCounts();
  
  // Show/hide empty state
  if (filteredSnippets.length === 0) {
    emptyState.classList.remove('hidden');
    snippetsGrid.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  snippetsGrid.classList.remove('hidden');
  
  // Render snippet cards
  snippetsGrid.innerHTML = filteredSnippets.map(snippet => createSnippetCard(snippet)).join('');
  
  // Apply syntax highlighting
  document.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}

function createSnippetCard(snippet) {
  const createdDate = new Date(snippet.createdAt).toLocaleDateString();
  const tagsHTML = snippet.tags.map(tag => 
    `<span class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">${tag}</span>`
  ).join('');
  
  return `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden hover:shadow-lg transition group">
      
      <!-- Card Header -->
      <div class="p-4 border-b border-slate-300 dark:border-slate-700 flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            ${snippet.isPinned ? '<i class="fas fa-thumbtack text-blue-500 text-sm"></i>' : ''}
            <h3 class="font-bold text-slate-900 dark:text-white">${escapeHtml(snippet.title)}</h3>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded font-mono">${snippet.language}</span>
            <span>•</span>
            <span>${createdDate}</span>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="flex items-center gap-1">
          <button onclick="toggleFavorite('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition" title="Favorite">
            <i class="fas fa-star ${snippet.isFavorite ? 'text-yellow-500' : 'text-slate-400'}"></i>
          </button>
          <button onclick="togglePin('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition" title="Pin">
            <i class="fas fa-thumbtack ${snippet.isPinned ? 'text-blue-500' : 'text-slate-400'}"></i>
          </button>
        </div>
      </div>
      
      <!-- Code Preview -->
      <div class="p-4 bg-slate-900 dark:bg-slate-950 max-h-48 overflow-hidden relative">
        <pre class="text-sm"><code class="language-${snippet.language}">${escapeHtml(snippet.code)}</code></pre>
        <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 dark:from-slate-950 to-transparent pointer-events-none"></div>
      </div>
      
      ${snippet.screenshot ? `
      <!-- Screenshot -->
      <div class="p-4 border-t border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <img src="${snippet.screenshot}" alt="Snippet screenshot" class="w-full rounded-lg border border-slate-300 dark:border-slate-600" />
      </div>
      ` : ''}
      
      <!-- Card Footer -->
      <div class="p-4 flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-1 flex-wrap">
          ${tagsHTML}
        </div>
        
        <div class="flex items-center gap-1">
          <button onclick="copySnippet('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition text-slate-600 dark:text-slate-400 hover:text-green-500" title="Copy">
            <i class="fas fa-copy text-sm"></i>
          </button>
          <button onclick="shareSnippet('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition text-slate-600 dark:text-slate-400 hover:text-blue-500" title="Share">
            <i class="fas fa-share-alt text-sm"></i>
          </button>
          <button onclick="openEditModal('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition text-slate-600 dark:text-slate-400 hover:text-blue-500" title="Edit">
            <i class="fas fa-edit text-sm"></i>
          </button>
          <button onclick="deleteSnippet('${snippet.id}')" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition text-slate-600 dark:text-slate-400 hover:text-red-500" title="Delete">
            <i class="fas fa-trash text-sm"></i>
          </button>
        </div>
      </div>
      
    </div>
  `;
}

function updateCounts() {
  const snippetCount = document.getElementById('snippetCount');
  const snippetCountMobile = document.getElementById('snippetCountMobile');
  const allCount = document.getElementById('allCount');
   const allCountMobile = document.getElementById('allCountMobile');
  
  if (snippetCount) {
    snippetCount.textContent = snippets.length;
  }
   if (snippetCountMobile) {
    snippetCountMobile.textContent = snippets.length;
  }
  if (allCount) {
    allCount.textContent = snippets.length;
  }
  if (allCountMobile) {
    allCountMobile.textContent = snippets.length;
  }
}

// ==========================================
// SEARCH & FILTER
// ==========================================

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderSnippets();
    return;
  }
  
  const filtered = snippets.filter(snippet => {
    return (
      snippet.title.toLowerCase().includes(query) ||
      snippet.code.toLowerCase().includes(query) ||
      snippet.language.toLowerCase().includes(query) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });
  
  // Temporarily render filtered results
  const snippetsGrid = document.getElementById('snippetsGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    snippetsGrid.classList.add('hidden');
    emptyState.innerHTML = `
      <i class="fas fa-search text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">No results found</h2>
      <p class="text-slate-600 dark:text-slate-400 mb-6 text-center max-w-md">
        Try searching with different keywords
      </p>
    `;
  } else {
    emptyState.classList.add('hidden');
    snippetsGrid.classList.remove('hidden');
    snippetsGrid.innerHTML = filtered.map(snippet => createSnippetCard(snippet)).join('');
    
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
}

function handleFilterClick(e) {
  const filterBtn = e.currentTarget;
  const filterText = filterBtn.textContent.trim().toLowerCase();
  
  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100');
    btn.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
  });
  
  filterBtn.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
  filterBtn.classList.add('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100');
  
  // Set filter
  if (filterText.includes('all')) {
    currentFilter = 'all';
  } else if (filterText.includes('favorites')) {
    currentFilter = 'favorites';
  } else if (filterText.includes('recent')) {
    currentFilter = 'recent';
  }
  
  renderSnippets();
}

// ==========================================
// FEEDBACK FORM
// ==========================================

function handleFeedbackSubmit(e) {
  e.preventDefault();
  
  const feedbackText = document.getElementById('feedbackText').value.trim();
  
  if (!feedbackText) {
    alert('Please enter your feedback');
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  
  // Send via EmailJS
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    from_name: currentUser?.name || currentUser?.email || 'Anonymous',
    from_email: currentUser?.email || 'anonymous@snipflow.com',
    message: feedbackText,
    to_name: 'Snipflow Team'
  })
  .then(() => {
    showToast('Feedback sent! Thank you!');
    closeFeedbackModal();
  })
  .catch(err => {
    console.error('EmailJS error:', err);
    showToast('Failed to send feedback. Please try again.', 'error');
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Feedback';
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally accessible
window.openEditModal = openEditModal;
window.deleteSnippet = deleteSnippet;
window.togglePin = togglePin;
window.toggleFavorite = toggleFavorite;
window.copySnippet = copySnippet;
window.shareSnippet = shareSnippet;
window.handleFilterClick = handleFilterClick;
window.closeCreateModal = closeCreateModal;
window.closeFeedbackModal = closeFeedbackModal;
window.logout = logout;
window.handleScreenshotUpload = handleScreenshotUpload;
window.clearScreenshot = clearScreenshot;