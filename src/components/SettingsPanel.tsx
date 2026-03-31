import React from 'react'
import { useAppStore } from '../stores/appStore'

export function SettingsPanel() {
  const { settings, showSettings, setShowSettings, updateSettings } = useAppStore()
  const [form, setForm] = React.useState({ ...settings })

  React.useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  if (!showSettings) return null

  const save = () => {
    updateSettings(form)
    setShowSettings(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm">
      <div className="mt-16 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">⚙️ 设置</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Model select */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">默认模型</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value as any })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="gemini-flash">Gemini Flash (推荐)</option>
              <option value="minimax">MiniMax VL</option>
            </select>
          </div>

          {/* Gemini Key */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Gemini API Key
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-indigo-400 hover:text-indigo-300 text-xs"
              >
                获取 →
              </a>
            </label>
            <input
              type="password"
              placeholder="AIza..."
              value={form.geminiApiKey}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* MiniMax Key */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              MiniMax API Key
              <a
                href="https://platform.minimaxi.com"
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-indigo-400 hover:text-indigo-300 text-xs"
              >
                获取 →
              </a>
            </label>
            <input
              type="password"
              placeholder="eyJ..."
              value={form.minimaxApiKey}
              onChange={(e) => setForm({ ...form, minimaxApiKey: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={save}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
