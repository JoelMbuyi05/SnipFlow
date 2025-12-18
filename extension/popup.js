// ============================================
// SNIPFLOW - POPUP SCRIPT
// ============================================

const form = document.getElementById('snippetForm');
const titleInput = document.getElementById('title');
const languageSelect = document.getElementById('language');
const codeTextarea = document.getElementById('code');
const tagsInput = document.getElementById('tags');
const statusMessage = document.getElementById('statusMessage');

// ============================================
// INITIALIZE ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Popup opened');
  loadCapturedCode();
  
  // Setup open dashboard link (if exists)
  const openDashboardBtn = document.getElementById('openDashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
    });
  }
  
  // Listen for storage changes (real-time updates)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastCapturedCode) {
      console.log('📦 Storage changed, filling form');
      fillForm(changes.lastCapturedCode.newValue);
    }
  });
});

// ============================================
// LOAD FROM STORAGE
// ============================================
function loadCapturedCode() {
  chrome.storage.local.get(['lastCapturedCode'], (result) => {
    if (result.lastCapturedCode) {
      console.log('✅ Found captured code:', result.lastCapturedCode);
      fillForm(result.lastCapturedCode);
    } else {
      console.log('❌ No captured code');
      showStatus('💡 Right-click on code to capture', 'info');
    }
  });
}

// ============================================
// FILL FORM
// ============================================
function fillForm(data) {
  if (!data) return;
  
  titleInput.value = data.title || '';
  languageSelect.value = data.language || 'JavaScript';
  codeTextarea.value = data.code || '';
  
  showStatus('✨ Code auto-filled!', 'success');
  
  // Clear storage after loading
  chrome.storage.local.remove(['lastCapturedCode']);
}

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
    showStatus('❌ Please fill all required fields', 'error');
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
    isFavorite: false
  };
  
  console.log('💾 Saving snippet:', snippet);
  
  try {
    // Save via background script
    chrome.runtime.sendMessage(
      { action: 'saveSnippet', snippet: snippet },
      (response) => {
        console.log('📨 Save response:', response);
        
        if (response && response.success) {
          showStatus('✅ Snippet saved!', 'success');
          setTimeout(() => {
            form.reset();
            window.close();
          }, 1000);
        } else {
          console.error('❌ Save failed:', response);
          showStatus('❌ Failed to save', 'error');
        }
      }
    );
  } catch (error) {
    console.error('Save error:', error);
    showStatus('❌ Failed to save snippet', 'error');
  }
});

// ============================================
// STATUS MESSAGE
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