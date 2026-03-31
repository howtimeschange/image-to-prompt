import { create } from 'zustand'
import type { ChatMessage, HistoryItem, Language, ModelType, Settings } from '../services/types'

interface AppState {
  // Current image
  currentImageUrl: string | null
  currentImageBase64: string | null

  // AI result
  prompt: string
  tags: string[]
  isLoading: boolean
  error: string | null

  // Chat
  messages: ChatMessage[]

  // UI state
  language: Language
  model: ModelType
  activeTab: 'chat' | 'history'
  showSettings: boolean

  // History
  history: HistoryItem[]

  // Settings
  settings: Settings

  // Actions
  setImage: (url: string, base64: string | null) => void
  setPrompt: (prompt: string) => void
  setTags: (tags: string[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  setLanguage: (lang: Language) => void
  setModel: (model: ModelType) => void
  setActiveTab: (tab: 'chat' | 'history') => void
  setShowSettings: (show: boolean) => void
  addToHistory: (item: HistoryItem) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
  updateSettings: (settings: Partial<Settings>) => void
  loadFromStorage: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  currentImageUrl: null,
  currentImageBase64: null,
  prompt: '',
  tags: [],
  isLoading: false,
  error: null,
  messages: [],
  language: 'zh',
  model: 'gemini-flash',
  activeTab: 'chat',
  showSettings: false,
  history: [],
  settings: {
    model: 'gemini-flash',
    geminiApiKey: '',
    minimaxApiKey: '',
    language: 'zh',
  },

  setImage: (url, base64) => set({ currentImageUrl: url, currentImageBase64: base64 }),
  setPrompt: (prompt) => set({ prompt }),
  setTags: (tags) => set({ tags }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [], prompt: '', tags: '', error: null } as any),

  setLanguage: (language) => {
    set({ language })
    chrome.storage.local.set({ 'settings.language': language })
  },

  setModel: (model) => {
    set({ model })
    chrome.storage.local.set({ 'settings.model': model })
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setShowSettings: (showSettings) => set({ showSettings }),

  addToHistory: (item) => {
    const history = [item, ...get().history].slice(0, 100)
    set({ history })
    chrome.storage.local.set({ history })
  },

  removeFromHistory: (id) => {
    const history = get().history.filter((h) => h.id !== id)
    set({ history })
    chrome.storage.local.set({ history })
  },

  clearHistory: () => {
    set({ history: [] })
    chrome.storage.local.set({ history: [] })
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    set({ settings, model: settings.model, language: settings.language })
    chrome.storage.local.set({ settings })
  },

  loadFromStorage: async () => {
    const data = await chrome.storage.local.get(['settings', 'history', 'currentImageUrl', 'currentImageBase64', 'pendingImage'])

    if (data.settings) {
      set({
        settings: data.settings,
        model: data.settings.model ?? 'gemini-flash',
        language: data.settings.language ?? 'zh',
      })
    }

    if (data.history) {
      set({ history: data.history })
    }

    if (data.pendingImage && data.currentImageUrl) {
      set({
        currentImageUrl: data.currentImageUrl,
        currentImageBase64: data.currentImageBase64 ?? null,
      })
      // Clear the pending flag
      chrome.storage.local.remove(['pendingImage'])
    }
  },
}))
