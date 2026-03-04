# NowFocus 开发日志

> 记录时间：2026-03-02
> 项目性质：Vibe Coding / 个人 Anti-Procrastination App
> 平台：Android（Expo Go 调试）

---

## 一、项目背景与技术栈

### 产品定位
一款专注于「单任务流」的反拖延 App。核心理念：**任何时刻只显示一件事**，强迫用户专注当下而非被任务列表焦虑淹没。

### 技术栈
| 技术 | 版本 | 用途 |
|---|---|---|
| Expo | ~51.0.0 | 项目脚手架 + Expo Go 调试 |
| React Native | (Expo 内置) | 原生渲染 |
| React Native Reanimated | ~3.10.1 | 弹簧动效 / 共享值动画 |
| React Native Gesture Handler | ~2.16.1 | 手势识别（Pan / LongPress） |
| Zustand | ^4.5.4 | 全局状态管理 |
| AsyncStorage | 1.23.1 | 数据持久化 |
| expo-haptics | ~13.0.1 | 触感反馈 |
| react-native-safe-area-context | 4.10.1 | 安全区适配 |

> **NativeWind 被中途移除**：初期引入 NativeWind（Tailwind for RN），后因其 Babel 插件在 Node.js 22 + Reanimated 3 环境下触发 ESM 冲突，彻底移除，改用 StyleSheet。

---

## 二、V1 —— 单任务卡片版

### 功能设计
- **主界面**：全屏英雄卡片，展示当前任务标题
- **长按时间轴**：长按屏幕，弹簧动效展开历史/未来任务时间线（Peek）
- **完成**：点击下方完成按钮 or 右滑卡片
- **延后（Snooze）**：左滑卡片，任务移至队尾
- **AI 拆解**：输入目标后调用 OpenAI-compatible API 拆解为子任务
- **25 分钟沙漏进度条**：屏幕底部极细进度条，无感计时
- **三种任务模式**：ai_chain（AI 有序链）/ manual_chain（手动有序）/ daily_focus（优先级排序）
- **FAB 按钮**：右下角悬浮添加按钮

### 数据模型（V1）
```
Goal { id, title, mode, queue: Task[], history: Task[] }
Task { id, title, priority, snoozeCount, createdAt, completedAt }
Store: { goals[], activeGoalId }
```

### 用户评价
> **约 30% 完成度。**
> - "今日聚焦"模式与手动模式重复
> - 时间线只能看历史，看不到未来
> - AI 模式子任务输入框多余
> - 缺少已延后/已完成列表视图

---

## 三、V1 期间遇到的 Bug 与修复

### Bug 1：ERR_MODULE_NOT_FOUND（启动崩溃）
**现象**：`Cannot find module 'lib/module/Animated'`
**根因**：Node.js 22 默认开启 `--experimental-require-module`，导致 Reanimated 3 的 ESM 构建被 require() 调用，而该 ESM 包的内部 import 路径缺少扩展名，Node.js 报错。
**修复过程**：
1. 先移除 NativeWind（其 Babel 插件也触发该问题）
2. 在 package.json scripts 里加 `NODE_OPTIONS=...` → **Windows cmd.exe 不支持**，失败
3. 最终：创建 `.npmrc` 写入 `node-options=--no-experimental-require-module`（跨平台，由 npm 自动注入）✓

### Bug 2：PluginError（Expo 配置插件错误）
**现象**：启动时报 `Package "react-native-reanimated" does not contain a valid config plugin`
**根因**：`app.json` 里 `"plugins": ["react-native-reanimated"]`，Expo 的插件解析器尝试加载该包的 ESM 入口作为配置插件，引发 SyntaxError。
**修复**：删除 `app.json` 中的 `plugins` 数组（Expo Go 开发阶段不需要）✓

### Bug 3："main" has not been registered（Expo Go 白屏）
**现象**：Expo Go 连接后报 `"main" has not been registered`
**根因**：`package.json` 的 `"main": "App.tsx"`，Metro 打包了文件但没有人调用 `AppRegistry.registerComponent`
**修复**：改为 `"main": "expo/AppEntry.js"`，Expo 标准入口会自动调用 `registerRootComponent(App)` ✓

### Bug 4：pointerEvents 写在 useAnimatedStyle 里
**现象**：TypeScript 警告 + Android 行为异常
**根因**：`pointerEvents` 是 View 的 JSX prop，不是 CSS 属性，不能放在 Reanimated 的 `useAnimatedStyle` 里
**修复**：移回 JSX prop `pointerEvents="none"` ✓

### Bug 5：ProgressBar 宽度用百分比字符串
**现象**：进度条在 Android 上不动
**根因**：Reanimated 的 `useAnimatedStyle` 不支持 `width: "100%"` 这类字符串值
**修复**：改用像素值 `withTiming(SCREEN_W, ...)` ✓

---

## 四、V2 —— 治愈胶囊流（Healing Capsule Flow）

### 设计动机
用户对 V1 整体不满意，提出全新视觉概念：**以药物胶囊为核心意象，引线贯穿屏幕，代表时间流**。

### 新数据模型
```
Capsule { id, title, snoozeCount, createdAt, completedAt? }
Store: { inbox[], activeQueue[], history[] }
// 彻底抛弃 Goal 概念，改为扁平队列
```

### 三种胶囊形态
| 形态 | 视觉 | 含义 |
|---|---|---|
| active | 红/蓝两壳拉开，文字浮在缝隙 | 当前正在做 |
| upcoming | 红/蓝闭合胶囊，半透明文字 | 待做 |
| history | 纯蓝小药丸，无文字 | 已完成（执念已消除） |

### 手势设计
- **右滑 ≥ 72px** → 完成（触感 Light）
- **左滑 ≥ 72px** → 延后至队尾（触感 Warning）
- **松手未达阈值** → 弹回

### 布局
- 引线贯穿屏幕中央
- 历史药丸在上方
- 激活胶囊居中
- 待做胶囊在下方
- 黑白添加按钮在底部
- 右上角灰色胶囊 = 药盒入口（随手备忘）

### 设计常量（design.ts）
```typescript
CapsuleColors: background/thread/activeRed/activeBlue/historyBlue/inboxGray/addBlack/addWhite/...
CapsuleDims:   halfW:110  capsuleH:52  openGap:42  containerW:304
               upcomingW:240  upcomingH:44  histPillW:60  histPillH:24
               stepH:72  addBtnW:148  addBtnH:46  swipeThreshold:72
Spring:        open/snapBack/sheet
```

---

## 五、V2.1 —— 几何修复 + 单焦点

### 用户对 V2 初版的评价
> - 胶囊动效不错，但"太丑了，太丑了，一点也不优雅"
> - 激活胶囊两半壳飞出了屏幕边缘
> - 中间那条引线太割裂
> - 历史/待做全部显示，违反"只专注当下一件事"的初衷
> - 长按时间轴预览功能消失了（V1 有，V2 没做进来）

### 修复：胶囊几何重算
**原问题**：左壳从 `left: 0`，右壳从 `right: 0`，`openGap=42` 的 transform 将两壳各推出容器边缘飞出屏幕。

**修复方案**：改为以屏幕中心为锚点：
```
左壳：right: SCREEN_W/2  （右边缘贴中线，向左延伸 halfW）
右壳：left:  SCREEN_W/2  （左边缘贴中线，向右延伸 halfW）
张开后：左壳 x=[28,138]  右壳 x=[222,332]  缝隙 84px  全部在屏幕内 ✓
```

### 新增动画
- **进场动画**：gap 从 0 → openGap（胶囊缓缓张开）
- **飞出动画**：完成/延后时先 `withTiming` 飞出屏幕，再触发 store 更新
- **合拢反馈**：滑动过程中随手势逐渐合拢（gap 减小）

### 修复：单焦点布局
默认只显示激活胶囊，历史和待做全部隐藏。
**长按 Toggle 机制**：
- 长按 400ms → Peek 开启（保持常驻）
- 再次长按 → Peek 关闭
- 引线也只在 Peek 时出现

---

## 六、V2.2 —— Bug 修复 + 历史池 + 批量操作

### 用户反馈
> - 点击待做任务提前后，激活区域空白（严重 Bug）
> - 新添加的任务找不到
> - 看不到已完成了什么（需要历史池）
> - 添加完一个任务弹层就关了，不能连续添加

### Bug 修复：激活胶囊消失（swipeX 残留）
**根因分析**：
1. 用户右滑完成任务，`swipeX` 被 `withTiming` 动画到 `SCREEN_W × 1.5`
2. 动画完成回调触发 `completeCurrentCapsule()`，store 更新
3. React 复用同一个 `CapsuleItem` 组件实例（无 `key` prop）
4. 新任务的组件继承了旧的 `swipeX = 540px`，整体偏移到屏幕右侧不可见

**修复**：给激活胶囊加 `key={currentCapsule.id}`，任务变化时强制卸载/重挂，所有 shared value 归零。

### Bug 修复：新添加任务找不到
**根因**：`addToQueue` 原来是追加到队列末尾，若队列已有任务，新任务被"压在"最后看不到。
**修复**：改为插入到位置 1（当前任务之后），使新添加的任务立即成为"下一个"。

### 新功能

**1. 历史池（左上角蓝色药丸按钮）**
- 查看所有已完成任务，显示标题 + 完成时间
- 每条记录可：「存药盒」（移回 inbox）/ 「✕」（永久删除）

**2. 待做项可点击提前**
- Peek 状态下，待做胶囊可点击 → `prioritizeCapsule(id)` 移至队首
- 提示文字："点击可提前至下一个"

**3. 药盒/历史池均支持批量操作**
- 不再点一个就关闭弹层，关闭按钮在底部，用户可连续操作

**4. 历史条目新增「回收到药盒」操作**
- 将已完成任务以碎想形式移入 inbox（清除 completedAt，snoozeCount 归零）

---

## 七、当前功能全貌（截至 2026-03-02）

### 主屏幕
| 区域 | 内容 |
|---|---|
| 左上角 | 蓝色药丸 + 数字 → 打开历史池 |
| 右上角 | 灰色胶囊 + 红色角标 → 打开药盒 |
| 中央 | 激活胶囊（仅此一个，专注模式） |
| 底部 | 黑白分体胶囊「+ 添加」按钮 |
| 长按屏幕 | Toggle Peek：历史药丸（上）+ 待做胶囊（下）淡入 |

### 激活胶囊手势
| 手势 | 触感 | 效果 |
|---|---|---|
| 右滑 ≥ 72px | Light | 飞出右侧 → 完成 → 下一个登场 |
| 左滑 ≥ 72px | Warning | 飞出左侧 → 延后至队尾 |
| 松手未达阈值 | — | 弹回，缝隙恢复 |
| 无手势 | — | 进场时胶囊缓缓张开 |

### 添加弹层
- 单行文本输入
- 「加入队列」：插入到当前任务之后（位置 1），立即可见
- 「存入药盒」：放入碎想 inbox，不排队

### 药盒弹层
- 列出所有 inbox 项
- 每项可：加入队列 / ✕ 删除
- 支持连续操作，不自动关闭

### 历史池弹层
- 列出所有已完成任务 + 完成时间
- 每项可：存药盒 / ✕ 永久删除
- 支持连续操作

### 数据持久化
- Zustand persist + AsyncStorage
- key: `nowfocus-capsules`

---

## 八、遗留问题 / 未来可做方向

| 优先级 | 描述 |
|---|---|
| 中 | 激活胶囊完成后的过渡动画（当前：新胶囊从闭合缓缓张开，可考虑更有仪式感的转场） |
| 中 | 待做胶囊在 Peek 中文字只在左半壳，对齐不够美观 |
| 低 | 真实 AI 拆解（目前无 API Key，已移除 AI 功能） |
| 低 | 任务编辑（长按待做项进入编辑） |
| 低 | 每日统计 / 成就系统 |
| 低 | iPad / 横屏适配 |
| 低 | 深色模式 |

---

## 九、关键文件索引

| 文件 | 职责 |
|---|---|
| `App.tsx` | 根入口，GestureHandlerRootView + SafeAreaProvider |
| `src/constants/design.ts` | 所有设计 Token（颜色/尺寸/弹簧参数） |
| `src/store/taskStore.ts` | 全局状态（Zustand），所有数据操作 |
| `src/screens/MainScreen.tsx` | 主界面 + 三个弹层（AddCapsule / Inbox / History） |
| `src/components/CapsuleItem.tsx` | 三态胶囊组件（active / upcoming / history） |
| `src/components/AddCapsuleSheet.tsx` | 添加新胶囊的底部弹出表单 |
| `.npmrc` | `node-options=--no-experimental-require-module`（Node.js 22 兼容必须） |
| `metro.config.js` | `unstable_enablePackageExports = false`（防止 ESM 路径错误） |
| `babel.config.js` | 仅保留 `react-native-reanimated/plugin`（NativeWind 已移除） |
| `app.json` | 无 plugins 字段（防止 Reanimated config plugin 报错） |
