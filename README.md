# ImageToPrompt

> Right-click any image → AI extracts its visual DNA → get a structured JSON style archive you can reuse in Gemini / Midjourney / Flux / Stable Diffusion.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)

**[中文](#中文说明) | [English](#english-guide)**

---

## 中文说明

### 这是什么

ImageToPrompt 是一个 Chrome 扩展。右键任意网页图片，AI 自动提取其视觉风格，输出一份结构化 JSON 档案（颜色、构图、光影、质感……），你可以把这份 JSON 粘贴给任意 AI 图像工具，生成同风格的新图。

### 功能亮点

- 🎨 **结构化风格档案** — 不是一句 prompt，而是可复用的 JSON，描述颜色/构图/光影/质感
- 🌐 **多语言分析提示词** — 中文、英文、日文三套系统提示词
- 🖼️ **色板可视化** — 主色 + 强调色以色块展示，点击复制 hex 值
- ⚡ **一键生成指令** — 输入新主题，切换中英文，一键复制完整生成指令
- 🔒 **隐私优先** — API Key 仅存储在本地 `chrome.storage.local`，不经过任何第三方服务器

### 安装方法

#### 方法一：下载 Release（推荐，无需编译）

1. 前往 [Releases 页面](https://github.com/howtimeschange/image-to-prompt/releases)
2. 下载最新版本的 `extension.zip`
3. 解压到任意文件夹（比如桌面的 `image-to-prompt/`）

#### 方法二：从源码构建

```bash
git clone https://github.com/howtimeschange/image-to-prompt.git
cd image-to-prompt
npm install
npm run build
# 构建完成后，使用 dist/ 文件夹
```

#### 导入 Chrome

1. 打开 Chrome，地址栏输入 `chrome://extensions/` 并回车
2. 右上角开启 **开发者模式**（Developer mode）
3. 点击左上角 **加载已解压的扩展程序**（Load unpacked）
4. 选择解压后的文件夹（或 `dist/` 文件夹）
5. 扩展图标出现在工具栏，安装完成 ✅

> **Edge 用户**：打开 `edge://extensions/`，同样开启开发者模式后操作步骤相同。

#### 配置 API Key

1. 点击工具栏的扩展图标 → 点击 **打开侧边栏**
2. 点击右上角 ⚙️ 设置图标
3. 填入你的 **Gemini API Key**（免费申请：[aistudio.google.com](https://aistudio.google.com)）
4. 可选：填入 MiniMax API Key 以使用备用视觉模型

### 使用方法

#### 分析图片风格

1. 在任意网页上，**右键点击**你想分析的图片
2. 选择菜单中的 **"分析图片风格"**
3. 侧边栏自动打开，AI 开始分析，几秒后输出 `visual_style` JSON

```json
{
  "visual_style": {
    "overall_concept": "极简主义产品摄影，冷色调工业感",
    "color_palette": {
      "dominant": [{ "hex": "#1a1a2e", "role": "背景" }],
      "accent":   [{ "hex": "#e94560", "role": "点缀高光" }]
    },
    "composition": { "layout": "中心构图", "focal_point": "产品主体" },
    "reproduction_prompt": {
      "style_essence_en": "minimalist product photography, cold industrial tone",
      "style_essence_zh": "极简主义产品摄影，冷色调工业感",
      "negative_prompt": "blurry, overexposed, chromatic aberration",
      "style_tags": ["minimalist", "product", "cold tone", "industrial"]
    }
  }
}
```

#### 生成同风格新图

分析完成后，使用侧边栏底部的 **生成指令** 区域：

1. 在输入框填写你想生成的新主题（比如：`赛博朋克街头`）
2. 切换 **中文 / English** 指令语言
3. 点击 **复制指令**
4. 将指令粘贴给 Gemini、Midjourney、Flux 等任意 AI 图像工具

**指令示例（中文）：**
> 请严格按照以下 JSON 数据中描述的视觉风格、色彩、构图和光影，生成一张「赛博朋克街头」的图像：
> `{ "visual_style": { ... } }`

---

## English Guide

### What It Does

ImageToPrompt is a Chrome extension. Right-click any image on any webpage, and AI automatically extracts its visual style into a structured JSON archive (colors, composition, lighting, textures…). Paste this JSON into any AI image tool to generate new images in the same style.

### Features

- 🎨 **Structured style archive** — not a plain prompt, but a reusable JSON describing color, composition, lighting, and mood
- 🌐 **Multi-language prompts** — system prompts in Chinese, English, and Japanese
- 🖼️ **Color palette visualization** — dominant and accent colors shown as clickable hex swatches
- ⚡ **One-click instruction builder** — type a new subject, toggle ZH/EN, copy the full generation command
- 🔒 **Privacy-first** — API keys stored locally in `chrome.storage.local` only

### Installation

#### Option 1: Download Release (Recommended — no build required)

1. Go to the [Releases page](https://github.com/howtimeschange/image-to-prompt/releases)
2. Download the latest `extension.zip`
3. Unzip to any folder (e.g. your Desktop → `image-to-prompt/`)

#### Option 2: Build from Source

```bash
git clone https://github.com/howtimeschange/image-to-prompt.git
cd image-to-prompt
npm install
npm run build
# Use the dist/ folder after build
```

#### Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle on **Developer mode** (top-right corner)
3. Click **Load unpacked** (top-left)
4. Select the unzipped folder (or the `dist/` folder from source build)
5. The extension icon appears in your toolbar — done ✅

> **Edge users**: Open `edge://extensions/` and follow the same steps.

#### Configure Your API Key

1. Click the extension icon in the toolbar → click **Open Sidebar**
2. Click the ⚙️ settings icon (top-right of sidebar)
3. Enter your **Gemini API Key** (free at [aistudio.google.com](https://aistudio.google.com))
4. Optionally add a **MiniMax API Key** for the alternative vision model

### How to Use

#### Analyze an Image

1. On any webpage, **right-click** the image you want to analyze
2. Select **"分析图片风格"** from the context menu
3. The sidebar opens and AI analyzes the image, outputting a `visual_style` JSON in seconds

#### Generate a New Image in the Same Style

After analysis, use the **Generate Instruction** box at the bottom of the sidebar:

1. Type your new subject (e.g. `a lone astronaut`, `cyberpunk street`)
2. Toggle **ZH** or **EN** for the instruction language
3. Click **Copy Instruction**
4. Paste it into Gemini, Midjourney, Flux, or any AI image tool

**Example instruction (English):**
> Please generate an image of "a lone astronaut" strictly following the visual style, colors, composition and lighting described in this JSON:
> `{ "visual_style": { ... } }`

The AI sees both **what** to generate and **how it should look** — color palette, composition rules, lighting mood, textures, and more.

---

## Supported Models

| Role | Model |
|------|-------|
| Vision / Style Analysis | `gemini-3-flash-preview` (Gemini 3 Flash) |
| Vision alternative | MiniMax-VL-01 |
| Image generation | `gemini-3.1-flash-image-preview` |

---

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** · **Zustand**
- Chrome Extension Manifest V3

---

## Development

```bash
npm run dev      # Watch mode
npm run build    # Production build → dist/
npm run zip      # Build + package → extension.zip
```

---

## License

MIT
