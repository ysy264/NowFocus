/**
 * useSpringTimeline
 *
 * 管理"弹簧式时间轴"的核心手势与动画逻辑：
 * - 长按触发 peek 模式
 * - 拖拽时跟随手指滚动
 * - 松手后弹簧回弹至当前任务
 */

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Spring } from '../constants/design';

interface UseSpringTimelineOptions {
  currentIndex: number;
  totalItems: number;
  onPeekStart?: () => void;
  onPeekEnd?: () => void;
}

export function useSpringTimeline({
  onPeekStart,
  onPeekEnd,
}: UseSpringTimelineOptions) {
  // 时间轴的竖向偏移（0 = 锁定在当前任务）
  const translateY   = useSharedValue(0);
  // peek 进度（0 = 隐藏, 1 = 完全展示）
  const peekProgress = useSharedValue(0);

  // ─── 回弹到当前任务 ──────────────────────────────────────────
  const snapToCurrent = () => {
    'worklet';
    translateY.value   = withSpring(0, Spring.snapBack);
    peekProgress.value = withTiming(0, { duration: 280 });
  };

  // ─── 手势：长按 400ms 激活，激活后跟随拖拽 ─────────────────
  const gesture = Gesture.Pan()
    .minDistance(0)
    .activateAfterLongPress(400)
    .onStart(() => {
      peekProgress.value = withTiming(1, { duration: 200 });
      if (onPeekStart) runOnJS(onPeekStart)();
    })
    .onUpdate(e => {
      // 橡皮筋阻尼：实际移动量 × 0.35
      translateY.value = e.translationY * 0.35;
    })
    .onEnd(() => {
      snapToCurrent();
      if (onPeekEnd) runOnJS(onPeekEnd)();
    })
    .onFinalize(() => {
      // onEnd 未触发时的兜底（手势被打断时）
      snapToCurrent();
      if (onPeekEnd) runOnJS(onPeekEnd)();
    });

  // ─── 动画样式 ────────────────────────────────────────────────
  const timelineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ⚠️  pointerEvents 不能放进 useAnimatedStyle（它是 RN View prop，非 CSS 样式）
  //     通过 opacity 控制视觉，pointerEvents="none" 写在 TimelineView 的 JSX 上
  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: peekProgress.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - peekProgress.value * 0.04 }],
    opacity:   1 - peekProgress.value * 0.3,
  }));

  return {
    gesture,
    translateY,
    peekProgress,
    timelineAnimStyle,
    overlayAnimStyle,
    cardAnimStyle,
  };
}
