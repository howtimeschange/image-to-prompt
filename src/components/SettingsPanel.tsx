import React from 'react'
import { useAppStore } from '../stores/appStore'

export function SettingsPanel() {
  const { settings, showSettings, setShowSettings, updateSettings } = useAppStore()
  const [form, setForm] = React.useState({ ...settings })
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => { setForm({ ...settings }) }, [settings])

  if (!showSettings) return null

  const save = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); setShowSettings(false) }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
    >
      <div
        className="w-full mx-4 rounded-2xl p-6"
        style={{
          maxWidth: '360px',
          background: 'rgba(18,18,26,0.96)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 32px 72px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Configuration</p>
            <h2 className="mt-0.5 text-[17px] font-bold text-white/90 leading-tight">设置</h2>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[14px] text-zinc-600 transition-colors hover:text-zinc-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          {/* Model */}
          <div>
            <label className="settings-label">默认模型</label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl p-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[
                { val: 'gemini-flash', label: 'Gemini Flash', sub: '推荐' },
                { val: 'minimax', label: 'MiniMax VL', sub: '' },
              ].map(({ val, label, sub }) => (
                <button
                  key={val}
                  onClick={() => setForm({ ...form, model: val as any })}
                  className="rounded-lg py-2 px-3 text-left transition-all"
                  style={form.model === val ? {
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                >
                  <p className={`text-[12px] font-semibold ${form.model === val ? 'text-white' : 'text-zinc-500'}`}>{label}</p>
                  {sub && <p className="text-[10px] text-zinc-700 mt-0.5">{sub}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="settings-label">Gemini API Key</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                获取 →
              </a>
            </div>
            <input
              type="password"
              placeholder="AIza..."
              value={form.geminiApiKey}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              className="settings-input"
            />
          </div>

          {/* MiniMax Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="settings-label">MiniMax API Key</label>
              <a
                href="https://platform.minimaxi.com"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                获取 →
              </a>
            </div>
            <input
              type="password"
              placeholder="eyJ..."
              value={form.minimaxApiKey}
              onChange={(e) => setForm({ ...form, minimaxApiKey: e.target.value })}
              className="settings-input"
            />
          </div>

          {/* Save */}
          <button
            onClick={save}
            className="mt-2 w-full rounded-xl py-3 text-[13px] font-semibold transition-all"
            style={{
              background: saved ? 'rgba(22,163,74,0.9)' : 'rgba(81,69,205,0.95)',
              color: '#fff',
              boxShadow: saved ? '0 4px 16px rgba(22,163,74,0.25)' : '0 4px 16px rgba(81,69,205,0.3)',
            }}
          >
            {saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
