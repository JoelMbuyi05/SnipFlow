// ============================================
// JS/APP.JS - UI LAYER
// ============================================
// Handles only UI logic
// Database logic is in firebase/db.js
// Clean separation of concerns

import {
  createSnippet,
  getAllSnippets,
  getSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
  searchSnippets,
  filterByType
} from '../firebase/db.js';

console.log('📄 App loading...');

// ============================================
// STATE
// ============================================
let allSnippets = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 App starting...');
  
  await waitForFirebase();
  setupEventListeners();
  setupModalListeners();
  await loadSnippets();
  
  console.log('✅ App ready!');
});

// Wait for Firebase to initialize
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.firebase?.auth?.currentUser) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}

// ============================================
// LOAD SNIPPETS FROM DATABASE
// ============================================
async function loadSnippets() {
  try {
    const user = window.firebase?.auth?.currentUser;
    if (!user) {
      console.warn('⚠️ No user logged in');
      return;
    }

    // Call database function
    allSnippets = await getAllSnippets(user.uid);
    
    updateSnippetCount();
    applyFilters();

  } catch (error) {
    console.error('❌ Failed to load snippets:', error);
    showNotification('Failed to load snippets', 'error');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Create button
  document.getElementById('createBtn')?.addEventListener('click', openCreateModal);

  // Form submission
  document.getElementById('snippetForm')?.addEventListener('submit', handleFormSubmit);

  // Search input
  document.getElementById('searchInput')?.addEventListener('input', debounce((e) => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  }, 300));

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });

  // Feedback button
  document.getElementById('feedbackBtn')?.addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('hidden');
  });

  // Feedback form
  document.getElementById('feedbackForm')?.addEventListener('submit', handleFeedbackSubmit);
}

function setupModalListeners() {
  const createModal = document.getElementById('createModal');
  const feedbackModal = document.getElementById('feedbackModal');

  // Close on outside click
  createModal?.addEventListener('click', (e) => {
    if (e.target === createModal) closeCreateModal();
  });

  feedbackModal?.addEventListener('click', (e) => {
    if (e.target === feedbackModal) closeFeedbackModal();
  });
}

// ============================================
// FORM HANDLING
// ============================================
function openCreateModal() {
  editingId = null;
  document.getElementById('snippetForm').reset();
  document.querySelector('#createModal h2').textContent = 'Create New Snippet';
  document.getElementById('createModal').classList.remove('hidden');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('snippetTitle').value.trim();
  const code = document.getElementById('snippetCode').value.trim();
  const language = document.getElementById('snippetLanguage').value;
  const tags = document.getElementById('snippetTags').value;

  // Validate
  if (!title || !code || !language) {
    showNotification('❌ Title, Code, and Language are required', 'error');
    return;
  }

  const user = window.firebase?.auth?.currentUser;
  if (!user) {
    showNotification('❌ You must be logged in', 'error');
    return;
  }

  try {
    const btn = document.querySelector('#snippetForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    if (editingId) {
      // EDIT - Call database function
      await updateSnippet(editingId, {
        title,
        code,
        language,
        tags
      });
      showNotification('✅ Snippet updated!', 'success');
    } else {
      // CREATE - Call database function
      await createSnippet(user.uid, {
        title,
        code,
        language,
        tags
      });
      showNotification('✅ Snippet created!', 'success');
    }

    document.getElementById('snippetForm').reset();
    closeCreateModal();
    await loadSnippets();

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save';

  } catch (error) {
    console.error('Error saving snippet:', error);
    showNotification('❌ Failed to save snippet', 'error');
    const btn = document.querySelector('#snippetForm button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save';
  }
}

function handleFeedbackSubmit(e) {
  e.preventDefault();
  showNotification('✅ Thank you for your feedback!', 'success');
  document.getElementById('feedbackForm').reset();
  closeFeedbackModal();
}

// ============================================
// FILTER & SEARCH
// ============================================
function handleFilterClick(e) {
  e.preventDefault();
  document.querySelectorAll('.filter-btn').forEach(b => 
    b.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100')
  );
  e.target.closest('.filter-btn').classList.add('bg-blue-50', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-100');
  
  const text = e.target.closest('.filter-btn').textContent;
  if (text.includes('All')) currentFilter = 'all';
  else if (text.includes('Favorites')) currentFilter = 'favorites';
  else if (text.includes('Recent')) currentFilter = 'recent';
  
  applyFilters();
}

function applyFilters() {
  // Use database functions for filtering
  let filtered = filterByType(allSnippets, currentFilter);
  filtered = searchSnippets(filtered, currentSearch);
  renderSnippets(filtered);
}

// ============================================
// RENDER SNIPPETS
// ============================================
function renderSnippets(snippets) {
  const grid = document.getElementById('snippetsGrid');
  const empty = document.getElementById('emptyState');

  if (!snippets.length) {
    empty?.classList.remove('hidden');
    grid?.classList.add('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid?.classList.remove('hidden');

  grid.innerHTML = snippets.map(snippet => `
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition cursor-pointer group" data-id="${snippet.id}">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer" onclick="window.viewSnippet('${snippet.id}')">${escapeHtml(snippet.title)}</h3>
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-yellow-400 rounded-full"></span>
              ${snippet.language}
            </span>
            <span>•</span>
            <span>${getTimeAgo(snippet.createdAt)}</span>
          </div>
        </div>
        <button class="opacity-0 group-hover:opacity-100 transition favorite-btn" onclick="window.toggleFavoriteBtnClick('${snippet.id}'); event.stopPropagation();">
          <i class="fas fa-star ${snippet.isFavorite ? 'text-yellow-500' : 'text-slate-300'} hover:text-yellow-500"></i>
        </button>
      </div>
      
      <div class="bg-slate-900 rounded-lg p-3 mb-3 font-mono text-xs text-slate-300 overflow-hidden max-h-24">
        <code>${escapeHtml(snippet.code.slice(0, 150))}${snippet.code.length > 150 ? '...' : ''}</code>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex gap-1 flex-wrap max-w-sm">
          ${snippet.tags?.map(tag => `<span class="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">${tag}</span>`).join('') || ''}
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onclick="window.editSnippetBtn('${snippet.id}'); event.stopPropagation();" title="Edit">
            <i class="fas fa-edit text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="window.copyCodeBtn('${snippet.id}'); event.stopPropagation();" title="Copy">
            <i class="fas fa-copy text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="window.shareSnippetBtn('${snippet.id}'); event.stopPropagation();" title="Share">
            <i class="fas fa-share text-slate-400 hover:text-blue-600"></i>
          </button>
          <button onclick="window.deleteSnippetBtn('${snippet.id}'); event.stopPropagation();" title="Delete">
            <i class="fas fa-trash text-slate-400 hover:text-red-600"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// ACTIONS (Global so HTML can call them)
// ============================================

// View snippet
window.viewSnippet = async function(id) {
  try {
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
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">${snippet.language} • ${getTimeAgo(snippet.createdAt)}</p>
          <pre class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4"><code>${escapeHtml(snippet.code)}</code></pre>
          ${snippet.tags.length > 0 ? `<div class="flex gap-2 flex-wrap">${snippet.tags.map(t => `<span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">${t}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    console.error('Error viewing snippet:', error);
  }
};

// Edit snippet
window.editSnippetBtn = function(id) {
  const snippet = allSnippets.find(s => s.id === id);
  if (!snippet) return;

  editingId = id;
  document.getElementById('snippetTitle').value = snippet.title;
  document.getElementById('snippetCode').value = snippet.code;
  document.getElementById('snippetLanguage').value = snippet.language;
  document.getElementById('snippetTags').value = snippet.tags?.join(', ') || '';

  document.querySelector('#createModal h2').textContent = 'Edit Snippet';
  document.getElementById('createModal').classList.remove('hidden');
};

// Delete snippet
window.deleteSnippetBtn = async function(id) {
  if (!confirm('Delete this snippet?')) return;

  try {
    await deleteSnippet(id);
    showNotification('✅ Snippet deleted!', 'success');
    await loadSnippets();
  } catch (error) {
    console.error('Error deleting:', error);
    showNotification('Failed to delete snippet', 'error');
  }
};

// Toggle favorite
window.toggleFavoriteBtnClick = async function(id) {
  try {
    const snippet = allSnippets.find(s => s.id === id);
    await toggleFavorite(id, snippet.isFavorite);
    await loadSnippets();
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
};

// Copy code
window.copyCodeBtn = async function(id) {
  try {
    const snippet = allSnippets.find(s => s.id === id);
    await navigator.clipboard.writeText(snippet.code);
    showNotification('✅ Code copied!', 'success');
  } catch (error) {
    console.error('Error copying:', error);
    showNotification('Failed to copy code', 'error');
  }
};

// Share snippet
window.shareSnippetBtn = function(id) {
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
          <button onclick="navigator.clipboard.writeText(document.getElementById('shareLink').value); alert('Copied!');" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Copy</button>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="w-full mt-4 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
};

// ============================================
// UTILITIES
// ============================================
function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
  document.getElementById('snippetForm').reset();
  editingId = null;
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('hidden');
  document.getElementById('feedbackForm').reset();
}

function updateSnippetCount() {
  const count = allSnippets.length;
  document.getElementById('snippetCount')? .textContent = count;
  document.getElementById('allCount')?.textContent = count;
}

function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(text) {
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

function showNotification(message, type = 'info') {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'fixed top-6 right-6 z-[999] space-y-3 pointer-events-none';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  notification.className = `${bgColor} text-white rounded-lg px-6 py-4 text-sm font-medium shadow-lg pointer-events-auto transition-all`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

console.log('✅ App.js loaded');