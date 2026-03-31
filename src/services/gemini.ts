import type { AIAnalysisResult, Language } from './types'

// 使用最新可用的 Gemini Flash 模型
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// 结构化 Prompt，提升文生图还原度
const SYSTEM_PROMPT = `你是世界顶级的 AI 绘图提示词工程师。请深度分析图片，生成一个专业级别的文生图提示词 JSON。

JSON 结构如下（所有字段用英文）：
{
  "subject": "主体描述，包含人物/物体/场景的详细特征",
  "style": "艺术风格，如 photorealistic, oil painting, anime, cinematic 等",
  "composition": "构图方式，如 portrait, wide shot, close-up, rule of thirds 等",
  "lighting": "光线描述，如 golden hour, studio lighting, rim light, dramatic shadows 等",
  "color_palette": "主色调，如 warm tones, monochrome, vibrant, pastel 等",
  "mood": "氛围，如 mysterious, cheerful, melancholic, epic 等",
  "technical": "技术参数，如 8K, ultra detailed, sharp focus, bokeh 等",
  "full_prompt": "将以上所有要素整合成一段完整的英文提示词，适合直接用于 Stable Diffusion / Midjourney",
  "negative_prompt": "需要排除的元素，如 blurry, deformed, low quality 等",
  "tags": ["风格标签1", "风格标签2", "风格标签3"]
}

只返回 JSON，不要有任何其他文字、markdown 代码块标记。`

const SYSTEM_PROMPT_EN = `You are a world-class AI image prompt engineer. Deeply analyze this image and generate a professional text-to-image prompt JSON.

JSON structure (all fields in English):
{
  "subject": "Main subject description with detailed characteristics",
  "style": "Art style, e.g. photorealistic, oil painting, anime, cinematic",
  "composition": "Composition, e.g. portrait, wide shot, close-up, rule of thirds",
  "lighting": "Lighting, e.g. golden hour, studio lighting, rim light, dramatic shadows",
  "color_palette": "Color palette, e.g. warm tones, monochrome, vibrant, pastel",
  "mood": "Mood/atmosphere, e.g. mysterious, cheerful, melancholic, epic",
  "technical": "Technical specs, e.g. 8K, ultra detailed, sharp focus, bokeh",
  "full_prompt": "Complete English prompt combining all above elements",
  "negative_prompt": "Elements to exclude, e.g. blurry, deformed, low quality",
  "tags": ["tag1", "tag2", "tag3"]
}

Return ONLY valid JSON, no markdown, no extra text.`

const SYSTEM_PROMPT_JA = `あなたは世界最高水準のAI画像プロンプトエンジニアです。この画像を深く分析し、プロ級のプロンプトJSONを生成してください。

JSON構造（全フィールドは英語）:
{
  "subject": "メインの被写体の詳細な説明",
  "style": "アートスタイル（例: photorealistic, anime, cinematic）",
  "composition": "構図（例: portrait, wide shot, close-up）",
  "lighting": "照明（例: golden hour, studio lighting）",
  "color_palette": "カラーパレット（例: warm tones, monochrome）",
  "mood": "雰囲気（例: mysterious, cheerful, epic）",
  "technical": "技術仕様（例: 8K, ultra detailed）",
  "full_prompt": "全要素を統合した完全な英語プロンプト",
  "negative_prompt": "除外要素（例: blurry, deformed）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}

JSONのみを返してください。`

const PROMPTS: Record<string, string> = {
  zh: SYSTEM_PROMPT,
  en: SYSTEM_PROMPT_EN,
  ja: SYSTEM_PROMPT_JA,
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

export async function analyzeImageWithGemini(
  base64: string | null,
  imageUrl: string,
  apiKey: string,
  language: Language = 'zh'
): Promise<AIAnalysisResult & { structured?: StructuredPrompt }> {
  if (!apiKey) throw new Error('请先在设置中配置 Gemini API Key')

  // Gemini 不支持外部 URL，必须用 base64
  // 如果没有 base64，尝试通过 fetch 获取（限制：某些图片可能因 CORS 失败）
  let imageData = base64
  if (!imageData) {
    try {
      imageData = await fetchImageAsBase64(imageUrl)
    } catch {
      throw new Error('无法获取图片数据，请尝试右键图片重新选择（Gemini 不支持外部 URL）')
    }
  }

  if (!imageData) {
    throw new Error('图片数据为空，请重试')
  }

  const promptText = PROMPTS[language] ?? SYSTEM_PROMPT

  // Detect mime type from base64 prefix or default to jpeg
  const mimeType = detectMimeType(imageData)

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageData,
              },
            },
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
    throw new Error(`Gemini API 错误: ${response.status} ${msg}`)
  }

  const data = await response.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  return parseStructuredResponse(text)
}

export async function continueChat(
  messages: Array<{ role: string; content: string }>,
  imageBase64: string | null,
  imageUrl: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('请先配置 Gemini API Key')

  let imageData = imageBase64
  if (!imageData && imageUrl) {
    try {
      imageData = await fetchImageAsBase64(imageUrl)
    } catch {
      // continue without image
    }
  }

  // Build conversation history
  const contents = messages.map((msg, i) => {
    const parts: object[] = [{ text: msg.content }]
    // Attach image to first user message
    if (i === 0 && imageData) {
      parts.unshift({
        inline_data: {
          mime_type: detectMimeType(imageData),
          data: imageData,
        },
      })
    }
    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts,
    }
  })

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Gemini API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── helpers ──────────────────────────────────────────────────────────────────

function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBOR')) return 'image/png'
  if (base64.startsWith('R0lGO')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg' // default
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Strip data URL prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function parseStructuredResponse(text: string): AIAnalysisResult & { structured?: StructuredPrompt } {
  // Clean up any accidental markdown fences
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as StructuredPrompt & { tags?: string[] }

    const fullPrompt = parsed.full_prompt ?? cleaned

    // Build display prompt (show full_prompt prominently)
    const displayPrompt = [
      parsed.full_prompt,
      parsed.negative_prompt ? `\n\n❌ Negative: ${parsed.negative_prompt}` : '',
    ]
      .filter(Boolean)
      .join('')

    return {
      prompt: displayPrompt || fullPrompt,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      structured: parsed as StructuredPrompt,
    }
  } catch {
    return { prompt: text, tags: [] }
  }
}
