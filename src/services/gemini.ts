import type { AIAnalysisResult, Language } from './types'

// 识图：Gemini 3 Flash
const VISION_MODEL = 'gemini-3-flash-preview'
// 生图：Nano Banana 2
const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview'

const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

/**
 * 提示词方法论：莲生"偷图神技"
 * 输出完整 JSON 结构化分析，直接用于 AI 生图（SD/MJ/Flux/Sora）
 * JSON 本身即为 prompt，无需再提取单独字段
 */

const STYLE_EXTRACTION_PROMPT_ZH = `你是一个专业的视觉分析师。分析这张图片，输出完整的视觉风格 JSON 数据。

【输出要求】
- 只输出 JSON，不要任何解释文字，不要 markdown 代码块标记
- JSON 必须完整、合法、可被直接 parse
- 所有字段都需要填写，不要留空

输出以下 JSON 结构：
{
  "visual_style_analysis": {
    "overall_aesthetic": {
      "theme": "视觉主题（如：现代极简科技、赛博朋克霓虹、复古胶片摄影）",
      "tone": "整体基调（如：专业干净、暗黑魔幻、温暖治愈）",
      "target_vibe": "目标氛围关键词，3-5个，用于 prompt（如：cinematic, moody, editorial）"
    },
    "color_palette": {
      "background": {
        "primary": "#XXXXXX",
        "description": "背景色描述和质感"
      },
      "brand_colors": [
        { "name": "颜色名", "hex": "#XXXXXX", "usage": "在画面中的用途" }
      ],
      "text_colors": {
        "primary": "#XXXXXX",
        "secondary": "#XXXXXX"
      },
      "accent_colors": [
        { "name": "颜色名", "hex": "#XXXXXX", "usage": "点缀用途" }
      ],
      "color_harmony": "配色关系（如：高反差对比、类比色系、单色渐变）"
    },
    "composition": {
      "layout": "构图类型（如：中心对称、三分法、满版出血）",
      "focal_point": "视觉焦点位置和内容",
      "white_space": "留白策略（如：大量留白极简、满版密集）",
      "hierarchy": "视觉层级描述（主体→副标题→说明文字）"
    },
    "lighting_and_effects": {
      "lighting_type": "光线类型（如：柔光漫射、硬光棚拍、自然侧光）",
      "shadow": "阴影风格",
      "special_effects": ["特效1（如：景深虚化）", "特效2（如：胶片颗粒）"],
      "post_processing": "后期调色风格（如：低饱和胶片感、高对比HDR）"
    },
    "subject_analysis": {
      "main_subject": "主体描述",
      "supporting_elements": "辅助元素描述",
      "texture": "主要质感（如：哑光金属、皮革纹理）",
      "depth": "空间深度感描述"
    },
    "typography_style": {
      "has_text": true,
      "font_style": "字体风格（如：无衬线现代、粗体展示、手写风格）",
      "text_layout": "文字排版描述"
    },
    "ai_generation_prompt": {
      "positive_prompt_en": "完整英文生图提示词，直接用于 Midjourney/Stable Diffusion/Flux，包含：主体描述 + 风格词 + 光线 + 色彩 + 质感 + 技术参数，格式：主体, 风格词1, 风格词2, 光线描述, 色彩描述, --ar 1:1",
      "positive_prompt_zh": "对应中文生图提示词",
      "negative_prompt": "negative prompt: blurry, deformed, bad anatomy, low quality, watermark, text overlay",
      "style_tags": ["风格标签1", "风格标签2", "风格标签3", "风格标签4", "风格标签5"]
    }
  }
}`

const STYLE_EXTRACTION_PROMPT_EN = `You are a professional visual analyst. Analyze this image and output a complete visual style JSON.

REQUIREMENTS:
- Output JSON only, no explanations, no markdown code blocks
- All fields must be filled, no empty values

Output this JSON structure:
{
  "visual_style_analysis": {
    "overall_aesthetic": {
      "theme": "Visual theme (e.g. Modern Minimalist Tech, Cyberpunk Neon, Vintage Film Photography)",
      "tone": "Overall tone (e.g. Professional Clean, Dark Fantasy, Warm Healing)",
      "target_vibe": "3-5 atmosphere keywords for prompt (e.g. cinematic, moody, editorial)"
    },
    "color_palette": {
      "background": {
        "primary": "#XXXXXX",
        "description": "Background color description and texture"
      },
      "brand_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "usage": "Usage in composition" }
      ],
      "text_colors": {
        "primary": "#XXXXXX",
        "secondary": "#XXXXXX"
      },
      "accent_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "usage": "Accent purpose" }
      ],
      "color_harmony": "Color relationship (e.g. High Contrast, Analogous, Monochromatic gradient)"
    },
    "composition": {
      "layout": "Composition type (e.g. Center-weighted, Rule of thirds, Full-bleed)",
      "focal_point": "Focal point position and content",
      "white_space": "White space strategy (e.g. Generous negative space, Dense full coverage)",
      "hierarchy": "Visual hierarchy (Hero → Subheading → Body copy)"
    },
    "lighting_and_effects": {
      "lighting_type": "Lighting type (e.g. Soft diffused, Hard studio, Natural side light)",
      "shadow": "Shadow style",
      "special_effects": ["Effect 1 (e.g. Shallow DOF bokeh)", "Effect 2 (e.g. Film grain)"],
      "post_processing": "Color grading (e.g. Desaturated film look, High-contrast HDR)"
    },
    "subject_analysis": {
      "main_subject": "Main subject description",
      "supporting_elements": "Supporting elements",
      "texture": "Primary texture (e.g. Matte metal, Leather grain)",
      "depth": "Spatial depth description"
    },
    "typography_style": {
      "has_text": true,
      "font_style": "Font style (e.g. Sans-serif modern, Bold display, Handwritten)",
      "text_layout": "Text layout description"
    },
    "ai_generation_prompt": {
      "positive_prompt_en": "Complete English prompt for Midjourney/Stable Diffusion/Flux: subject description + style words + lighting + color + texture + technical params, format: subject, style1, style2, lighting, color, --ar 1:1",
      "positive_prompt_zh": "Corresponding Chinese generation prompt",
      "negative_prompt": "negative prompt: blurry, deformed, bad anatomy, low quality, watermark, text overlay",
      "style_tags": ["style tag1", "style tag2", "style tag3", "style tag4", "style tag5"]
    }
  }
}`

const STYLE_EXTRACTION_PROMPT_JA = STYLE_EXTRACTION_PROMPT_EN

const PROMPTS: Record<string, string> = {
  zh: STYLE_EXTRACTION_PROMPT_ZH,
  en: STYLE_EXTRACTION_PROMPT_EN,
  ja: STYLE_EXTRACTION_PROMPT_JA,
}

export interface VisualStyleData {
  overall_aesthetic?: {
    theme: string
    tone: string
    target_vibe: string
  }
  color_palette?: {
    background?: { primary: string; description: string }
    brand_colors?: Array<{ name: string; hex: string; usage: string }>
    text_colors?: { primary: string; secondary?: string }
    accent_colors?: Array<{ name: string; hex: string; usage: string }>
    color_harmony?: string
  }
  composition?: {
    layout?: string
    focal_point?: string
    white_space?: string
    hierarchy?: string
  }
  lighting_and_effects?: {
    lighting_type?: string
    shadow?: string
    special_effects?: string[]
    post_processing?: string
  }
  subject_analysis?: {
    main_subject?: string
    supporting_elements?: string
    texture?: string
    depth?: string
  }
  typography_style?: {
    has_text: boolean
    font_style?: string
    text_layout?: string
  }
  ai_generation_prompt?: {
    positive_prompt_en: string
    positive_prompt_zh: string
    negative_prompt: string
    style_tags: string[]
  }
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
  visual_style?: VisualStyleData
  /** 原始完整 JSON 字符串，用于展示 */
  raw_json?: string
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

  const promptText = PROMPTS[language] ?? PROMPTS.zh
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
        temperature: 0.3,
        maxOutputTokens: 8192,
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
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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

export type AIAnalysisResult = {
  prompt: string
  tags: string[]
  structured?: StructuredPrompt
}

function parseStructuredResponse(text: string): AIAnalysisResult {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    const vsa = parsed.visual_style_analysis ?? parsed.visual_style ?? {}
    const gen = vsa.ai_generation_prompt ?? vsa.prompts ?? {}

    const structured: StructuredPrompt = {
      subject: vsa.subject_analysis?.main_subject ?? vsa.subjects_and_props?.subject?.description ?? '',
      subject_zh: vsa.subject_analysis?.main_subject ?? '',
      style: vsa.overall_aesthetic?.theme ?? vsa.overall_concept?.theme ?? '',
      composition: vsa.composition?.layout ?? vsa.composition?.layout_type ?? '',
      lighting: vsa.lighting_and_effects?.lighting_type ?? vsa.effects_and_textures?.lighting?.type ?? '',
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
      prompt: structured.full_prompt || cleaned,
      tags: structured.tags,
      structured,
    }
  } catch {
    return {
      prompt: text,
      tags: [],
      structured: {
        subject: '', subject_zh: '', style: '', composition: '',
        lighting: '', color_palette: '', mood: '', technical: '',
        full_prompt: text, full_prompt_zh: '', negative_prompt: '', negative_prompt_zh: '',
        tags: [], raw_json: text,
      },
    }
  }
}
