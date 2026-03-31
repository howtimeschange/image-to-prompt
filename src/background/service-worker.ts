// Background Service Worker - handles context menu and message routing

// Create right-click context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'image-to-prompt',
    title: '🎨 ImageToPrompt - 分析图片',
    contexts: ['image'],
  })
})

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'image-to-prompt' && info.srcUrl && tab?.id) {
    // Save image URL to storage
    await chrome.storage.local.set({ currentImageUrl: info.srcUrl, pendingImage: true })

    // Open side panel
    if (chrome.sidePanel) {
      await chrome.sidePanel.open({ windowId: tab.windowId })
    }

    // Ask content script to convert image to base64
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: 'FETCH_IMAGE_BASE64',
        url: info.srcUrl,
      })
    } catch (e) {
      // Content script might not be ready, sidebar will poll storage
      console.warn('Could not send to content script:', e)
    }
  }
})

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'IMAGE_BASE64_READY') {
    chrome.storage.local.set({
      currentImageBase64: message.base64,
      currentImageUrl: message.url,
      pendingImage: true,
    })
    // Notify sidebar
    chrome.runtime.sendMessage({ type: 'IMAGE_SELECTED', url: message.url, base64: message.base64 })
      .catch(() => {/* sidebar might not be open yet */})
    sendResponse({ ok: true })
  }
  return true
})

// Open sidebar when action icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }
})
