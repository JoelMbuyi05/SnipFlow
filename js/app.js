// ============================================
// SNIPFLOW - DASHBOARD (PRODUCTION VERSION)
// ============================================

console.log('📄 App.js loading...');

let allSnippets = [];
let currentFilter = 'all';
let currentSearch = '';
let currentLanguageFilter = null;
let selectedSnippetIds = new Set();
let dashboardStats = {};

// ============================================
// HELPERS
// ============================================
function getLanguageColor(lang) {
  const colors = {
    JavaScript: 'bg-yellow-400',
    Python: 'bg-blue-500',
    Java: 'bg-red-500',
    CSS: 'bg-blue-400',
    HTML: 'bg-orange-500',
    TypeScript: 'bg-blue-600',
    PHP: 'bg-purple-500',
    Ruby: 'bg-red-600',
    Go: 'bg-cyan-500',
    Rust: 'bg-orange-600',
    'C++': 'bg-pink-500',
    'C#': 'bg-purple-600',
    SQL: 'bg-teal-500',
    Bash: 'bg-slate-600'
  };
  return colors[lang] || 'bg-slate-400';
}

function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
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

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  try {
    await loadSnippets();
    await loadStats();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupAutoRefresh();
    setupExportImport();
    console.log('✅ Dashboard ready');
  } catch (e) {
    console.error(e);
  }
}

// ============================================
// LOAD DATA
// ============================================
function loadSnippets() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getAllSnippets' }, res => {
      allSnippets = res?.snippets || [];
      allSnippets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      renderSnippets(allSnippets);
      resolve();
    });
  });
}

function loadStats() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getStats' }, res => {
      dashboardStats = res?.stats || {};
      resolve();
    });
  });
}

// ============================================
// RENDER
// ============================================
function renderSnippets(snippets) {
  const grid = document.querySelector('.grid');
  const empty = document.querySelector('.empty-state');

  if (!snippets.length) {
    empty?.classList.remove('hidden');
    grid?.classList.add('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = snippets.map(createCard).join('');

  document.querySelectorAll('.snippet-card').forEach(card => {
    card.onclick = e => {
      if (e.target.closest('button,input')) return;
      viewSnippet(+card.dataset.id);
    };

    const cb = card.querySelector('.select-checkbox');
    cb.onchange = () => {
      cb.checked
        ? selectedSnippetIds.add(+card.dataset.id)
        : selectedSnippetIds.delete(+card.dataset.id);
      updateBulkActionBar();
    };
  });
}

function createCard(snippet) {
  return `
  <div class="snippet-card bg-white p-4 rounded-xl border" data-id="${snippet.id}">
    <input type="checkbox" class="select-checkbox absolute top-3 right-3">
    <h3 class="font-bold">${escapeHtml(snippet.title)}</h3>
    <p class="text-xs">${snippet.language} • ${getTimeAgo(snippet.createdAt)}</p>
    <pre class="bg-slate-900 text-white p-2 rounded mt-2 text-xs">
${escapeHtml(snippet.code.slice(0, 80))}${snippet.code.length > 80 ? '...' : ''}
    </pre>
    <div class="flex gap-2 mt-2">
      <button onclick="toggleFavorite(${snippet.id})">⭐</button>
      <button onclick="editSnippet(${snippet.id})">✏️</button>
      <button onclick="copyCode(${snippet.id})">📋</button>
    </div>
  </div>`;
}

// ============================================
// FILTERS
// ============================================
function applyFilters() {
  let list = [...allSnippets];

  if (currentFilter === 'favorites') list = list.filter(s => s.isFavorite);
  if (currentSearch)
    list = list.filter(s =>
      s.title.toLowerCase().includes(currentSearch) ||
      s.code.toLowerCase().includes(currentSearch)
    );

  renderSnippets(list);
}

// ============================================
// UI EVENTS
// ============================================
function setupEventListeners() {
  document.querySelector('input[type="search"]')?.addEventListener(
    'input',
    debounce(e => {
      currentSearch = e.target.value.toLowerCase();
      applyFilters();
    }, 300)
  );
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') showAddModal();
  });
}

// ============================================
// CRUD
// ============================================
function showAddModal(data = null) {
  alert(data ? 'Edit modal placeholder' : 'Add modal placeholder');
}

function editSnippet(id) {
  showAddModal(allSnippets.find(s => s.id === id));
}

function copyCode(id) {
  navigator.clipboard.writeText(allSnippets.find(s => s.id === id).code);
}

function toggleFavorite(id) {
  chrome.runtime.sendMessage({ action: 'toggleFavorite', id }, loadSnippets);
}

function viewSnippet(id) {
  alert(allSnippets.find(s => s.id === id).title);
}

function deleteSnippet(id) {
  chrome.runtime.sendMessage({ action: 'deleteSnippet', id }, loadSnippets);
}

// ============================================
// BULK
// ============================================
function updateBulkActionBar() {
  let bar = document.getElementById('bulk');
  if (!selectedSnippetIds.size) return bar?.remove();

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bulk';
    bar.className = 'fixed bottom-5 left-1/2 bg-black text-white p-4';
    document.body.appendChild(bar);
  }

  bar.innerHTML = `
    ${selectedSnippetIds.size} selected
    <button onclick="deleteBulk()">Delete</button>
    <button onclick="clearSelection()">Clear</button>
  `;
}

function clearSelection() {
  selectedSnippetIds.clear();
  updateBulkActionBar();
}

function deleteBulk() {
  chrome.runtime.sendMessage(
    { action: 'deleteMultiple', ids: [...selectedSnippetIds] },
    () => {
      clearSelection();
      loadSnippets();
    }
  );
}

// ============================================
// EXPORT / IMPORT
// ============================================
function setupExportImport() {
  console.log('📦 Export/Import ready');
}

// ============================================
// AUTO REFRESH
// ============================================
function setupAutoRefresh() {
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'refreshDashboard') loadSnippets();
  });
}
