import type { AIAnalysisResult, Language } from './types'

// 识图模型：gemini-2.5-flash-preview-04-17（最新多模态 flash）
const VISION_MODEL = 'gemini-2.5-flash-preview-04-17'
// 生图模型：imagen-3.0-generate-002（当前 Gemini 系列最新生图）
// 备用：gemini-2.0-flash-preview-image-generation
const IMAGE_GEN_MODEL = 'gemini-2.0-flash-preview-image-generation'

const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

// 结构化 Prompt JSON
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: `你是世界顶级的 AI 绘图提示词工程师。深度分析图片，输出专业级文生图 JSON。

只输出 JSON，无任何额外文字、markdown 代码块标记：
{
  "subject": "主体描述，包含人物/物体/场景的详细特征",
  "style": "艺术风格，如 photorealistic, oil painting, anime, cinematic 等",
  "composition": "构图方式，如 portrait, wide shot, close-up 等",
  "lighting": "光线描述，如 golden hour, studio lighting, dramatic shadows 等",
  "color_palette": "主色调，如 warm tones, monochrome, vibrant 等",
  "mood": "氛围，如 mysterious, cheerful, melancholic, epic 等",
  "technical": "技术参数，如 8K, ultra detailed, sharp focus, bokeh 等",
  "full_prompt": "所有要素整合的完整英文提示词，可直接用于 Stable Diffusion / Midjourney",
  "negative_prompt": "需要排除的元素，如 blurry, deformed, low quality 等",
  "tags": ["风格标签1", "风格标签2", "风格标签3"]
}`,

  en: `You are a world-class AI image prompt engineer. Analyze this image deeply and output a professional JSON prompt.

Return ONLY valid JSON, no markdown:
{
  "subject": "Detailed description of main subjects",
  "style": "Art style, e.g. photorealistic, oil painting, anime, cinematic",
  "composition": "Composition, e.g. portrait, wide shot, close-up",
  "lighting": "Lighting, e.g. golden hour, studio lighting, dramatic shadows",
  "color_palette": "Colors, e.g. warm tones, monochrome, vibrant",
  "mood": "Atmosphere, e.g. mysterious, cheerful, melancholic, epic",
  "technical": "Specs, e.g. 8K, ultra detailed, sharp focus, bokeh",
  "full_prompt": "Complete English prompt for Stable Diffusion / Midjourney",
  "negative_prompt": "Elements to exclude, e.g. blurry, deformed, low quality",
  "tags": ["tag1", "tag2", "tag3"]
}`,

  ja: `あなたは世界最高水準のAI画像プロンプトエンジニアです。JSONのみ返してください：
{
  "subject": "被写体の詳細",
  "style": "アートスタイル",
  "composition": "構図",
  "lighting": "照明",
  "color_palette": "カラー",
  "mood": "雰囲気",
  "technical": "技術仕様",
  "full_prompt": "完全な英語プロンプト",
  "negative_prompt": "除外要素",
  "tags": ["タグ1", "タグ2"]
}`,
}

export interface StructuredPrompt {
  subject: string
  style: string
  composition: string
  lighting: string
  color_palette: string
  mood: string
  technical: string
  full_prompt: string
  negative_prompt: string
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

// ── 生图（Gemini Image Generation）──────────────────────────────────────────

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
