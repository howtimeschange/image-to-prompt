/**
 * content-script.ts
 * 1. 监听 background 的 FETCH_IMAGE_BASE64 请求，返回 base64
 * 2. 注入液态玻璃悬浮窗到页面，支持 inline 编辑
 */

// ── Base64 converter ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE_BASE64') {
    fetchBase64(message.url)
      .then((base64) => sendResponse({ base64 }))
      .catch((err) => sendResponse({ error: String(err) }))
    return true // keep port open
  }

  if (message.type === 'SHOW_FLOAT_WINDOW') {
    showOrUpdateFloatWindow(message.imageUrl, message.imageBase64 ?? null)
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

// ── Floating Window ───────────────────────────────────────────────────────────

const CONTAINER_ID = 'itp-float-root'

function showOrUpdateFloatWindow(imageUrl: string, imageBase64: string | null) {
  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    document.documentElement.appendChild(container)
    injectStyles()
  }

  // Reset and render
  container.innerHTML = ''
  const root = buildFloatUI(imageUrl, imageBase64)
  container.appendChild(root)
}

function buildFloatUI(imageUrl: string, _base64: string | null) {
  // Outer wrapper (fixed overlay, click-outside to close)
  const overlay = el('div', { class: 'itp-overlay' })

  // The glass card
  const card = el('div', { class: 'itp-card', id: 'itp-card' })

  // ── Header ──
  const header = el('div', { class: 'itp-header' })
  const title = el('span', { class: 'itp-title' }, '🎨 ImageToPrompt')
  const closeBtn = el('button', { class: 'itp-icon-btn', title: '关闭' }, '✕')
  closeBtn.addEventListener('click', () => removeFloatWindow())
  header.append(title, closeBtn)

  // ── Image ──
  const imgWrap = el('div', { class: 'itp-img-wrap' })
  const img = el('img', { class: 'itp-img', src: imageUrl, alt: '分析图片' }) as HTMLImageElement
  img.addEventListener('error', () => { imgWrap.style.display = 'none' })
  imgWrap.appendChild(img)

  // ── Status ──
  const status = el('div', { class: 'itp-status', id: 'itp-status' })
  const spinner = el('div', { class: 'itp-spinner' })
  const statusText = el('span', {}, '正在深度分析图片...')
  status.append(spinner, statusText)

  // ── Result (hidden until loaded) ──
  const result = el('div', { class: 'itp-result', id: 'itp-result', style: 'display:none' })

  // Full Prompt (editable)
  const promptLabel = el('div', { class: 'itp-label' })
  const promptLabelIcon = el('span', {}, '✨ Full Prompt')
  const copyBtn = el('button', { class: 'itp-copy-btn', id: 'itp-copy-full' }, '📋 复制')
  promptLabel.append(promptLabelIcon, copyBtn)

  const promptArea = el('textarea', {
    class: 'itp-textarea',
    id: 'itp-prompt',
    placeholder: '等待生成...',
    spellcheck: 'false',
  }) as HTMLTextAreaElement

  // Negative Prompt (editable)
  const negLabel = el('div', { class: 'itp-label itp-neg-label' })
  negLabel.innerHTML = '<span>❌ Negative Prompt</span>'
  const negCopyBtn = el('button', { class: 'itp-copy-btn', id: 'itp-copy-neg' }, '📋')
  negLabel.appendChild(negCopyBtn)

  const negArea = el('textarea', {
    class: 'itp-textarea itp-neg-textarea',
    id: 'itp-negative',
    placeholder: '等待生成...',
    spellcheck: 'false',
  }) as HTMLTextAreaElement

  // Tags
  const tagsRow = el('div', { class: 'itp-tags', id: 'itp-tags' })

  // Structured details (collapsible)
  const detailsToggle = el('button', { class: 'itp-toggle', id: 'itp-toggle' }, '▼ 展开结构化详情')
  const detailsGrid = el('div', { class: 'itp-details', id: 'itp-details', style: 'display:none' })

  result.append(promptLabel, promptArea, negLabel, negArea, tagsRow, detailsToggle, detailsGrid)

  // ── Actions ──
  const actions = el('div', { class: 'itp-actions', id: 'itp-actions', style: 'display:none' })

  const reanalyzeBtn = el('button', { class: 'itp-btn itp-btn-ghost', id: 'itp-reanalyze' }, '🔄 重新分析')
  const copyAllBtn = el('button', { class: 'itp-btn itp-btn-primary', id: 'itp-copy-action' }, '📋 复制 Prompt')
  const genImgBtn = el('button', { class: 'itp-btn itp-btn-secondary', id: 'itp-gen-img' }, '🖼️ 预览生图')
  actions.append(reanalyzeBtn, copyAllBtn, genImgBtn)

  // ── Error ──
  const errorBox = el('div', { class: 'itp-error', id: 'itp-error', style: 'display:none' })

  // ── Preview image (gen result) ──
  const previewWrap = el('div', { class: 'itp-preview-wrap', id: 'itp-preview-wrap', style: 'display:none' })
  const previewImg = el('img', { class: 'itp-preview-img', id: 'itp-preview-img', alt: '生成预览' }) as HTMLImageElement

  previewWrap.appendChild(previewImg)

  card.append(header, imgWrap, status, result, actions, errorBox, previewWrap)
  overlay.appendChild(card)

  // ── Click outside to close ──
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeFloatWindow()
  })

  // ── Wire events ──
  detailsToggle.addEventListener('click', () => {
    const isOpen = detailsGrid.style.display !== 'none'
    detailsGrid.style.display = isOpen ? 'none' : 'grid'
    detailsToggle.textContent = isOpen ? '▼ 展开结构化详情' : '▲ 收起详情'
  })

  copyBtn.addEventListener('click', () => copyText(promptArea.value, copyBtn))
  negCopyBtn.addEventListener('click', () => copyText(negArea.value, negCopyBtn))

  copyAllBtn.addEventListener('click', () => {
    copyText(promptArea.value, copyAllBtn)
    copyAllBtn.textContent = '✓ 已复制'
    setTimeout(() => (copyAllBtn.textContent = '📋 复制 Prompt'), 2000)
  })

  // Trigger analysis
  triggerAnalysis(imageUrl, _base64, promptArea, negArea, tagsRow, detailsGrid,
    status, result, actions, errorBox)

  reanalyzeBtn.addEventListener('click', () => {
    result.style.display = 'none'
    actions.style.display = 'none'
    status.style.display = 'flex'
    errorBox.style.display = 'none'
    triggerAnalysis(imageUrl, _base64, promptArea, negArea, tagsRow, detailsGrid,
      status, result, actions, errorBox)
  })

  genImgBtn.addEventListener('click', async () => {
    const prompt = promptArea.value
    if (!prompt) return
    genImgBtn.textContent = '⏳ 生成中...'
    genImgBtn.setAttribute('disabled', 'true')
    previewWrap.style.display = 'none'

    const settings = await chrome.storage.local.get(['settings'])
    const apiKey = settings?.settings?.geminiApiKey ?? ''
    if (!apiKey) {
      showError(errorBox, '请先在侧边栏设置中配置 Gemini API Key')
      genImgBtn.textContent = '🖼️ 预览生图'
      genImgBtn.removeAttribute('disabled')
      return
    }

    try {
      const imgDataUrl = await generateImageViaBackground(prompt, apiKey)
      ;(previewImg as HTMLImageElement).src = imgDataUrl
      previewWrap.style.display = 'block'
    } catch (err) {
      showError(errorBox, `生图失败: ${String(err)}`)
    } finally {
      genImgBtn.textContent = '🖼️ 预览生图'
      genImgBtn.removeAttribute('disabled')
    }
  })

  return overlay
}

async function triggerAnalysis(
  imageUrl: string,
  base64: string | null,
  promptArea: HTMLElement,
  negArea: HTMLElement,
  tagsRow: HTMLElement,
  detailsGrid: HTMLElement,
  status: HTMLElement,
  result: HTMLElement,
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

    if (!apiKey) {
      throw new Error('请先在侧边栏 ⚙️ 设置中配置 API Key')
    }

    // Ask background to analyze (background has network access without CORS issues)
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IMAGE',
      imageUrl,
      imageBase64: base64,
      model,
      apiKey,
      language: settings?.language ?? 'zh',
    })

    if (response?.error) throw new Error(response.error)

    const { prompt, structured, tags } = response

    // Fill prompt
    ;(promptArea as HTMLTextAreaElement).value = structured?.full_prompt ?? prompt ?? ''
    ;(negArea as HTMLTextAreaElement).value = structured?.negative_prompt ?? ''

    // Tags
    tagsRow.innerHTML = ''
    const allTags: string[] = tags ?? structured?.tags ?? []
    allTags.forEach((tag: string) => {
      const chip = el('span', { class: 'itp-tag' }, tag)
      tagsRow.appendChild(chip)
    })

    // Structured details
    if (structured) {
      detailsGrid.innerHTML = ''
      const fields = [
        ['👤 主体', structured.subject],
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

    status.style.display = 'none'
    result.style.display = 'block'
    actions.style.display = 'flex'
  } catch (err) {
    status.style.display = 'none'
    showError(errorBox, String(err))
  }
}

async function generateImageViaBackground(prompt: string, apiKey: string): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: 'GENERATE_IMAGE',
    prompt,
    apiKey,
  })
  if (response?.error) throw new Error(response.error)
  return response.dataUrl
}

function showError(errorBox: HTMLElement, msg: string) {
  errorBox.textContent = `⚠️ ${msg}`
  errorBox.style.display = 'block'
}

function copyText(text: string, btn: HTMLElement) {
  if (!text) return
  navigator.clipboard.writeText(text)
  const orig = btn.textContent
  btn.textContent = '✓ 已复制'
  setTimeout(() => (btn.textContent = orig), 2000)
}

function removeFloatWindow() {
  document.getElementById(CONTAINER_ID)?.remove()
}

// ── DOM helper ────────────────────────────────────────────────────────────────

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
  if (document.getElementById('itp-styles')) return
  const style = document.createElement('style')
  style.id = 'itp-styles'
  style.textContent = `
    #itp-float-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    .itp-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      padding: 20px;
    }

    .itp-card {
      position: relative;
      width: 420px;
      max-width: 94vw;
      max-height: 88vh;
      overflow-y: auto;
      border-radius: 24px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      /* 液态玻璃核心效果 */
      background: rgba(18, 18, 28, 0.72);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.05) inset,
        0 32px 64px rgba(0,0,0,0.6),
        0 8px 24px rgba(0,0,0,0.4),
        0 0 0 0.5px rgba(99,102,241,0.3);
      backdrop-filter: blur(28px) saturate(180%) brightness(0.9);
      -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(0.9);

      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
    }

    .itp-card::-webkit-scrollbar { width: 4px; }
    .itp-card::-webkit-scrollbar-track { background: transparent; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }

    .itp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .itp-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }

    .itp-icon-btn {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      transition: all 0.15s;
      padding: 0;
      line-height: 1;
    }
    .itp-icon-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

    .itp-img-wrap {
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.25);
      max-height: 180px;
      display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 180px; object-fit: contain; display: block; }

    .itp-status {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
    }

    .itp-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(99,102,241,0.4);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: itp-spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    .itp-status span { font-size: 12px; color: #a5b4fc; }

    @keyframes itp-spin { to { transform: rotate(360deg); } }

    .itp-result { display: flex; flex-direction: column; gap: 10px; }

    .itp-label {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; font-weight: 600; color: #818cf8; letter-spacing: 0.3px;
    }
    .itp-neg-label { color: #f87171; }

    .itp-copy-btn {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: all 0.15s;
      line-height: 1.6;
    }
    .itp-copy-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .itp-textarea {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #e2e8f0;
      font-size: 12px;
      line-height: 1.7;
      padding: 10px 12px;
      resize: vertical;
      min-height: 80px;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }
    .itp-textarea:focus { border-color: rgba(99,102,241,0.5); }
    .itp-neg-textarea {
      min-height: 52px;
      background: rgba(239,68,68,0.05);
      border-color: rgba(239,68,68,0.15);
      color: #fca5a5;
    }
    .itp-neg-textarea:focus { border-color: rgba(239,68,68,0.4); }

    .itp-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .itp-tag {
      border-radius: 20px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.25);
      color: #a5b4fc;
      font-size: 10px;
      padding: 3px 9px;
    }

    .itp-toggle {
      font-size: 11px; color: rgba(255,255,255,0.35);
      background: none; border: none; cursor: pointer;
      padding: 4px 0; text-align: left;
      transition: color 0.15s;
    }
    .itp-toggle:hover { color: rgba(255,255,255,0.7); }

    .itp-details {
      display: none;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 8px 10px;
    }
    .itp-detail-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 3px; }
    .itp-detail-value { font-size: 11px; color: #cbd5e1; line-height: 1.5; }

    .itp-actions {
      display: none; gap: 8px;
    }
    .itp-btn {
      flex: 1; padding: 9px 4px;
      border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit;
    }
    .itp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .itp-btn-primary {
      background: #6366f1;
      color: #fff;
    }
    .itp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .itp-btn-ghost {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.7);
    }
    .itp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-btn-secondary {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.25);
      color: #6ee7b7;
    }
    .itp-btn-secondary:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    .itp-error {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      color: #fca5a5;
      font-size: 12px;
      line-height: 1.5;
    }

    .itp-preview-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .itp-preview-img { width: 100%; display: block; }
  `
  document.head.appendChild(style)
}
