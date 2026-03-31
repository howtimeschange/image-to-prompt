import React from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'
import { useAppStore } from '../stores/appStore'

function PopupApp() {
  const store = useAppStore()

  React.useEffect(() => {
    store.loadFromStorage()
  }, [])

  const openSidebar = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.windowId) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId })
        window.close()
      }
    })
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0f0f0f] p-6 text-white">
      <div className="text-4xl">🎨</div>
      <h1 className="text-lg font-semibold">ImageToPrompt</h1>
      <p className="text-center text-sm text-gray-400">
        右键点击网页图片选择 "ImageToPrompt" 开始分析
      </p>
      <button
        onClick={openSidebar}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium hover:bg-indigo-500 transition-colors"
      >
        打开侧边栏
      </button>
      <button
        onClick={() => store.setShowSettings(true)}
        className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
      >
        ⚙️ 配置 API Key
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
)
