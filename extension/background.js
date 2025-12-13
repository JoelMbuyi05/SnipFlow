// ============================================
// SNIPFLOW - BACKGROUND SERVICE WORKER
// ============================================

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

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('Extension DB opened');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        objectStore.createIndex('title', 'title', { unique: false });
        objectStore.createIndex('language', 'language', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// ============================================
// SAVE SNIPPET TO INDEXEDDB
// ============================================
async function saveSnippet(snippet) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(snippet);
    
    request.onsuccess = () => {
      console.log('Snippet saved:', snippet.title);
      resolve({ ...snippet, id: request.result });
    };
    
    request.onerror = () => {
      console.error('Failed to save snippet');
      reject(request.error);
    };
  });
}

// ============================================
// LISTEN FOR MESSAGES
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSnippet') {
    saveSnippet(request.snippet)
      .then(result => sendResponse({ success: true, snippet: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// ============================================
// CREATE CONTEXT MENU (Right-click menu)
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToSnipflow',
    title: 'Save to Snipflow',
    contexts: ['selection']
  });
  
  console.log('Snipflow extension installed!');
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveToSnipflow') {
    // Open popup with selected text
    chrome.action.openPopup();
  }
});

// ============================================
// INITIALIZE
// ============================================
initDB();