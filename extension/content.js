// ============================================
// SNIPFLOW - CONTENT SCRIPT
// ============================================
// Detects and captures code snippets from web pages

let lastSelectedCode = null;
let rightClickedElement = null;

// ============================================
// TRACK RIGHT-CLICK ON CODE
// ============================================
document.addEventListener('contextmenu', (e) => {
  const target = e.target;
  
  // Check if clicked on code element
  const codeElement = target.closest('pre, code, [class*="code"], [class*="highlight"]');
  
  if (codeElement) {
    rightClickedElement = codeElement;
    console.log('🎯 Code element right-clicked');
    // Immediately capture on right-click
    captureCode(codeElement);
  }
}, true);

// ============================================
// DETECT CODE BLOCKS ON PAGE
// ============================================
function detectCodeBlocks() {
  // Common code block selectors
  const codeSelectors = [
    'pre code',
    'pre',
    '.highlight code',
    '.code-block',
    '[class*="language-"]',
    '[class*="code"]'
  ];
  
  const codeBlocks = [];
  
  codeSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(block => {
      if (block.textContent.trim().length > 10) {
        codeBlocks.push(block);
      }
    });
  });
  
  return codeBlocks;
}

// ============================================
// CAPTURE CODE FROM ELEMENT
// ============================================
function captureCode(element) {
  const code = element.textContent.trim();
  const language = detectLanguage(element);
  const title = generateTitle(element);
  const sourceUrl = window.location.href;
  
  const capturedData = {
    code,
    language,
    title,
    sourceUrl,
    timestamp: new Date().toISOString()
  };
  
  // Save to Chrome storage (accessible by popup)
  try {
    chrome.storage.local.set({ lastCapturedCode: capturedData }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
        showToast('⚠️ Extension reloaded. Please refresh this page!');
        return;
      }
      
      console.log('✅ Code saved to storage:', {
        title,
        language,
        codeLength: code.length
      });
      
      lastSelectedCode = capturedData;
      
      // Show toast notification
      showToast('✓ Code captured! Right-click → Save to Snipflow');
    });
  } catch (error) {
    console.error('❌ Capture error:', error);
    showToast('⚠️ Extension reloaded. Please refresh this page!');
  }
}

// ============================================
// DETECT PROGRAMMING LANGUAGE
// ============================================
function detectLanguage(element) {
  // Check class names for language hints
  const classes = (element.className || '').toLowerCase();
  const parentClasses = (element.parentElement?.className || '').toLowerCase();
  const allClasses = classes + ' ' + parentClasses;
  
  console.log('🔍 Detecting language from classes:', allClasses);
  
  const languageMap = {
    'typescript': 'TypeScript',
    'ts': 'TypeScript',
    'javascript': 'JavaScript',
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'python': 'Python',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c++': 'C++',
    'csharp': 'C#',
    'cs': 'C#',
    'php': 'PHP',
    'ruby': 'Ruby',
    'rb': 'Ruby',
    'go': 'Go',
    'golang': 'Go',
    'rust': 'Rust',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'CSS',
    'sql': 'SQL',
    'bash': 'Bash',
    'shell': 'Bash',
    'sh': 'Bash',
    'json': 'JavaScript',
    'xml': 'HTML'
  };
  
  // Check class names (TypeScript should be checked BEFORE JavaScript)
  for (const [key, value] of Object.entries(languageMap)) {
    if (allClasses.includes(key) || allClasses.includes('language-' + key) || allClasses.includes('lang-' + key)) {
      console.log('✅ Language detected:', value);
      return value;
    }
  }
  
  // Detect by content patterns
  const code = element.textContent.toLowerCase();
  
  if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) return 'TypeScript';
  if (code.includes('def ') && code.includes(':')) return 'Python';
  if (code.includes('public class')) return 'Java';
  if (code.includes('<div') || code.includes('<html')) return 'HTML';
  if (code.includes('{') && (code.includes('color:') || code.includes('display:'))) return 'CSS';
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'JavaScript';
  
  console.log('⚠️ No language detected, defaulting to JavaScript');
  return 'JavaScript'; // Default
}

// ============================================
// GENERATE SMART TITLE
// ============================================
function generateTitle(element) {
  // Get site name from URL
  const url = new URL(window.location.href);
  const hostname = url.hostname;
  
  let siteName = '';
  if (hostname.includes('stackoverflow.com')) siteName = 'Stack Overflow';
  else if (hostname.includes('github.com')) siteName = 'GitHub';
  else if (hostname.includes('mdn') || hostname.includes('mozilla.org')) siteName = 'MDN';
  else if (hostname.includes('w3schools.com')) siteName = 'W3Schools';
  else if (hostname.includes('geeksforgeeks.org')) siteName = 'GeeksforGeeks';
  else if (hostname.includes('medium.com')) siteName = 'Medium';
  else if (hostname.includes('dev.to')) siteName = 'DEV';
  else if (hostname.includes('freecodecamp.org')) siteName = 'freeCodeCamp';
  else if (hostname.includes('codepen.io')) siteName = 'CodePen';
  else {
    // Extract site name from domain
    siteName = hostname.replace('www.', '').split('.')[0];
    siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
  }
  
  // Try to find nearby heading for context
  const parent = element.closest('article, section, div');
  let context = '';
  
  if (parent) {
    const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      context = heading.textContent.trim().substring(0, 40);
    }
  }
  
  // If no heading, use page title
  if (!context) {
    const pageTitle = document.title.split('|')[0].split('-')[0].trim();
    context = pageTitle.substring(0, 40);
  }
  
  // Combine: "Site: Context"
  const title = `${siteName}: ${context}`;
  
  console.log('📝 Generated title:', title);
  return title.substring(0, 60); // Max 60 chars
}

// ============================================
// SHOW TOAST NOTIFICATION
// ============================================
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.getElementById('snipflow-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'snipflow-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animations
if (!document.getElementById('snipflow-styles')) {
  const style = document.createElement('style');
  style.id = 'snipflow-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// LISTEN FOR MESSAGES FROM POPUP/BACKGROUND
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received:', request.action);
  
  if (request.action === 'getSelectedCode') {
    sendResponse({ code: lastSelectedCode });
  }
  
  if (request.action === 'captureFromContext') {
    // Capture from right-clicked element
    if (rightClickedElement) {
      captureCode(rightClickedElement);
      sendResponse({ success: true });
    } else {
      // Try to find first code block on page
      const codeBlocks = detectCodeBlocks();
      if (codeBlocks.length > 0) {
        captureCode(codeBlocks[0]);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    }
  }
  
  if (request.action === 'captureVisibleCode') {
    const codeBlocks = detectCodeBlocks();
    if (codeBlocks.length > 0) {
      captureCode(codeBlocks[0]);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'No code found' });
    }
  }
  
  return true; // Keep message channel open
});

// ============================================
// HIGHLIGHT CODE BLOCKS ON HOVER (Optional)
// ============================================
function highlightCodeBlocks() {
  const codeBlocks = detectCodeBlocks();
  
  codeBlocks.forEach(block => {
    block.style.cursor = 'pointer';
    block.style.transition = 'all 0.2s';
    
    block.addEventListener('mouseenter', () => {
      block.style.outline = '2px solid #3b82f6';
      block.style.outlineOffset = '2px';
    });
    
    block.addEventListener('mouseleave', () => {
      block.style.outline = 'none';
    });
    
    // Ctrl+Click to save
    block.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        captureCode(block);
      }
    });
  });
}

// ============================================
// INITIALIZE
// ============================================
console.log('🚀 Snipflow content script loaded');
highlightCodeBlocks();

// Re-detect code blocks when page updates (for SPAs)
const observer = new MutationObserver(() => {
  highlightCodeBlocks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});