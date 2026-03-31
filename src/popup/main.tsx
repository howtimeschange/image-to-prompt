import React from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'

function PopupApp() {
  const [opening, setOpening] = React.useState(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    // Fade-in on mount
    requestAnimationFrame(() => setReady(true))
  }, [])

  const openSidebar = () => {
    setOpening(true)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.windowId) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId })
        setTimeout(() => window.close(), 120)
      }
    })
  }

  return (
    <div
      style={{
        width: 280,
        minHeight: 320,
        background: '#0c0c0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: 0,
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: -60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Icon mark */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        fontSize: 22,
        boxShadow: '0 0 24px rgba(99,102,241,0.15)',
      }}>
        ⊞
      </div>

      {/* Wordmark */}
      <p style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.22)',
        marginBottom: 4,
      }}>
        ImageToPrompt
      </p>
      <h1 style={{
        fontSize: 17,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.88)',
        letterSpacing: '-0.3px',
        marginBottom: 8,
        textAlign: 'center',
      }}>
        视觉风格提取
      </h1>
      <p style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 28,
        maxWidth: 200,
      }}>
        右键点击网页图片<br />选择 "ImageToPrompt" 开始分析
      </p>

      {/* CTA */}
      <button
        onClick={openSidebar}
        disabled={opening}
        style={{
          width: '100%',
          padding: '11px 0',
          borderRadius: 12,
          border: 'none',
          background: opening
            ? 'rgba(99,102,241,0.4)'
            : 'rgba(99,102,241,0.9)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: opening ? 'default' : 'pointer',
          letterSpacing: '0.02em',
          transition: 'all 0.15s',
          boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
        }}
      >
        {opening ? '正在打开...' : '打开侧边栏 →'}
      </button>

      {/* Divider line */}
      <div style={{
        width: '100%',
        height: 1,
        background: 'rgba(255,255,255,0.05)',
        margin: '20px 0 0',
      }} />
      <p style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.15)',
        marginTop: 12,
        letterSpacing: '0.02em',
      }}>
        在侧边栏中配置 API Key
      </p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
)
