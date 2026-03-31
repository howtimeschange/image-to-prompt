/**
 * content-script.ts
 * 1. FETCH_IMAGE_BASE64 → 返回 base64
 * 2. SHOW_FLOAT_WINDOW → 注入液态玻璃悬浮窗（完全重建，不保留旧状态）
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE_BASE64') {
    fetchBase64(message.url)
      .then((base64) => sendResponse({ base64 }))
      .catch((err) => sendResponse({ error: String(err) }))
    return true
  }

  if (message.type === 'SHOW_FLOAT_WINDOW') {
    // 完整销毁旧窗口，重建新窗口（解决切换图片时旧 Prompt 残留问题）
    destroyFloatWindow()
    buildFloatWindow(message.imageUrl, message.imageBase64 ?? null)
    sendResponse({ ok: true })
    return true
  }
})

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Float Window ──────────────────────────────────────────────────────────────

const ROOT_ID = 'itp-float-root'

function destroyFloatWindow() {
  document.getElementById(ROOT_ID)?.remove()
}

function buildFloatWindow(imageUrl: string, imageBase64: string | null) {
  injectStyles()

  const root = el('div', { id: ROOT_ID })

  // Overlay (click outside to close)
  const overlay = el('div', { class: 'itp-overlay' })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) destroyFloatWindow()
  })

  // Glass card
  const card = el('div', { class: 'itp-card' })

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = el('div', { class: 'itp-header' })
  header.innerHTML = `<span class="itp-title">🎨 ImageToPrompt</span>`
  const closeBtn = el('button', { class: 'itp-icon-btn' }, '✕')
  closeBtn.addEventListener('click', destroyFloatWindow)
  header.appendChild(closeBtn)

  // ── Image preview ────────────────────────────────────────────────────────────
  const imgWrap = el('div', { class: 'itp-img-wrap' })
  const img = document.createElement('img')
  img.className = 'itp-img'
  img.src = imageUrl
  img.alt = '分析图片'
  img.addEventListener('error', () => { imgWrap.style.display = 'none' })
  imgWrap.appendChild(img)

  // ── Loading state ────────────────────────────────────────────────────────────
  const statusBox = el('div', { class: 'itp-status' })
  statusBox.innerHTML = `<div class="itp-spinner"></div><span>AI 正在分析图片...</span>`

  // ── Result area (hidden until loaded) ───────────────────────────────────────
  const resultArea = el('div', { class: 'itp-result', style: 'display:none' })

  // Language tab: EN / 中文
  const langTabs = el('div', { class: 'itp-lang-tabs' })
  const tabEN = el('button', { class: 'itp-lang-tab active', 'data-lang': 'en' }, 'EN Prompt')
  const tabZH = el('button', { class: 'itp-lang-tab', 'data-lang': 'zh' }, '中文 Prompt')
  langTabs.append(tabEN, tabZH)

  // Full prompt blocks (EN / ZH, toggled)
  const promptBlockEN = el('div', { class: 'itp-prompt-block', 'data-block': 'en' })
  const promptBlockZH = el('div', { class: 'itp-prompt-block', style: 'display:none', 'data-block': 'zh' })

  function makePromptBlock(block: HTMLElement, labelText: string, textareaId: string, negId: string) {
    const promptLabel = el('div', { class: 'itp-label' })
    promptLabel.innerHTML = `<span>✨ ${labelText}</span>`
    const copyBtn = el('button', { class: 'itp-copy-btn' }, '📋 复制')
    promptLabel.appendChild(copyBtn)

    const promptArea = el('textarea', { class: 'itp-textarea', id: textareaId, spellcheck: 'false' }) as HTMLTextAreaElement
    promptArea.rows = 4

    const negLabel = el('div', { class: 'itp-label itp-neg-label' })
    negLabel.innerHTML = '<span>❌ Negative Prompt</span>'
    const negCopyBtn = el('button', { class: 'itp-copy-btn' }, '📋')
    negLabel.appendChild(negCopyBtn)

    const negArea = el('textarea', { class: 'itp-textarea itp-neg-textarea', id: negId, spellcheck: 'false' }) as HTMLTextAreaElement
    negArea.rows = 2

    copyBtn.addEventListener('click', () => copyText(promptArea.value, copyBtn))
    negCopyBtn.addEventListener('click', () => copyText(negArea.value, negCopyBtn))

    block.append(promptLabel, promptArea, negLabel, negArea)
  }

  makePromptBlock(promptBlockEN, 'Full Prompt (EN)', 'itp-prompt-en', 'itp-neg-en')
  makePromptBlock(promptBlockZH, '完整提示词（中文）', 'itp-prompt-zh', 'itp-neg-zh')

  // Tab switch
  function switchLang(lang: 'en' | 'zh') {
    tabEN.className = `itp-lang-tab${lang === 'en' ? ' active' : ''}`
    tabZH.className = `itp-lang-tab${lang === 'zh' ? ' active' : ''}`
    promptBlockEN.style.display = lang === 'en' ? 'block' : 'none'
    promptBlockZH.style.display = lang === 'zh' ? 'block' : 'none'
  }
  tabEN.addEventListener('click', () => switchLang('en'))
  tabZH.addEventListener('click', () => switchLang('zh'))

  // Tags
  const tagsRow = el('div', { class: 'itp-tags', id: 'itp-tags-row' })

  // Structured detail toggle
  const detailsToggle = el('button', { class: 'itp-toggle' }, '▼ 展开结构化详情')
  const detailsGrid = el('div', { class: 'itp-details', style: 'display:none' })
  detailsToggle.addEventListener('click', () => {
    const open = detailsGrid.style.display !== 'none'
    detailsGrid.style.display = open ? 'none' : 'grid'
    detailsToggle.textContent = open ? '▼ 展开结构化详情' : '▲ 收起详情'
  })

  resultArea.append(langTabs, promptBlockEN, promptBlockZH, tagsRow, detailsToggle, detailsGrid)

  // ── Action buttons ────────────────────────────────────────────────────────────
  const actions = el('div', { class: 'itp-actions', style: 'display:none' })
  const reanalyzeBtn = el('button', { class: 'itp-btn itp-btn-ghost' }, '🔄 重新分析')
  const copyBtn = el('button', { class: 'itp-btn itp-btn-primary' }, '📋 复制 Prompt')
  const genBtn = el('button', { class: 'itp-btn itp-btn-secondary' }, '🖼️ 预览生图')
  actions.append(reanalyzeBtn, copyBtn, genBtn)

  // ── Error box ──────────────────────────────────────────────────────────────────
  const errorBox = el('div', { class: 'itp-error', style: 'display:none' })

  // ── Preview image ──────────────────────────────────────────────────────────────
  const previewWrap = el('div', { class: 'itp-preview-wrap', style: 'display:none' })
  const previewImg = document.createElement('img')
  previewImg.className = 'itp-preview-img'
  previewWrap.appendChild(previewImg)

  // ── Wire action handlers ───────────────────────────────────────────────────────

  copyBtn.addEventListener('click', () => {
    // Copy whichever tab is active
    const activeArea = document.querySelector<HTMLTextAreaElement>('.itp-lang-tab.active[data-lang="en"]')
      ? document.getElementById('itp-prompt-en') as HTMLTextAreaElement
      : document.getElementById('itp-prompt-zh') as HTMLTextAreaElement
    copyText(activeArea?.value ?? '', copyBtn)
    copyBtn.textContent = '✓ 已复制'
    setTimeout(() => (copyBtn.textContent = '📋 复制 Prompt'), 2000)
  })

  function runAnalysis() {
    statusBox.style.display = 'flex'
    resultArea.style.display = 'none'
    actions.style.display = 'none'
    errorBox.style.display = 'none'
    previewWrap.style.display = 'none'

    doAnalyze(imageUrl, imageBase64, resultArea, tagsRow, detailsGrid, statusBox, actions, errorBox)
  }

  reanalyzeBtn.addEventListener('click', runAnalysis)

  genBtn.addEventListener('click', async () => {
    const promptArea = document.getElementById('itp-prompt-en') as HTMLTextAreaElement
    const prompt = promptArea?.value
    if (!prompt) return

    genBtn.textContent = '⏳ 生成中...'
    genBtn.setAttribute('disabled', 'true')
    previewWrap.style.display = 'none'

    const stored = await chrome.storage.local.get(['settings'])
    const apiKey = stored?.settings?.geminiApiKey ?? ''
    if (!apiKey) {
      errorBox.textContent = '⚠️ 请先在设置中配置 Gemini API Key'
      errorBox.style.display = 'block'
      genBtn.textContent = '🖼️ 预览生图'
      genBtn.removeAttribute('disabled')
      return
    }

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GENERATE_IMAGE', prompt, apiKey })
      if (resp?.error) throw new Error(resp.error)
      previewImg.src = resp.dataUrl
      previewWrap.style.display = 'block'
    } catch (err) {
      errorBox.textContent = `⚠️ 生图失败: ${String(err)}`
      errorBox.style.display = 'block'
    } finally {
      genBtn.textContent = '🖼️ 预览生图'
      genBtn.removeAttribute('disabled')
    }
  })

  // ── Assemble ──────────────────────────────────────────────────────────────────
  card.append(header, imgWrap, statusBox, resultArea, actions, errorBox, previewWrap)
  overlay.appendChild(card)
  root.appendChild(overlay)
  document.documentElement.appendChild(root)

  // Start analysis immediately
  runAnalysis()
}

async function doAnalyze(
  imageUrl: string,
  imageBase64: string | null,
  resultArea: HTMLElement,
  tagsRow: HTMLElement,
  detailsGrid: HTMLElement,
  statusBox: HTMLElement,
  actions: HTMLElement,
  errorBox: HTMLElement
) {
  try {
    const stored = await chrome.storage.local.get(['settings'])
    const settings = stored?.settings ?? {}
    const model: string = settings?.model ?? 'gemini-flash'
    const apiKey: string = model === 'gemini-flash'
      ? (settings?.geminiApiKey ?? '')
      : (settings?.minimaxApiKey ?? '')

    if (!apiKey) throw new Error('请先在侧边栏 ⚙️ 设置中配置 API Key')

    const resp = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IMAGE',
      imageUrl,
      imageBase64,
      model,
      apiKey,
      language: settings?.language ?? 'zh',
    })

    if (resp?.error) throw new Error(resp.error)

    const { structured, tags } = resp

    // Fill EN prompt
    const promptEN = document.getElementById('itp-prompt-en') as HTMLTextAreaElement
    const negEN = document.getElementById('itp-neg-en') as HTMLTextAreaElement
    if (promptEN) promptEN.value = structured?.full_prompt ?? resp.prompt ?? ''
    if (negEN) negEN.value = structured?.negative_prompt ?? ''

    // Fill ZH prompt
    const promptZH = document.getElementById('itp-prompt-zh') as HTMLTextAreaElement
    const negZH = document.getElementById('itp-neg-zh') as HTMLTextAreaElement
    if (promptZH) promptZH.value = structured?.full_prompt_zh ?? structured?.full_prompt ?? resp.prompt ?? ''
    if (negZH) negZH.value = structured?.negative_prompt_zh ?? structured?.negative_prompt ?? ''

    // Tags
    tagsRow.innerHTML = ''
    const allTags: string[] = Array.isArray(tags) ? tags : (structured?.tags ?? [])
    allTags.forEach((tag: string) => {
      const chip = el('span', { class: 'itp-tag' }, tag)
      tagsRow.appendChild(chip)
    })

    // Structured details
    if (structured) {
      detailsGrid.innerHTML = ''
      const fields = [
        ['👤 主体 (EN)', structured.subject],
        ['👤 主体 (中文)', structured.subject_zh],
        ['🎨 风格', structured.style],
        ['📐 构图', structured.composition],
        ['💡 光线', structured.lighting],
        ['🎨 色调', structured.color_palette],
        ['🌟 氛围', structured.mood],
        ['⚙️ 技术', structured.technical],
      ]
      fields.forEach(([label, value]) => {
        if (!value) return
        const item = el('div', { class: 'itp-detail-item' })
        item.innerHTML = `<div class="itp-detail-label">${label}</div><div class="itp-detail-value">${value}</div>`
        detailsGrid.appendChild(item)
      })
    }

    statusBox.style.display = 'none'
    resultArea.style.display = 'block'
    actions.style.display = 'flex'
  } catch (err) {
    statusBox.style.display = 'none'
    errorBox.textContent = `⚠️ ${String(err)}`
    errorBox.style.display = 'block'
  }
}

// ── utils ─────────────────────────────────────────────────────────────────────

function copyText(text: string, btn: HTMLElement) {
  if (!text) return
  navigator.clipboard.writeText(text)
  const orig = btn.textContent
  btn.textContent = '✓ 已复制'
  setTimeout(() => (btn.textContent = orig), 2000)
}

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else node.setAttribute(k, v)
  }
  if (text !== undefined) node.textContent = text
  return node
}

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('itp-styles')) {
    document.getElementById('itp-styles')!.remove() // always refresh
  }
  const style = document.createElement('style')
  style.id = 'itp-styles'
  style.textContent = `
    #itp-float-root * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0; padding: 0;
    }

    .itp-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.48);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      padding: 20px;
    }

    /* 液态玻璃卡片 */
    .itp-card {
      position: relative;
      width: 440px; max-width: 94vw;
      max-height: 90vh; overflow-y: auto;
      border-radius: 26px;
      padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
      background: rgba(14, 14, 22, 0.75);
      border: 1px solid rgba(255,255,255,0.13);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 -1px 0 rgba(0,0,0,0.3),
        0 40px 80px rgba(0,0,0,0.65),
        0 8px 32px rgba(0,0,0,0.4),
        0 0 0 0.5px rgba(99,102,241,0.25);
      backdrop-filter: blur(32px) saturate(200%) brightness(0.85);
      -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(0.85);
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
    }
    .itp-card::-webkit-scrollbar { width: 4px; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }

    .itp-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .itp-title {
      font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px;
    }
    .itp-icon-btn {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 12px; display: flex;
      align-items: center; justify-content: center; transition: all .15s;
    }
    .itp-icon-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }

    .itp-img-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.25); max-height: 180px;
      display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 180px; object-fit: contain; display: block; }

    .itp-status {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 14px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
    }
    .itp-status span { font-size: 12px; color: #a5b4fc; }
    .itp-spinner {
      width: 16px; height: 16px; flex-shrink: 0;
      border: 2px solid rgba(99,102,241,0.3);
      border-top-color: #6366f1; border-radius: 50%;
      animation: itp-spin 0.8s linear infinite;
    }
    @keyframes itp-spin { to { transform: rotate(360deg); } }

    /* Lang tabs */
    .itp-lang-tabs {
      display: flex; gap: 4px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px; padding: 3px;
    }
    .itp-lang-tab {
      flex: 1; padding: 6px; border-radius: 8px;
      font-size: 11px; font-weight: 600;
      border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.4);
      transition: all .15s;
    }
    .itp-lang-tab.active {
      background: rgba(99,102,241,0.3);
      color: #c7d2fe;
    }

    .itp-result { display: flex; flex-direction: column; gap: 10px; }
    .itp-prompt-block { display: flex; flex-direction: column; gap: 6px; }

    .itp-label {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; font-weight: 600; color: #818cf8; letter-spacing: 0.3px;
    }
    .itp-neg-label { color: #f87171; }
    .itp-copy-btn {
      font-size: 10px; padding: 2px 8px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
      cursor: pointer; transition: all .15s; line-height: 1.6;
    }
    .itp-copy-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .itp-textarea {
      width: 100%; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04); color: #e2e8f0;
      font-size: 12px; line-height: 1.7; padding: 10px 12px;
      resize: vertical; min-height: 72px; outline: none;
      transition: border-color .15s; font-family: inherit;
    }
    .itp-textarea:focus { border-color: rgba(99,102,241,0.5); }
    .itp-neg-textarea {
      min-height: 48px; background: rgba(239,68,68,0.05);
      border-color: rgba(239,68,68,0.15); color: #fca5a5;
    }
    .itp-neg-textarea:focus { border-color: rgba(239,68,68,0.4); }

    .itp-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .itp-tag {
      border-radius: 20px; background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc;
      font-size: 10px; padding: 3px 9px;
    }

    .itp-toggle {
      font-size: 11px; color: rgba(255,255,255,0.35);
      background: none; border: none; cursor: pointer;
      padding: 4px 0; text-align: left; transition: color .15s;
    }
    .itp-toggle:hover { color: rgba(255,255,255,0.7); }

    .itp-details {
      display: none; grid-template-columns: 1fr 1fr; gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07); padding: 8px 10px;
    }
    .itp-detail-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 3px; }
    .itp-detail-value { font-size: 11px; color: #cbd5e1; line-height: 1.5; }

    .itp-actions { display: none; gap: 8px; }
    .itp-btn {
      flex: 1; padding: 9px 4px; border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all .15s; font-family: inherit;
    }
    .itp-btn:disabled { opacity: .45; cursor: not-allowed; }
    .itp-btn-primary { background: #6366f1; color: #fff; }
    .itp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .itp-btn-ghost {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
    }
    .itp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-btn-secondary {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7;
    }
    .itp-btn-secondary:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    .itp-error {
      padding: 10px 12px; border-radius: 12px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2); color: #fca5a5;
      font-size: 12px; line-height: 1.5; display: none;
    }

    .itp-preview-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .itp-preview-img { width: 100%; display: block; }
  `
  document.head.appendChild(style)
}
