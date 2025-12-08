// background.js - FIXED VERSION
console.log("✅ SnipFlow background script loaded");

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 SnipFlow installed!");
  
  // Create right-click context menu
  chrome.contextMenus.create({
    id: "snipflow-save",
    title: "💾 Save to SnipFlow",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("❌ Context menu error:", chrome.runtime.lastError);
    } else {
      console.log("✅ Context menu created successfully");
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("🖱️ Context menu clicked", info);
  
  if (info.menuItemId === "snipflow-save") {
    // Get the selected text
    const selectedText = info.selectionText;
    
    if (!selectedText || !selectedText.trim()) {
      console.error("❌ No text selected");
      showNotification("Error", "Please select some code first");
      return;
    }
    
    console.log("📝 Selected text:", selectedText);
    
    // Create snippet object
    const snippet = {
      id: Date.now(), // Unique ID
      code: selectedText.trim(),
      title: generateTitle(selectedText, info.pageUrl),
      url: info.pageUrl,
      pageTitle: tab.title,
      language: detectLanguage(selectedText),
      tags: ['captured'],
      timestamp: new Date().toISOString(),
      dateCreated: new Date().toISOString()
    };
    
    console.log("📦 Created snippet:", snippet);
    
    // Save snippet
    saveSnippet(snippet);
  }
});

// Save snippet to Chrome storage
function saveSnippet(snippet) {
  console.log("💾 Saving snippet...");
  
  // Get existing snippets
  chrome.storage.local.get(['snippets'], (result) => {
    const snippets = result.snippets || [];
    
    console.log("📊 Current snippets count:", snippets.length);
    
    // Add new snippet to the beginning
    snippets.unshift(snippet);
    
    // Keep only last 500 snippets (prevent unlimited growth)
    if (snippets.length > 500) {
      snippets.length = 500;
    }
    
    // Save back to storage
    chrome.storage.local.set({ snippets: snippets }, () => {
      if (chrome.runtime.lastError) {
        console.error("❌ Save error:", chrome.runtime.lastError);
        showNotification("Error", "Failed to save snippet");
      } else {
        console.log("✅ Snippet saved successfully!");
        console.log("📊 Total snippets:", snippets.length);
        
        // Update badge with count
        updateBadge(snippets.length);
        
        // Show success notification
        showNotification(
          "Snippet Saved! ✅",
          `${snippet.title.substring(0, 50)}...`
        );
      }
    });
  });
}

// Update extension badge with snippet count
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Detect programming language from code
function detectLanguage(code) {
  const codeStr = code.toLowerCase();
  
  // JavaScript
  if (codeStr.includes('function') || codeStr.includes('const ') || 
      codeStr.includes('let ') || codeStr.includes('=>') ||
      codeStr.includes('var ')) {
    return 'javascript';
  }
  
  // Python
  if (codeStr.includes('def ') || codeStr.includes('import ') || 
      codeStr.includes('print(') || codeStr.includes('class ')) {
    return 'python';
  }
  
  // Java
  if (codeStr.includes('public class') || codeStr.includes('private ') ||
      codeStr.includes('system.out')) {
    return 'java';
  }
  
  // HTML
  if (codeStr.includes('<html') || codeStr.includes('</div>') || 
      codeStr.includes('<body')) {
    return 'html';
  }
  
  // CSS
  if (codeStr.includes('{') && codeStr.includes('}') && 
      (codeStr.includes('color:') || codeStr.includes('margin:') || 
       codeStr.includes('padding:'))) {
    return 'css';
  }
  
  // SQL
  if (codeStr.includes('select ') || codeStr.includes('insert into') || 
      codeStr.includes('update ') || codeStr.includes('delete from')) {
    return 'sql';
  }
  
  // Default
  return 'plaintext';
}

// Generate smart title for snippet
function generateTitle(code, url) {
  try {
    // Extract domain name
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Get first meaningful line of code
    const firstLine = code.split('\n')[0].trim();
    const preview = firstLine.substring(0, 40);
    
    return `${preview}... from ${domain}`;
  } catch (e) {
    return `Code snippet from ${new Date().toLocaleDateString()}`;
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Message received:", message.type);
  
  if (message.type === "GET_SNIPPETS") {
    chrome.storage.local.get(['snippets'], (result) => {
      const snippets = result.snippets || [];
      console.log("📤 Sending snippets:", snippets.length);
      sendResponse({ snippets: snippets });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === "DELETE_SNIPPET") {
    chrome.storage.local.get(['snippets'], (result) => {
      let snippets = result.snippets || [];
      snippets = snippets.filter(s => s.id !== message.id);
      
      chrome.storage.local.set({ snippets: snippets }, () => {
        console.log("🗑️ Snippet deleted");
        updateBadge(snippets.length);
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (message.type === "COPY_SNIPPET") {
    console.log("📋 Copy request received");
    sendResponse({ success: true });
    return true;
  }
});

// Initialize badge on startup
chrome.storage.local.get(['snippets'], (result) => {
  const snippets = result.snippets || [];
  updateBadge(snippets.length);
  console.log("📊 Loaded", snippets.length, "snippets on startup");
});