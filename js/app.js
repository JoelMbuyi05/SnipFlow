// ============================================
// SNIPFLOW - MAIN APP LOGIC
// ============================================

let allSnippets = [];
let currentFilter = 'all';
let currentSearch = '';

// ============================================
// INITIALIZE APP
// ============================================
async function initApp() {
  console.log('🚀 Initializing Snipflow...');
  
  try {
    // Initialize database
    await initDB();
    
    // Load snippets
    await loadSnippets();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update stats
    await updateStats();
    
    // AUTO-REFRESH: Listen for storage changes (new snippets from extension)
    setupAutoRefresh();
    
    console.log('✅ Snipflow initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    alert('Failed to initialize app. Please refresh the page.');
  }
}

// ============================================
// AUTO-REFRESH DASHBOARD
// ============================================
function setupAutoRefresh() {
  // Create a MutationObserver for IndexedDB changes
  // Since IndexedDB doesn't have native change listeners, we'll poll periodically
  let lastCount = allSnippets.length;
  
  setInterval(async () => {
    const currentSnippets = await getAllSnippets();
    
    if (currentSnippets.length !== lastCount) {
      console.log('🔄 New snippets detected! Refreshing...');
      lastCount = currentSnippets.length;
      await loadSnippets();
      await updateStats();
    }
  }, 2000); // Check every 2 seconds
  
  console.log('👀 Auto-refresh enabled');
}

// ============================================
// LOAD SNIPPETS
// ============================================
async function loadSnippets() {
  try {
    allSnippets = await getAllSnippets();
    console.log(`📦 Loaded ${allSnippets.length} snippets`);
    
    // Sort by most recent first
    allSnippets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    renderSnippets(allSnippets);
  } catch (error) {
    console.error('❌ Failed to load snippets:', error);
  }
}

// ============================================
// RENDER SNIPPETS
// ============================================
function renderSnippets(snippets) {
  const emptyState = document.querySelector('.flex.flex-col.items-center.justify-center.py-20');
  const snippetGrid = document.querySelector('.grid.grid-cols-1');
  
  if (!snippets || snippets.length === 0) {
    // Show empty state
    if (emptyState) emptyState.style.display = 'flex';
    if (snippetGrid) snippetGrid.classList.add('hidden');
    return;
  }
  
  // Hide empty state, show grid
  if (emptyState) emptyState.style.display = 'none';
  if (snippetGrid) {
    snippetGrid.classList.remove('hidden');
    snippetGrid.innerHTML = snippets.map(snippet => createSnippetCard(snippet)).join('');
    
    // Add click listeners
    snippetGrid.querySelectorAll('.snippet-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't open modal if clicking star or copy button
        if (e.target.closest('.star-btn') || e.target.closest('.copy-btn')) return;
        const id = parseInt(card.dataset.id);
        viewSnippet(id);
      });
    });
  }
}

// ============================================
// CREATE SNIPPET CARD HTML
// ============================================
function createSnippetCard(snippet) {
  const languageColor = getLanguageColor(snippet.language);
  const timeAgo = getTimeAgo(snippet.createdAt);
  const codePreview = snippet.code.substring(0, 100);
  
  return `
    <div class="snippet-card bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-300 transition cursor-pointer group" data-id="${snippet.id}">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition">${escapeHtml(snippet.title)}</h3>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 ${languageColor} rounded-full"></span>
              ${snippet.language}
            </span>
            <span>•</span>
            <span>${timeAgo}</span>
          </div>
        </div>
        <button class="star-btn opacity-0 group-hover:opacity-100 transition" onclick="event.stopPropagation(); toggleFavoriteSnippet(${snippet.id})">
          <i class="fas fa-star ${snippet.isFavorite ? 'text-yellow-500' : 'text-slate-300'}"></i>
        </button>
      </div>
      
      <div class="bg-slate-900 rounded-lg p-3 mb-3 font-mono text-xs text-slate-300 overflow-hidden">
        <code>${escapeHtml(codePreview)}${snippet.code.length > 100 ? '...' : ''}</code>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex gap-1 flex-wrap">
          ${snippet.tags ? snippet.tags.slice(0, 3).map(tag => 
            `<span class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">${escapeHtml(tag)}</span>`
          ).join('') : ''}
        </div>
        <button class="copy-btn text-slate-400 hover:text-blue-600 transition" onclick="event.stopPropagation(); copyCode(${snippet.id})">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>
  `;
}

// ============================================
// UPDATE STATS
// ============================================
async function updateStats() {
  const count = await getSnippetCount();
  
  // Update sidebar counter
  const totalCountEl = document.querySelector('.text-3xl.font-bold.text-blue-900');
  if (totalCountEl) totalCountEl.textContent = count;
  
  // Update "All Snippets" badge
  const allCountBadge = document.querySelector('.ml-auto.text-xs.bg-blue-200');
  if (allCountBadge) allCountBadge.textContent = count;
}

// ============================================
// VIEW SNIPPET (Full Detail)
// ============================================
async function viewSnippet(id) {
  const snippet = await getSnippet(id);
  if (!snippet) return;
  
  // Increment view count
  await incrementViews(id);
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'viewModal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-slate-900">${escapeHtml(snippet.title)}</h2>
          <p class="text-sm text-slate-600">${snippet.language} • ${getTimeAgo(snippet.createdAt)} • ${snippet.views || 0} views</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="copySnippetCode(${snippet.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition">
            <i class="fas fa-copy"></i> Copy
          </button>
          <button onclick="deleteSnippetConfirm(${snippet.id})" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition">
            <i class="fas fa-trash"></i> Delete
          </button>
          <button onclick="closeViewModal()" class="w-8 h-8 hover:bg-slate-100 rounded-lg flex items-center justify-center transition">
            <i class="fas fa-times text-slate-400"></i>
          </button>
        </div>
      </div>
      <div class="p-6">
        ${snippet.tags && snippet.tags.length > 0 ? `
          <div class="mb-4 flex gap-2 flex-wrap">
            ${snippet.tags.map(tag => `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="bg-slate-900 rounded-lg p-6 overflow-x-auto">
          <pre class="text-slate-100 font-mono text-sm whitespace-pre-wrap">${escapeHtml(snippet.code)}</pre>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeViewModal();
  });
}

function closeViewModal() {
  const modal = document.getElementById('viewModal');
  if (modal) modal.remove();
  // Refresh is handled by the action that closed it
}

async function copySnippetCode(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await navigator.clipboard.writeText(snippet.code);
    alert('✅ Code copied to clipboard!');
  }
}

// ============================================
// COPY CODE (Quick copy from card)
// ============================================
async function copyCode(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await navigator.clipboard.writeText(snippet.code);
    alert('✅ Code copied!');
  }
}

// ============================================
// TOGGLE FAVORITE
// ============================================
async function toggleFavoriteSnippet(id) {
  await toggleFavorite(id);
  await loadSnippets();
}

// ============================================
// DELETE SNIPPET
// ============================================
async function deleteSnippetConfirm(id) {
  if (confirm('Are you sure you want to delete this snippet?')) {
    try {
      await deleteSnippet(id);
      closeViewModal(); // Close the modal first
      await loadSnippets(); // Reload all snippets
      await updateStats(); // Update counters
      alert('🗑️ Snippet deleted successfully!');
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      alert('❌ Failed to delete snippet');
    }
  }
}

// ============================================
// ADD SNIPPET MODAL
// ============================================
function showAddSnippetModal() {
  const modal = document.createElement('div');
  modal.id = 'addModal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Add New Snippet</h2>
          <p class="text-sm text-slate-600">Save your code for later use</p>
        </div>
        <button onclick="closeAddModal()" class="w-8 h-8 hover:bg-slate-100 rounded-lg flex items-center justify-center transition">
          <i class="fas fa-times text-slate-400"></i>
        </button>
      </div>

      <form id="addSnippetForm" class="p-6">
        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            Title <span class="text-red-500">*</span>
          </label>
          <input type="text" id="snippetTitle" placeholder="e.g., React useState Hook" 
            class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            Language <span class="text-red-500">*</span>
          </label>
          <select id="snippetLanguage" class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            <option value="">Select language...</option>
            <option value="JavaScript">JavaScript</option>
            <option value="Python">Python</option>
            <option value="Java">Java</option>
            <option value="TypeScript">TypeScript</option>
            <option value="HTML">HTML</option>
            <option value="CSS">CSS</option>
            <option value="PHP">PHP</option>
            <option value="Ruby">Ruby</option>
            <option value="Go">Go</option>
            <option value="Rust">Rust</option>
            <option value="C++">C++</option>
            <option value="C#">C#</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            Code <span class="text-red-500">*</span>
          </label>
          <textarea id="snippetCode" rows="10" placeholder="Paste your code here..." 
            class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none" required></textarea>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            Tags <span class="text-slate-400 text-xs">(comma separated)</span>
          </label>
          <input type="text" id="snippetTags" placeholder="e.g., react, hooks, state" 
            class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div class="flex gap-3">
          <button type="button" onclick="closeAddModal()" class="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition">
            <i class="fas fa-save"></i> Save Snippet
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle form submit
  document.getElementById('addSnippetForm').addEventListener('submit', saveNewSnippet);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAddModal();
  });
}

function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.remove();
}

// ============================================
// SAVE NEW SNIPPET
// ============================================
async function saveNewSnippet(e) {
  e.preventDefault();
  
  const title = document.getElementById('snippetTitle').value.trim();
  const code = document.getElementById('snippetCode').value.trim();
  const language = document.getElementById('snippetLanguage').value;
  const tagsInput = document.getElementById('snippetTags').value.trim();
  
  if (!title || !code || !language) {
    alert('Please fill all required fields');
    return;
  }
  
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
  
  try {
    await addSnippet({ title, code, language, tags });
    alert('✅ Snippet saved successfully!');
    closeAddModal();
    await loadSnippets();
    await updateStats();
  } catch (error) {
    console.error('Failed to save snippet:', error);
    alert('❌ Failed to save snippet');
  }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Add snippet buttons
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Add Snippet')) {
      btn.addEventListener('click', showAddSnippetModal);
    }
  });
  
  // Search input
  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
  
  // Filter buttons in sidebar
  const allLinks = document.querySelectorAll('aside a');
  allLinks.forEach(link => {
    if (link.textContent.includes('All Snippets')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter = 'all';
        applyFilters();
      });
    }
    if (link.textContent.includes('Favorites')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter = 'favorites';
        applyFilters();
      });
    }
    if (link.textContent.includes('Recent')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter = 'recent';
        applyFilters();
      });
    }
  });
}

// ============================================
// SEARCH & FILTER
// ============================================
async function handleSearch(searchTerm) {
  currentSearch = searchTerm.toLowerCase();
  await applyFilters();
}

async function applyFilters() {
  let filtered = [...allSnippets];
  
  // Apply filter type
  if (currentFilter === 'favorites') {
    filtered = filtered.filter(s => s.isFavorite);
  } else if (currentFilter === 'recent') {
    // Show last 10 snippets
    filtered = filtered.slice(0, 10);
  }
  
  // Apply search
  if (currentSearch) {
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(currentSearch) ||
      s.code.toLowerCase().includes(currentSearch) ||
      (s.tags && s.tags.some(tag => tag.toLowerCase().includes(currentSearch)))
    );
  }
  
  renderSnippets(filtered);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getLanguageColor(language) {
  const colors = {
    'JavaScript': 'bg-yellow-400',
    'Python': 'bg-blue-500',
    'Java': 'bg-red-500',
    'CSS': 'bg-blue-400',
    'HTML': 'bg-orange-500',
    'TypeScript': 'bg-blue-600',
    'PHP': 'bg-purple-500',
    'Ruby': 'bg-red-600',
    'Go': 'bg-cyan-500',
    'Rust': 'bg-orange-600',
    'C++': 'bg-pink-500',
    'C#': 'bg-purple-600',
  };
  return colors[language] || 'bg-slate-400';
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', initApp);