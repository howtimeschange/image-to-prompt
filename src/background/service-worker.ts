/**
 * background/service-worker.ts
 * - 右键菜单 → 打开侧边栏 + 注入悬浮窗
 * - ANALYZE_IMAGE: 代理 AI 分析请求（无 CORS 限制）
 * - GENERATE_IMAGE: 代理生图请求
 */

// ── Context Menu ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'image-to-prompt',
    title: '🎨 ImageToPrompt - 分析图片',
    contexts: ['image'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'image-to-prompt' || !info.srcUrl || !tab?.id) return

  const imageUrl = info.srcUrl

  // Fetch base64 via content script (to avoid background CORS on some servers)
  let imageBase64: string | null = null
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, {
      type: 'FETCH_IMAGE_BASE64',
      url: imageUrl,
    })
    imageBase64 = resp?.base64 ?? null
  } catch {
    // content script may not be injected yet; that's ok
  }

  // Store for sidebar polling
  await chrome.storage.local.set({
    currentImageUrl: imageUrl,
    currentImageBase64: imageBase64,
    pendingImage: true,
  })

  // Open side panel
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId! })
    } catch {
      // Side panel may already be open
    }
  }

  // Inject and show the floating glass window on the page
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content-script.js'],
    })
  } catch {
    // Already injected
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: 'SHOW_FLOAT_WINDOW',
    imageUrl,
    imageBase64,
  })

  // Also broadcast to sidebar
  chrome.runtime.sendMessage({
    type: 'IMAGE_SELECTED',
    url: imageUrl,
    base64: imageBase64,
    tabId: tab.id,
  }).catch(() => {/* sidebar may not be open yet */})
})

// ── Message Router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_IMAGE') {
    handleAnalyze(message).then(sendResponse).catch((err) =>
      sendResponse({ error: String(err) })
    )
    return true
  }

  if (message.type === 'GENERATE_IMAGE') {
    handleGenImage(message).then(sendResponse).catch((err) =>
      sendResponse({ error: String(err) })
    )
    return true
  }
})

// ── AI Analysis (no CORS in background) ──────────────────────────────────────

async function handleAnalyze(message: {
  imageUrl: string
  imageBase64: string | null
  model: string
  apiKey: string
  language: string
}) {
  const { imageUrl, imageBase64, model, apiKey, language } = message

  if (model === 'minimax') {
    return analyzeWithMinimax(imageUrl, imageBase64, apiKey, language)
  }
  return analyzeWithGemini(imageUrl, imageBase64, apiKey, language)
}

const VISION_MODEL = 'gemini-2.5-flash-preview-04-17'
const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`

const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `你是世界顶级的 AI 绘图提示词工程师。深度分析图片，只输出如下 JSON（无 markdown 标记）：
{"subject":"主体描述","style":"艺术风格","composition":"构图","lighting":"光线","color_palette":"色调","mood":"氛围","technical":"技术参数","full_prompt":"完整英文提示词","negative_prompt":"负向提示词","tags":["标签1","标签2","标签3"]}`,
  en: `You are a world-class AI prompt engineer. Output ONLY this JSON (no markdown):
{"subject":"...","style":"...","composition":"...","lighting":"...","color_palette":"...","mood":"...","technical":"...","full_prompt":"complete English prompt","negative_prompt":"elements to exclude","tags":["tag1","tag2","tag3"]}`,
  ja: `画像を深く分析し、JSONのみを返してください：
{"subject":"...","style":"...","composition":"...","lighting":"...","color_palette":"...","mood":"...","technical":"...","full_prompt":"完全な英語プロンプト","negative_prompt":"除外要素","tags":["タグ1","タグ2"]}`,
}

async function analyzeWithGemini(
  imageUrl: string,
  imageBase64: string | null,
  apiKey: string,
  language: string
) {
  let imgData = imageBase64
  if (!imgData) {
    imgData = await fetchBase64(imageUrl)
  }

  const mime = detectMime(imgData)
  const promptText = SYSTEM_PROMPTS[language] ?? SYSTEM_PROMPTS.zh

  const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: promptText },
          { inline_data: { mime_type: mime, data: imgData } },
        ],
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${(err as any)?.error?.message ?? JSON.stringify(err)}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseJSON(text)
}

async function analyzeWithMinimax(
  imageUrl: string,
  imageBase64: string | null,
  apiKey: string,
  language: string
) {
  const promptText = SYSTEM_PROMPTS[language] ?? SYSTEM_PROMPTS.zh
  const imageContent = imageBase64
    ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
    : { type: 'image_url', image_url: { url: imageUrl } }

  const res = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-VL-01',
      messages: [{
        role: 'user',
        content: [
          imageContent,
          { type: 'text', text: promptText },
        ],
      }],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`MiniMax ${res.status}: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  return parseJSON(text)
}

// ── Image Generation ──────────────────────────────────────────────────────────

const IMAGE_GEN_MODEL = 'gemini-2.0-flash-preview-image-generation'
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

async function handleGenImage(message: { prompt: string; apiKey: string }) {
  const { prompt, apiKey } = message

  const res = await fetch(`${IMAGE_GEN_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`生图 ${res.status}: ${(err as any)?.error?.message ?? JSON.stringify(err)}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return { dataUrl: `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}` }
    }
  }
  throw new Error('未返回图片数据')
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function detectMime(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBOR')) return 'image/png'
  if (base64.startsWith('R0lGO')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

function parseJSON(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    const s = JSON.parse(cleaned)
    return {
      prompt: s.full_prompt ?? cleaned,
      tags: Array.isArray(s.tags) ? s.tags : [],
      structured: s,
    }
  } catch {
    return { prompt: text, tags: [], structured: null }
  }
}
