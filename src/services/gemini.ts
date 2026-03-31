import type { AIAnalysisResult, Language } from './types'

// 识图：Gemini 3 Flash
const VISION_MODEL = 'gemini-3-flash-preview'
// 生图：Nano Banana 2
const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview'

const VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
const IMAGE_GEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_GEN_MODEL}:generateContent`

/**
 * 提示词方法论（参考：莲生的碎碎念"偷图神技"）
 * 核心思路：将图像视觉风格提取为 JSON 结构化数据，捕捉颜色、排版、构图、效果，
 * 以便精准复用和克隆该风格。
 *
 * JSON 结构：
 *   visual_style
 *     overall_concept    — 主题 / mood / 关键词
 *     color_palette      — 主色(hex) / 点缀色(hex) / 背景色 / 配色和谐方式
 *     typography         — 是否有文字 / 字体风格 / 特效
 *     composition        — 构图类型 / 焦点 / 机位 / 景深 / 姿势平衡
 *     effects_and_textures — 质感 / 光线方向与类型 / 后期风格
 *     subjects_and_props — 主体描述 / 道具 / 主体与道具的关系张力
 *   prompts
 *     full_prompt        — 整合所有要素的完整英文提示词（直接用于 SD/MJ/Nano Banana）
 *     full_prompt_zh     — 同上的中文版
 *     negative_prompt    — 英文负向提示词
 *     negative_prompt_zh — 中文负向提示词
 *     keywords           — 风格关键词 tags
 */

const STYLE_EXTRACTION_PROMPT_ZH = `将此视觉风格提取为 JSON 结构化数据：颜色、排版、构图、效果...

只输出如下结构的 JSON，不要有任何额外文字或 markdown 代码块标记：

{
  "visual_style": {
    "overall_concept": {
      "theme": "核心主题风格名称（中英文）",
      "mood": "氛围描述（如：严肃的滑稽、冷幽默、复古怀旧）",
      "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"]
    },
    "color_palette": {
      "dominant_colors": [
        { "name": "颜色名（中英）", "hex": "#XXXXXX", "description": "该颜色在画面中的作用和比重" }
      ],
      "accent_colors": [
        { "name": "颜色名（中英）", "hex": "#XXXXXX", "description": "点缀色的视觉作用" }
      ],
      "background_color": { "name": "颜色名", "hex": "#XXXXXX", "description": "背景色描述" },
      "color_harmony": "配色和谐方式（如：高反差对比、类比配色、单色渐变）"
    },
    "typography": {
      "has_text": true或false,
      "text_elements": [
        { "content": "文字内容", "location": "位置", "font_style": { "family": "字体类别", "characteristics": "字体特征", "color": "颜色", "effect": "特效" } }
      ]
    },
    "composition": {
      "layout_type": "构图类型（如：中心对称、三分法、对角线）",
      "focal_point": "视觉焦点描述",
      "camera_angle": "机位（如：低平视角、俯视、平视）",
      "depth_of_field": "景深（如：浅景深背景虚化、全清晰）",
      "pose_and_balance": "姿势与画面平衡描述"
    },
    "effects_and_textures": {
      "texture": ["质感1（如：浓重胶片颗粒感）", "质感2（如：老照片柔焦）"],
      "lighting": {
        "type": "光线类型（如：自然光漫反射、棚拍硬光）",
        "direction": "光线方向与投影描述"
      },
      "post_processing_vibe": "后期处理风格（如：复古胶片扫描、HDR、黑白高对比）"
    },
    "subjects_and_props": {
      "subject": { "description": "主体描述", "attire": "服装/外观", "expression": "表情/神态" },
      "prop": { "description": "道具或环境描述" },
      "interaction": "主体与道具/环境之间的关系张力或反差"
    }
  },
  "prompts": {
    "full_prompt": "整合以上所有视觉要素的完整英文提示词，可直接用于 Stable Diffusion / Midjourney / Nano Banana 2",
    "full_prompt_zh": "完整中文提示词，与 full_prompt 内容等价，方便理解和二次修改",
    "negative_prompt": "blurry, deformed, low quality, bad anatomy, watermark",
    "negative_prompt_zh": "模糊、变形、低质量、解剖错误、水印",
    "keywords": ["风格标签1", "风格标签2", "风格标签3"]
  }
}`

const STYLE_EXTRACTION_PROMPT_EN = `Extract this visual style as structured JSON data: colors, typography, composition, effects...

Output ONLY the following JSON structure, no extra text or markdown:

{
  "visual_style": {
    "overall_concept": {
      "theme": "Core visual style name",
      "mood": "Mood description",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    },
    "color_palette": {
      "dominant_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "description": "Role in composition" }
      ],
      "accent_colors": [
        { "name": "Color name", "hex": "#XXXXXX", "description": "Accent role" }
      ],
      "background_color": { "name": "Color name", "hex": "#XXXXXX", "description": "Background description" },
      "color_harmony": "Color harmony method (e.g. High Contrast, Analogous, Monochromatic)"
    },
    "typography": {
      "has_text": true or false,
      "text_elements": [
        { "content": "text", "location": "position", "font_style": { "family": "font family", "characteristics": "traits", "color": "color", "effect": "effect" } }
      ]
    },
    "composition": {
      "layout_type": "Composition type (e.g. Center-weighted, Rule of thirds, Diagonal)",
      "focal_point": "Visual focal point description",
      "camera_angle": "Camera angle (e.g. Low-level, Bird's eye, Eye-level)",
      "depth_of_field": "Depth of field (e.g. Shallow DOF with bokeh, Deep focus)",
      "pose_and_balance": "Pose and visual balance"
    },
    "effects_and_textures": {
      "texture": ["texture1 (e.g. Heavy Film Grain)", "texture2 (e.g. Soft Focus)"],
      "lighting": {
        "type": "Lighting type (e.g. Natural diffused, Studio hard light)",
        "direction": "Direction and shadow description"
      },
      "post_processing_vibe": "Post-processing style (e.g. Vintage film scan, HDR, High-contrast B&W)"
    },
    "subjects_and_props": {
      "subject": { "description": "Subject description", "attire": "Outfit/appearance", "expression": "Expression/demeanor" },
      "prop": { "description": "Prop or environment" },
      "interaction": "Tension or contrast between subject and prop/environment"
    }
  },
  "prompts": {
    "full_prompt": "Complete English prompt integrating all visual elements, ready for Stable Diffusion / Midjourney / Nano Banana 2",
    "full_prompt_zh": "中文完整提示词",
    "negative_prompt": "blurry, deformed, low quality, bad anatomy, watermark",
    "negative_prompt_zh": "模糊、变形、低质量、解剖错误、水印",
    "keywords": ["style tag1", "style tag2", "style tag3"]
  }
}`

const STYLE_EXTRACTION_PROMPT_JA = `この画像のビジュアルスタイルをJSON構造化データとして抽出してください：色、タイポグラフィ、構図、エフェクト...

以下のJSON構造のみを出力し、余分なテキストやmarkdownは含めないでください：

{
  "visual_style": {
    "overall_concept": { "theme": "スタイル名", "mood": "雰囲気", "keywords": ["キーワード1", "キーワード2"] },
    "color_palette": {
      "dominant_colors": [{ "name": "色名", "hex": "#XXXXXX", "description": "役割" }],
      "accent_colors": [{ "name": "色名", "hex": "#XXXXXX", "description": "役割" }],
      "background_color": { "name": "色名", "hex": "#XXXXXX", "description": "説明" },
      "color_harmony": "配色の調和方法"
    },
    "typography": { "has_text": true, "text_elements": [] },
    "composition": { "layout_type": "構図タイプ", "focal_point": "焦点", "camera_angle": "カメラアングル", "depth_of_field": "被写界深度", "pose_and_balance": "バランス" },
    "effects_and_textures": { "texture": ["テクスチャ1"], "lighting": { "type": "照明タイプ", "direction": "方向" }, "post_processing_vibe": "後処理スタイル" },
    "subjects_and_props": { "subject": { "description": "説明", "attire": "服装", "expression": "表情" }, "prop": { "description": "小道具" }, "interaction": "相互作用" }
  },
  "prompts": {
    "full_prompt": "Complete English prompt for SD/MJ/Nano Banana 2",
    "full_prompt_zh": "中文完整提示词",
    "negative_prompt": "blurry, deformed, low quality",
    "negative_prompt_zh": "模糊、变形、低质量",
    "keywords": ["tag1", "tag2", "tag3"]
  }
}`

const PROMPTS: Record<string, string> = {
  zh: STYLE_EXTRACTION_PROMPT_ZH,
  en: STYLE_EXTRACTION_PROMPT_EN,
  ja: STYLE_EXTRACTION_PROMPT_JA,
}

export interface VisualStyleData {
  overall_concept: {
    theme: string
    mood: string
    keywords: string[]
  }
  color_palette: {
    dominant_colors: Array<{ name: string; hex: string; description: string }>
    accent_colors: Array<{ name: string; hex: string; description: string }>
    background_color: { name: string; hex: string; description: string }
    color_harmony: string
  }
  typography: {
    has_text: boolean
    text_elements: Array<any>
  }
  composition: {
    layout_type: string
    focal_point: string
    camera_angle: string
    depth_of_field: string
    pose_and_balance: string
  }
  effects_and_textures: {
    texture: string[]
    lighting: { type: string; direction: string }
    post_processing_vibe: string
  }
  subjects_and_props: {
    subject: { description: string; attire: string; expression: string }
    prop: { description: string }
    interaction: string
  }
}

export interface StructuredPrompt {
  // 兼容旧字段（直接访问）
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
  // 新增：完整视觉风格数据
  visual_style?: VisualStyleData
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
        temperature: 0.4,
        maxOutputTokens: 4096,
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
    const parsed = JSON.parse(cleaned)
    const vs: VisualStyleData = parsed.visual_style ?? {}
    const pr = parsed.prompts ?? {}

    // 将新结构映射到兼容字段
    const structured: StructuredPrompt = {
      subject: vs.subjects_and_props?.subject?.description ?? '',
      subject_zh: vs.subjects_and_props?.subject?.description ?? '',
      style: vs.overall_concept?.theme ?? '',
      composition: vs.composition?.layout_type ?? '',
      lighting: vs.effects_and_textures?.lighting?.type ?? '',
      color_palette: vs.color_palette?.color_harmony ?? '',
      mood: vs.overall_concept?.mood ?? '',
      technical: vs.effects_and_textures?.texture?.join(', ') ?? '',
      full_prompt: pr.full_prompt ?? '',
      full_prompt_zh: pr.full_prompt_zh ?? '',
      negative_prompt: pr.negative_prompt ?? '',
      negative_prompt_zh: pr.negative_prompt_zh ?? '',
      tags: Array.isArray(pr.keywords) ? pr.keywords : [],
      visual_style: vs,
    }

    return {
      prompt: structured.full_prompt || cleaned,
      tags: structured.tags,
      structured,
    }
  } catch {
    return { prompt: text, tags: [] }
  }
}
