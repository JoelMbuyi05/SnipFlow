// ============================================
// SNIPFLOW - CONTENT SCRIPT
// ============================================
// Detects and captures code snippets from web pages

let lastSelectedCode = null;

// ============================================
// DETECT CODE BLOCKS ON PAGE
// ============================================
function detectCodeBlocks() {
  // Common code block selectors
  const codeSelectors = [
    'pre code',           // Most common
    'pre',                // Plain pre tags
    '.highlight code',    // GitHub
    '.code-block',        // Generic
    '[class*="language-"]', // Prism.js
    '[class*="code"]'     // Generic code classes
  ];
  
  const codeBlocks = [];
  
  codeSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(block => {
      if (block.textContent.trim().length > 10) { // At least 10 chars
        codeBlocks.push(block);
      }
    });
  });
  
  return codeBlocks;
}

// ============================================
// HIGHLIGHT CODE BLOCKS (Visual feedback)
// ============================================
function highlightCodeBlocks() {
  const codeBlocks = detectCodeBlocks();
  
  codeBlocks.forEach(block => {
    // Add hover effect
    block.style.cursor = 'pointer';
    block.style.transition = 'all 0.2s';
    
    block.addEventListener('mouseenter', () => {
      block.style.outline = '2px solid #3b82f6';
      block.style.outlineOffset = '2px';
    });
    
    block.addEventListener('mouseleave', () => {
      block.style.outline = 'none';
    });
    
    // Click to save
    block.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) { // Ctrl+Click or Cmd+Click
        e.preventDefault();
        captureCode(block);
      }
    });
  });
}

// ============================================
// CAPTURE CODE FROM ELEMENT
// ============================================
function captureCode(element) {
  const code = element.textContent.trim();
  const language = detectLanguage(element);
  const title = generateTitle(element);
  const sourceUrl = window.location.href;
  
  lastSelectedCode = {
    code,
    language,
    title,
    sourceUrl,
    timestamp: new Date().toISOString()
  };
  
  // Send to popup
  chrome.runtime.sendMessage({
    action: 'codeSelected',
    data: lastSelectedCode
  });
  
  // Show toast notification
  showToast('Code captured! Click extension to save.');
}

// ============================================
// DETECT PROGRAMMING LANGUAGE
// ============================================
function detectLanguage(element) {
  // Check class names for language hints
  const classes = element.className || '';
  
  const languageMap = {
    'javascript': 'JavaScript',
    'js': 'JavaScript',
    'typescript': 'TypeScript',
    'ts': 'TypeScript',
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
    'rust': 'Rust',
    'html': 'HTML',
    'css': 'CSS',
    'sql': 'SQL',
    'bash': 'Bash',
    'shell': 'Bash'
  };
  
  // Check class names
  for (const [key, value] of Object.entries(languageMap)) {
    if (classes.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  // Detect by content patterns
  const code = element.textContent.toLowerCase();
  
  if (code.includes('function') && code.includes('{')) return 'JavaScript';
  if (code.includes('def ') && code.includes(':')) return 'Python';
  if (code.includes('public class')) return 'Java';
  if (code.includes('<div') || code.includes('<html')) return 'HTML';
  if (code.includes('{') && code.includes('color:')) return 'CSS';
  
  return 'JavaScript'; // Default
}

// ============================================
// GENERATE SMART TITLE
// ============================================
function generateTitle(element) {
  // Try to find nearby heading
  const parent = element.closest('article, section, div');
  if (parent) {
    const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      return heading.textContent.trim().substring(0, 50);
    }
  }
  
  // Use page title
  const pageTitle = document.title.split('|')[0].split('-')[0].trim();
  return `Code from ${pageTitle}`.substring(0, 50);
}

// ============================================
// SHOW TOAST NOTIFICATION
// ============================================
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3b82f6;
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
const style = document.createElement('style');
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

// ============================================
// LISTEN FOR MESSAGES FROM POPUP
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedCode') {
    sendResponse({ code: lastSelectedCode });
  }
  
  if (request.action === 'captureVisibleCode') {
    const codeBlocks = detectCodeBlocks();
    if (codeBlocks.length > 0) {
      captureCode(codeBlocks[0]); // Capture first code block
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'No code found' });
    }
  }
});

// ============================================
// INITIALIZE
// ============================================
console.log('Snipflow content script loaded');
highlightCodeBlocks();

// Re-detect code blocks when page updates (for SPAs)
const observer = new MutationObserver(() => {
  highlightCodeBlocks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});