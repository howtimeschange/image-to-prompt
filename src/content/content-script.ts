/**
 * content-script.ts
 * 参考图3设计：毛玻璃悬浮卡片，中英Tab，色板，完整字段展示
 * 提示词方法论：莲生《偷图神技》— visual_style JSON结构
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE_BASE64') {
    fetchBase64(message.url)
      .then((base64) => sendResponse({ base64 }))
      .catch((err) => sendResponse({ error: String(err) }))
    return true
  }
  if (message.type === 'SHOW_FLOAT_WINDOW') {
    destroyFloatWindow()
    buildFloatWindow(message.imageUrl, message.imageBase64 ?? null)
    sendResponse({ ok: true })
    return true
  }
})

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const r = reader.result as string
      resolve(r.includes(',') ? r.split(',')[1] : r)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const ROOT_ID = 'itp-float-root'

function destroyFloatWindow() {
  document.getElementById(ROOT_ID)?.remove()
}

// ── 全局状态（当前语言）────────────────────────────────────────────────────────
let currentLang: 'en' | 'zh' = 'zh'
let currentStructured: any = null

function buildFloatWindow(imageUrl: string, imageBase64: string | null) {
  injectStyles()
  currentLang = 'zh'
  currentStructured = null

  const root = el('div', { id: ROOT_ID })

  // Backdrop
  const overlay = el('div', { class: 'itp-overlay' })
  overlay.addEventListener('click', (e) => { if (e.target === overlay) destroyFloatWindow() })

  // Card
  const card = el('div', { class: 'itp-card' })

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = el('div', { class: 'itp-header' })
  const titleWrap = el('div', { class: 'itp-title-wrap' })
  titleWrap.innerHTML = `<span class="itp-brand">IMAGETOPROMPT</span><span class="itp-subtitle" id="itp-theme-label">分析结果</span>`
  const closeBtn = el('button', { class: 'itp-close' }, '×')
  closeBtn.addEventListener('click', destroyFloatWindow)
  header.append(titleWrap, closeBtn)

  // ── Image ────────────────────────────────────────────────────────────────────
  const imgWrap = el('div', { class: 'itp-img-wrap' })
  const img = document.createElement('img')
  img.src = imageUrl
  img.className = 'itp-img'
  img.addEventListener('error', () => { imgWrap.style.display = 'none' })
  // Color strip (filled after analysis)
  const colorStrip = el('div', { class: 'itp-color-strip', id: 'itp-color-strip', style: 'display:none' })
  imgWrap.append(img, colorStrip)

  // ── Loading ──────────────────────────────────────────────────────────────────
  const loading = el('div', { class: 'itp-loading', id: 'itp-loading' })
  loading.innerHTML = `
    <div class="itp-dots"><span></span><span></span><span></span></div>
    <p>提取视觉风格...</p>`

  // ── Error ────────────────────────────────────────────────────────────────────
  const errorBox = el('div', { class: 'itp-error-box', id: 'itp-error-box', style: 'display:none' })

  // ── Result ───────────────────────────────────────────────────────────────────
  const result = el('div', { class: 'itp-result', id: 'itp-result', style: 'display:none' })

  // Lang tabs (中 / EN)
  const langBar = el('div', { class: 'itp-lang-bar' })
  const btnZH = el('button', { class: 'itp-lang-btn active' }, '中')
  const btnEN = el('button', { class: 'itp-lang-btn' }, 'EN')
  const btnJA = el('button', { class: 'itp-lang-btn' }, 'J')
  langBar.append(btnZH, btnEN, btnJA)

  function setLang(lang: 'zh' | 'en' | 'ja') {
    currentLang = lang === 'ja' ? 'zh' : lang // ja → fallback zh for display
    btnZH.className = `itp-lang-btn${lang === 'zh' ? ' active' : ''}`
    btnEN.className = `itp-lang-btn${lang === 'en' ? ' active' : ''}`
    btnJA.className = `itp-lang-btn${lang === 'ja' ? ' active' : ''}`
    refreshPromptDisplay()
  }
  btnZH.addEventListener('click', () => setLang('zh'))
  btnEN.addEventListener('click', () => setLang('en'))
  btnJA.addEventListener('click', () => setLang('ja'))

  // Main prompt textarea
  const promptSection = el('div', { class: 'itp-prompt-section' })
  const promptTextarea = el('textarea', { class: 'itp-prompt-ta', id: 'itp-main-prompt', spellcheck: 'false' }) as HTMLTextAreaElement

  function refreshPromptDisplay() {
    const s = currentStructured
    if (!s) return
    promptTextarea.value = currentLang === 'en'
      ? (s.full_prompt ?? s.prompts?.full_prompt ?? '')
      : (s.full_prompt_zh ?? s.prompts?.full_prompt_zh ?? s.full_prompt ?? '')
  }

  promptSection.appendChild(promptTextarea)

  // Negative prompt
  const negSection = el('div', { class: 'itp-neg-section' })
  const negLabel = el('div', { class: 'itp-field-label itp-neg-label' })
  negLabel.innerHTML = `<span class="itp-x">✕</span> Negative Prompt`
  const negTextarea = el('textarea', { class: 'itp-neg-ta', id: 'itp-neg-prompt', spellcheck: 'false' }) as HTMLTextAreaElement
  negSection.append(negLabel, negTextarea)

  // Tags row
  const tagsRow = el('div', { class: 'itp-tags-row', id: 'itp-tags-row' })

  // Details section (always visible, per 参考图3)
  const details = el('div', { class: 'itp-details-section', id: 'itp-details', style: 'display:none' })

  result.append(langBar, promptSection, negSection, tagsRow, details)

  // ── Actions ──────────────────────────────────────────────────────────────────
  const actions = el('div', { class: 'itp-actions', id: 'itp-actions', style: 'display:none' })
  const reBtn = el('button', { class: 'itp-action-btn itp-re-btn' }, '↺ 重新分析')
  const copyBtn = el('button', { class: 'itp-action-btn itp-copy-btn-main' }, '⊡ 复制 Prompt')
  const genBtn = el('button', { class: 'itp-action-btn itp-gen-btn' }, '⊞ 预览生图')
  actions.append(reBtn, copyBtn, genBtn)

  // ── Preview ──────────────────────────────────────────────────────────────────
  const previewWrap = el('div', { class: 'itp-preview-wrap', style: 'display:none' })
  const previewImg = document.createElement('img')
  previewImg.className = 'itp-preview-img'
  previewWrap.appendChild(previewImg)

  // ── Wire events ───────────────────────────────────────────────────────────────

  // Copy: 完整 prompt（当前语言）+ negative
  copyBtn.addEventListener('click', () => {
    const main = promptTextarea.value ?? ''
    const neg = negTextarea.value ?? ''
    const full = neg ? `${main}\n\nNegative: ${neg}` : main
    navigator.clipboard.writeText(full)
    const orig = copyBtn.textContent
    copyBtn.textContent = '✓ 已复制'
    copyBtn.classList.add('itp-copied')
    setTimeout(() => { copyBtn.textContent = orig!; copyBtn.classList.remove('itp-copied') }, 2000)
  })

  function runAnalysis() {
    loading.style.display = 'flex'
    result.style.display = 'none'
    actions.style.display = 'none'
    errorBox.style.display = 'none'
    previewWrap.style.display = 'none'
    doAnalyze(imageUrl, imageBase64, {
      loading, result, actions, errorBox, previewWrap,
      promptTextarea, negTextarea, tagsRow, details, colorStrip,
    })
  }

  reBtn.addEventListener('click', runAnalysis)

  genBtn.addEventListener('click', async () => {
    const prompt = promptTextarea.value
    if (!prompt) return
    genBtn.textContent = '⏳...'
    genBtn.setAttribute('disabled', 'true')
    const stored = await chrome.storage.local.get(['settings'])
    const apiKey = stored?.settings?.geminiApiKey ?? ''
    if (!apiKey) {
      showError(errorBox, '请先在侧边栏设置中配置 Gemini API Key')
      genBtn.textContent = '⊞ 预览生图'; genBtn.removeAttribute('disabled'); return
    }
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GENERATE_IMAGE', prompt, apiKey })
      if (resp?.error) throw new Error(resp.error)
      previewImg.src = resp.dataUrl
      previewWrap.style.display = 'block'
    } catch (err) {
      showError(errorBox, `生图失败: ${String(err)}`)
    } finally { genBtn.textContent = '⊞ 预览生图'; genBtn.removeAttribute('disabled') }
  })

  card.append(header, imgWrap, loading, errorBox, result, actions, previewWrap)
  overlay.appendChild(card)
  root.appendChild(overlay)
  document.documentElement.appendChild(root)

  runAnalysis()
}

interface AnalyzeRefs {
  loading: HTMLElement; result: HTMLElement; actions: HTMLElement
  errorBox: HTMLElement; previewWrap: HTMLElement
  promptTextarea: HTMLTextAreaElement; negTextarea: HTMLTextAreaElement
  tagsRow: HTMLElement; details: HTMLElement; colorStrip: HTMLElement
}

async function doAnalyze(imageUrl: string, imageBase64: string | null, refs: AnalyzeRefs) {
  const { loading, result, actions, errorBox, promptTextarea, negTextarea, tagsRow, details, colorStrip } = refs
  try {
    const stored = await chrome.storage.local.get(['settings'])
    const settings = stored?.settings ?? {}
    const model: string = settings?.model ?? 'gemini-flash'
    const apiKey: string = model === 'gemini-flash' ? (settings?.geminiApiKey ?? '') : (settings?.minimaxApiKey ?? '')
    if (!apiKey) throw new Error('请先在侧边栏设置中配置 API Key')

    const resp = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IMAGE', imageUrl, imageBase64, model, apiKey,
      language: settings?.language ?? 'zh',
    })
    if (resp?.error) throw new Error(resp.error)

    const s = resp.structured ?? {}
    currentStructured = s

    // -- 从 visual_style 提取数据 --
    const vs = s.visual_style ?? {}
    const pr = s // structured 已在 background 里展平

    // Prompt 填充（按当前语言）
    promptTextarea.value = currentLang === 'en'
      ? (pr.full_prompt ?? '')
      : (pr.full_prompt_zh ?? pr.full_prompt ?? '')
    negTextarea.value = currentLang === 'en'
      ? (pr.negative_prompt ?? '')
      : (pr.negative_prompt_zh ?? pr.negative_prompt ?? '')

    // 更新主题标签
    const themeLabel = document.getElementById('itp-theme-label')
    if (themeLabel && vs.overall_concept?.theme) {
      themeLabel.textContent = vs.overall_concept.theme
    }

    // Tags
    tagsRow.innerHTML = ''
    const allTags: string[] = Array.isArray(pr.tags) ? pr.tags : []
    allTags.forEach((tag: string) => {
      const chip = el('span', { class: 'itp-tag-chip' }, tag)
      tagsRow.appendChild(chip)
    })

    // Color strip from color_palette
    const allColors = [
      ...(vs.color_palette?.dominant_colors ?? []),
      ...(vs.color_palette?.accent_colors ?? []),
    ].filter((c: any) => c?.hex)
    if (allColors.length) {
      colorStrip.innerHTML = ''
      allColors.forEach((c: any) => {
        const sw = el('button', { class: 'itp-color-sw', style: `background:${c.hex}`, title: `${c.name}\n${c.hex}` })
        sw.addEventListener('click', () => {
          navigator.clipboard.writeText(c.hex)
          sw.style.outline = '2px solid white'
          setTimeout(() => (sw.style.outline = ''), 1000)
        })
        colorStrip.appendChild(sw)
      })
      colorStrip.style.display = 'flex'
    }

    // Details grid — 对照参考图3的字段布局
    details.innerHTML = ''
    const detailFields: Array<[string, string]> = [
      ['主体', pr.subject_zh ?? (vs.subjects_and_props?.subject?.description ?? '')],
      ['风格', pr.style ?? (vs.overall_concept?.theme ?? '')],
      ['构图', pr.composition ?? (vs.composition?.layout_type ?? '')],
      ['光线', pr.lighting ?? (vs.effects_and_textures?.lighting?.type ?? '')],
      ['色调', pr.color_palette ?? (vs.color_palette?.color_harmony ?? '')],
      ['氛围', pr.mood ?? (vs.overall_concept?.mood ?? '')],
      ['技术', pr.technical ?? (vs.effects_and_textures?.texture?.join(', ') ?? '')],
    ].filter(([, v]) => v)

    if (detailFields.length) {
      const grid = el('div', { class: 'itp-details-grid' })
      detailFields.forEach(([label, value]) => {
        const item = el('div', { class: 'itp-detail-item' })
        item.innerHTML = `<div class="itp-detail-lbl">${label}</div><div class="itp-detail-val">${value}</div>`
        grid.appendChild(item)
      })
      details.appendChild(grid)
      details.style.display = 'block'
    }

    loading.style.display = 'none'
    result.style.display = 'block'
    actions.style.display = 'flex'
  } catch (err) {
    loading.style.display = 'none'
    showError(errorBox, String(err))
  }
}

function showError(box: HTMLElement, msg: string) {
  box.textContent = `⚠ ${msg}`
  box.style.display = 'block'
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

function copyText(text: string, btn: HTMLElement) {
  if (!text) return
  navigator.clipboard.writeText(text)
  const orig = btn.textContent
  btn.textContent = '✓'
  setTimeout(() => (btn.textContent = orig), 2000)
}

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  document.getElementById('itp-styles')?.remove()
  const style = document.createElement('style')
  style.id = 'itp-styles'
  style.textContent = `
    #itp-float-root *, #itp-float-root *::before, #itp-float-root *::after {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      margin: 0; padding: 0;
    }

    /* Overlay */
    .itp-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      padding: 16px;
    }

    /* Card — 参考图3：毛玻璃深色卡片，max-height 可滚动 */
    .itp-card {
      width: 420px; max-width: 94vw;
      max-height: 88vh; overflow-y: auto;
      border-radius: 20px;
      background: rgba(16,16,22,0.88);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 32px 72px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      display: flex; flex-direction: column;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .itp-card::-webkit-scrollbar { width: 3px; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* Header */
    .itp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 16px 16px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .itp-title-wrap { display: flex; flex-direction: column; gap: 2px; }
    .itp-brand {
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
      color: rgba(255,255,255,0.3); text-transform: uppercase;
    }
    .itp-subtitle {
      font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; line-height: 1.2;
    }
    .itp-close {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.5); border-radius: 50%; width: 28px; height: 28px;
      font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .15s; flex-shrink: 0; margin-top: 2px;
    }
    .itp-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

    /* Image */
    .itp-img-wrap {
      position: relative; background: #000; overflow: hidden;
      max-height: 220px; display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 220px; object-fit: contain; display: block; }
    .itp-color-strip { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; display: none; }
    .itp-color-sw { flex: 1; height: 6px; border: none; cursor: pointer; transition: transform .15s; }
    .itp-color-sw:hover { transform: scaleY(2.5); transform-origin: bottom; }

    /* Loading */
    .itp-loading {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; color: rgba(255,255,255,0.35); font-size: 12px;
    }
    .itp-dots { display: flex; gap: 4px; }
    .itp-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3);
      animation: itp-pulse 1s ease-in-out infinite;
    }
    .itp-dots span:nth-child(2) { animation-delay: .2s; }
    .itp-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes itp-pulse { 0%,100%{opacity:.2;transform:scale(.9)} 50%{opacity:.8;transform:scale(1.1)} }

    /* Error */
    .itp-error-box {
      margin: 12px 16px; padding: 10px 12px; border-radius: 8px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: rgba(252,165,165,0.9); font-size: 12px; line-height: 1.5; display: none;
    }

    /* Result */
    .itp-result { display: none; flex-direction: column; }

    /* Lang bar — 参考图3底部语言按钮样式 */
    .itp-lang-bar {
      display: flex; gap: 6px; padding: 12px 16px 8px;
    }
    .itp-lang-btn {
      padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all .15s;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.4);
    }
    .itp-lang-btn.active { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); }

    /* Prompt textarea — 大而清晰，对照参考图3正文字号 */
    .itp-prompt-section { padding: 0 16px 12px; }
    .itp-prompt-ta {
      width: 100%; min-height: 120px; max-height: 260px;
      background: transparent; border: none; outline: none;
      color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.75;
      resize: vertical; font-family: inherit; overflow-y: auto;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .itp-prompt-ta::placeholder { color: rgba(255,255,255,0.2); }

    /* Negative prompt */
    .itp-neg-section {
      margin: 0 16px 12px; border-radius: 10px;
      background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); padding: 10px 12px;
    }
    .itp-field-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
      color: rgba(255,255,255,0.35); margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
    }
    .itp-neg-label { color: rgba(248,113,113,0.7); }
    .itp-x { font-size: 14px; }
    .itp-neg-ta {
      width: 100%; min-height: 52px; max-height: 120px;
      background: transparent; border: none; outline: none;
      color: rgba(252,165,165,0.7); font-size: 12px; line-height: 1.7;
      font-family: inherit; resize: vertical;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }

    /* Tags */
    .itp-tags-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 12px; }
    .itp-tag-chip {
      border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 500;
      background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.3);
      color: rgba(199,210,254,0.85); cursor: default;
    }

    /* Details grid — 对照参考图3两列卡片 */
    .itp-details-section { padding: 0 16px 12px; display: none; }
    .itp-details-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07); padding: 10px 11px;
    }
    .itp-detail-lbl {
      font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
      color: rgba(255,255,255,0.28); margin-bottom: 4px; text-transform: uppercase;
    }
    .itp-detail-val { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.45; }

    /* Actions — 对照参考图3底部三按钮 */
    .itp-actions {
      display: none; gap: 6px; padding: 6px 16px 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .itp-action-btn {
      flex: 1; padding: 11px 6px; border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s;
      font-family: inherit; letter-spacing: 0.01em;
    }
    .itp-action-btn:disabled { opacity: .4; cursor: not-allowed; }
    .itp-re-btn {
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
    }
    .itp-re-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-copy-btn-main { background: #5145cd; color: #fff; }
    .itp-copy-btn-main:hover:not(:disabled) { background: #4338ca; }
    .itp-copy-btn-main.itp-copied { background: #16a34a; }
    .itp-gen-btn {
      background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.25);
      color: rgba(110,231,183,0.9);
    }
    .itp-gen-btn:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    /* Preview */
    .itp-preview-wrap { margin: 0 16px 16px; border-radius: 12px; overflow: hidden; }
    .itp-preview-img { width: 100%; display: block; }
  `
  document.head.appendChild(style)
}
