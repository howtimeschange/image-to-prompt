import type { AIAnalysisResult, Language } from './types'

// 识图：Gemini 3 Flash（最新多模态）
const VISION_MODEL = 'gemini-3-flash-preview'
// 生图：Nano Banana 2
const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview'

const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

// Prompt 模板：要求同时输出中文描述和英文 Prompt
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `你是世界顶级的 AI 绘图提示词工程师。深度分析图片，输出以下 JSON（只输出 JSON，无任何额外内容）：
{
  "subject_zh": "主体的中文描述，详细描述人物/物体/场景的特征",
  "subject": "Main subject in English, detailed characteristics",
  "style": "Art style, e.g. photorealistic, oil painting, anime, cinematic",
  "composition": "Composition, e.g. portrait, wide shot, close-up, rule of thirds",
  "lighting": "Lighting, e.g. golden hour, studio lighting, rim light, dramatic shadows",
  "color_palette": "Colors, e.g. warm tones, monochrome, vibrant, pastel",
  "mood": "Atmosphere, e.g. mysterious, cheerful, melancholic, epic",
  "technical": "Technical specs, e.g. 8K, ultra detailed, sharp focus, bokeh",
  "full_prompt": "完整英文提示词，整合以上所有要素，可直接用于 Stable Diffusion / Midjourney",
  "full_prompt_zh": "完整中文提示词，与 full_prompt 内容一致，但用中文表达，方便理解和修改",
  "negative_prompt": "Elements to exclude, e.g. blurry, deformed, low quality, bad anatomy",
  "negative_prompt_zh": "负向提示词的中文版，与 negative_prompt 对应",
  "tags": ["风格标签1", "风格标签2", "风格标签3"]
}`,

  en: `You are a world-class AI image prompt engineer. Analyze this image deeply and output ONLY the following JSON (no markdown, no extra text):
{
  "subject_zh": "中文主体描述",
  "subject": "Main subject in English with detailed characteristics",
  "style": "Art style, e.g. photorealistic, oil painting, anime, cinematic",
  "composition": "Composition, e.g. portrait, wide shot, close-up",
  "lighting": "Lighting, e.g. golden hour, studio lighting, dramatic shadows",
  "color_palette": "Colors, e.g. warm tones, monochrome, vibrant",
  "mood": "Atmosphere, e.g. mysterious, cheerful, melancholic, epic",
  "technical": "Technical specs, e.g. 8K, ultra detailed, sharp focus, bokeh",
  "full_prompt": "Complete English prompt combining all elements for SD/MJ",
  "full_prompt_zh": "中文完整提示词",
  "negative_prompt": "Elements to exclude, e.g. blurry, deformed, low quality",
  "negative_prompt_zh": "负向提示词中文版",
  "tags": ["tag1", "tag2", "tag3"]
}`,

  ja: `あなたは世界最高水準のAI画像プロンプトエンジニアです。以下のJSONのみを返してください：
{
  "subject_zh": "中文主体描述",
  "subject": "English subject description",
  "style": "Art style",
  "composition": "Composition",
  "lighting": "Lighting",
  "color_palette": "Colors",
  "mood": "Atmosphere",
  "technical": "Technical specs",
  "full_prompt": "Complete English prompt for SD/MJ",
  "full_prompt_zh": "中文完整提示词",
  "negative_prompt": "Elements to exclude",
  "negative_prompt_zh": "负向提示词中文版",
  "tags": ["tag1", "tag2"]
}`,
}

export interface StructuredPrompt {
  subject_zh: string
  subject: string
  style: string
  composition: string
  lighting: string
  color_palette: string
  mood: string
  technical: string
  full_prompt: string
  full_prompt_zh: string
  negative_prompt: string
  negative_prompt_zh: string
  tags: string[]
}

// ── 图片分析 ──────────────────────────────────────────────────────────────────

export async function analyzeImageWithGemini(
  base64: string | null,
  imageUrl: string,
  apiKey: string,
  language: Language = 'zh'
): Promise<AIAnalysisResult & { structured?: StructuredPrompt }> {
  if (!apiKey) throw new Error('请先在设置中配置 Gemini API Key')

  let imageData = base64
  if (!imageData) {
    try {
      imageData = await fetchImageAsBase64(imageUrl)
    } catch {
      throw new Error('无法获取图片数据（Gemini 不支持外部 URL，需要 Base64）')
    }
  }
  if (!imageData) throw new Error('图片数据为空，请重试')

  const promptText = SYSTEM_PROMPTS[language] ?? SYSTEM_PROMPTS.zh
  const mimeType = detectMimeType(imageData)

  const response = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: imageData } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as any)?.error?.message ?? JSON.stringify(err)
    throw new Error(`Gemini API 错误: ${response.status} — ${msg}`)
  }

  const data = await response.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseStructuredResponse(text)
}

// ── 多轮对话 ──────────────────────────────────────────────────────────────────

export async function continueChat(
  messages: Array<{ role: string; content: string }>,
  imageBase64: string | null,
  imageUrl: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('请先配置 Gemini API Key')

  let imageData = imageBase64
  if (!imageData && imageUrl) {
    try { imageData = await fetchImageAsBase64(imageUrl) } catch { /* ok */ }
  }

  const contents = messages.map((msg, i) => {
    const parts: object[] = [{ text: msg.content }]
    if (i === 0 && imageData) {
      parts.unshift({ inline_data: { mime_type: detectMimeType(imageData), data: imageData } })
    }
    return { role: msg.role === 'user' ? 'user' : 'model', parts }
  })

  const response = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })

  if (!response.ok) throw new Error(`Gemini API 错误: ${response.status}`)
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── 生图（Nano Banana 2）─────────────────────────────────────────────────────

export async function generateImageWithGemini(
  prompt: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('请先配置 Gemini API Key')

  const response = await fetch(`${IMAGE_GEN_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as any)?.error?.message ?? JSON.stringify(err)
    throw new Error(`生图 API 错误: ${response.status} — ${msg}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`
    }
  }
  throw new Error('未返回图片数据')
}

// ── helpers ───────────────────────────────────────────────────────────────────

function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBOR')) return 'image/png'
  if (base64.startsWith('R0lGO')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function parseStructuredResponse(text: string): AIAnalysisResult & { structured?: StructuredPrompt } {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as StructuredPrompt
    return {
      prompt: parsed.full_prompt ?? cleaned,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      structured: parsed,
    }
  } catch {
    return { prompt: text, tags: [] }
  }
}
