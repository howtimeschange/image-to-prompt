import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useAI } from '../hooks/useAI'
import { SettingsPanel } from '../components/SettingsPanel'
import { HistoryList } from '../components/HistoryList'
import type { VisualStyleData } from '../services/gemini'

// ── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ hex, name, desc }: { hex: string; name: string; desc?: string }) {
  const [tip, setTip] = React.useState(false)
  return (
    <button
      className="group flex items-center gap-2 text-left"
      onClick={() => { navigator.clipboard.writeText(hex); setTip(true); setTimeout(() => setTip(false), 1500) }}
      title={desc}
    >
      <span
        className="h-5 w-5 shrink-0 rounded-full border border-white/10 shadow-inner"
        style={{ background: hex }}
      />
      <span className="text-[11px] leading-none">
        <span className="block font-mono text-[10px] text-zinc-400">{tip ? '✓ copied' : hex}</span>
        <span className="block text-zinc-500 mt-0.5 truncate max-w-[120px]">{name}</span>
      </span>
    </button>
  )
}

// ── Palette strip ─────────────────────────────────────────────────────────────

function PaletteStrip({ vs }: { vs: VisualStyleData }) {
  const all = [
    ...(vs.color_palette?.dominant_colors ?? []),
    ...(vs.color_palette?.accent_colors ?? []),
    ...(vs.color_palette?.background_color ? [vs.color_palette.background_color] : []),
  ]
  if (!all.length) return null
  return (
    <div className="flex gap-1">
      {all.map((c, i) => (
        <button
          key={i}
          onClick={() => navigator.clipboard.writeText(c.hex)}
          className="h-8 flex-1 rounded transition-transform hover:scale-105 hover:z-10"
          style={{ background: c.hex }}
          title={`${c.name} — ${c.hex}\n${c.description}`}
        />
      ))}
    </div>
  )
}

// ── Visual style detail panel ─────────────────────────────────────────────────

function StyleDetail({ vs }: { vs: VisualStyleData }) {
  return (
    <div className="space-y-4">
      {/* Color grid */}
      {vs.color_palette && (
        <section>
          <p className="label-xs mb-2">色板</p>
          <PaletteStrip vs={vs} />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ...(vs.color_palette.dominant_colors ?? []),
              ...(vs.color_palette.accent_colors ?? []),
            ].map((c, i) => (
              <ColorSwatch key={i} hex={c.hex} name={c.name} desc={c.description} />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 italic">
            {vs.color_palette.color_harmony}
          </p>
        </section>
      )}

      {/* Composition */}
      {vs.composition && (
        <section>
          <p className="label-xs mb-2">构图</p>
          <dl className="space-y-1.5">
            {[
              ['类型', vs.composition.layout_type],
              ['焦点', vs.composition.focal_point],
              ['机位', vs.composition.camera_angle],
              ['景深', vs.composition.depth_of_field],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[11px]">
                <dt className="w-[3.5rem] shrink-0 text-zinc-600">{k}</dt>
                <dd className="text-zinc-400 leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Lighting & texture */}
      {vs.effects_and_textures && (
        <section>
          <p className="label-xs mb-2">光线与质感</p>
          <div className="space-y-1 text-[11px] text-zinc-400 leading-relaxed">
            {vs.effects_and_textures.lighting?.type && (
              <p>{vs.effects_and_textures.lighting.type}</p>
            )}
            {vs.effects_and_textures.lighting?.direction && (
              <p className="text-zinc-500">{vs.effects_and_textures.lighting.direction}</p>
            )}
            {vs.effects_and_textures.texture?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {vs.effects_and_textures.texture.map((t, i) => (
                  <span key={i} className="tag-pill">{t}</span>
                ))}
              </div>
            )}
            {vs.effects_and_textures.post_processing_vibe && (
              <p className="italic text-zinc-500">{vs.effects_and_textures.post_processing_vibe}</p>
            )}
          </div>
        </section>
      )}

      {/* Subject & props */}
      {vs.subjects_and_props?.interaction && (
        <section>
          <p className="label-xs mb-1">主体与张力</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">{vs.subjects_and_props.interaction}</p>
        </section>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const store = useAppStore()
  const { analyzeImage, sendChatMessage } = useAI()
  const [chatInput, setChatInput] = React.useState('')
  const [copied, setCopied] = React.useState<'full' | 'negative' | null>(null)
  const [promptLang, setPromptLang] = React.useState<'en' | 'zh'>('en')
  const [expandStyle, setExpandStyle] = React.useState(false)
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { store.loadFromStorage() }, [])

  React.useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'IMAGE_SELECTED') {
        store.clearMessages(); store.setPrompt(''); store.setTags([])
        store.setStructured(null); store.setError(null)
        store.setImage(message.url, message.base64 ?? null)
        store.setActiveTab('chat')
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    const poll = setInterval(async () => {
      const d = await chrome.storage.local.get(['pendingImage', 'pendingClear', 'currentImageUrl', 'currentImageBase64'])
      if (d.pendingImage && d.currentImageUrl) {
        store.clearMessages(); store.setPrompt(''); store.setTags([])
        store.setStructured(null); store.setError(null)
        store.setImage(d.currentImageUrl, d.currentImageBase64 ?? null)
        store.setActiveTab('chat')
        chrome.storage.local.remove(['pendingImage', 'pendingClear'])
      }
    }, 500)
    return () => { chrome.runtime.onMessage.removeListener(listener); clearInterval(poll) }
  }, [])

  React.useEffect(() => {
    if (store.currentImageUrl && store.messages.length === 0 && !store.isLoading) analyzeImage()
  }, [store.currentImageUrl])

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.messages])

  const getCopyText = (type: 'full' | 'negative') => {
    const s = store.structured
    if (type === 'full') return promptLang === 'zh' ? (s?.full_prompt_zh ?? s?.full_prompt ?? store.prompt) : (s?.full_prompt ?? store.prompt)
    return promptLang === 'zh' ? (s?.negative_prompt_zh ?? s?.negative_prompt ?? '') : (s?.negative_prompt ?? '')
  }

  const handleCopy = (type: 'full' | 'negative') => {
    const text = getCopyText(type)
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(type); setTimeout(() => setCopied(null), 2000)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput.trim()); setChatInput('')
  }

  const handleLoadHistory = (item: any) => {
    store.setImage(item.imageUrl, item.imageBase64 ?? null)
    store.setPrompt(item.prompt); store.setTags(item.tags)
    store.setActiveTab('chat')
  }

  const s = store.structured
  const vs = s?.visual_style as VisualStyleData | undefined
  const hasResult = !!(s || store.prompt)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0c0c0e] text-white">
      <SettingsPanel />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tracking-tight text-white/90">ImageToPrompt</span>
          {s && (
            <span className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
              {vs?.overall_concept?.theme?.slice(0, 18) ?? 'Style'}
            </span>
          )}
        </div>
        <button
          onClick={() => store.setShowSettings(true)}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-400"
        >
          Settings
        </button>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <nav className="flex border-b border-white/[0.06]">
        {(['chat', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => store.setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors ${
              store.activeTab === tab
                ? 'border-b border-white/40 text-white/90'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tab === 'chat' ? 'Analyze' : 'History'}
          </button>
        ))}
      </nav>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {store.activeTab === 'history' ? (
          <div className="p-4">
            <HistoryList onLoadHistory={handleLoadHistory} />
          </div>
        ) : (
          <div className="flex flex-col">

            {/* Image */}
            {store.currentImageUrl ? (
              <div className="relative border-b border-white/[0.06] bg-black">
                <img
                  src={store.currentImageUrl}
                  alt=""
                  className="w-full max-h-48 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                />
                {vs && (
                  <div className="absolute inset-x-0 bottom-0 flex gap-0.5">
                    {[
                      ...(vs.color_palette?.dominant_colors ?? []),
                      ...(vs.color_palette?.accent_colors ?? []),
                    ].slice(0, 8).map((c, i) => (
                      <div key={i} className="h-1 flex-1" style={{ background: c.hex }} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="h-10 w-10 rounded-full border border-white/[0.08] flex items-center justify-center">
                  <span className="text-lg opacity-30">⊞</span>
                </div>
                <p className="text-[12px] text-zinc-600">右键点击网页任意图片开始分析</p>
              </div>
            )}

            {/* Loading */}
            {store.isLoading && (
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="h-1 w-1 rounded-full bg-white/30"
                      style={{ animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </span>
                <span className="text-[11px] text-zinc-600">提取视觉风格...</span>
              </div>
            )}

            {/* Error */}
            {store.error && (
              <div className="border-b border-red-900/30 bg-red-950/20 px-4 py-3">
                <p className="text-[11px] text-red-400/80">{store.error}</p>
              </div>
            )}

            {/* Concept bar */}
            {vs?.overall_concept && (
              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="text-[13px] font-medium text-white/80 leading-snug">{vs.overall_concept.theme}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{vs.overall_concept.mood}</p>
                {vs.overall_concept.keywords?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {vs.overall_concept.keywords.map((k) => (
                      <span key={k} className="tag-pill">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompt section */}
            {hasResult && (
              <div className="border-b border-white/[0.06] px-4 py-4">
                {/* Lang toggle */}
                <div className="mb-3 flex items-center justify-between">
                  <p className="label-xs">Prompt</p>
                  <div className="flex rounded-md border border-white/[0.08] overflow-hidden">
                    {(['en', 'zh'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setPromptLang(lang)}
                        className={`px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors ${
                          promptLang === lang
                            ? 'bg-white/10 text-white/80'
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                      >
                        {lang === 'en' ? 'EN' : '中'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable prompt */}
                <textarea
                  value={promptLang === 'zh' ? (s?.full_prompt_zh ?? s?.full_prompt ?? store.prompt) : (s?.full_prompt ?? store.prompt)}
                  onChange={(e) => {
                    if (!s) { store.setPrompt(e.target.value); return }
                    if (promptLang === 'zh') store.setStructured({ ...s, full_prompt_zh: e.target.value })
                    else store.setStructured({ ...s, full_prompt: e.target.value })
                  }}
                  rows={6}
                  className="prompt-textarea"
                  style={{ minHeight: '120px', maxHeight: '360px' }}
                  spellCheck={false}
                />

                {/* Copy full */}
                <button
                  onClick={() => handleCopy('full')}
                  className={`mt-2 w-full rounded-md py-2 text-[11px] font-medium transition-colors ${
                    copied === 'full'
                      ? 'bg-white/10 text-white/70'
                      : 'bg-white/[0.05] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300'
                  }`}
                >
                  {copied === 'full' ? 'Copied' : 'Copy Prompt'}
                </button>

                {/* Negative prompt */}
                {(s?.negative_prompt || s?.negative_prompt_zh) && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="label-xs text-red-500/60">Negative</p>
                      <button
                        onClick={() => handleCopy('negative')}
                        className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
                      >
                        {copied === 'negative' ? '✓' : 'copy'}
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-400/50 font-mono">
                      {promptLang === 'zh' ? (s?.negative_prompt_zh ?? s?.negative_prompt) : s?.negative_prompt}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Style details — collapsible */}
            {vs && (
              <div className="border-b border-white/[0.06]">
                <button
                  onClick={() => setExpandStyle(!expandStyle)}
                  className="flex w-full items-center justify-between px-4 py-3 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <span className="font-medium tracking-wide uppercase text-[10px]">Visual Style Data</span>
                  <span className="text-zinc-700">{expandStyle ? '−' : '+'}</span>
                </button>
                {expandStyle && (
                  <div className="px-4 pb-4">
                    <StyleDetail vs={vs} />
                  </div>
                )}
              </div>
            )}

            {/* Chat messages */}
            {store.messages.length > 1 && (
              <div className="space-y-2 px-4 py-3">
                {store.messages.slice(1).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`w-full rounded-xl px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-white/[0.08] text-white/80 max-w-[88%]'
                        : 'text-zinc-300'
                    }`}>
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

      {/* ── Footer toolbar ────────────────────────────────────────────────── */}
      {store.activeTab === 'chat' && (
        <footer className="border-t border-white/[0.06] px-3 py-2.5 space-y-2">
          {/* Controls row */}
          <div className="flex items-center justify-between gap-2">
            {/* Language (output) */}
            <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] overflow-hidden">
              {(['zh', 'en', 'ja'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => store.setLanguage(lang)}
                  className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    store.language === lang
                      ? 'bg-white/10 text-white/80'
                      : 'text-zinc-700 hover:text-zinc-500'
                  }`}
                >
                  {lang === 'zh' ? 'ZH' : lang === 'en' ? 'EN' : 'JA'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {store.currentImageUrl && !store.isLoading && (
                <button
                  onClick={analyzeImage}
                  className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
                >
                  ↺ Reanalyze
                </button>
              )}
              <select
                value={store.model}
                onChange={(e) => store.setModel(e.target.value as any)}
                className="rounded-md border border-white/[0.07] bg-transparent px-2 py-1 text-[10px] text-zinc-600 outline-none cursor-pointer"
              >
                <option value="gemini-flash">Gemini</option>
                <option value="minimax">MiniMax</option>
              </select>
            </div>
          </div>

          {/* Chat input */}
          {store.currentImageUrl && (
            <form onSubmit={handleSend} className="flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask follow-up: change to cyberpunk style..."
                className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/80 placeholder:text-zinc-700 outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || store.isLoading}
                className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/60 disabled:opacity-30 hover:bg-white/[0.12] transition-colors"
              >
                →
              </button>
            </form>
          )}
        </footer>
      )}
    </div>
  )
}
