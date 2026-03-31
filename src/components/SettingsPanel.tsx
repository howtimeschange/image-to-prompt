import React from 'react'
import { useAppStore } from '../stores/appStore'

export function SettingsPanel() {
  const { settings, showSettings, setShowSettings, updateSettings } = useAppStore()
  const [form, setForm] = React.useState({ ...settings })
  const [saved, setSaved] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => { setForm({ ...settings }) }, [settings])

  React.useEffect(() => {
    if (showSettings) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [showSettings])

  if (!showSettings) return null

  const save = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); setShowSettings(false) }, 900)
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(0,0,0,${visible ? 0.7 : 0})`,
        backdropFilter: visible ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(8px)' : 'none',
        transition: 'background 0.2s, backdrop-filter 0.2s',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 20,
          background: 'rgba(14,14,18,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
          padding: '20px 20px 24px',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)',
              marginBottom: 3,
            }}>
              Configuration
            </p>
            <h2 style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.88)',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}>
              API 设置
            </h2>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Model selector */}
          <div>
            <p className="label-xs" style={{ marginBottom: 8 }}>默认模型</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              padding: 4,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {([
                { val: 'gemini-flash', label: 'Gemini Flash', badge: '推荐' },
                { val: 'minimax', label: 'MiniMax VL', badge: '' },
              ] as const).map(({ val, label, badge }) => {
                const active = form.model === val
                return (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, model: val })}
                    style={{
                      borderRadius: 8,
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(255,255,255,0.13)' : 'transparent'}`,
                    }}
                  >
                    <p style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.35)',
                      marginBottom: badge ? 2 : 0,
                    }}>
                      {label}
                    </p>
                    {badge && (
                      <span style={{
                        fontSize: 9,
                        color: active ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.2)',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Gemini Key */}
          <ApiKeyField
            label="Gemini API Key"
            href="https://aistudio.google.com/app/apikey"
            placeholder="AIza..."
            value={form.geminiApiKey}
            onChange={(v) => setForm({ ...form, geminiApiKey: v })}
          />

          {/* MiniMax Key */}
          <ApiKeyField
            label="MiniMax API Key"
            href="https://platform.minimaxi.com"
            placeholder="eyJ..."
            value={form.minimaxApiKey}
            onChange={(v) => setForm({ ...form, minimaxApiKey: v })}
          />

          {/* Save */}
          <button
            onClick={save}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 12,
              border: 'none',
              background: saved
                ? 'rgba(22,163,74,0.85)'
                : 'rgba(99,102,241,0.9)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              marginTop: 4,
              transition: 'background 0.2s, box-shadow 0.2s',
              boxShadow: saved
                ? '0 4px 20px rgba(22,163,74,0.2)'
                : '0 4px 20px rgba(99,102,241,0.2)',
            }}
          >
            {saved ? '✓ 已保存' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiKeyField({
  label, href, placeholder, value, onChange,
}: {
  label: string
  href: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = React.useState(false)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p className="label-xs">{label}</p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          获取 →
        </a>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            padding: '9px 36px 9px 12px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
        <button
          onClick={() => setShow(!show)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 12,
            padding: 2,
          }}
        >
          {show ? '○' : '●'}
        </button>
      </div>
    </div>
  )
}
