import type { AIAnalysisResult, Language } from './types'

const MINIMAX_ENDPOINT = 'https://api.minimax.chat/v1/text/chatcompletion_v2'

const PROMPT_TEMPLATE = {
  zh: `你是一个专业的 AI 绘图提示词专家。请分析这张图片，生成一个详细的英文绘图提示词（Prompt），并提取中文风格标签。

请以 JSON 格式返回：
{"prompt": "详细英文 Prompt", "tags": ["标签1", "标签2", "标签3"]}

只返回 JSON。`,
  en: `Analyze this image and generate a detailed English drawing prompt with style tags. Return JSON only: {"prompt": "...", "tags": [...]}`,
  ja: `この画像を分析し、詳細な英語プロンプトとタグを生成してください。JSONのみ: {"prompt": "...", "tags": [...]}`,
}

export async function analyzeImageWithMinimax(
  base64: string | null,
  imageUrl: string,
  apiKey: string,
  language: Language = 'zh'
): Promise<AIAnalysisResult> {
  if (!apiKey) throw new Error('请先在设置中配置 MiniMax API Key')

  const imageSource = base64
    ? `data:image/jpeg;base64,${base64}`
    : imageUrl

  const response = await fetch(MINIMAX_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-VL-01',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageSource } },
            { type: 'text', text: PROMPT_TEMPLATE[language] },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`MiniMax API 错误: ${response.status} ${JSON.stringify(err)}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  try {
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
