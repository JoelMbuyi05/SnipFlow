# SnipFlow
SnipFlow is a browser extension and web dashboard that helps developers capture, organize, and reuse code snippets from any website. Built with vanilla JavaScript and designed for speed, privacy, and offline functionality.

# The Problem It Solves
As developers, we constantly:

📌 Find useful code on Stack Overflow, GitHub, and documentation sites
🔄 Lose track of snippets we've seen before
⏰ Waste time searching for the same solutions repeatedly
📝 Need a quick way to save and organize code snippets

SnipFlow solves this by letting you capture code with one click, automatically organizing it with tags, and making it instantly searchable.

# 🚀Core Features

# One-Click Capture: Right-click any code on the web → Save to SnipFlow instantly
# Smart Detection: Automatically detects programming language from context
# Offline-First: All data stored locally using IndexedDB - works without internet
# Full-Text Search: Search across titles, code content, tags, and descriptions
# Syntax Highlighting: Beautiful code display with Prism.js support for 50+ languages
# Tag Organization: Create custom tags to categorize your snippets
# Export/Import: Backup all snippets as JSON or migrate between devices
# Analytics Dashboard: Track most-used snippets and capture sources
# Dark/Light Theme: Eye-friendly themes with automatic system detection
# Privacy-Focused: Zero tracking, no external servers, your data stays local

# 🎨Advanced Features
# Context Preservation - Saves source URL and page title with each snippet
# Keyboard Shortcuts - Ctrl+Shift+S to quick-save selected text
# Recent View - Quick access to recently saved snippets
# Duplicate Detection - Prevents saving the same snippet twice
# Copy to Clipboard - One-click copy from dashboard or extension popup
# Multi-Language Support - JavaScript, Python, Java, C++, HTML, CSS, SQL, and more
# Responsive Design - Works seamlessly on desktop, tablet, and mobile

# Demo
# Tech Stack
# Frontend

- JavaScript (ES6+) - Modern vanilla JavaScript, no frameworks
- HTML5 & CSS3 - Semantic markup and modern styling
- CSS Grid & Flexbox - Responsive layouts

# Storage & Data
- IndexedDB: Browser's native database for offline-first storage
- Chrome Storage API: Sync data between extension and dashboard

# Browser Extension
- Manifest V3: Latest Chrome extension specification
- Service Workers: Background script for event handling
- Content Scripts: Inject capture functionality into web pages

# Libraries & Tools
- Prism.js: Syntax highlighting for code display

# 🚀How to Use
Capturing Code Snippets

# Method 1: Context Menu (Right-Click)
1. Visit any website with code (Stack Overflow, GitHub, documentation)
2. Select the code you want to save
3. Right-click → "💾 Save to SnipFlow"
4. Snippet saved with automatic language detection!

# Method 2: Keyboard Shortcut
1. Select code on any page
2. Press Ctrl + Shift + S (Windows/Linux) or Cmd + Shift + S (Mac)
3. Instant save!

# Method 3: Extension Popup
