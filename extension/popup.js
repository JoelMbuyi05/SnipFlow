// ============================================
// SNIPFLOW - POPUP SCRIPT
// ============================================

const form = document.getElementById('snippetForm');
const titleInput = document.getElementById('title');
const languageSelect = document.getElementById('language');
const codeTextarea = document.getElementById('code');
const tagsInput = document.getElementById('tags');
const captureBtn = document.getElementById('captureBtn');
const statusMessage = document.getElementById('statusMessage');

// ============================================
// INITIALIZE - Check for captured code
// ============================================
async function init() {
  // Check if content script captured code
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'getSelectedCode' }, (response) => {
    if (response && response.code) {
      // Auto-fill form with captured code
      titleInput.value = response.code.title || '';
      languageSelect.value = response.code.language || '';
      codeTextarea.value = response.code.code || '';
      
      showStatus('Code auto-captured! Edit and save.', 'info');
    }
  });
}

// ============================================
// CAPTURE CODE FROM PAGE
// ============================================
captureBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'captureVisibleCode' }, (response) => {
    if (response && response.success) {
      showStatus('Code captured! Check the form.', 'success');
      init(); // Reload form with captured code
    } else {
      showStatus('No code found on this page.', 'error');
    }
  });
});

// ============================================
// SAVE SNIPPET
// ============================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = titleInput.value.trim();
  const language = languageSelect.value;
  const code = codeTextarea.value.trim();
  const tagsString = tagsInput.value.trim();
  
  if (!title || !language || !code) {
    showStatus('Please fill all required fields!', 'error');
    return;
  }
  
  const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
  
  const snippet = {
    title,
    language,
    code,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    isFavorite: false,
    sourceUrl: await getCurrentTabUrl()
  };
  
  try {
    // Save to IndexedDB via background script
    await chrome.runtime.sendMessage({
      action: 'saveSnippet',
      snippet: snippet
    });
    
    showStatus('✅ Snippet saved successfully!', 'success');
    
    // Clear form after 1.5 seconds
    setTimeout(() => {
      form.reset();
      window.close(); // Close popup
    }, 1500);
    
  } catch (error) {
    console.error('Failed to save snippet:', error);
    showStatus('Failed to save snippet', 'error');
  }
});

// ============================================
// SHOW STATUS MESSAGE
// ============================================
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 3000);
  }
}

// ============================================
// GET CURRENT TAB URL
// ============================================
async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.url;
}

// ============================================
// INITIALIZE ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', init);