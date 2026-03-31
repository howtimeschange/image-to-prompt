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

// Prompt templates — 莲生方法论：输出完整 JSON 风格克隆档案
// 用法：将 JSON 贴给 AI，说"请按照此 JSON 风格，生成一张[新主题]的图像"
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `你是一个专业视觉分析师，将图像风格拆解为可被 AI 精确复现的结构化 JSON 数据。只输出 JSON，不要任何解释文字，不要 markdown 代码块。输出结构：{"visual_style":{"overall_concept":{"theme":"核心主题风格名（中英文）","mood":"氛围描述","keywords":["关键词1","关键词2","关键词3","关键词4","关键词5"]},"color_palette":{"dominant_colors":[{"name":"颜色名（中英）","hex":"#XXXXXX","description":"占多少面积、用在哪里、视觉作用"}],"accent_colors":[{"name":"颜色名（中英）","hex":"#XXXXXX","description":"点缀色在哪里、视觉作用"}],"background_color":{"name":"颜色名","hex":"#XXXXXX","description":"背景色质感描述"},"color_harmony":"配色和谐方式（附简短解释）"},"typography":{"has_text":true,"text_elements":[{"content":"文字内容","location":"位置","font_style":{"family":"字体类别","characteristics":"具体特征","color":"颜色","effect":"特效"}}]},"composition":{"layout_type":"构图类型（中心对称/三分法/对角线/满版出血/框架式）","focal_point":"视觉焦点：位置+内容+为什么吸引眼球","camera_angle":"机位描述","depth_of_field":"景深描述","pose_and_balance":"主体姿势和画面平衡感"},"effects_and_textures":{"texture":["质感1（如：浓重胶片颗粒感 Heavy Film Grain）","质感2"],"lighting":{"type":"光线类型（自然光漫反射/棚拍硬光/侧逆光等）","direction":"光源方向和投影描述"},"post_processing_vibe":"后期调色风格（复古胶片扫描/低饱和冷色调/HDR高对比/色差等）"},"subjects_and_props":{"subject":{"description":"主体细节","attire":"服装/外观/材质细节","expression":"表情/神态/动作细节"},"prop":{"description":"道具或环境细节"},"interaction":"主体与道具/环境的关系张力或反差（幽默感/情绪的来源）"},"reproduction_prompt":{"usage_note":"将整个 visual_style 字段贴给 AI 模型，说：请严格按照以下 JSON 数据中描述的视觉风格、色彩、构图和光影，生成一张【替换为你的新主题】的图像：[粘贴 JSON]","style_essence_en":"一句话英文风格精髓（用于作为提示词前缀）","style_essence_zh":"一句话中文风格精髓","negative_prompt":"blurry, deformed, bad anatomy, low quality, watermark, text overlay, overexposed, chromatic aberration","style_tags":["标签1","标签2","标签3","标签4","标签5","标签6"]}}}`,
  en: `You are a professional visual analyst. Deconstruct this image style into structured JSON data that AI can precisely replicate. Output JSON only, no explanations, no markdown. Structure: {"visual_style":{"overall_concept":{"theme":"Core theme name","mood":"Mood description","keywords":["kw1","kw2","kw3","kw4","kw5"]},"color_palette":{"dominant_colors":[{"name":"Color name","hex":"#XXXXXX","description":"Coverage, placement, visual role"}],"accent_colors":[{"name":"Color name","hex":"#XXXXXX","description":"Where it appears, visual impact"}],"background_color":{"name":"Color name","hex":"#XXXXXX","description":"Background texture and feel"},"color_harmony":"Color harmony method (with brief explanation)"},"typography":{"has_text":true,"text_elements":[{"content":"text","location":"position","font_style":{"family":"font category","characteristics":"specific traits","color":"color","effect":"effects"}}]},"composition":{"layout_type":"Composition type (Center-weighted/Rule of thirds/Diagonal/Full-bleed/Frame-within-frame)","focal_point":"Focal point: position + content + why it draws attention","camera_angle":"Camera angle description","depth_of_field":"DOF description","pose_and_balance":"Subject pose and balance"},"effects_and_textures":{"texture":["Texture 1 (e.g. Heavy Film Grain)","Texture 2"],"lighting":{"type":"Lighting type (Natural diffused/Hard studio/Side backlight/Low-key dark)","direction":"Light source direction and shadow"},"post_processing_vibe":"Color grading (Vintage film scan/Desaturated cool/HDR/chromatic aberration)"},"subjects_and_props":{"subject":{"description":"Subject details","attire":"Clothing/appearance/material details","expression":"Expression/demeanor/gesture"},"prop":{"description":"Prop or environment details"},"interaction":"Relationship, tension or contrast between subject and prop (source of humor or emotion)"},"reproduction_prompt":{"usage_note":"Paste the entire visual_style to an AI model with: Please generate an image of [YOUR NEW SUBJECT] strictly following the visual style, colors, composition and lighting in this JSON: [paste JSON]","style_essence_en":"One-sentence English style essence (standalone prompt prefix)","style_essence_zh":"One-sentence Chinese style essence","negative_prompt":"blurry, deformed, bad anatomy, low quality, watermark, text overlay, overexposed, chromatic aberration","style_tags":["tag1","tag2","tag3","tag4","tag5","tag6"]}}}`,
  ja: `You are a professional visual analyst. Deconstruct this image style into structured JSON data that AI can precisely replicate. Output JSON only, no explanations, no markdown. Structure: {"visual_style":{"overall_concept":{"theme":"Core theme name","mood":"Mood description","keywords":["kw1","kw2","kw3","kw4","kw5"]},"color_palette":{"dominant_colors":[{"name":"Color name","hex":"#XXXXXX","description":"Coverage, placement, visual role"}],"accent_colors":[{"name":"Color name","hex":"#XXXXXX","description":"Where it appears, visual impact"}],"background_color":{"name":"Color name","hex":"#XXXXXX","description":"Background texture"},"color_harmony":"Color harmony method"},"typography":{"has_text":true,"text_elements":[]},"composition":{"layout_type":"Composition type","focal_point":"Focal point","camera_angle":"Camera angle","depth_of_field":"DOF","pose_and_balance":"Pose and balance"},"effects_and_textures":{"texture":["Texture 1","Texture 2"],"lighting":{"type":"Lighting type","direction":"Direction"},"post_processing_vibe":"Color grading style"},"subjects_and_props":{"subject":{"description":"Subject","attire":"Attire","expression":"Expression"},"prop":{"description":"Prop"},"interaction":"Interaction/tension"},"reproduction_prompt":{"usage_note":"Paste visual_style JSON to AI with: generate [new subject] following this JSON style","style_essence_en":"One-sentence English style essence","style_essence_zh":"Chinese style essence","negative_prompt":"blurry, deformed, bad anatomy, low quality, watermark","style_tags":["tag1","tag2","tag3"]}}}`,
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
    // Support both new schema (visual_style) and legacy (visual_style_analysis)
    const vs = parsed.visual_style ?? parsed.visual_style_analysis ?? {}
    const rp = vs.reproduction_prompt ?? vs.ai_generation_prompt ?? vs.prompts ?? {}
    const structured = {
      subject: vs.subjects_and_props?.subject?.description ?? vs.subject_analysis?.main_subject ?? '',
      subject_zh: vs.subjects_and_props?.subject?.description ?? '',
      style: vs.overall_concept?.theme ?? vs.overall_aesthetic?.theme ?? '',
      composition: vs.composition?.layout_type ?? vs.composition?.layout ?? '',
      lighting: vs.effects_and_textures?.lighting?.type ?? vs.lighting_and_effects?.lighting_type ?? '',
      color_palette: vs.color_palette?.color_harmony ?? '',
      mood: vs.overall_concept?.mood ?? vs.overall_aesthetic?.tone ?? '',
      technical: [
        ...(vs.effects_and_textures?.texture ?? []),
        ...(vs.lighting_and_effects?.special_effects ?? []),
      ].join(', '),
      full_prompt: rp.style_essence_en ?? rp.positive_prompt_en ?? rp.full_prompt ?? '',
      full_prompt_zh: rp.style_essence_zh ?? rp.positive_prompt_zh ?? rp.full_prompt_zh ?? '',
      negative_prompt: rp.negative_prompt ?? '',
      negative_prompt_zh: rp.negative_prompt ?? '',
      tags: Array.isArray(rp.style_tags) ? rp.style_tags : (Array.isArray(rp.keywords) ? rp.keywords : []),
      visual_style: vs,
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
