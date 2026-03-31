import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useAI } from '../hooks/useAI'
import { SettingsPanel } from '../components/SettingsPanel'
import { HistoryList } from '../components/HistoryList'

export default function App() {
  const store = useAppStore()
  const { analyzeImage, sendChatMessage } = useAI()
  const [chatInput, setChatInput] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Load storage on mount
  React.useEffect(() => {
    store.loadFromStorage()
  }, [])

  // Listen for new image from background
  React.useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'IMAGE_SELECTED') {
        store.setImage(message.url, message.base64 ?? null)
        store.setActiveTab('chat')
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    // Also poll storage in case message was sent before sidebar opened
    const poll = setInterval(async () => {
      const data = await chrome.storage.local.get(['pendingImage', 'currentImageUrl', 'currentImageBase64'])
      if (data.pendingImage && data.currentImageUrl) {
        store.setImage(data.currentImageUrl, data.currentImageBase64 ?? null)
        store.setActiveTab('chat')
        chrome.storage.local.remove(['pendingImage'])
      }
    }, 500)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
      clearInterval(poll)
    }
  }, [])

  // Auto-analyze when image changes
  React.useEffect(() => {
    if (store.currentImageUrl && store.messages.length === 0) {
      analyzeImage()
    }
  }, [store.currentImageUrl])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.messages])

  const handleCopy = () => {
    navigator.clipboard.writeText(store.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput.trim())
    setChatInput('')
  }

  const handleLoadHistory = (item: { imageUrl: string; imageBase64?: string | null; prompt: string; tags: string[] }) => {
    store.setImage(item.imageUrl, item.imageBase64 ?? null)
    store.setPrompt(item.prompt)
    store.setTags(item.tags)
    store.setActiveTab('chat')
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f0f0f] text-white">
      <SettingsPanel />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="font-semibold tracking-tight">ImageToPrompt</span>
        </div>
        <button
          onClick={() => store.setShowSettings(true)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          title="设置"
        >
          ⚙️
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {(['chat', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => store.setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              store.activeTab === tab
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'chat' ? '💬 新对话' : '📜 历史记录'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {store.activeTab === 'history' ? (
          <HistoryList onLoadHistory={handleLoadHistory} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Image preview */}
            {store.currentImageUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <img
                  src={store.currentImageUrl}
                  alt="分析图片"
                  className="w-full max-h-48 object-contain bg-black/20"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 py-12 text-gray-500">
                <span className="text-3xl mb-2">🖼️</span>
                <p className="text-sm">右键点击网页图片开始分析</p>
                <p className="text-xs mt-1 text-gray-600">或点击插件图标打开侧边栏</p>
              </div>
            )}

            {/* Loading */}
            {store.isLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span className="text-sm text-gray-400">AI 正在分析图片...</span>
              </div>
            )}

            {/* Error */}
            {store.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                ⚠️ {store.error}
              </div>
            )}

            {/* Prompt editor */}
            {store.prompt && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-indigo-400">🤖 生成的 Prompt</span>
                </div>
                <textarea
                  value={store.prompt}
                  onChange={(e) => store.setPrompt(e.target.value)}
                  className="w-full resize-none bg-transparent text-sm text-gray-200 outline-none leading-relaxed"
                  rows={6}
                />
                {/* Style tags */}
                {store.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {store.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat messages (beyond the first) */}
            {store.messages.length > 1 && (
              <div className="space-y-3">
                {store.messages.slice(1).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'border border-white/10 bg-white/5 text-gray-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      {store.activeTab === 'chat' && (
        <div className="border-t border-white/10 p-3 space-y-2">
          {/* Language + Model */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['zh', 'en', 'ja'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => store.setLanguage(lang)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    store.language === lang
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {lang === 'zh' ? '中' : lang === 'en' ? 'EN' : 'J'}
                </button>
              ))}
            </div>
            <select
              value={store.model}
              onChange={(e) => store.setModel(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-gray-300 outline-none"
            >
              <option value="gemini-flash">Gemini Flash</option>
              <option value="minimax">MiniMax</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {store.currentImageUrl && !store.isLoading && (
              <button
                onClick={analyzeImage}
                className="flex-1 rounded-lg bg-white/10 py-2 text-sm text-gray-300 hover:bg-white/15 transition-colors"
              >
                🔄 重新分析
              </button>
            )}
            <button
              onClick={handleCopy}
              disabled={!store.prompt}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : store.prompt
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {copied ? '✓ 已复制' : '📋 复制 Prompt'}
            </button>
          </div>

          {/* Chat input */}
          {store.currentImageUrl && (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="继续提问，如：换成男性风格..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || store.isLoading}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm disabled:opacity-40 hover:bg-indigo-500 transition-colors"
              >
                发送
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
