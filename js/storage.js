// ============================================
// SNIPFLOW - STORAGE LAYER (IndexedDB)
// ============================================
// Handles all database operations for snippets

const DB_NAME = 'snipflow_db';
const DB_VERSION = 1;
const STORE_NAME = 'snippets';

let db = null;

// ============================================
// INITIALIZE DATABASE
// ============================================
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        // Create indexes for faster searching
        objectStore.createIndex('title', 'title', { unique: false });
        objectStore.createIndex('language', 'language', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        
        console.log('✅ Object store created');
      }
    };
  });
}

// ============================================
// CREATE - Add new snippet
// ============================================
async function addSnippet(snippet) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Add timestamp and defaults
    const newSnippet = {
      ...snippet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      isFavorite: false
    };
    
    const request = store.add(newSnippet);
    
    request.onsuccess = () => {
      console.log('✅ Snippet added:', newSnippet.title);
      resolve({ ...newSnippet, id: request.result });
    };
    
    request.onerror = () => {
      console.error('❌ Failed to add snippet');
      reject(request.error);
    };
  });
}

// ============================================
// READ - Get all snippets
// ============================================
async function getAllSnippets() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      console.log('✅ Loaded snippets:', request.result.length);
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('❌ Failed to get snippets');
      reject(request.error);
    };
  });
}

// ============================================
// READ - Get single snippet by ID
// ============================================
async function getSnippet(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================
// UPDATE - Update existing snippet
// ============================================
async function updateSnippet(id, updates) {
  return new Promise(async (resolve, reject) => {
    const snippet = await getSnippet(id);
    
    if (!snippet) {
      reject(new Error('Snippet not found'));
      return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const updatedSnippet = {
      ...snippet,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(updatedSnippet);
    
    request.onsuccess = () => {
      console.log('✅ Snippet updated:', id);
      resolve(updatedSnippet);
    };
    
    request.onerror = () => {
      console.error('❌ Failed to update snippet');
      reject(request.error);
    };
  });
}

// ============================================
// DELETE - Remove snippet
// ============================================
async function deleteSnippet(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      console.log('✅ Snippet deleted:', id);
      resolve(true);
    };
    
    request.onerror = () => {
      console.error('❌ Failed to delete snippet');
      reject(request.error);
    };
  });
}

// ============================================
// SEARCH - Find snippets
// ============================================
async function searchSnippets(searchTerm) {
  const allSnippets = await getAllSnippets();
  const term = searchTerm.toLowerCase();
  
  return allSnippets.filter(snippet => 
    snippet.title.toLowerCase().includes(term) ||
    snippet.code.toLowerCase().includes(term) ||
    (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes(term)))
  );
}

// ============================================
// FILTER - By language
// ============================================
async function filterByLanguage(language) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('language');
    const request = index.getAll(language);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================
// UTILITIES
// ============================================

// Get snippet count
async function getSnippetCount() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get all unique languages
async function getAllLanguages() {
  const snippets = await getAllSnippets();
  const languages = {};
  
  snippets.forEach(snippet => {
    if (snippet.language) {
      languages[snippet.language] = (languages[snippet.language] || 0) + 1;
    }
  });
  
  return languages;
}

// Get all unique tags
async function getAllTags() {
  const snippets = await getAllSnippets();
  const tags = {};
  
  snippets.forEach(snippet => {
    if (snippet.tags && Array.isArray(snippet.tags)) {
      snippet.tags.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    }
  });
  
  return tags;
}

// Increment view count
async function incrementViews(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await updateSnippet(id, { views: (snippet.views || 0) + 1 });
  }
}

// Toggle favorite
async function toggleFavorite(id) {
  const snippet = await getSnippet(id);
  if (snippet) {
    await updateSnippet(id, { isFavorite: !snippet.isFavorite });
  }
}

// Export all snippets as JSON
async function exportSnippets() {
  const snippets = await getAllSnippets();
  const json = JSON.stringify(snippets, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `snoflow-snippets-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Import snippets from JSON
async function importSnippets(jsonString) {
  try {
    const snippets = JSON.parse(jsonString);
    
    for (const snippet of snippets) {
      // Remove ID to create new entries
      delete snippet.id;
      await addSnippet(snippet);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import snippets:', error);
    return false;
  }
}