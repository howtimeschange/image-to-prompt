import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useAI } from '../hooks/useAI'
import { SettingsPanel } from '../components/SettingsPanel'
import { HistoryList } from '../components/HistoryList'

export default function App() {
  const store = useAppStore()
  const { analyzeImage, sendChatMessage } = useAI()
  const [chatInput, setChatInput] = React.useState('')
  const [copied, setCopied] = React.useState<'full' | 'negative' | null>(null)
  const [showStructured, setShowStructured] = React.useState(false)
  const [promptLang, setPromptLang] = React.useState<'en' | 'zh'>('en')
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Load storage on mount
  React.useEffect(() => {
    store.loadFromStorage()
  }, [])

  // Listen for new image from background
  React.useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'IMAGE_SELECTED') {
        // 切换到新图片时，完整清空上一张图的结果
        store.clearMessages()
        store.setPrompt('')
        store.setTags([])
        store.setStructured(null)
        store.setError(null)
        store.setImage(message.url, message.base64 ?? null)
        store.setActiveTab('chat')
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    // Poll storage in case message was sent before sidebar opened
    const poll = setInterval(async () => {
      const data = await chrome.storage.local.get(['pendingImage', 'pendingClear', 'currentImageUrl', 'currentImageBase64'])
      if (data.pendingImage && data.currentImageUrl) {
        // 切换图片时清空旧内容
        store.clearMessages()
        store.setPrompt('')
        store.setTags([])
        store.setStructured(null)
        store.setError(null)
        store.setImage(data.currentImageUrl, data.currentImageBase64 ?? null)
        store.setActiveTab('chat')
        chrome.storage.local.remove(['pendingImage', 'pendingClear'])
      }
    }, 500)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
      clearInterval(poll)
    }
  }, [])

  // Auto-analyze when image changes
  React.useEffect(() => {
    if (store.currentImageUrl && store.messages.length === 0 && !store.isLoading) {
      analyzeImage()
    }
  }, [store.currentImageUrl])

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.messages])

  const handleCopy = (type: 'full' | 'negative') => {
    let text = ''
    if (type === 'full') {
      text = promptLang === 'zh'
        ? (store.structured?.full_prompt_zh ?? store.structured?.full_prompt ?? store.prompt)
        : (store.structured?.full_prompt ?? store.prompt)
    } else {
      text = promptLang === 'zh'
        ? (store.structured?.negative_prompt_zh ?? store.structured?.negative_prompt ?? '')
        : (store.structured?.negative_prompt ?? '')
    }
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
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

  const s = store.structured

  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <SettingsPanel />

      {/* Header - 毛玻璃效果 */}
      <div className="flex items-center justify-between border-b border-white/8 bg-white/5 backdrop-blur-xl px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🎨</span>
          <span className="font-semibold tracking-tight text-sm">ImageToPrompt</span>
          {store.structured && (
            <span className="rounded-full bg-indigo-500/25 px-2 py-0.5 text-xs text-indigo-300">
              结构化
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => store.setShowSettings(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white transition-colors text-sm"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/8 flex-shrink-0">
        {(['chat', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => store.setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              store.activeTab === tab
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'chat' ? '💬 对话' : '📜 历史'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {store.activeTab === 'history' ? (
          <div className="p-3">
            <HistoryList onLoadHistory={handleLoadHistory} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3">

            {/* Image preview */}
            {store.currentImageUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <img
                  src={store.currentImageUrl}
                  alt="分析图片"
                  className="w-full max-h-44 object-contain"
                  onError={(e) => {
                    // Fallback if URL fails
                    (e.target as HTMLImageElement).style.opacity = '0.3'
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 py-10 text-gray-600">
                <span className="text-3xl mb-2">🖼️</span>
                <p className="text-xs">右键点击网页图片开始分析</p>
              </div>
            )}

            {/* Loading */}
            {store.isLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent flex-shrink-0" />
                <span className="text-xs text-indigo-300">AI 正在深度分析图片，生成结构化 Prompt...</span>
              </div>
            )}

            {/* Error */}
            {store.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-400">
                ⚠️ {store.error}
              </div>
            )}

            {/* Structured Prompt Result */}
            {s && (
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                {/* Lang tabs */}
                <div className="flex gap-1 p-2 pb-0">
                  {(['en', 'zh'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPromptLang(lang)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        promptLang === lang
                          ? 'bg-indigo-500/30 text-indigo-300'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {lang === 'en' ? 'EN Prompt' : '中文 Prompt'}
                    </button>
                  ))}
                </div>

                {/* Full Prompt (editable) */}
                <div className="p-3 border-b border-white/8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-400">✨ Full Prompt</span>
                    <button
                      onClick={() => handleCopy('full')}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                        copied === 'full'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/8 text-gray-400 hover:text-white'
                      }`}
                    >
                      {copied === 'full' ? '✓ 已复制' : '📋 复制'}
                    </button>
                  </div>
                  <textarea
                    value={promptLang === 'zh' ? (s.full_prompt_zh ?? s.full_prompt) : s.full_prompt}
                    onChange={(e) => {
                      if (promptLang === 'zh') {
                        store.setStructured({ ...s, full_prompt_zh: e.target.value })
                      } else {
                        store.setStructured({ ...s, full_prompt: e.target.value })
                      }
                    }}
                    className="w-full resize-none bg-transparent text-xs text-gray-200 outline-none leading-relaxed"
                    rows={4}
                  />
                </div>

                {/* Negative Prompt */}
                {(s.negative_prompt || s.negative_prompt_zh) && (
                  <div className="p-3 border-b border-white/8 bg-red-500/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-red-400">❌ Negative Prompt</span>
                      <button
                        onClick={() => handleCopy('negative')}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          copied === 'negative'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/8 text-gray-400 hover:text-white'
                        }`}
                      >
                        {copied === 'negative' ? '✓' : '📋'}
                      </button>
                    </div>
                    <p className="text-xs text-red-300/80 leading-relaxed">
                      {promptLang === 'zh' ? (s.negative_prompt_zh ?? s.negative_prompt) : s.negative_prompt}
                    </p>
                  </div>
                )}

                {/* Toggle details */}
                <button
                  onClick={() => setShowStructured(!showStructured)}
                  className="w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  <span>{showStructured ? '▲' : '▼'}</span>
                  <span>{showStructured ? '收起详情' : '展开结构化详情'}</span>
                </button>

                {showStructured && (
                  <div className="border-t border-white/8 p-3 grid grid-cols-2 gap-2">
                    {[
                      { label: '主体 (EN)', key: 'subject', icon: '👤' },
                      { label: '主体 (中文)', key: 'subject_zh', icon: '👤' },
                      { label: '风格', key: 'style', icon: '🎨' },
                      { label: '构图', key: 'composition', icon: '📐' },
                      { label: '光线', key: 'lighting', icon: '💡' },
                      { label: '色调', key: 'color_palette', icon: '🎨' },
                      { label: '氛围', key: 'mood', icon: '🌟' },
                      { label: '技术', key: 'technical', icon: '⚙️' },
                    ].map(({ label, key, icon }) => (
                      <div key={key} className="rounded-lg bg-white/5 p-2 col-span-2">
                        <div className="text-xs text-gray-500 mb-0.5">{icon} {label}</div>
                        <div className="text-xs text-gray-300">{(s as any)[key]}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {store.tags.length > 0 && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1">
                    {store.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Simple prompt (when no structured data) */}
            {!s && store.prompt && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-400">🤖 生成的 Prompt</span>
                  <button
                    onClick={() => handleCopy('full')}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      copied === 'full'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/8 text-gray-400 hover:text-white'
                    }`}
                  >
                    {copied === 'full' ? '✓ 已复制' : '📋 复制'}
                  </button>
                </div>
                <textarea
                  value={store.prompt}
                  onChange={(e) => store.setPrompt(e.target.value)}
                  className="w-full resize-none bg-transparent text-xs text-gray-200 outline-none leading-relaxed"
                  rows={5}
                />
                {store.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {store.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat messages (beyond the first) */}
            {store.messages.length > 1 && (
              <div className="space-y-2">
                {store.messages.slice(1).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
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
        <div className="border-t border-white/8 bg-white/3 backdrop-blur-xl p-3 space-y-2 flex-shrink-0">
          {/* Language + Model */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['zh', 'en', 'ja'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => store.setLanguage(lang)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    store.language === lang
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/8'
                  }`}
                >
                  {lang === 'zh' ? '中' : lang === 'en' ? 'EN' : 'J'}
                </button>
              ))}
            </div>
            <select
              value={store.model}
              onChange={(e) => store.setModel(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-300 outline-none"
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
                className="flex-1 rounded-lg bg-white/8 py-1.5 text-xs text-gray-300 hover:bg-white/12 transition-colors"
              >
                🔄 重新分析
              </button>
            )}
            <button
              onClick={() => handleCopy('full')}
              disabled={!store.prompt && !store.structured}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                copied === 'full'
                  ? 'bg-green-600 text-white'
                  : store.prompt || store.structured
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {copied === 'full' ? '✓ 已复制' : '📋 复制 Prompt'}
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
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || store.isLoading}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-indigo-500 transition-colors"
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
