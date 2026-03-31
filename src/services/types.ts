export type ModelType = 'gemini-flash' | 'minimax'
export type Language = 'zh' | 'en' | 'ja'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  messages: ChatMessage[]
  imageUrl: string
  imageBase64: string | null
  generatedPrompt: string
  tags: string[]
  createdAt: number
  updatedAt: number
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
  /** 原始完整 JSON 字符串，直接展示给用户 */
  raw_json?: string
}

export interface HistoryItem {
  id: string
  imageUrl: string
  imageBase64?: string | null
  prompt: string
  tags: string[]
  model: ModelType
  createdAt: number
  structured?: StructuredPrompt
}

export interface Settings {
  model: ModelType
  geminiApiKey: string
  minimaxApiKey: string
  language: Language
}

export interface AIAnalysisResult {
  prompt: string
  tags: string[]
  structured?: StructuredPrompt
}
