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

const STYLE_EXTRACTION_PROMPT_ZH = `你是一个专业视觉分析师，擅长将图像风格拆解为可被 AI 精确复现的结构化数据。

分析这张图片，输出完整的视觉风格 JSON 数据存档。

【核心原则】
- 这个 JSON 是"风格克隆档案"，不是提示词本身
- 后续使用方式：把这个 JSON 贴给 AI 模型，说"请按照此 JSON 风格，生成一张[新主题]的图像"
- 因此每个字段都必须足够精确，能让 AI 模型还原原图的视觉感受
- 只输出 JSON，不要任何解释文字，不要 markdown 代码块

输出以下 JSON 结构（字段说明已内嵌为注释，实际输出不含注释）：
{
  "visual_style": {
    "overall_concept": {
      "theme": "核心主题风格名（中英文，如：荒诞喜剧 / Absurdist Humor）",
      "mood": "氛围描述（如：严肃的滑稽、冷幽默、复古怀旧）",
      "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
    },
    "color_palette": {
      "dominant_colors": [
        { "name": "颜色名（中英）", "hex": "#XXXXXX", "description": "该颜色占多少面积、用在哪里、视觉作用" }
      ],
      "accent_colors": [
        { "name": "颜色名（中英）", "hex": "#XXXXXX", "description": "点缀色在哪里出现、视觉作用" }
      ],
      "background_color": { "name": "颜色名", "hex": "#XXXXXX", "description": "背景色质感描述" },
      "color_harmony": "配色和谐方式（高反差对比 / 类比配色 / 单色渐变 / 互补色等，附简短解释）"
    },
    "typography": {
      "has_text": true,
      "text_elements": [
        {
          "content": "文字内容",
          "location": "在画面中的位置",
          "font_style": {
            "family": "字体类别（衬线/无衬线/手写/展示体）",
            "characteristics": "具体特征描述",
            "color": "颜色",
            "effect": "特效（如：涂装质感、发光、阴影）"
          }
        }
      ]
    },
    "composition": {
      "layout_type": "构图类型（中心对称 / 三分法 / 对角线 / 满版出血 / 框架式等）",
      "focal_point": "视觉焦点：位置 + 内容 + 为什么吸引眼球",
      "camera_angle": "机位描述（低平视角 / 俯视 / 仰视 / 平视 / 特写等）",
      "depth_of_field": "景深（浅景深背景虚化Bokeh / 全清晰 / 极浅前景虚化等）",
      "pose_and_balance": "主体姿势和画面平衡感描述"
    },
    "effects_and_textures": {
      "texture": ["质感1（如：浓重胶片颗粒感 Heavy Film Grain）", "质感2（如：老照片柔焦 Soft Focus）"],
      "lighting": {
        "type": "光线类型（自然光漫反射 / 棚拍硬光 / 侧逆光 / 低调暗光等）",
        "direction": "光源方向和投影描述"
      },
      "post_processing_vibe": "后期调色风格（如：复古胶片扫描感、低饱和冷色调、HDR高对比、色差效果等）"
    },
    "subjects_and_props": {
      "subject": {
        "description": "主体是什么，外观特征细节",
        "attire": "服装/外观/材质细节",
        "expression": "表情/神态/动作细节"
      },
      "prop": { "description": "道具或环境的细节描述" },
      "interaction": "主体与道具/环境之间的关系、张力或反差（这是幽默感/情绪的来源）"
    },
    "reproduction_prompt": {
      "usage_note": "将整个 visual_style 字段贴给 AI 模型，说：请严格按照以下 JSON 数据中描述的视觉风格、色彩、构图和光影，生成一张【替换为你的新主题】的图像：[粘贴 JSON]",
      "style_essence_en": "一句话总结该风格的英文精髓（用于单独作为提示词前缀，如：absurdist humor photography, vintage film grain, low-angle street shot, high contrast dark tones）",
      "style_essence_zh": "一句话总结该风格的中文精髓",
      "negative_prompt": "blurry, deformed, bad anatomy, low quality, watermark, text overlay, overexposed, chromatic aberration",
      "style_tags": ["标签1", "标签2", "标签3", "标签4", "标签5", "标签6"]
    }
  }
}`

const STYLE_EXTRACTION_PROMPT_EN = `You are a professional visual analyst specializing in deconstructing image styles into structured data that AI models can precisely replicate.

Analyze this image and output a complete visual style JSON archive.

KEY PRINCIPLE:
- This JSON is a "style clone archive", NOT a generation prompt itself
- Usage: paste this JSON to an AI model with: "Please generate an image of [new subject] strictly following the visual style, colors, composition and lighting described in this JSON: [paste JSON]"
- Every field must be precise enough for an AI to reconstruct the original visual feeling
- Output JSON only, no explanations, no markdown code blocks

Output this JSON structure:
{
  "visual_style": {
    "overall_concept": {
      "theme": "Core theme name (e.g. Absurdist Humor / 荒诞喜剧)",
      "mood": "Mood description (e.g. deadpan comedy, cold humor, vintage nostalgia)",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
    },
    "color_palette": {
      "dominant_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "description": "Coverage area, placement, visual role" }
      ],
      "accent_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "description": "Where it appears, visual impact" }
      ],
      "background_color": { "name": "Color name", "hex": "#XXXXXX", "description": "Background texture and feel" },
      "color_harmony": "Color harmony method (High Contrast / Analogous / Monochromatic / Complementary, with brief explanation)"
    },
    "typography": {
      "has_text": true,
      "text_elements": [
        {
          "content": "text content",
          "location": "position in frame",
          "font_style": {
            "family": "font category (serif/sans-serif/handwritten/display)",
            "characteristics": "specific traits",
            "color": "color",
            "effect": "effects (paint finish, glow, shadow, etc.)"
          }
        }
      ]
    },
    "composition": {
      "layout_type": "Composition type (Center-weighted / Rule of thirds / Diagonal / Full-bleed / Frame-within-frame)",
      "focal_point": "Focal point: position + content + why it draws attention",
      "camera_angle": "Camera angle (Low-level / Bird's eye / Worm's eye / Eye-level / Close-up)",
      "depth_of_field": "DOF (Shallow DOF with bokeh / Deep focus / Extreme shallow foreground blur)",
      "pose_and_balance": "Subject pose and compositional balance"
    },
    "effects_and_textures": {
      "texture": ["Texture 1 (e.g. Heavy Film Grain / Noise)", "Texture 2 (e.g. Soft Focus / Vintage Lens)"],
      "lighting": {
        "type": "Lighting type (Natural diffused / Hard studio / Side backlight / Low-key dark)",
        "direction": "Light source direction and shadow description"
      },
      "post_processing_vibe": "Color grading (e.g. Vintage film scan, Desaturated cool tones, HDR high contrast, chromatic aberration)"
    },
    "subjects_and_props": {
      "subject": {
        "description": "What the subject is, detailed visual characteristics",
        "attire": "Clothing/appearance/material details",
        "expression": "Expression/demeanor/gesture details"
      },
      "prop": { "description": "Detailed prop or environment description" },
      "interaction": "Relationship, tension or contrast between subject and prop/environment (source of humor or emotion)"
    },
    "reproduction_prompt": {
      "usage_note": "Paste the entire visual_style field to an AI model with: Please generate an image of [YOUR NEW SUBJECT] strictly following the visual style, colors, composition and lighting described in this JSON: [paste JSON]",
      "style_essence_en": "One-sentence English style essence (standalone prompt prefix, e.g.: absurdist humor photography, vintage film grain, low-angle street shot, high contrast dark tones)",
      "style_essence_zh": "One-sentence Chinese style essence",
      "negative_prompt": "blurry, deformed, bad anatomy, low quality, watermark, text overlay, overexposed, chromatic aberration",
      "style_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
    }
  }
}`

const STYLE_EXTRACTION_PROMPT_JA = STYLE_EXTRACTION_PROMPT_EN  // fallback to EN for JA

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
    // Support both new schema (visual_style) and legacy (visual_style_analysis)
    const vs = parsed.visual_style ?? parsed.visual_style_analysis ?? {}
    const rp = vs.reproduction_prompt ?? vs.ai_generation_prompt ?? vs.prompts ?? {}

    const structured: StructuredPrompt = {
      subject: vs.subjects_and_props?.subject?.description ?? vs.subject_analysis?.main_subject ?? '',
      subject_zh: vs.subjects_and_props?.subject?.description ?? vs.subject_analysis?.main_subject ?? '',
      style: vs.overall_concept?.theme ?? vs.overall_aesthetic?.theme ?? '',
      composition: vs.composition?.layout_type ?? vs.composition?.layout ?? '',
      lighting: vs.effects_and_textures?.lighting?.type ?? vs.lighting_and_effects?.lighting_type ?? '',
      color_palette: vs.color_palette?.color_harmony ?? '',
      mood: vs.overall_concept?.mood ?? vs.overall_aesthetic?.tone ?? '',
      technical: [
        ...(vs.effects_and_textures?.texture ?? []),
        ...(vs.lighting_and_effects?.special_effects ?? []),
      ].join(', '),
      // style_essence_en: one-liner style summary for quick copy
      full_prompt: rp.style_essence_en ?? rp.positive_prompt_en ?? rp.full_prompt ?? '',
      full_prompt_zh: rp.style_essence_zh ?? rp.positive_prompt_zh ?? rp.full_prompt_zh ?? '',
      negative_prompt: rp.negative_prompt ?? '',
      negative_prompt_zh: rp.negative_prompt ?? '',
      tags: Array.isArray(rp.style_tags) ? rp.style_tags : (Array.isArray(rp.keywords) ? rp.keywords : []),
      visual_style: vs,
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
