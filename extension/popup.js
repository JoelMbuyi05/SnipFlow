// ============================================
// SNIPFLOW - POPUP SCRIPT (ENHANCED)
// ============================================
// Better language detection, duplicate warnings, quick stats

console.log('📄 Popup script loading...');

const form = document.getElementById('snippetForm');
const titleInput = document.getElementById('title');
const languageSelect = document.getElementById('language');
const codeTextarea = document.getElementById('code');
const tagsInput = document.getElementById('tags');
const statusMessage = document.getElementById('statusMessage');

console.log('✅ DOM elements loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Popup DOMContentLoaded fired');
  
  loadCapturedCode();
  setupQuickActions();
});

// ============================================
// LOAD CAPTURED CODE
// ============================================
function loadCapturedCode() {
  console.log('🔍 Loading captured code from storage...');
  
  chrome.storage.local.get(['lastCapturedCode'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Storage error:', chrome.runtime.lastError);
      showStatus('⚠️ Storage error. Please refresh the extension.', 'error');
      return;
    }
    
    if (result && result.lastCapturedCode) {
      console.log('✅ Found captured code');
      fillForm(result.lastCapturedCode);
    } else {
      console.log('❌ No captured code');
      showStatus('💡 Right-click on code or paste manually', 'info');
    }
  });
}

// ============================================
// FILL FORM WITH CAPTURED DATA
// ============================================
function fillForm(data) {
  if (!data) return;
  
  console.log('📝 Filling form with data');
  
  try {
    if (data.title) {
      titleInput.value = data.title;
      console.log('✅ Title filled');
    }
    
    if (data.language) {
      const langValue = data.language;
      const options = Array.from(languageSelect.options).map(o => o.value);
      
      if (options.includes(langValue)) {
        languageSelect.value = langValue;
      } else {
        const matchedLang = options.find(o => 
          o.toLowerCase() === langValue.toLowerCase() ||
          o.includes(langValue)
        );
        if (matchedLang) {
          languageSelect.value = matchedLang;
        }
      }
    }
    
    if (data.code) {
      codeTextarea.value = data.code;
      codeTextarea.focus();
    }
    
    if (data.tags) {
      tagsInput.value = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags;
    }
    
    showStatus('✨ Code auto-filled!', 'success');
    
    // Check for duplicates
    checkDuplicateCode(data.code);
  } catch (error) {
    console.error('❌ Error filling form:', error);
    showStatus('⚠️ Error filling form', 'error');
  }
}

// ============================================
// CHECK FOR DUPLICATES
// ============================================
function checkDuplicateCode(code) {
  chrome.runtime.sendMessage(
    { action: 'checkDuplicate', code },
    (response) => {
      if (response && response.isDuplicate && response.existing) {
        showStatus(`⚠️ Similar snippet exists: "${response.existing.title}"`, 'warning');
      }
    }
  );
}

// ============================================
// SETUP QUICK ACTIONS
// ============================================
function setupQuickActions() {
  const openDashboardBtn = document.getElementById('openDashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const appUrl = chrome.runtime.getURL('extension/app.html');
      chrome.tabs.create({ url: appUrl });
      window.close();
    });
  }
}

// ============================================
// SAVE SNIPPET
// ============================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('📤 Form submitted');
  
  const title = titleInput.value.trim();
  const language = languageSelect.value;
  const code = codeTextarea.value.trim();
  const tagsString = tagsInput.value.trim();
  
  if (!title || !language || !code) {
    showStatus('❌ Fill all required fields', 'error');
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
  
  console.log('💾 Saving snippet...');
  showStatus('⏳ Saving...', 'info');
  
  try {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    chrome.runtime.sendMessage(
      { action: 'saveSnippet', snippet },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Runtime error:', chrome.runtime.lastError);
          showStatus('❌ Error: Background worker not responding', 'error');
          submitBtn.innerHTML = originalHTML;
          submitBtn.disabled = false;
          return;
        }
        
        if (response && response.success) {
          console.log('✅ Saved!');
          showStatus('✅ Saved to dashboard!', 'success');
          submitBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
          
          // Clear storage
          chrome.storage.local.remove(['lastCapturedCode'], () => {
            console.log('🧹 Cleared captured code');
          });
          
          // Notify dashboard
          chrome.runtime.sendMessage({ action: 'refreshDashboard' }, () => {});
          
          setTimeout(() => {
            form.reset();
            window.close();
          }, 1000);
        } else {
          console.error('❌ Save failed:', response?.error);
          showStatus('❌ Failed: ' + (response?.error || 'Unknown error'), 'error');
          submitBtn.innerHTML = originalHTML;
          submitBtn.disabled = false;
        }
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    showStatus('❌ Error: ' + error.message, 'error');
  }
});

// ============================================
// STATUS MESSAGE
// ============================================
function showStatus(message, type) {
  console.log(`📢 Status [${type}]:`, message);
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 4000);
  }
}

console.log('✅ Popup script loaded');