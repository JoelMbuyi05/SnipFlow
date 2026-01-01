// ==========================================
// SNIPPET MANAGER - FIRESTORE INTEGRATION
// ==========================================

// Global State
let snippets = [];
let currentUser = null;
let currentFilter = 'all';
let editingSnippetId = null;
let db = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Snipflow App Initialized');
  
  // Check if user is logged in
  checkAuth();
  
  // Wait for Firebase to be ready
  const checkFirebase = setInterval(() => {
    db = window.getDb();
    if (db) {
      clearInterval(checkFirebase);
      console.log('✅ Firestore ready');
      
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
    console.log('✅ User logged in:', currentUser.email);
    updateUserProfile();
  } else {
    // Redirect to index if not logged in
    if (window.location.pathname.includes('app.html')) {
      window.location.href = 'index.html';
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
  if (typeof window.firebaseLogout === 'function') {
    window.firebaseLogout();
  } else {
    localStorage.removeItem('snipflow_user');
    localStorage.removeItem('snipflow_snippets');
    window.location.href = 'index.html';
  }
}

// ==========================================
// FIRESTORE FUNCTIONS
// ==========================================

async function loadSnippetsFromFirestore() {
  if (!db || !currentUser) {
    console.warn('DB or user not ready');
    return;
  }
  
  try {
    console.log('📦 Loading snippets from Firestore...');
    
    const querySnapshot = await db.collection('snippets')
      .where('userId', '==', currentUser.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    
    snippets = [];
    querySnapshot.forEach((doc) => {
      snippets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Loaded ${snippets.length} snippets`);
    renderSnippets();
    
  } catch (error) {
    console.error('Error loading snippets:', error);
    
    // Fallback to localStorage if Firestore fails
    const saved = localStorage.getItem('snipflow_snippets');
    if (saved) {
      snippets = JSON.parse(saved);
      renderSnippets();
    }
  }
}

async function saveSnippetToFirestore(snippet) {
  if (!db) {
    console.warn('DB not ready, saving to localStorage only');
    saveToLocalStorage();
    return;
  }
  
  try {
    if (snippet.id && snippet.id.startsWith('snip_')) {
      // New snippet - add to Firestore
      const docRef = await db.collection('snippets').add({
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        tags: snippet.tags,
        isPinned: snippet.isPinned,
        isFavorite: snippet.isFavorite,
        userId: snippet.userId,
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt
      });
      
      // Update local snippet with Firestore ID
      snippet.id = docRef.id;
      console.log('✅ Snippet saved to Firestore:', docRef.id);
      
    } else if (snippet.id) {
      // Existing snippet - update in Firestore
      await db.collection('snippets').doc(snippet.id).update({
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        tags: snippet.tags,
        isPinned: snippet.isPinned,
        isFavorite: snippet.isFavorite,
        updatedAt: snippet.updatedAt
      });
      
      console.log('✅ Snippet updated in Firestore:', snippet.id);
    }
    
    // Also save to localStorage as backup
    saveToLocalStorage();
    
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    // Fallback to localStorage
    saveToLocalStorage();
  }
}

async function deleteSnippetFromFirestore(snippetId) {
  if (!db) {
    console.warn('DB not ready');
    return;
  }
  
  try {
    await db.collection('snippets').doc(snippetId).delete();
    console.log('✅ Snippet deleted from Firestore');
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
  }
}

function saveToLocalStorage() {
  localStorage.setItem('snipflow_snippets', JSON.stringify(snippets));
  console.log('💾 Snippets saved to localStorage');
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
  document.getElementById('createModal').classList.remove('hidden');
  document.querySelector('#createModal h2').textContent = 'Create New Snippet';
  document.getElementById('snippetForm').reset();
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
  editingSnippetId = null;
}

function openEditModal(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  editingSnippetId = snippetId;
  document.getElementById('createModal').classList.remove('hidden');
  document.querySelector('#createModal h2').textContent = 'Edit Snippet';
  
  document.getElementById('snippetTitle').value = snippet.title;
  document.getElementById('snippetLanguage').value = snippet.language;
  document.getElementById('snippetCode').value = snippet.code;
  document.getElementById('snippetTags').value = snippet.tags.join(', ');
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
      snippet.updatedAt = Date.now();
      
      await saveSnippetToFirestore(snippet);
      console.log('✏️ Snippet updated:', title);
    }
  } else {
    // Create new snippet
    const newSnippet = {
      id: 'snip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      language,
      code,
      tags,
      isPinned: false,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: currentUser?.uid || 'guest'
    };
    
    snippets.unshift(newSnippet);
    await saveSnippetToFirestore(newSnippet);
    console.log('✅ New snippet created:', title);
  }
  
  renderSnippets();
  closeCreateModal();
}

async function deleteSnippet(snippetId) {
  if (!confirm('Delete this snippet?')) return;
  
  snippets = snippets.filter(s => s.id !== snippetId);
  await deleteSnippetFromFirestore(snippetId);
  saveToLocalStorage();
  renderSnippets();
  console.log('🗑️ Snippet deleted');
}

async function togglePin(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (snippet) {
    snippet.isPinned = !snippet.isPinned;
    snippet.updatedAt = Date.now();
    await saveSnippetToFirestore(snippet);
    renderSnippets();
  }
}

async function toggleFavorite(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (snippet) {
    snippet.isFavorite = !snippet.isFavorite;
    snippet.updatedAt = Date.now();
    await saveSnippetToFirestore(snippet);
    renderSnippets();
  }
}

function copySnippet(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  navigator.clipboard.writeText(snippet.code)
    .then(() => {
      console.log('📋 Code copied');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
    });
}

function shareSnippet(snippetId) {
  const snippet = snippets.find(s => s.id === snippetId);
  if (!snippet) return;
  
  const shareLink = `${window.location.origin}/share.html?id=${snippetId}`;
  
  navigator.clipboard.writeText(shareLink)
    .then(() => {
      console.log('🔗 Share link copied');
    })
    .catch(err => {
      console.error('Failed to copy link:', err);
    });
}

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
    `<span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">${tag}</span>`
  ).join('');
  
  return `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition group">
      
      <!-- Card Header -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
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
      
      <!-- Card Footer -->
      <div class="p-4 flex items-center justify-between">
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
  const allCount = document.getElementById('allCount');
  
  if (snippetCount) {
    snippetCount.textContent = snippets.length;
  }
  
  if (allCount) {
    allCount.textContent = snippets.length;
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
    closeFeedbackModal();
  })
  .catch(err => {
    console.error('EmailJS error:', err);
    alert('Failed to send feedback. Please try again.');
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