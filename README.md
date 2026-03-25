# NowFocus

一款专注于「单任务流」的反拖延 App。核心理念：**任何时刻只显示一件事**，强迫用户专注当下，而非被任务列表焦虑淹没。

以药物胶囊为核心视觉意象——完成一个任务，就是服下一粒胶囊，执念消除。

## 功能概览

- **单焦点主屏**：默认只显示当前激活任务，无干扰
- **手势操作**：右滑完成、左滑延后，松手未到阈值自动弹回
- **长按 Peek**：长按屏幕展开时间线，查看历史与待做队列
- **药盒（Inbox）**：随手记录碎想，不进入主队列
- **历史池**：查看所有已完成任务，支持回收至药盒
- **数据持久化**：基于 AsyncStorage，关闭 App 数据不丢失

## 技术栈

| 技术 | 版本 |
|---|---|
| Expo | ~51.0.0 |
| React Native | 0.74.5 |
| React Native Reanimated | ~3.10.1 |
| React Native Gesture Handler | ~2.16.1 |
| Zustand | ^4.5.4 |
| AsyncStorage | 1.23.1 |

## 快速开始

**环境要求**：Node.js、npm、Expo Go（手机安装）

```bash
# 克隆项目
git clone https://github.com/ysy264/NowFocus.git
cd NowFocus

# 安装依赖
npm install

# 启动开发服务器
npm start
```

启动后用 Expo Go 扫描二维码即可在手机上预览。

## 项目结构

```
src/
  components/
    CapsuleItem.tsx        # 三态胶囊组件（active / upcoming / history）
    AddCapsuleSheet.tsx    # 添加任务底部弹层
  screens/
    MainScreen.tsx         # 主界面
  store/
    taskStore.ts           # Zustand 全局状态
  constants/
    design.ts              # 设计 Token（颜色、尺寸、动画参数）
App.tsx                    # 根入口
```

## 注意事项

项目使用 `.npmrc` 注入了 `node-options=--no-experimental-require-module`，用于兼容 Node.js 22 与 Reanimated 3 的 ESM 冲突，请勿删除。

## 开发日志

详见 [DEVLOG.md](./DEVLOG.md)
