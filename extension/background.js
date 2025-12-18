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
      console.log('✅ Extension DB opened');
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
        console.log('✅ Object store created');
      }
    };
  });
}

// ============================================
// SAVE SNIPPET TO INDEXEDDB
// ============================================
async function saveSnippet(snippet) {
  if (!db) {
    console.log('⏳ DB not ready, initializing...');
    await initDB();
  }
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Make sure snippet has all required fields
      const completeSnippet = {
        ...snippet,
        createdAt: snippet.createdAt || new Date().toISOString(),
        updatedAt: snippet.updatedAt || new Date().toISOString(),
        views: snippet.views || 0,
        isFavorite: snippet.isFavorite || false
      };
      
      const request = store.add(completeSnippet);
      
      request.onsuccess = () => {
        const savedSnippet = { ...completeSnippet, id: request.result };
        console.log('✅ Snippet saved to IndexedDB:', savedSnippet.title, 'ID:', request.result);
        resolve(savedSnippet);
      };
      
      request.onerror = () => {
        console.error('❌ Failed to save snippet:', request.error);
        reject(request.error);
      };
    } catch (error) {
      console.error('❌ Save error:', error);
      reject(error);
    }
  });
}

// ============================================
// CREATE CONTEXT MENU (Right-click menu)
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToSnipflow',
    title: 'Save to Snipflow',
    contexts: ['page', 'selection']
  });
  
  console.log('🚀 Snipflow extension installed!');
  initDB();
});

// ============================================
// HANDLE CONTEXT MENU CLICK
// ============================================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToSnipflow') {
    console.log('📌 Context menu clicked');
    
    // Tell content script to capture (if not already done)
    chrome.tabs.sendMessage(tab.id, { action: 'captureFromContext' }, () => {
      // Ignore errors if content script not ready
      if (chrome.runtime.lastError) {
        console.log('Content script not ready');
      }
    });
    
    // Wait a bit then open popup
    setTimeout(() => {
      chrome.action.openPopup();
    }, 200);
  }
});

// ============================================
// LISTEN FOR MESSAGES
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  if (request.action === 'saveSnippet') {
    saveSnippet(request.snippet)
      .then(result => {
        console.log('✅ Snippet saved:', result);
        sendResponse({ success: true, snippet: result });
      })
      .catch(error => {
        console.error('❌ Save failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

// ============================================
// INITIALIZE
// ============================================
initDB();