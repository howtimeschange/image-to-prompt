# ImageToPrompt

> Right-click any image → AI extracts its visual DNA → get a structured JSON style archive you can reuse in Gemini / Midjourney / Flux / Stable Diffusion.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)

---

## What It Does

1. **Right-click** any image on any webpage
2. Select **"分析图片风格"** from the context menu
3. The sidebar opens and AI analyzes the image, outputting a `visual_style` JSON:

```json
{
  "visual_style": {
    "overall_concept": "...",
    "color_palette": {
      "dominant": [{ "hex": "#1a1a2e", "role": "background" }],
      "accent": [{ "hex": "#e94560", "role": "highlight" }]
    },
    "composition": { "layout": "...", "focal_point": "..." },
    "effects_and_textures": "...",
    "subjects_and_props": { "subject": { "description": "..." } },
    "reproduction_prompt": {
      "style_essence_en": "cinematic noir, high contrast ...",
      "style_essence_zh": "电影感黑色风格，高对比度...",
      "negative_prompt": "blurry, low quality, overexposed",
      "style_tags": ["noir", "cinematic", "moody", "dark"]
    }
  }
}
```

4. Paste the JSON into any AI with a template like:
   > *请严格按照以下 JSON 数据中描述的视觉风格，生成一张「赛博朋克街头」的图像：[JSON]*

---

## Features

- 🎨 **Structured style archive** — not a plain text prompt, but a reusable JSON describing color, composition, lighting, and mood
- 🌐 **Multi-language prompts** — system prompts available in Chinese, English, and Japanese
- 🖼️ **Color palette visualization** — dominant and accent colors displayed as clickable hex swatches
- ⚡ **GenerateCommandBox** — enter a new subject, toggle ZH/EN, copy the full generation instruction in one click
- 🔒 **Privacy-first** — API keys stored locally in `chrome.storage.local`, never sent anywhere except the AI provider
- 🌙 **Dark mode UI** — `#0c0c0e` base, clean typographic hierarchy, no visual clutter

---

## Supported AI Models

| Role | Model |
|------|-------|
| Vision / Style Analysis | `gemini-3-flash-preview` (Gemini 3 Flash) |
| Vision alternative | MiniMax-VL-01 |
| Image generation preview | `gemini-3.1-flash-image-preview` |

---

## Installation

### From Source

```bash
git clone https://github.com/howtimeschange/image-to-prompt.git
cd image-to-prompt
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

### Configure API Key

1. Click the extension icon → **Open Sidebar**
2. Click the ⚙️ settings icon
3. Enter your **Gemini API key** (get one at [aistudio.google.com](https://aistudio.google.com))
4. Optionally add a **MiniMax API key** for alternative vision model

---

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **Zustand** (state management)
- Chrome Extension Manifest V3 (service worker + sidebar)

---

## Project Structure

```
src/
├── background/       # Service worker — context menu, AI request proxy
├── content/          # Content script — image base64 extraction
├── sidebar/          # Main sidebar UI (App.tsx)
├── popup/            # Extension popup
├── components/       # SettingsPanel, shared components
├── services/         # gemini.ts, minimax.ts, types.ts
├── hooks/            # useAI.ts
└── stores/           # appStore.ts (Zustand)
```

---

## How to Generate a New Image from the Style Archive

After analyzing an image, use the **GenerateCommandBox** in the sidebar:

1. Type your new subject (e.g. `"赛博朋克街头"` or `"a lone astronaut"`)
2. Toggle ZH or EN
3. Click **Copy Instruction**
4. Paste into Gemini, Midjourney, Flux, or any image AI

The full instruction wraps your new subject with the complete JSON context, so the AI understands both **what** to generate and **how it should look**.

---

## Development

```bash
npm run dev      # Watch mode (rebuilds on save)
npm run build    # Production build → dist/
npm run zip      # Build + package → extension.zip
```

---

## License

MIT
