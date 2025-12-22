// ============================================
// SNIPFLOW - UNIFIED STORAGE LAYER
// ============================================
// Single source of truth for all data operations
// Works offline with IndexedDB, fallback to chrome.storage

const DB_NAME = 'snipflow_db';
const DB_VERSION = 2;
const STORE_NAMES = {
  snippets: 'snippets',
  collections: 'collections',
  stats: 'stats'
};

let db = null;
let useIndexedDB = true;

// ============================================
// INITIALIZE DATABASE
// ============================================
async function initStorage() {
  return new Promise((resolve, reject) => {
    // Check IndexedDB support
    const indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
    
    if (!indexedDB) {
      console.warn('⚠️ IndexedDB not available, using chrome.storage fallback');
      useIndexedDB = false;
      resolve(true);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Failed to open database');
      useIndexedDB = false;
      resolve(true); // Continue with fallback
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB opened successfully');
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Snippets store
      if (!db.objectStoreNames.contains(STORE_NAMES.snippets)) {
        const snippets = db.createObjectStore(STORE_NAMES.snippets, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        snippets.createIndex('title', 'title', { unique: false });
        snippets.createIndex('language', 'language', { unique: false });
        snippets.createIndex('createdAt', 'createdAt', { unique: false });
        snippets.createIndex('isFavorite', 'isFavorite', { unique: false });
        snippets.createIndex('collectionId', 'collectionId', { unique: false });
        snippets.createIndex('codeHash', 'codeHash', { unique: true }); // For duplicate detection
        console.log('✅ Snippets store created');
      }
      
      // Collections store (for future organization)
      if (!db.objectStoreNames.contains(STORE_NAMES.collections)) {
        const collections = db.createObjectStore(STORE_NAMES.collections, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        collections.createIndex('name', 'name', { unique: false });
        collections.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('✅ Collections store created');
      }
      
      // Stats store (for analytics)
      if (!db.objectStoreNames.contains(STORE_NAMES.stats)) {
        db.createObjectStore(STORE_NAMES.stats, { keyPath: 'id' });
        console.log('✅ Stats store created');
      }
    };
  });
}

// ============================================
// UTILITY: GENERATE CODE HASH (DUPLICATE DETECTION)
// ============================================
function generateCodeHash(code) {
  // Simple hash for detecting duplicates
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// ============================================
// CHECK FOR DUPLICATES
// ============================================
async function checkDuplicate(code, excludeId = null) {
  if (!useIndexedDB || !db) return false;
  
  return new Promise((resolve) => {
    const codeHash = generateCodeHash(code);
    const transaction = db.transaction([STORE_NAMES.snippets], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.snippets);
    const index = store.index('codeHash');
    const request = index.get(codeHash);
    
    request.onsuccess = () => {
      const existing = request.result;
      if (existing && existing.id !== excludeId) {
        console.warn('⚠️ Duplicate code detected:', existing.title);
        resolve(existing);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => resolve(null);
  });
}

// ============================================
// CREATE - ADD SNIPPET
// ============================================
async function addSnippet(snippet) {
  // Check for duplicates
  const duplicate = await checkDuplicate(snippet.code);
  if (duplicate) {
    throw new Error(`Duplicate detected! You already saved: "${duplicate.title}"`);
  }

  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.snippets], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.snippets);
      
      const newSnippet = {
        ...snippet,
        codeHash: generateCodeHash(snippet.code),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        isFavorite: false,
        collectionId: snippet.collectionId || null,
        source: snippet.source || 'manual'
      };
      
      const request = store.add(newSnippet);
      
      request.onsuccess = () => {
        console.log('✅ Snippet added to IndexedDB:', newSnippet.title);
        resolve({ ...newSnippet, id: request.result });
      };
      
      request.onerror = () => reject(request.error);
    });
  } else {
    // Fallback: chrome.storage
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('snippets_backup', (result) => {
        let snippets = result.snippets_backup || [];
        const id = Math.max(...snippets.map(s => s.id || 0), 0) + 1;
        
        const newSnippet = {
          id,
          ...snippet,
          codeHash: generateCodeHash(snippet.code),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          views: 0,
          isFavorite: false,
          source: 'manual'
        };
        
        snippets.push(newSnippet);
        chrome.storage.local.set({ snippets_backup: snippets }, () => {
          console.log('✅ Snippet added to chrome.storage');
          resolve(newSnippet);
        });
      });
    });
  }
}

// ============================================
// READ - GET ALL SNIPPETS
// ============================================
async function getAllSnippets() {
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.snippets], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.snippets);
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('✅ Loaded', request.result.length, 'snippets from IndexedDB');
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  } else {
    // Fallback
    return new Promise((resolve) => {
      chrome.storage.local.get('snippets_backup', (result) => {
        const snippets = result.snippets_backup || [];
        console.log('✅ Loaded', snippets.length, 'snippets from chrome.storage');
        resolve(snippets);
      });
    });
  }
}

// ============================================
// READ - GET SINGLE SNIPPET
// ============================================
async function getSnippet(id) {
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.snippets], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.snippets);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } else {
    return new Promise((resolve) => {
      chrome.storage.local.get('snippets_backup', (result) => {
        const snippets = result.snippets_backup || [];
        resolve(snippets.find(s => s.id === id));
      });
    });
  }
}

// ============================================
// UPDATE - EDIT SNIPPET
// ============================================
async function updateSnippet(id, updates) {
  const snippet = await getSnippet(id);
  if (!snippet) throw new Error('Snippet not found');

  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.snippets], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.snippets);
      
      const updatedSnippet = {
        ...snippet,
        ...updates,
        codeHash: updates.code ? generateCodeHash(updates.code) : snippet.codeHash,
        updatedAt: new Date().toISOString()
      };
      
      const request = store.put(updatedSnippet);
      
      request.onsuccess = () => {
        console.log('✅ Snippet updated:', id);
        resolve(updatedSnippet);
      };
      
      request.onerror = () => reject(request.error);
    });
  } else {
    return new Promise((resolve) => {
      chrome.storage.local.get('snippets_backup', (result) => {
        let snippets = result.snippets_backup || [];
        const idx = snippets.findIndex(s => s.id === id);
        if (idx !== -1) {
          snippets[idx] = {
            ...snippets[idx],
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        chrome.storage.local.set({ snippets_backup: snippets }, () => {
          resolve(snippets[idx]);
        });
      });
    });
  }
}

// ============================================
// DELETE - REMOVE SNIPPET
// ============================================
async function deleteSnippet(id) {
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.snippets], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.snippets);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('✅ Snippet deleted:', id);
        resolve(true);
      };
      
      request.onerror = () => reject(request.error);
    });
  } else {
    return new Promise((resolve) => {
      chrome.storage.local.get('snippets_backup', (result) => {
        let snippets = result.snippets_backup || [];
        snippets = snippets.filter(s => s.id !== id);
        chrome.storage.local.set({ snippets_backup: snippets }, () => {
          resolve(true);
        });
      });
    });
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================
async function deleteMultiple(ids) {
  const promises = ids.map(id => deleteSnippet(id));
  await Promise.all(promises);
  console.log('✅ Deleted', ids.length, 'snippets');
}

async function updateMultiple(updates) {
  // updates = { id1: {...}, id2: {...} }
  const promises = Object.entries(updates).map(([id, data]) => 
    updateSnippet(parseInt(id), data)
  );
  await Promise.all(promises);
  console.log('✅ Updated', Object.keys(updates).length, 'snippets');
}

// ============================================
// SEARCH & FILTER
// ============================================
async function searchSnippets(query) {
  const snippets = await getAllSnippets();
  const q = query.toLowerCase();
  
  return snippets.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.code.toLowerCase().includes(q) ||
    (s.tags && s.tags.some(tag => tag.toLowerCase().includes(q)))
  );
}

async function filterByLanguage(language) {
  const snippets = await getAllSnippets();
  return snippets.filter(s => s.language === language);
}

async function filterByCollection(collectionId) {
  const snippets = await getAllSnippets();
  return snippets.filter(s => s.collectionId === collectionId);
}

async function getFavorites() {
  const snippets = await getAllSnippets();
  return snippets.filter(s => s.isFavorite).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

async function getRecent(limit = 10) {
  const snippets = await getAllSnippets();
  return snippets
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

// ============================================
// UTILITIES
// ============================================
async function getSnippetCount() {
  const snippets = await getAllSnippets();
  return snippets.length;
}

async function getLanguageStats() {
  const snippets = await getAllSnippets();
  const stats = {};
  
  snippets.forEach(s => {
    stats[s.language] = (stats[s.language] || 0) + 1;
  });
  
  return Object.entries(stats)
    .map(([lang, count]) => ({ language: lang, count }))
    .sort((a, b) => b.count - a.count);
}

async function getMostUsed(limit = 5) {
  const snippets = await getAllSnippets();
  return snippets
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);
}

async function incrementViews(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await updateSnippet(id, { views: (snippet.views || 0) + 1 });
  }
}

async function toggleFavorite(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await updateSnippet(id, { isFavorite: !snippet.isFavorite });
  }
}

// ============================================
// EXPORT & IMPORT
// ============================================
async function exportSnippets() {
  const snippets = await getAllSnippets();
  const json = JSON.stringify(snippets, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `snipflow-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  console.log('✅ Exported', snippets.length, 'snippets');
}

async function importSnippets(jsonString) {
  try {
    const snippets = JSON.parse(jsonString);
    let imported = 0;
    
    for (const snippet of snippets) {
      delete snippet.id; // Remove ID to create new entries
      try {
        await addSnippet(snippet);
        imported++;
      } catch (error) {
        console.warn('⚠️ Skipped duplicate:', snippet.title);
      }
    }
    
    console.log('✅ Imported', imported, 'snippets');
    return imported;
  } catch (error) {
    console.error('❌ Failed to import:', error);
    throw error;
  }
}

// ============================================
// COLLECTIONS (FUTURE FEATURE)
// ============================================
async function createCollection(name, description = '') {
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.collections], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.collections);
      
      const collection = {
        name,
        description,
        createdAt: new Date().toISOString(),
        snippetCount: 0
      };
      
      const request = store.add(collection);
      request.onsuccess = () => {
        console.log('✅ Collection created:', name);
        resolve({ ...collection, id: request.result });
      };
      request.onerror = () => reject(request.error);
    });
  }
}

async function getAllCollections() {
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAMES.collections], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.collections);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return [];
}

// ============================================
// INIT
// ============================================
console.log('📦 Storage layer loaded');