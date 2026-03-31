import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useAI } from '../hooks/useAI'
import { SettingsPanel } from '../components/SettingsPanel'
import { HistoryList } from '../components/HistoryList'
import type { VisualStyleData } from '../services/gemini'

// ── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ hex, name }: { hex: string; name: string }) {
  const [tip, setTip] = React.useState(false)
  return (
    <button
      className="group flex items-center gap-2 text-left"
      onClick={() => { navigator.clipboard.writeText(hex); setTip(true); setTimeout(() => setTip(false), 1500) }}
    >
      <span className="h-4 w-4 shrink-0 rounded-full border border-white/10 shadow-inner" style={{ background: hex }} />
      <span className="text-[10px] leading-none">
        <span className="block font-mono text-[10px] text-zinc-500">{tip ? '✓' : hex}</span>
        <span className="block text-zinc-600 truncate max-w-[100px]">{name}</span>
      </span>
    </button>
  )
}

// ── Palette strip ─────────────────────────────────────────────────────────────

function PaletteStrip({ vs }: { vs: VisualStyleData }) {
  // new format
  const colors = [
    ...(vs.color_palette?.brand_colors ?? []),
    ...(vs.color_palette?.accent_colors ?? []),
    vs.color_palette?.background ? [{ hex: vs.color_palette.background.primary, name: 'BG', usage: '' }] : [],
  ].flat().filter((c: any) => c?.hex)

  if (!colors.length) return null
  return (
    <div className="flex gap-0.5 h-8">
      {colors.map((c: any, i: number) => (
        <button
          key={i}
          onClick={() => navigator.clipboard.writeText(c.hex)}
          className="flex-1 rounded transition-transform hover:scale-105 hover:z-10"
          style={{ background: c.hex }}
          title={`${c.name} — ${c.hex}`}
        />
      ))}
    </div>
  )
}

// ── JSON Code Block ───────────────────────────────────────────────────────────

function JsonBlock({ json, onCopy }: { json: string; onCopy: () => void }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy()
  }

  return (
    <div className="relative">
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          fontSize: 10.5,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.65)',
          fontFamily: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          // NO max-height — show everything
        }}
      >
        {json}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '3px 8px',
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.1)',
          background: copied ? 'rgba(22,163,74,0.8)' : 'rgba(255,255,255,0.06)',
          color: copied ? '#fff' : 'rgba(255,255,255,0.4)',
          fontSize: 10,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
          letterSpacing: '0.04em',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ── Chat message bubble ───────────────────────────────────────────────────────

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  // Try to detect if content is JSON
  const isJson = content.trimStart().startsWith('{') || content.trimStart().startsWith('[')

  return (
    <div className={`flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        style={{
          maxWidth: role === 'user' ? '88%' : '100%',
          width: role === 'assistant' ? '100%' : undefined,
          borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '10px 13px',
          background: role === 'user' ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          fontSize: isJson ? 10.5 : 12,
          lineHeight: 1.65,
          color: role === 'user' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.65)',
          fontFamily: isJson
            ? '"SF Mono", "Fira Code", monospace'
            : '-apple-system, BlinkMacSystemFont, sans-serif',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
      >
        {content}
      </div>
    </div>
  )
}

// ── Generate command box (莲生用法：JSON + 新主题 → 完整生图指令) ─────────────

function GenerateCommandBox({ rawJson }: { rawJson: string }) {
  const [subject, setSubject] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [lang, setLang] = React.useState<'zh' | 'en'>('zh')

  const buildCommand = (theme: string) => {
    if (lang === 'zh') {
      return `请严格按照以下 JSON 数据中描述的视觉风格、色彩、构图和光影，生成一张「${theme || '你的新主题'}」的图像：\n\n${rawJson}`
    }
    return `Please generate an image of "${theme || 'your new subject'}" strictly following the visual style, colors, composition and lighting described in this JSON:\n\n${rawJson}`
  }

  const handleCopy = () => {
    if (!subject.trim()) return
    navigator.clipboard.writeText(buildCommand(subject))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const preview = subject.trim()
    ? buildCommand(subject).slice(0, 120) + '...'
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Lang toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['zh', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '3px 8px',
              borderRadius: 5,
              border: `1px solid ${lang === l ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`,
              background: lang === l ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: lang === l ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {l === 'zh' ? '中文指令' : 'EN Prompt'}
          </button>
        ))}
      </div>

      {/* Subject input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={lang === 'zh' ? '输入新主题，如：一只橘猫骑摩托车' : 'New subject, e.g. a corgi riding a motorcycle'}
          style={{
            flex: 1,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.04)',
            padding: '8px 10px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.75)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
          onKeyDown={(e) => { if (e.key === 'Enter' && subject.trim()) handleCopy() }}
        />
        <button
          onClick={handleCopy}
          disabled={!subject.trim()}
          style={{
            padding: '0 12px',
            borderRadius: 8,
            border: 'none',
            background: copied
              ? 'rgba(22,163,74,0.85)'
              : subject.trim()
              ? 'rgba(99,102,241,0.9)'
              : 'rgba(255,255,255,0.06)',
            color: subject.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize: 11,
            fontWeight: 600,
            cursor: subject.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            boxShadow: subject.trim() && !copied ? '0 2px 12px rgba(99,102,241,0.2)' : 'none',
          }}
        >
          {copied ? '✓ 已复制' : '复制指令'}
        </button>
      </div>

      {/* Preview snippet */}
      {preview && (
        <p style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          lineHeight: 1.6,
          fontFamily: '"SF Mono", monospace',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 6,
          padding: '6px 8px',
          wordBreak: 'break-word',
        }}>
          {preview}
        </p>
      )}

      {/* Hint */}
      <p style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.15)',
        lineHeight: 1.5,
      }}>
        将复制的指令直接粘贴给 Gemini 3.1 / Midjourney / Flux 即可生成同风格新图
      </p>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const store = useAppStore()
  const { analyzeImage, sendChatMessage } = useAI()
  const [chatInput, setChatInput] = React.useState('')
  const [copied, setCopied] = React.useState(false)
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
      const d = await chrome.storage.local.get(['pendingImage', 'currentImageUrl', 'currentImageBase64'])
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput.trim()); setChatInput('')
  }

  const handleLoadHistory = (item: any) => {
    store.setImage(item.imageUrl, item.imageBase64 ?? null)
    store.setPrompt(item.prompt); store.setTags(item.tags)
    if (item.structured) store.setStructured(item.structured)
    store.setActiveTab('chat')
  }

  const s = store.structured
  const vs = s?.visual_style as VisualStyleData | undefined
  const rawJson = s?.raw_json ?? ''
  const hasResult = !!(s || store.prompt)

  // Extract dominant color for accent strip
  const accentColors = [
    ...(vs?.color_palette?.brand_colors ?? []),
    ...(vs?.color_palette?.accent_colors ?? []),
  ].filter((c: any) => c?.hex).slice(0, 8)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0c0c0e] text-white">
      <SettingsPanel />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
          }}>
            ImageToPrompt
          </span>
          {s?.style && (
            <span style={{
              borderRadius: 3,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '2px 6px',
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.02em',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {s.style}
            </span>
          )}
        </div>
        <button
          onClick={() => store.setShowSettings(true)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
          }}
        >
          Settings
        </button>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <nav className="flex border-b border-white/[0.06] shrink-0">
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
              <div className="relative border-b border-white/[0.06] bg-black shrink-0">
                <img
                  src={store.currentImageUrl}
                  alt=""
                  className="w-full max-h-44 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                />
                {accentColors.length > 0 && (
                  <div className="absolute inset-x-0 bottom-0 flex gap-0">
                    {accentColors.map((c: any, i: number) => (
                      <div key={i} className="h-[3px] flex-1" style={{ background: c.hex }} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, opacity: 0.2 }}>⊞</span>
                </div>
                <p className="text-[12px] text-zinc-600">右键点击网页任意图片开始分析</p>
              </div>
            )}

            {/* Loading */}
            {store.isLoading && (
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 shrink-0">
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="h-1 w-1 rounded-full bg-white/25"
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
            {(s?.style || s?.mood) && (
              <div className="border-b border-white/[0.06] px-4 py-3 shrink-0">
                {s?.style && <p className="text-[13px] font-semibold text-white/80 leading-snug">{s.style}</p>}
                {s?.mood && <p className="mt-0.5 text-[11px] text-zinc-500">{s.mood}</p>}
                {s?.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tags.map((k) => (
                      <span key={k} className="tag-pill">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Color palette */}
            {vs && (
              <div className="border-b border-white/[0.06] px-4 py-3 shrink-0">
                <p className="label-xs mb-2">色板</p>
                <PaletteStrip vs={vs} />
                <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5">
                  {[
                    ...(vs.color_palette?.brand_colors ?? []),
                    ...(vs.color_palette?.accent_colors ?? []),
                  ].slice(0, 6).map((c: any, i: number) => (
                    <ColorSwatch key={i} hex={c.hex} name={c.name} />
                  ))}
                </div>
              </div>
            )}

            {/* JSON result — main content */}
            {hasResult && rawJson && (
              <div className="border-b border-white/[0.06] px-4 py-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="label-xs">Visual Style JSON</p>
                  <div className="flex items-center gap-2">
                    {store.currentImageUrl && !store.isLoading && (
                      <button
                        onClick={analyzeImage}
                        className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors"
                      >
                        ↺ 重新分析
                      </button>
                    )}
                    <div className="flex rounded border border-white/[0.07] overflow-hidden">
                      {(['zh', 'en', 'ja'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => store.setLanguage(lang)}
                          className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                            store.language === lang
                              ? 'bg-white/10 text-white/70'
                              : 'text-zinc-700 hover:text-zinc-500'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <JsonBlock json={rawJson} onCopy={() => setCopied(true)} />
              </div>
            )}

            {/* ── 生图指令区 —— 莲生用法：JSON + 主题模板 ── */}
            {hasResult && rawJson && (
              <div className="border-b border-white/[0.06] px-4 py-4">
                <p className="label-xs mb-2">生图指令生成器</p>
                <p style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.22)',
                  lineHeight: 1.6,
                  marginBottom: 10,
                }}>
                  输入新主题，一键生成可直接贴给 Gemini / Midjourney / Flux 的完整生图指令
                </p>
                <GenerateCommandBox rawJson={rawJson} />
              </div>
            )}

            {/* Visual Style collapsible detail */}
            {vs && (
              <div className="border-b border-white/[0.06]">
                <button
                  onClick={() => setExpandStyle(!expandStyle)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <span className="font-semibold tracking-wide uppercase">Detail Fields</span>
                  <span className="text-zinc-700">{expandStyle ? '−' : '+'}</span>
                </button>
                {expandStyle && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {[
                      ['主体', s?.subject],
                      ['构图', s?.composition],
                      ['光线', s?.lighting],
                      ['氛围', s?.mood],
                      ['技术', s?.technical],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[11px]">
                        <dt className="w-10 shrink-0 text-zinc-700">{k}</dt>
                        <dd className="text-zinc-500 leading-relaxed">{v}</dd>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat messages — follow-up conversation */}
            {store.messages.length > 1 && (
              <div className="space-y-3 px-4 py-3">
                {store.messages.slice(1).map((msg) => (
                  <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      {store.activeTab === 'chat' && store.currentImageUrl && (
        <footer className="border-t border-white/[0.06] px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={store.model}
              onChange={(e) => store.setModel(e.target.value as any)}
              style={{
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                padding: '3px 6px',
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="gemini-flash">Gemini</option>
              <option value="minimax">MiniMax</option>
            </select>
            <span style={{ flex: 1 }} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleSend} className="flex gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="继续追问：换成赛博朋克风格..."
              style={{
                flex: 1,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                padding: '8px 12px',
                fontSize: 11,
                color: 'rgba(255,255,255,0.75)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || store.isLoading}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.06)',
                padding: '0 12px',
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: (!chatInput.trim() || store.isLoading) ? 0.3 : 1,
              }}
            >
              →
            </button>
          </form>
        </footer>
      )}
    </div>
  )
}
