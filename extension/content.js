// content.js
console.log("SnipFlow content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureSnippet") {
    const selectedText = window.getSelection().toString();

    if (!selectedText.trim()) {
      alert("⚠️ Please select some code to save.");
      return;
    }

    // Send to background script for saving
    chrome.runtime.sendMessage({
      action: "saveSnippet",
      text: selectedText,
      url: window.location.href,
      title: document.title
    });
  }
});
