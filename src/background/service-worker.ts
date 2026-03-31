/**
 * background/service-worker.ts
 * - 右键菜单 → 打开侧边栏 + 注入悬浮窗
 * - ANALYZE_IMAGE: 代理 AI 分析（无 CORS 限制）
 * - GENERATE_IMAGE: 代理生图
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

  // Fetch base64 via content script
  let imageBase64: string | null = null
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, {
      type: 'FETCH_IMAGE_BASE64',
      url: imageUrl,
    })
    imageBase64 = resp?.base64 ?? null
  } catch { /* content script may not be ready */ }

  // Store for sidebar polling — clear previous state first
  await chrome.storage.local.set({
    currentImageUrl: imageUrl,
    currentImageBase64: imageBase64,
    pendingImage: true,
    // Clear previous result so sidebar resets
    pendingClear: true,
  })

  // Open side panel
  if (chrome.sidePanel) {
    try { await chrome.sidePanel.open({ windowId: tab.windowId! }) } catch { /* already open */ }
  }

  // Ensure content script is injected
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content-script.js'],
    })
  } catch { /* already injected */ }

  // Show float window on page
  await chrome.tabs.sendMessage(tab.id, {
    type: 'SHOW_FLOAT_WINDOW',
    imageUrl,
    imageBase64,
  })

  // Notify sidebar
  chrome.runtime.sendMessage({
    type: 'IMAGE_SELECTED',
    url: imageUrl,
    base64: imageBase64,
    tabId: tab.id,
  }).catch(() => {})
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

// ── Vision model: Gemini 3 Flash ──────────────────────────────────────────────

const VISION_MODEL = 'gemini-3-flash-preview'
const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`

// Image gen model: Nano Banana 2
const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview'
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

// Prompt templates — 莲生方法论：将视觉风格提取为 JSON 结构化数据
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `将此视觉风格提取为 JSON 结构化数据：颜色、排版、构图、效果...

只输出以下 JSON，不要有任何额外文字或 markdown：
{"visual_style":{"overall_concept":{"theme":"主题风格名","mood":"氛围","keywords":["关键词1","关键词2","关键词3"]},"color_palette":{"dominant_colors":[{"name":"颜色名","hex":"#XXXXXX","description":"作用"}],"accent_colors":[{"name":"颜色名","hex":"#XXXXXX","description":"作用"}],"background_color":{"name":"颜色名","hex":"#XXXXXX","description":"描述"},"color_harmony":"配色方式"},"typography":{"has_text":false,"text_elements":[]},"composition":{"layout_type":"构图类型","focal_point":"视觉焦点","camera_angle":"机位","depth_of_field":"景深","pose_and_balance":"平衡感"},"effects_and_textures":{"texture":["质感1","质感2"],"lighting":{"type":"光线类型","direction":"方向"},"post_processing_vibe":"后期风格"},"subjects_and_props":{"subject":{"description":"主体","attire":"外观","expression":"神态"},"prop":{"description":"道具/环境"},"interaction":"反差或张力"}},"prompts":{"full_prompt":"整合所有视觉要素的完整英文提示词（直接用于SD/MJ/Nano Banana 2）","full_prompt_zh":"完整中文提示词","negative_prompt":"blurry, deformed, low quality, bad anatomy","negative_prompt_zh":"模糊、变形、低质量","keywords":["标签1","标签2","标签3"]}}`,
  en: `Extract this visual style as structured JSON data: colors, typography, composition, effects...

Output ONLY the JSON below, no extra text or markdown:
{"visual_style":{"overall_concept":{"theme":"style name","mood":"mood","keywords":["kw1","kw2","kw3"]},"color_palette":{"dominant_colors":[{"name":"color","hex":"#XXXXXX","description":"role"}],"accent_colors":[{"name":"color","hex":"#XXXXXX","description":"role"}],"background_color":{"name":"color","hex":"#XXXXXX","description":"desc"},"color_harmony":"harmony method"},"typography":{"has_text":false,"text_elements":[]},"composition":{"layout_type":"type","focal_point":"focal","camera_angle":"angle","depth_of_field":"DOF","pose_and_balance":"balance"},"effects_and_textures":{"texture":["texture1"],"lighting":{"type":"type","direction":"direction"},"post_processing_vibe":"vibe"},"subjects_and_props":{"subject":{"description":"desc","attire":"attire","expression":"expression"},"prop":{"description":"prop"},"interaction":"tension"}},"prompts":{"full_prompt":"Complete English prompt for SD/MJ/Nano Banana 2","full_prompt_zh":"中文完整提示词","negative_prompt":"blurry, deformed, low quality","negative_prompt_zh":"模糊、变形、低质量","keywords":["tag1","tag2","tag3"]}}`,
  ja: `この画像のビジュアルスタイルをJSON構造化データとして抽出してください：色、タイポグラフィ、構図、エフェクト...

以下のJSONのみを出力：
{"visual_style":{"overall_concept":{"theme":"スタイル","mood":"雰囲気","keywords":["kw1","kw2"]},"color_palette":{"dominant_colors":[{"name":"色","hex":"#XXXXXX","description":"役割"}],"accent_colors":[],"background_color":{"name":"色","hex":"#XXXXXX","description":"説明"},"color_harmony":"調和"},"typography":{"has_text":false,"text_elements":[]},"composition":{"layout_type":"構図","focal_point":"焦点","camera_angle":"アングル","depth_of_field":"被写界深度","pose_and_balance":"バランス"},"effects_and_textures":{"texture":["テクスチャ"],"lighting":{"type":"照明","direction":"方向"},"post_processing_vibe":"後処理"},"subjects_and_props":{"subject":{"description":"説明","attire":"服装","expression":"表情"},"prop":{"description":"小道具"},"interaction":"関係性"}},"prompts":{"full_prompt":"Complete English prompt","full_prompt_zh":"中文完整提示词","negative_prompt":"blurry, deformed","negative_prompt_zh":"模糊、变形","keywords":["tag1","tag2"]}}`,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

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

async function analyzeWithGemini(
  imageUrl: string,
  imageBase64: string | null,
  apiKey: string,
  language: string
) {
  let imgData = imageBase64
  if (!imgData) imgData = await fetchBase64(imageUrl)

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
        content: [imageContent, { type: 'text', text: promptText }],
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
    const parsed = JSON.parse(cleaned)
    const vs = parsed.visual_style ?? {}
    const pr = parsed.prompts ?? {}
    const structured = {
      subject: vs.subjects_and_props?.subject?.description ?? '',
      subject_zh: vs.subjects_and_props?.subject?.description ?? '',
      style: vs.overall_concept?.theme ?? '',
      composition: vs.composition?.layout_type ?? '',
      lighting: vs.effects_and_textures?.lighting?.type ?? '',
      color_palette: vs.color_palette?.color_harmony ?? '',
      mood: vs.overall_concept?.mood ?? '',
      technical: (vs.effects_and_textures?.texture ?? []).join(', '),
      full_prompt: pr.full_prompt ?? '',
      full_prompt_zh: pr.full_prompt_zh ?? '',
      negative_prompt: pr.negative_prompt ?? '',
      negative_prompt_zh: pr.negative_prompt_zh ?? '',
      tags: Array.isArray(pr.keywords) ? pr.keywords : [],
      visual_style: vs,
    }
    return {
      prompt: structured.full_prompt || text,
      tags: structured.tags,
      structured,
    }
  } catch {
    return { prompt: text, tags: [], structured: null }
  }
}
