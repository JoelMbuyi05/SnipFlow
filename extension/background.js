// ============================================
// SNIPFLOW - BACKGROUND SERVICE WORKER (ENHANCED)
// ============================================

console.log('🔧 Background worker starting...');

let initialized = false;

// ============================================
// INITIALIZE
// ============================================
async function init() {
  if (initialized) return;
  
  try {
    await initStorage();
    initialized = true;
    console.log('✅ Background worker ready');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
}

// ============================================
// LISTEN FOR MESSAGES
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received:', request.action);
  
  init().then(() => {
    try {
      // SAVE SNIPPET
      if (request.action === 'saveSnippet') {
        addSnippet(request.snippet)
          .then(result => {
            console.log('✅ Saved:', result.title);
            sendResponse({ success: true, snippet: result });
          })
          .catch(error => {
            console.error('❌ Save error:', error.message);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // GET ALL SNIPPETS
      if (request.action === 'getAllSnippets') {
        getAllSnippets()
          .then(snippets => {
            console.log('✅ Retrieved', snippets.length, 'snippets');
            sendResponse({ success: true, snippets: snippets });
          })
          .catch(error => {
            console.error('❌ Get error:', error);
            sendResponse({ success: true, snippets: [] });
          });
        return true;
      }
      
      // GET SINGLE SNIPPET
      if (request.action === 'getSnippet') {
        getSnippet(request.id)
          .then(snippet => {
            sendResponse({ success: true, snippet });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // UPDATE SNIPPET
      if (request.action === 'updateSnippet') {
        updateSnippet(request.id, request.updates)
          .then(snippet => {
            console.log('✅ Updated:', request.id);
            sendResponse({ success: true, snippet });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // DELETE SNIPPET
      if (request.action === 'deleteSnippet') {
        deleteSnippet(request.id)
          .then(() => {
            console.log('✅ Deleted:', request.id);
            sendResponse({ success: true });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // TOGGLE FAVORITE
      if (request.action === 'toggleFavorite') {
        toggleFavorite(request.id)
          .then(() => {
            console.log('✅ Favorite toggled:', request.id);
            sendResponse({ success: true });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // INCREMENT VIEWS
      if (request.action === 'incrementViews') {
        incrementViews(request.id)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(error => {
            sendResponse({ success: false });
          });
        return true;
      }
      
      // SEARCH
      if (request.action === 'search') {
        searchSnippets(request.query)
          .then(results => {
            sendResponse({ success: true, snippets: results });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // GET FAVORITES
      if (request.action === 'getFavorites') {
        getFavorites()
          .then(snippets => {
            sendResponse({ success: true, snippets });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // GET RECENT
      if (request.action === 'getRecent') {
        getRecent(request.limit || 10)
          .then(snippets => {
            sendResponse({ success: true, snippets });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // GET MOST USED
      if (request.action === 'getMostUsed') {
        getMostUsed(request.limit || 5)
          .then(snippets => {
            sendResponse({ success: true, snippets });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // GET STATS
      if (request.action === 'getStats') {
        Promise.all([
          getSnippetCount(),
          getLanguageStats(),
          getMostUsed(3)
        ])
          .then(([count, languages, mostUsed]) => {
            sendResponse({ 
              success: true, 
              stats: { count, languages, mostUsed }
            });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // EXPORT
      if (request.action === 'exportSnippets') {
        getAllSnippets()
          .then(snippets => {
            const json = JSON.stringify(snippets, null, 2);
            sendResponse({ 
              success: true, 
              data: json,
              filename: `snipflow-backup-${new Date().toISOString().split('T')[0]}.json`
            });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // IMPORT
      if (request.action === 'importSnippets') {
        importSnippets(request.data)
          .then(count => {
            console.log('✅ Imported', count, 'snippets');
            sendResponse({ success: true, imported: count });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // DUPLICATE CHECK
      if (request.action === 'checkDuplicate') {
        checkDuplicate(request.code, request.excludeId)
          .then(existing => {
            sendResponse({ 
              success: true, 
              isDuplicate: !!existing,
              existing 
            });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      // DELETE MULTIPLE
      if (request.action === 'deleteMultiple') {
        deleteMultiple(request.ids)
          .then(() => {
            console.log('✅ Deleted', request.ids.length, 'snippets');
            sendResponse({ success: true });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
    } catch (error) {
      console.error('❌ Handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  });
  
  return true; // Keep channel open
});

// ============================================
// CREATE CONTEXT MENU
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Extension installed/updated');
  
  chrome.contextMenus.create({
    id: 'saveToSnipflow',
    title: 'Save to Snipflow',
    contexts: ['page', 'selection']
  });
  
  chrome.contextMenus.create({
    id: 'openDashboard',
    title: 'Open Snipflow Dashboard',
    contexts: ['page']
  });
});

// ============================================
// HANDLE CONTEXT MENU CLICK
// ============================================
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveToSnipflow') {
    console.log('📌 Save context menu clicked');
    
    chrome.tabs.sendMessage(tab.id, { action: 'captureFromContext' }, () => {
      if (chrome.runtime.lastError) {
        console.log('Content script not ready');
      }
    });
    
    setTimeout(() => {
      try {
        chrome.action.openPopup();
      } catch (error) {
        console.log('Popup already open or not available');
      }
    }, 100);
  }
  
  if (info.menuItemId === 'openDashboard') {
    const appUrl = chrome.runtime.getURL('extension/app.html');
    chrome.tabs.create({ url: appUrl });
  }
});

console.log('✅ Background worker loaded');