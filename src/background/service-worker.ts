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

// Prompt templates — 莲生方法论：输出完整 JSON 结构化视觉分析，直接用于 AI 生图
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `你是一个专业的视觉分析师。分析这张图片，输出完整的视觉风格 JSON 数据。只输出 JSON，不要任何解释文字，不要 markdown 代码块标记。JSON 必须完整合法。输出结构：{"visual_style_analysis":{"overall_aesthetic":{"theme":"视觉主题","tone":"整体基调","target_vibe":"氛围关键词3-5个"},"color_palette":{"background":{"primary":"#XXXXXX","description":"背景色描述"},"brand_colors":[{"name":"颜色名","hex":"#XXXXXX","usage":"用途"}],"text_colors":{"primary":"#XXXXXX","secondary":"#XXXXXX"},"accent_colors":[{"name":"颜色名","hex":"#XXXXXX","usage":"用途"}],"color_harmony":"配色关系"},"composition":{"layout":"构图类型","focal_point":"视觉焦点","white_space":"留白策略","hierarchy":"视觉层级描述"},"lighting_and_effects":{"lighting_type":"光线类型","shadow":"阴影风格","special_effects":["特效1","特效2"],"post_processing":"后期调色"},"subject_analysis":{"main_subject":"主体描述","supporting_elements":"辅助元素","texture":"主要质感","depth":"空间深度"},"typography_style":{"has_text":true,"font_style":"字体风格","text_layout":"排版描述"},"ai_generation_prompt":{"positive_prompt_en":"完整英文生图提示词，格式：主体描述, 风格词, 光线, 色彩, 质感, --ar 1:1","positive_prompt_zh":"对应中文生图提示词","negative_prompt":"blurry, deformed, bad anatomy, low quality, watermark","style_tags":["标签1","标签2","标签3","标签4","标签5"]}}}`,
  en: `You are a professional visual analyst. Analyze this image and output complete visual style JSON. Output JSON only, no explanations, no markdown. JSON must be complete and valid. Structure: {"visual_style_analysis":{"overall_aesthetic":{"theme":"Visual theme","tone":"Overall tone","target_vibe":"3-5 atmosphere keywords"},"color_palette":{"background":{"primary":"#XXXXXX","description":"Background description"},"brand_colors":[{"name":"Color","hex":"#XXXXXX","usage":"Usage"}],"text_colors":{"primary":"#XXXXXX","secondary":"#XXXXXX"},"accent_colors":[{"name":"Color","hex":"#XXXXXX","usage":"Usage"}],"color_harmony":"Color relationship"},"composition":{"layout":"Composition type","focal_point":"Focal point","white_space":"White space strategy","hierarchy":"Visual hierarchy"},"lighting_and_effects":{"lighting_type":"Lighting type","shadow":"Shadow style","special_effects":["Effect1","Effect2"],"post_processing":"Color grading"},"subject_analysis":{"main_subject":"Subject description","supporting_elements":"Supporting elements","texture":"Primary texture","depth":"Spatial depth"},"typography_style":{"has_text":true,"font_style":"Font style","text_layout":"Text layout"},"ai_generation_prompt":{"positive_prompt_en":"Complete prompt for MJ/SD/Flux: subject, style words, lighting, color, texture, --ar 1:1","positive_prompt_zh":"Chinese generation prompt","negative_prompt":"blurry, deformed, bad anatomy, low quality, watermark","style_tags":["tag1","tag2","tag3","tag4","tag5"]}}}`,
  ja: `You are a professional visual analyst. Analyze this image and output complete visual style JSON. Output JSON only, no explanations, no markdown. JSON must be complete and valid. Structure: {"visual_style_analysis":{"overall_aesthetic":{"theme":"Visual theme","tone":"Overall tone","target_vibe":"3-5 atmosphere keywords"},"color_palette":{"background":{"primary":"#XXXXXX","description":"Background description"},"brand_colors":[{"name":"Color","hex":"#XXXXXX","usage":"Usage"}],"text_colors":{"primary":"#XXXXXX","secondary":"#XXXXXX"},"accent_colors":[{"name":"Color","hex":"#XXXXXX","usage":"Usage"}],"color_harmony":"Color relationship"},"composition":{"layout":"Composition type","focal_point":"Focal point","white_space":"White space strategy","hierarchy":"Visual hierarchy"},"lighting_and_effects":{"lighting_type":"Lighting type","shadow":"Shadow style","special_effects":["Effect1","Effect2"],"post_processing":"Color grading"},"subject_analysis":{"main_subject":"Subject description","supporting_elements":"Supporting elements","texture":"Primary texture","depth":"Spatial depth"},"typography_style":{"has_text":true,"font_style":"Font style","text_layout":"Text layout"},"ai_generation_prompt":{"positive_prompt_en":"Complete prompt for MJ/SD/Flux","positive_prompt_zh":"Chinese generation prompt","negative_prompt":"blurry, deformed, bad anatomy, low quality","style_tags":["tag1","tag2","tag3"]}}}`,
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
    const vsa = parsed.visual_style_analysis ?? parsed.visual_style ?? {}
    const gen = vsa.ai_generation_prompt ?? vsa.prompts ?? {}
    const structured = {
      subject: vsa.subject_analysis?.main_subject ?? '',
      subject_zh: vsa.subject_analysis?.main_subject ?? '',
      style: vsa.overall_aesthetic?.theme ?? vsa.overall_concept?.theme ?? '',
      composition: vsa.composition?.layout ?? vsa.composition?.layout_type ?? '',
      lighting: vsa.lighting_and_effects?.lighting_type ?? '',
      color_palette: vsa.color_palette?.color_harmony ?? '',
      mood: vsa.overall_aesthetic?.tone ?? vsa.overall_concept?.mood ?? '',
      technical: (vsa.lighting_and_effects?.special_effects ?? vsa.effects_and_textures?.texture ?? []).join(', '),
      full_prompt: gen.positive_prompt_en ?? gen.full_prompt ?? '',
      full_prompt_zh: gen.positive_prompt_zh ?? gen.full_prompt_zh ?? '',
      negative_prompt: gen.negative_prompt ?? '',
      negative_prompt_zh: gen.negative_prompt ?? '',
      tags: Array.isArray(gen.style_tags) ? gen.style_tags : (Array.isArray(gen.keywords) ? gen.keywords : []),
      visual_style: vsa,
      raw_json: JSON.stringify(parsed, null, 2),
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
