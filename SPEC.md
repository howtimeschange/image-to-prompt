# ImageToPrompt - Chrome Extension Spec

> AI 图片转提示词 Chrome 插件规格说明书

## 1. Overview

**项目名称**: ImageToPrompt  
**项目类型**: Chrome Extension (Manifest V3)  
**核心功能**: 在任意网页选中图片 → AI 分析 → 生成详细 Prompt → 支持多语言翻译和预览生图  
**目标用户**: AI 绘图爱好者、设计师、内容创作者

---

## 2. 功能范围

### 2.1 唤起方式（入口）

| 入口 | 触发方式 | 说明 |
|------|----------|------|
| **右键菜单** | 右键点击网页图片 → "ImageToPrompt" | MVP 核心场景 |
| **侧边栏** | 点击工具栏图标或快捷键 | 主交互界面，支持多轮对话 |
| **图标点击（Popup）** | 点击插件图标 | 轻量快速操作 |

### 2.2 交互形态

| 形态 | 特点 | 适用场景 |
|------|------|----------|
| **侧边栏 (Sidebar)** | 固定在浏览器右侧，可调整大小，支持多轮对话，历史记录 | 深度分析、多图对比 |
| **悬浮窗 (Popup)** | 轻量、临时、随开随关 | 快速复制、一键使用 |

### 2.2 核心功能

- [ ] **图片获取**：从网页右键菜单获取图片 URL 或 Base64
- [ ] **AI 分析**：调用 MiniMax / Gemini Flash 生成详细描述
- [ ] **Prompt 编辑**：用户可直接修改生成的 Prompt
- [ ] **风格标签**：自动提取关键词（时尚摄影、抽象人像等）
- [ ] **语言切换**：中 / EN / J 三种语言
- [ ] **一键复制**：复制 Prompt 到剪贴板
- [ ] **模型切换**：用户可选 MiniMax / Gemini Flash
- [ ] **API Key 配置**：用户可配置自己的 API Key
- [ ] **预览生图**：用生成的 Prompt 调用生图 API 生成预览图
- [ ] **多轮对话**：在侧边栏中支持对同一张图片进行多轮问答/修改
- [ ] **历史记录**：保存历次识图结果，可随时查看、复用、删除

### 2.3 非功能范围

- 不做多标签页状态同步
- 不做云端历史记录
- 不做账号系统

---

## 3. UI/UX

### 3.1 窗口形态

**侧边栏（Sidebar）**
- 尺寸：420px 宽（可拖拽调整）
- 位置：固定在浏览器右侧
- 样式：Dark Mode + 毛玻璃效果
- 支持多轮对话和历史记录

**悬浮窗（Popup）**
- 尺寸：400px × 520px（固定）
- 位置：屏幕居中
- 样式：Dark Mode + 毛玻璃效果
- 轻量快速操作

### 3.2 侧边栏界面布局（主交互界面）

```
┌──────────────────────────────┐
│  🎨 ImageToPrompt   [⚙] [×] │  Header（设置 + 关闭）
├──────────────────────────────┤
│  [历史] [新对话]             │  Tab 切换
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │      当前图片预览      │  │  显示当前分析的图片
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  🤖 AI 生成的 Prompt  │  │  Prompt 结果（可编辑）
│  │                        │  │
│  │  [风格标签] [标签]     │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  💬 多轮对话区         │  │  可继续提问/修改
│  │  "换成男性风格"       │  │
│  │  "加一些赛博朋克元素"  │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  [中] [EN] [J]              │  语言切换
│  [🚀 预览] [📋 复制] [模型▼] │  操作按钮
└──────────────────────────────┘
```

### 3.3 历史记录界面

```
┌──────────────────────────────┐
│  📜 历史记录          [×]   │
├──────────────────────────────┤
│  🔍 搜索历史...              │
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ 🖼️ 图片缩略图          │  │  点击加载
│  │ 时尚摄影 | 2026-03-31  │  │
│  │ [删除] [复制]           │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🖼️ 图片缩略图          │  │
│  │ 抽象人像 | 2026-03-30  │  │
│  │ [删除] [复制]           │  │
│  └────────────────────────┘  │
│           ...                │
└──────────────────────────────┘
```

### 3.3 设置面板（抽屉/弹窗）

```
┌──────────────────────────────┐
│  ⚙️ 设置                    │
├──────────────────────────────┤
│  AI 模型                     │
│  ┌────────────────────────┐  │
│  │ MiniMax               │  │
│  │ API Key: [**********] │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Gemini Flash          │  │
│  │ API Key: [__________] │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  [保存]                      │
└──────────────────────────────┘
```

---

## 4. 技术方案

### 4.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **框架** | React 18 + TypeScript | 组件化开发 |
| **样式** | Tailwind CSS | 快速 styling |
| **构建** | Vite | 多 entry points 支持 |
| **状态** | Zustand | 轻量 store |
| **打包** | chrome-extension-cli / crx | 最终打包 |

### 4.2 项目结构

```
image-to-prompt/
├── manifest.json           # MV3 配置（Vite 生成）
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts          # 多 entry points
├── src/
│   ├── manifest.ts         # manifest 模板
│   ├── popup/               # 悬浮窗入口
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── sidebar/             # 侧边栏入口（主界面）
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── content/             # Content Script
│   │   └── content-script.ts
│   ├── background/          # Service Worker
│   │   └── service-worker.ts
│   ├── components/          # 共享组件
│   │   ├── ImagePreview.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── StyleTags.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── ModelSwitcher.tsx
│   │   ├── ActionButtons.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── PreviewGrid.tsx
│   │   ├── ChatMessages.tsx   # 多轮对话消息
│   │   ├── HistoryList.tsx    # 历史记录列表
│   │   └── ImageInput.tsx     # 图片输入（上传/粘贴）
│   ├── hooks/
│   │   ├── useAI.ts
│   │   ├── useHistory.ts      # 历史记录 CRUD
│   │   └── useChat.ts         # 多轮对话
│   ├── stores/
│   │   └── appStore.ts        # Zustand 全局状态
│   ├── services/
│   │   ├── types.ts           # AI 接口定义
│   │   ├── minimax.ts         # MiniMax 实现
│   │   ├── gemini.ts          # Gemini 实现
│   │   └── imageGen.ts         # 生图 API
│   └── styles/
│       └── globals.css
└── public/
    └── icons/                 # 插件图标
```

### 4.3 数据流

```
[右键图片] → [Context Menu API]
                    ↓
         [Background Service Worker]
                    ↓
         [获取图片 URL/转 Base64]
                    ↓
         [打开侧边栏 + 发送图片数据]
                    ↓
         [侧边栏接收图片 + 调用 AI]
                    ↓
         [生成 Prompt + 标签]
                    ↓
         [多轮对话：用户继续提问]
                    ↓
         [保存到历史记录]
                    ↓
         [用户编辑 / 翻译 / 复制 / 预览]
```

### 4.4 多轮对话设计

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;  // 可选，附带图片
  timestamp: number;
}

interface Conversation {
  id: string;
  messages: ChatMessage[];
  imageUrl: string;
  imageBase64: string;
  generatedPrompt: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

### 4.5 历史记录设计

```typescript
interface HistoryItem {
  id: string;
  imageUrl: string;
  imageBase64?: string;  // 缩略图 Base64（可选）
  prompt: string;
  tags: string[];
  model: 'minimax' | 'gemini-flash';
  createdAt: number;
}

// chrome.storage.local
{
  settings: { ... },
  conversations: Conversation[],  // 当前会话（可多轮）
  history: HistoryItem[],          // 历史记录（最多 100 条）
}
```

### 4.6 Context Menu 实现

```typescript
// background/service-worker.ts

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'image-to-prompt',
    title: '🎨 ImageToPrompt - 分析图片',
    contexts: ['image'],
  });
});

// 点击菜单
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'image-to-prompt' && info.srcUrl) {
    // 存储图片 URL 到 local storage
    chrome.storage.local.set({ currentImageUrl: info.srcUrl });

    // 打开侧边栏（使用 Side Panel API，M120+）
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }

    // 通知侧边栏/popup 有新图片
    chrome.runtime.sendMessage({
      type: 'IMAGE_SELECTED',
      url: info.srcUrl,
      tabId: tab.id,
    });
  }
});
```

---

## 5. API 接入

### 5.1 MiniMax

**图片理解**：
- Endpoint: `https://api.minimax.chat/v1/c宝能/chat_completion`
- Model: `MiniMax-Reasoning` 或 `MiniMax-VL`
- Input: Base64 图片 + 文本指令
- Output: JSON（Prompt 文本）

**图片生成**：
- Endpoint: `https://api.minimax.chat/v1/image_generation`
- Model: `image-01`

### 5.2 Gemini Flash

**图片理解**：
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- API Key: 用户配置的 Google AI API Key
- Input: Base64 图片 + 文本指令
- Output: JSON（Prompt 文本）

---

## 6. 开发阶段

| 阶段 | 内容 | 产出 |
|------|------|------|
| **Phase 1** | 项目骨架 + Context Menu + Sidebar UI | 可运行的空壳插件 |
| **Phase 2** | MiniMax / Gemini 接入 + Prompt 生成 | 核心功能可用 |
| **Phase 3** | 语言切换 + 风格标签 + 复制 | 体验优化 |
| **Phase 4** | 多轮对话 + 历史记录 | 增强功能 |
| **Phase 5** | 预览生图 + 设置面板 | 完整功能 |

---

## 7. 验收标准

### 唤起与交互
- [ ] 右键点击网页图片 → 弹出菜单 → 点击后打开侧边栏
- [ ] 点击插件图标 → 打开侧边栏（Side Panel）
- [ ] 侧边栏正确显示图片预览

### 核心功能
- [ ] AI 生成 Prompt 显示在文本框
- [ ] 用户可编辑 Prompt
- [ ] 语言切换（中/EN/J）正常
- [ ] 复制按钮可用
- [ ] 模型切换可用（MiniMax / Gemini Flash）
- [ ] API Key 可配置
- [ ] 预览生图功能可用

### 增强功能
- [ ] 多轮对话：可对图片进行多轮问答/修改
- [ ] 历史记录：保存/查看/删除历史分析结果
- [ ] 搜索历史：通过关键词搜索历史记录

### 打包发布
- [ ] 插件可正常打包 .crx / .zip
- [ ] 可上传到 Chrome Web Store

---

## 8. 风险 & 注意事项

1. **MV3 Service Worker 限制**：不能直接打开 popup，需要通过消息或其他方式
2. **CORS**：图片 Base64 转换在 content script 中完成
3. **API Key 安全**：存储在 chrome.storage.local（用户本地）
4. **Context Menu 兼容性**：所有主流浏览器都支持
