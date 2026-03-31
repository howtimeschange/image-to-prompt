import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { analyzeImageWithGemini, continueChat as geminiChat } from '../services/gemini'
import { analyzeImageWithMinimax } from '../services/minimax'
import type { ChatMessage } from '../services/types'

export function useAI() {
  const store = useAppStore()

  const analyzeImage = useCallback(async () => {
    const { currentImageUrl, currentImageBase64, model, language, settings } = store

    if (!currentImageUrl) {
      store.setError('没有图片可分析')
      return
    }

    store.setLoading(true)
    store.setError(null)
    store.clearMessages()

    try {
      let result

      if (model === 'gemini-flash') {
        if (!settings.geminiApiKey) {
          throw new Error('请先在设置中配置 Gemini API Key')
        }
        result = await analyzeImageWithGemini(
          currentImageBase64,
          currentImageUrl,
          settings.geminiApiKey,
          language
        )
      } else {
        if (!settings.minimaxApiKey) {
          throw new Error('请先在设置中配置 MiniMax API Key')
        }
        result = await analyzeImageWithMinimax(
          currentImageBase64,
          currentImageUrl,
          settings.minimaxApiKey,
          language
        )
      }

      store.setPrompt(result.prompt)
      store.setTags(result.tags)
      if (result.structured) {
        store.setStructured(result.structured)
      }

      // Add to history
      store.addToHistory({
        id: Date.now().toString(),
        imageUrl: currentImageUrl,
        imageBase64: currentImageBase64,
        prompt: result.structured?.full_prompt ?? result.prompt,
        tags: result.tags,
        model,
        createdAt: Date.now(),
        structured: result.structured,
      })

      // Add initial assistant message
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.structured?.full_prompt ?? result.prompt,
        timestamp: Date.now(),
      }
      store.addMessage(msg)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '分析失败，请重试')
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const sendChatMessage = useCallback(
    async (userText: string) => {
      const { currentImageBase64, currentImageUrl, messages, settings } = store

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      }
      store.addMessage(userMsg)
      store.setLoading(true)
      store.setError(null)

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const reply = await geminiChat(
          allMessages,
          currentImageBase64,
          currentImageUrl ?? '',
          settings.geminiApiKey
        )

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
        }
        store.addMessage(assistantMsg)
        store.setPrompt(reply)
      } catch (err) {
        store.setError(err instanceof Error ? err.message : '对话失败')
      } finally {
        store.setLoading(false)
      }
    },
    [store]
  )

  return { analyzeImage, sendChatMessage }
}
