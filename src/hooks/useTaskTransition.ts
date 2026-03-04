/**
 * useTaskTransition
 *
 * 管理任务卡片的切换动画：
 * - 完成：当前卡片上滑消失，下一张从下方升起
 * - Snooze：当前卡片左滑消失，下一张淡入
 */

import { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, runOnJS } from 'react-native-reanimated';
import { SCREEN_W, Spring } from '../constants/design';

type TransitionType = 'complete' | 'snooze';

export function useTaskTransition() {
  const cardTranslateY = useSharedValue(0);
  const cardTranslateX = useSharedValue(0);
  const cardOpacity    = useSharedValue(1);
  const cardScale      = useSharedValue(1);

  const nextCardTranslateY = useSharedValue(60);
  const nextCardOpacity    = useSharedValue(0);

  // ─── 触发切换 ─────────────────────────────────────────────
  const triggerTransition = (type: TransitionType, onComplete: () => void) => {
    'worklet';
    if (type === 'complete') {
      // 当前卡片：向上滑出 + 淡出
      cardTranslateY.value = withTiming(-80, { duration: 260 });
      cardOpacity.value    = withTiming(0,   { duration: 220 });
      cardScale.value      = withTiming(0.92, { duration: 260 });

      // 下一张卡片：从下方升入
      nextCardTranslateY.value = withTiming(
        0,
        { duration: 320 },
        (finished) => {
          if (finished) {
            runOnJS(onComplete)();
            // 重置当前卡片状态（为下次动画准备）
            cardTranslateY.value = 0;
            cardTranslateX.value = 0;
            cardOpacity.value    = 1;
            cardScale.value      = 1;
            nextCardTranslateY.value = 60;
            nextCardOpacity.value    = 0;
          }
        }
      );
      nextCardOpacity.value = withTiming(1, { duration: 280 });

    } else {
      // snooze：向左滑出
      cardTranslateX.value = withTiming(-SCREEN_W * 0.6, { duration: 260 });
      cardOpacity.value    = withTiming(0, { duration: 220 });

      nextCardTranslateY.value = withTiming(
        0,
        { duration: 300 },
        (finished) => {
          if (finished) {
            runOnJS(onComplete)();
            cardTranslateY.value = 0;
            cardTranslateX.value = 0;
            cardOpacity.value    = 1;
            cardScale.value      = 1;
            nextCardTranslateY.value = 60;
            nextCardOpacity.value    = 0;
          }
        }
      );
      nextCardOpacity.value = withTiming(1, { duration: 260 });
    }
  };

  // ─── 动画样式 ─────────────────────────────────────────────
  const currentCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardTranslateY.value },
      { translateX: cardTranslateX.value },
      { scale:      cardScale.value },
    ],
    opacity: cardOpacity.value,
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: nextCardTranslateY.value }],
    opacity: nextCardOpacity.value,
    position: 'absolute',
    left: 0,
    right: 0,
  }));

  // ─── 完成按钮打勾动画 ─────────────────────────────────────
  const checkScale   = useSharedValue(1);
  const checkOpacity = useSharedValue(1);

  const triggerCheckAnim = () => {
    'worklet';
    checkScale.value = withSequence(
      withSpring(1.4, Spring.taskSwitch),
      withSpring(1.0, Spring.taskSwitch)
    );
  };

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  return {
    triggerTransition,
    currentCardStyle,
    nextCardStyle,
    triggerCheckAnim,
    checkAnimStyle,
  };
}
