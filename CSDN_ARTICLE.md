# 用 Vibe Coding 做了一个治愈系反拖延 App，踩了一堆坑但最后效果真的挺好看

> 标签：`React Native` `Expo` `Reanimated` `Vibe Coding` `Android` `个人项目`
>
> 时间：2026-03-02

---

## 前言：我为什么要做这个 App

我是一个重度拖延症患者。

不是那种「稍微有点懒」的那种，是那种打开 Notion 看着满屏任务清单然后直接关掉 Notion 的那种。任务太多，看着就焦虑，焦虑了就更不想做，然后就一直拖。

有一天我突然想明白了：**我不需要一个更好的任务管理系统，我需要的是——任何时刻，我的屏幕上只有一件事。**

就这一个想法，推着我做了这个叫 **NowFocus** 的 App。

这篇文章记录整个开发过程，包括我用 Vibe Coding 方式（也就是和 AI 结对编程）完成这个项目的全部历程——设计反复、踩坑、自我推翻、再来一遍。

---

## 什么是 Vibe Coding

简单说就是：**你负责想清楚要什么，AI 负责写代码，你来 review 和调方向。**

整个项目我没有自己手敲太多代码，但我在每一个关键决策点都做了清晰的判断——什么方向对、什么效果不行、哪里要推翻重来。

坦白说，Vibe Coding 对「想清楚要什么」的要求比传统开发更高，不是说说「做个任务 App」就行的，你得能描述出感觉、说出为什么。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Expo SDK 51 | 脚手架 + Expo Go 真机调试 |
| React Native | 原生渲染 |
| React Native Reanimated 3 | 弹簧动效、共享值动画 |
| React Native Gesture Handler 2 | 手势识别（Pan / LongPress） |
| Zustand | 全局状态管理 |
| AsyncStorage | 数据持久化 |
| expo-haptics | 触感反馈 |

有一个库我中途移掉了：**NativeWind**（Tailwind for RN）。

本来想用它来快速写样式，结果在 Node.js 22 + Reanimated 3 的环境下触发了 ESM 冲突，报一堆奇怪的错，排查了半天决定直接移除，改回 StyleSheet。这是后话，下面会讲。

---

## V1：全屏英雄卡片版

第一版的设计很直觉：全屏展示当前任务，下面一个大大的「完成」按钮，右滑完成、左滑延后，长按出时间轴。

我给它规划了三种任务模式：
- **ai_chain**：AI 帮你拆解目标成有序子任务
- **manual_chain**：手动排好顺序的任务链
- **daily_focus**：按优先级排序的今日清单

数据模型是：

```
Goal { id, title, mode, queue: Task[], history: Task[] }
Task { id, title, priority, snoozeCount, createdAt, completedAt }
```

做完之后我自己用了一会儿，感觉……不太对。

三种模式有重叠，时间轴只能看历史不能看未来，AI 拆解的输入框感觉多余，最重要的是——**看着 Goal 列表，那种「任务太多」的焦虑感又回来了。**

我给它打了个 30% 完成度的评分，然后决定重来。

---

## V2：治愈胶囊流（Healing Capsule Flow）

推翻 V1 的时候，我脑子里突然冒出来一个画面：**药物胶囊**。

红蓝两半壳，代表任务的两面性——紧迫和平静，你需要完成它但它也不会让你太焦虑。一根竖线贯穿屏幕，像时间的流动。历史的任务缩成小药丸，淡出在上方；未来的任务是闭合的胶囊，静静等待。

我把这个想法描述给 AI，让它帮我重写整个项目。

**新数据模型彻底抛弃了 Goal 概念：**

```
Capsule { id, title, snoozeCount, createdAt, completedAt? }
Store: { inbox[], activeQueue[], history[] }
```

扁平队列，没有层级，没有项目，只有「现在要做的」「待做的」「做完了的」。

**三种胶囊形态：**

| 形态 | 视觉 | 含义 |
|---|---|---|
| active | 红蓝两壳拉开，文字浮在缝隙 | 当前正在做 |
| upcoming | 红蓝闭合胶囊，半透明 | 待做 |
| history | 纯蓝小药丸，无文字 | 已完成（执念已消除） |

---

## 第一个让我崩溃的 Bug：胶囊两半飞出了屏幕

V2 初版跑起来，动效有了，但胶囊的两半壳在张开的时候直接飞出屏幕边缘，消失不见。

![胶囊飞出屏幕示意](./assets/bug_capsule_flyoff.png)

*（示意：两半壳飞出屏幕边缘）*

我在描述这个 bug 的时候用了一个词：「太丑了，太丑了，一点也不优雅。」

**根因是布局锚点错了。**

原来的写法是左壳从 `left: 0`，右壳从 `right: 0`，然后用 `transform: translateX(±openGap)` 推开。问题是容器本身就是 `width: SCREEN_W`，从两端向外推自然就飞出去了。

**修复方案**：改为以屏幕中心为锚点：

```typescript
// 左半壳：右边缘贴中线，向左延伸 halfW(110px)
leftHalfActive: {
  position: 'absolute',
  right: SCREEN_W / 2,   // 右边缘 = 屏幕中心
  width: 110,
  ...
},
// 右半壳：左边缘贴中线，向右延伸 halfW(110px)
rightHalfActive: {
  position: 'absolute',
  left: SCREEN_W / 2,    // 左边缘 = 屏幕中心
  width: 110,
  ...
},
```

张开时各向外推 42px：左壳落在 x=[28, 138]，右壳落在 x=[222, 332]，缝隙 84px，全部在 360px 屏幕内。

---

## Node.js 22 的 ESM 兼容地狱

在修 V2 bug 的同时，我一直在和一个启动报错周旋：

```
Cannot find module 'lib/module/Animated'
```

排查了很久才搞清楚：**Node.js 22 默认开启了 `--experimental-require-module`**，允许用 `require()` 加载 ESM 模块。但 Reanimated 3 的 ESM 构建里有内部 `import` 路径缺少扩展名，Node.js 一跑就报错。

一开始想在 `package.json` 的 scripts 里加环境变量：

```json
"start": "NODE_OPTIONS=--no-experimental-require-module expo start"
```

然后发现——**Windows cmd.exe 不支持 `KEY=VALUE cmd` 语法**。

最后的解法是创建 `.npmrc` 文件：

```
node-options=--no-experimental-require-module
```

npm 会在启动任何 Node.js 进程时自动注入这个参数，跨平台，完美解决。

顺带还踩了两个类似的坑：

**app.json 里不能加 Reanimated 的 plugin**

```json
// ❌ 会报 PluginError
"plugins": ["react-native-reanimated"]
```

Expo Go 开发阶段不需要 config plugin，删掉就好。

**package.json 的 main 字段要指向 Expo 标准入口**

```json
// ❌ 会报 "main" has not been registered
"main": "App.tsx"

// ✅ 正确
"main": "expo/AppEntry.js"
```

---

## 单焦点哲学 + 长按 Peek

V2 最让我纠结的设计决策是：**待做和历史要不要默认显示？**

我最开始是全部显示的。跑起来之后我立刻推翻了——看到一排待做胶囊，那种任务列表的焦虑感又来了。

最终方案：**默认只显示激活胶囊，长按屏幕 Toggle Peek 模式。**

```typescript
const longPress = Gesture.LongPress()
  .minDuration(400)
  .onStart(() => {
    const isOpen = peekProgress.value > 0.5;
    if (isOpen) {
      peekProgress.value = withSpring(0, Spring.snapBack);
      runOnJS(closePeek)();
    } else {
      peekProgress.value = withSpring(1, Spring.open);
      runOnJS(openPeek)();
    }
  });
```

`peekProgress` 是一个 0→1 的 SharedValue，驱动历史和待做区域的 opacity + translateY。在 worklet 里直接读 `.value`，不会有 stale closure 问题。

Peek 打开后，待做胶囊可以点击提前到队首。这个设计我挺喜欢的——平时屏幕干净，需要看全局的时候长按一下，需要改变优先级就点一下，然后屏幕又回归安静。

---

## 最严重的 Bug：完成任务后新任务消失

这个 Bug 让我差点以为整个逻辑写错了。

**现象**：右滑完成当前任务后，下一个任务应该出现在屏幕中央，但屏幕上什么都没有——空白。

我截图给 AI 看，描述现象，排查了一会儿才找到根因：

**没有给激活胶囊加 `key` prop。**

这是 React 的一个经典陷阱：没有 `key` 时，React 会复用同一个组件实例。

右滑完成时，`swipeX` 这个 SharedValue 被 `withTiming` 动画到了 `SCREEN_W × 1.5 = 540px`。动画完成后回调触发了 `completeCurrentCapsule()`，store 更新了。但 React 复用了同一个 `CapsuleItem` 实例，新任务继承了旧的 `swipeX = 540px`，整体偏移到屏幕右侧不可见。

修复一行代码：

```tsx
// ❌ 没有 key，共享值跨任务残留
<CapsuleItem variant="active" title={currentCapsule?.title} />

// ✅ 加上 key，任务变化时强制卸载/重挂，所有 SharedValue 归零
<CapsuleItem key={currentCapsule!.id} variant="active" title={currentCapsule?.title} />
```

---

## 「新添加的任务找不到」

另一个让用户（也就是我自己）很崩溃的 Bug：

**在队列里已有任务的情况下，新添加的任务消失了。**

根因：`addToQueue` 原来是追加到队列末尾。如果队列里已经有 3 个任务，新加的任务在第 4 位，用户完全看不到它。

改成插入到位置 1（当前任务之后）：

```typescript
addToQueue: (title: string) =>
  set(state => {
    const newCap = makeCapsule(title);
    if (state.activeQueue.length === 0) {
      return { activeQueue: [newCap] };
    }
    // 插入到位置 1，立刻成为「下一个」
    const [current, ...rest] = state.activeQueue;
    return { activeQueue: [current, newCap, ...rest] };
  }),
```

新添加的任务会立刻成为「下一个待做」，用户能看到，有即时反馈。

---

## 最终的交互设计

经过反复迭代，最终版的交互如下：

**主屏幕**

- 左上角：蓝色药丸 + 数字 → 历史池（已完成的任务）
- 右上角：灰色胶囊 + 红色角标 → 药盒（随手备忘的碎想）
- 中央：激活胶囊，默认只有这一个，**绝对的专注**
- 底部：黑白分体胶囊「+ 添加」按钮
- 长按屏幕：Toggle Peek，历史药丸（上）+ 待做胶囊（下）淡入

**手势**

| 手势 | 触感 | 效果 |
|---|---|---|
| 右滑 ≥ 72px | Light | 飞出右侧 → 完成 |
| 左滑 ≥ 72px | Warning | 飞出左侧 → 延后至队尾 |
| 松手未达阈值 | — | 弹回，胶囊缓缓张开恢复 |

触感反馈是我很在意的一个细节。完成任务是 Light（轻盈，成就感），延后任务是 Warning（轻微警示，不鼓励但允许）。

---

## 胶囊随手势合拢的触感设计

这个细节挺小的，但实际用起来手感差很多。

拖动胶囊时，随着拖动距离增加，两壳之间的缝隙会逐渐闭合：

```typescript
.onUpdate(e => {
  swipeX.value = e.translationX;
  // ratio: 0(没拖) → 1(达到阈值)
  const ratio = Math.min(Math.abs(e.translationX) / swipeThreshold, 1);
  // 合拢到 40%（缝隙最多缩小 60%）
  gap.value = openGap * (1 - ratio * 0.6);
})
```

像真的「抓着胶囊在拖」的感觉，松手弹回时缝隙重新张开，配合弹簧参数让整个交互有一种轻盈感。

---

## 一些没做完的事

说实话这个 App 还有很多可以做的地方：

- 完成后的过渡动画可以更有仪式感（现在就是新胶囊从闭合缓缓张开）
- 待做胶囊在 Peek 里文字对齐不够美观
- AI 拆解功能（目前因为没有 API Key 暂时移除了）
- 任务编辑
- 每日完成统计

但我现在用起来已经够了。屏幕上只有一件事，做完右滑，下一件事出现。就这么简单。

---

## 总结：Vibe Coding 的感受

这是我第一次完整地用 Vibe Coding 方式做一个项目，整个过程最大的感受是：

**AI 替我承担了「怎么写」的认知负担，让我能把精力放在「写什么」「为什么这样写」上。**

但这不意味着可以不懂技术。恰恰相反——我踩的那些坑（Node.js ESM、React key prop、Reanimated SharedValue 残留）如果我完全不懂原理，可能根本没办法描述清楚问题，也就没办法和 AI 有效协作。

Vibe Coding 降低的是**执行成本**，提高的是**对「想清楚」的要求**。

如果你也想尝试，我的建议是：先把你想要的交互、感觉、逻辑用人话描述清楚，然后再让 AI 来写。不清楚的地方先想清楚，别想着「让 AI 帮我想」——那样出来的东西会很平庸。

---

项目目前只是个人使用，暂不开源。如果有同样有拖延困扰的朋友，欢迎在评论区聊聊你的解决方案。

---

*完*
