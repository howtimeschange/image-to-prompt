/**
 * content-script.ts
 * 仅负责：将图片 URL 转换为 Base64，供 background service-worker 使用。
 * 悬浮窗逻辑已移除，所有分析交互均在侧边栏中进行。
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE_BASE64') {
    fetchBase64(message.url)
      .then((base64) => sendResponse({ base64 }))
      .catch((err) => sendResponse({ error: String(err) }))
    return true
  }
  // SHOW_FLOAT_WINDOW 已废弃，静默忽略
  if (message.type === 'SHOW_FLOAT_WINDOW') {
    sendResponse({ ok: true })
    return true
  }
})

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const r = reader.result as string
      resolve(r.includes(',') ? r.split(',')[1] : r)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
