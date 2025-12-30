// ============================================
// JS/APP.JS - UI LAYER (FIXED)
// ============================================

console.log('📄 App loading...');

// ============================================
// STATE
// ============================================
let allSnippets = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId = null;
let isAuthReady = false;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 App starting...');
  
  await waitForUser();
  setupEventListeners();
  setupModalListeners();
  await loadSnippets();
  
  console.log('✅ App ready!');
});

// ============================================
// WAIT FOR USER TO BE LOGGED IN
// ============================================
function waitForUser() {
  return new Promise((resolve) => {
    console.log('⏳ Checking if user is logged in...');
    
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const user = window.getCurrentUser?.();
      console.log('⏳ Auth check', attempts, '- User:', user?.email || 'NOT LOGGED IN');
      
      if (user && user.email) {
        clearInterval(checkInterval);
        console.log('✅ User is logged in:', user.email);
        isAuthReady = true;
        resolve();
        return;
      }
      
      // Timeout after 2 seconds
      if (attempts > 20) {
        clearInterval(checkInterval);
        console.log('⚠️ No user found after 2 seconds');
        isAuthReady = true;
        resolve();
      }
    }, 100);
  });
}

// ============================================
// LOAD SNIPPETS FROM DATABASE
// ============================================
async function loadSnippets() {
  try {
    const user = window.getCurrentUser?.();
    
    if (!user) {
      console.log('📝 No user logged in - showing empty state');
      const emptyState = document.getElementById('emptyState');
      const snippetsGrid = document.getElementById('snippetsGrid');
      
      if (emptyState) emptyState.classList.remove('hidden');
      if (snippetsGrid) snippetsGrid.classList.add('hidden');
      return;
    }

    console.log('📥 Loading snippets for:', user.uid);
    
    // Call the global function from db.js
    allSnippets = await window.getAllSnippets(user.uid);
    
    updateSnippetCount();
    applyFilters();

  } catch (error) {
    console.error('❌ Failed to load snippets:', error);
    window.showNotification?.('Failed to load snippets', 'error');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Create button
  const createBtn = document.getElementById('createBtn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateModal);
  }

  // Form submission
  const snippetForm = document.getElementById('snippetForm');
  if (snippetForm) {
    snippetForm.addEventListener('submit', handleFormSubmit);
  }

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentSearch = e.target.value;
      applyFilters();
    }, 300));
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });

  // Feedback button
  const feedbackBtn = document.getElementById('feedbackBtn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
      const feedbackModal = document.getElementById('feedbackModal');
      if (feedbackModal) feedbackModal.classList.remove('hidden');
    });
  }

  // Feedback form
  const feedbackForm = document.getElementById('feedbackForm');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', handleFeedbackSubmit);
  }
}

function setupModalListeners() {
  const createModal = document.getElementById('createModal');
  const feedbackModal = document.getElementById('feedbackModal');

  // Close on outside click
  if (createModal) {
    createModal.addEventListener('click', (e) => {
      if (e.target === createModal) closeCreateModal();
    });
  }

  if (feedbackModal) {
    feedbackModal.addEventListener('click', (e) => {
      if (e.target === feedbackModal) closeFeedbackModal();
    });
  }
}

// ============================================
// FORM HANDLING
// ============================================
function openCreateModal() {
  editingId = null;
  const form = document.getElementById('snippetForm');
  if (form) form.reset();
  
  const modalTitle = document.querySelector('#createModal h2');
  if (modalTitle) modalTitle.textContent = 'Create New Snippet';
  
  const createModal = document.getElementById('createModal');
  if (createModal) createModal.classList.remove('hidden');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const titleEl = document.getElementById('snippetTitle');
  const codeEl = document.getElementById('snippetCode');
  const langEl = document.getElementById('snippetLanguage');
  const tagsEl = document.getElementById('snippetTags');

  const title = titleEl?.value?.trim() || '';
  const code = codeEl?.value?.trim() || '';
  const language = langEl?.value || '';
  const tags = tagsEl?.value || '';

  // Validate
  if (!title || !code || !language) {
    window.showNotification?.('❌ Title, Code, and Language are required', 'error');
    return;
  }

  // CHECK USER IS LOGGED IN
  const user = window.getCurrentUser?.();
  console.log('🔍 Form submit - checking user...');
  console.log('   localStorage snipflow_user:', localStorage.getItem('snipflow_user') ? 'EXISTS' : 'MISSING');
  console.log('   localStorage snipflow_token:', localStorage.getItem('snipflow_token') ? 'EXISTS' : 'MISSING');
  console.log('   getCurrentUser() result:', user?.email || 'NULL');
  
  if (!user || !user.email) {
    console.error('❌ User not authenticated! User object:', user);
    window.showNotification?.('❌ You must be logged in to save snippets', 'error');
    return;
  }

  console.log('✅ User authenticated:', user.email);

  try {
    const btn = document.querySelector('#snippetForm button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    if (editingId) {
      // EDIT
      await window.updateSnippet(editingId, {
        title,
        code,
        language,
        tags
      });
      window.showNotification?.('✅ Snippet updated!', 'success');
    } else {
      // CREATE
      await window.createSnippet(user.uid, {
        title,
        code,
        language,
        tags
      });
      window.showNotification?.('✅ Snippet created!', 'success');
    }

    const form = document.getElementById('snippetForm');
    if (form) form.reset();
    closeCreateModal();
    await loadSnippets();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save';
    }

  } catch (error) {
    console.error('Error saving snippet:', error);
    window.showNotification?.('❌ Failed to save snippet: ' + error.message, 'error');
    
    const btn = document.querySelector('#snippetForm button[type="submit"]');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save';
    }
  }
}

function handleFeedbackSubmit(e) {
  e.preventDefault();
  window.showNotification?.('✅ Thank you for your feedback!', 'success');
  const form = document.getElementById('feedbackForm');
  if (form) form.reset();
  closeFeedbackModal();
}

// ============================================
// FILTER & SEARCH
// ============================================
function handleFilterClick(e) {
  e.preventDefault();
  
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(b => {
    b.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100');
  });
  
  const btn = e.target.closest('.filter-btn');
  if (btn) {
    btn.classList.add('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100');
    
    const text = btn.textContent;
    if (text.includes('All')) currentFilter = 'all';
    else if (text.includes('Favorites')) currentFilter = 'favorites';
    else if (text.includes('Recent')) currentFilter = 'recent';
  }
  
  applyFilters();
}

function applyFilters() {
  let filtered = window.filterByType(allSnippets, currentFilter);
  filtered = window.searchSnippets(filtered, currentSearch);
  renderSnippets(filtered);
}

// ============================================
// RENDER SNIPPETS
// ============================================
function renderSnippets(snippets) {
  const grid = document.getElementById('snippetsGrid');
  const empty = document.getElementById('emptyState');

  if (!snippets || !Array.isArray(snippets) || snippets.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (grid) grid.classList.add('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (grid) grid.classList.remove('hidden');

  grid.innerHTML = snippets.map(snippet => `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition cursor-pointer group" data-id="${escapeHtml(snippet.id)}">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer" onclick="viewSnippet('${escapeHtml(snippet.id)}')">${escapeHtml(snippet.title)}</h3>
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-yellow-400 rounded-full"></span>
              ${escapeHtml(snippet.language)}
            </span>
            <span>•</span>
            <span>${getTimeAgo(snippet.createdAt)}</span>
          </div>
        </div>
        <button class="opacity-0 group-hover:opacity-100 transition favorite-btn" onclick="toggleFavoriteBtnClick('${escapeHtml(snippet.id)}'); event.stopPropagation();" title="Toggle favorite">
          <i class="fas fa-star ${snippet.isFavorite ? 'text-yellow-500' : 'text-slate-300'} hover:text-yellow-500"></i>
        </button>
      </div>
      
      <div class="bg-slate-900 rounded-lg p-3 mb-3 font-mono text-xs text-slate-300 overflow-hidden max-h-24">
        <code>${escapeHtml(snippet.code.slice(0, 150))}${snippet.code.length > 150 ? '...' : ''}</code>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex gap-1 flex-wrap max-w-sm">
          ${(snippet.tags && Array.isArray(snippet.tags)) ? snippet.tags.map(tag => `<span class="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">${escapeHtml(tag)}</span>`).join('') : ''}
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onclick="editSnippetBtn('${escapeHtml(snippet.id)}'); event.stopPropagation();" title="Edit">
            <i class="fas fa-edit text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="copyCodeBtn('${escapeHtml(snippet.id)}'); event.stopPropagation();" title="Copy">
            <i class="fas fa-copy text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="shareSnippetBtn('${escapeHtml(snippet.id)}'); event.stopPropagation();" title="Share">
            <i class="fas fa-share text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="deleteSnippetBtn('${escapeHtml(snippet.id)}'); event.stopPropagation();" title="Delete">
            <i class="fas fa-trash text-slate-400 hover:text-red-600"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// ACTIONS
// ============================================

function viewSnippet(id) {
  const snippet = allSnippets.find(s => s.id === id);
  if (!snippet) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">${escapeHtml(snippet.title)}</h2>
        <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">${escapeHtml(snippet.language)} • ${getTimeAgo(snippet.createdAt)}</p>
        <pre class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4"><code>${escapeHtml(snippet.code)}</code></pre>
        ${(snippet.tags && snippet.tags.length > 0) ? `<div class="flex gap-2 flex-wrap">${snippet.tags.map(t => `<span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function editSnippetBtn(id) {
  const snippet = allSnippets.find(s => s.id === id);
  if (!snippet) return;

  editingId = id;
  const titleEl = document.getElementById('snippetTitle');
  const codeEl = document.getElementById('snippetCode');
  const langEl = document.getElementById('snippetLanguage');
  const tagsEl = document.getElementById('snippetTags');

  if (titleEl) titleEl.value = snippet.title;
  if (codeEl) codeEl.value = snippet.code;
  if (langEl) langEl.value = snippet.language;
  if (tagsEl) tagsEl.value = (snippet.tags && Array.isArray(snippet.tags)) ? snippet.tags.join(', ') : '';

  const modalTitle = document.querySelector('#createModal h2');
  if (modalTitle) modalTitle.textContent = 'Edit Snippet';
  
  const createModal = document.getElementById('createModal');
  if (createModal) createModal.classList.remove('hidden');
}

async function deleteSnippetBtn(id) {
  if (!confirm('Delete this snippet?')) return;

  try {
    await window.deleteSnippet(id);
    window.showNotification?.('✅ Snippet deleted!', 'success');
    await loadSnippets();
  } catch (error) {
    console.error('Error deleting:', error);
    window.showNotification?.('Failed to delete snippet', 'error');
  }
}

async function toggleFavoriteBtnClick(id) {
  try {
    const snippet = allSnippets.find(s => s.id === id);
    if (snippet) {
      await window.toggleFavorite(id, snippet.isFavorite);
      await loadSnippets();
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

async function copyCodeBtn(id) {
  try {
    const snippet = allSnippets.find(s => s.id === id);
    if (snippet && navigator.clipboard) {
      await navigator.clipboard.writeText(snippet.code);
      window.showNotification?.('✅ Code copied!', 'success');
    }
  } catch (error) {
    console.error('Error copying:', error);
    window.showNotification?.('Failed to copy code', 'error');
  }
}

function shareSnippetBtn(id) {
  const shareUrl = `${window.location.origin}/share.html?id=${id}`;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
      <div class="p-6 border-b border-slate-200 dark:border-slate-700">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Share Snippet</h2>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">Share link:</p>
        <div class="flex gap-2">
          <input type="text" value="${shareUrl}" readonly class="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" id="shareLink">
          <button onclick="navigator.clipboard.writeText(document.getElementById('shareLink').value); window.showNotification?.('Copied!', 'success');" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Copy</button>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="w-full mt-4 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ============================================
// UTILITIES
// ============================================
function closeCreateModal() {
  const createModal = document.getElementById('createModal');
  if (createModal) createModal.classList.add('hidden');
  
  const form = document.getElementById('snippetForm');
  if (form) form.reset();
  
  editingId = null;
}

function closeFeedbackModal() {
  const feedbackModal = document.getElementById('feedbackModal');
  if (feedbackModal) feedbackModal.classList.add('hidden');
  
  const form = document.getElementById('feedbackForm');
  if (form) form.reset();
}

function updateSnippetCount() {
  const count = allSnippets.length;
  const countEl = document.getElementById('snippetCount');
  const allCountEl = document.getElementById('allCount');
  
  if (countEl) countEl.textContent = count;
  if (allCountEl) allCountEl.textContent = count;
}

function getTimeAgo(date) {
  try {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  } catch (e) {
    return 'recently';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

console.log('✅ App.js loaded');