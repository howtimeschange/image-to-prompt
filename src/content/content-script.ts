// Content Script - runs in every page, handles image fetching

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE_BASE64') {
    fetchImageAsBase64(message.url)
      .then((base64) => {
        chrome.runtime.sendMessage({
          type: 'IMAGE_BASE64_READY',
          base64,
          url: message.url,
        })
        sendResponse({ ok: true })
      })
      .catch((err) => {
        console.error('ImageToPrompt: failed to fetch image', err)
        // Fall back: send URL only, let sidebar handle it
        chrome.runtime.sendMessage({
          type: 'IMAGE_BASE64_READY',
          base64: null,
          url: message.url,
        })
        sendResponse({ ok: false })
      })
    return true // keep message channel open for async
  }
})

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        // Strip data URL prefix, keep only base64 part
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    return null
  }
}
