// Types shared across the extension

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

export interface HistoryItem {
  id: string
  imageUrl: string
  imageBase64?: string | null
  prompt: string
  tags: string[]
  model: ModelType
  createdAt: number
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
}
