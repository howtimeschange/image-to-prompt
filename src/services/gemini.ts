import type { AIAnalysisResult, Language } from './types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const PROMPT_TEMPLATE = {
  zh: `你是一个专业的 AI 绘图提示词专家。请分析这张图片，生成一个详细的英文绘图提示词（Prompt），并提取中文风格标签。

请以 JSON 格式返回，结构如下：
{
  "prompt": "详细的英文 Prompt，包含画面描述、风格、光线、构图等要素",
  "tags": ["风格标签1", "风格标签2", "风格标签3"]
}

只返回 JSON，不要有其他文字。`,
  en: `You are a professional AI image prompt expert. Analyze this image and generate a detailed English drawing prompt, along with style tags.

Return JSON only:
{
  "prompt": "detailed English prompt with scene description, style, lighting, composition",
  "tags": ["tag1", "tag2", "tag3"]
}`,
  ja: `あなたはプロのAI画像プロンプトエキスパートです。この画像を分析し、詳細な英語プロンプトと日本語スタイルタグを生成してください。

JSONのみ返してください：
{
  "prompt": "detailed English prompt",
  "tags": ["タグ1", "タグ2", "タグ3"]
}`,
}

export async function analyzeImageWithGemini(
  base64: string | null,
  imageUrl: string,
  apiKey: string,
  language: Language = 'zh'
): Promise<AIAnalysisResult> {
  if (!apiKey) throw new Error('请先在设置中配置 Gemini API Key')

  const promptText = PROMPT_TEMPLATE[language]

  let imageContent: object

  if (base64) {
    // Detect mime type from base64 header or default to jpeg
    imageContent = {
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64,
      },
    }
  } else {
    // Use URL directly (some images may not be fetchable as base64)
    imageContent = {
      file_data: {
        file_uri: imageUrl,
      },
    }
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            imageContent,
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Gemini API 错误: ${response.status} ${JSON.stringify(err)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      prompt: parsed.prompt ?? text,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    }
  } catch {
    return { prompt: text, tags: [] }
  }
}

export async function continueChat(
  messages: Array<{ role: string; content: string }>,
  imageBase64: string | null,
  imageUrl: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('请先配置 Gemini API Key')

  const contents = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))

  // Attach image to first user message if available
  if (imageBase64 && contents[0]) {
    contents[0].parts.unshift({
      // @ts-ignore
      inline_data: { mime_type: 'image/jpeg', data: imageBase64 },
    })
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })

  if (!response.ok) throw new Error(`Gemini API 错误: ${response.status}`)

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
