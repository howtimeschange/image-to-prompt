import React from 'react'
import { useAppStore } from '../stores/appStore'

interface Props {
  onLoadHistory: (item: { imageUrl: string; imageBase64?: string | null; prompt: string; tags: string[] }) => void
}

export function HistoryList({ onLoadHistory }: Props) {
  const { history, removeFromHistory, clearHistory } = useAppStore()
  const [search, setSearch] = React.useState('')

  const filtered = history.filter(
    (h) =>
      h.prompt.toLowerCase().includes(search.toLowerCase()) ||
      h.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <span className="text-4xl mb-3">📭</span>
        <p className="text-sm">还没有历史记录</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="🔍 搜索历史..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
        />
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2"
          >
            清空
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/8 transition-colors"
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                <img
                  src={item.imageBase64 ? `data:image/jpeg;base64,${item.imageBase64}` : item.imageUrl}
                  alt="history"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.prompt}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.prompt)
                      }}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      📋 复制
                    </button>
                    <button
                      onClick={() => onLoadHistory(item)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
