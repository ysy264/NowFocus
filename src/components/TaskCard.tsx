/**
 * TaskCard
 *
 * 屏幕正中央的英雄卡片：
 * - 显示当前任务标题 & 所属目标
 * - 右滑 → 完成任务
 * - 左滑 → 稍后处理（snooze）
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Shadow, Typography, Layout, SCREEN_W, Spring } from '../constants/design';
import { Goal, Task } from '../store/taskStore';

interface TaskCardProps {
  goal: Goal;
  task: Task;
  onComplete: () => void;
  onSnooze: () => void;
  animStyle?: object;
}

const SWIPE_THRESHOLD = SCREEN_W * 0.28;

export const TaskCard: React.FC<TaskCardProps> = ({
  goal,
  task,
  onComplete,
  onSnooze,
  animStyle,
}) => {
  const translateX    = useSharedValue(0);
  const swipeOpacity  = useSharedValue(1);
  const actionOpacity = useSharedValue(0);  // 滑动时显示的动作提示
  const actionIsRight = useSharedValue(true);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const resetCard = () => {
    'worklet';
    translateX.value   = withSpring(0, Spring.snapBack);
    swipeOpacity.value = withTiming(1, { duration: 200 });
    actionOpacity.value = withTiming(0, { duration: 150 });
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate(e => {
      translateX.value = e.translationX * 0.75; // 阻尼系数
      actionIsRight.value = e.translationX > 0;
      // 越靠近阈值，动作提示越明显
      const progress = Math.min(Math.abs(e.translationX) / SWIPE_THRESHOLD, 1);
      actionOpacity.value = progress * 0.9;
    })
    .onEnd(e => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // 右滑：完成
        runOnJS(triggerHaptic)();
        translateX.value = withTiming(SCREEN_W, { duration: 260 }, () => {
          runOnJS(onComplete)();
          translateX.value = 0;
          swipeOpacity.value = 1;
          actionOpacity.value = 0;
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // 左滑：稍后处理
        runOnJS(triggerHaptic)();
        translateX.value = withTiming(-SCREEN_W, { duration: 260 }, () => {
          runOnJS(onSnooze)();
          translateX.value = 0;
          swipeOpacity.value = 1;
          actionOpacity.value = 0;
        });
      } else {
        resetCard();
      }
    })
    .onFinalize(() => {
      resetCard();
    });

  const cardSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const completeHintStyle = useAnimatedStyle(() => ({
    opacity: actionIsRight.value ? actionOpacity.value : 0,
  }));

  const snoozeHintStyle = useAnimatedStyle(() => ({
    opacity: actionIsRight.value ? 0 : actionOpacity.value,
  }));

  const modeLabel: Record<Goal['mode'], string> = {
    ai_chain:     'AI 拆解',
    manual_chain: '手动序列',
    daily_focus:  '今日聚焦',
  };

  const completedCount = goal.history.length;
  const totalCount     = goal.history.length + goal.queue.length;

  return (
    <View style={styles.wrapper}>
      {/* 滑动操作提示（背景层） */}
      <Animated.View style={[styles.actionHint, styles.actionHintRight, completeHintStyle]}>
        <Text style={styles.actionHintText}>完成 ✓</Text>
      </Animated.View>
      <Animated.View style={[styles.actionHint, styles.actionHintLeft, snoozeHintStyle]}>
        <Text style={styles.actionHintText}>稍后 →</Text>
      </Animated.View>

      {/* 主卡片 */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, animStyle, cardSwipeStyle]}>
          {/* 顶部：目标名 + 模式标签 */}
          <View style={styles.cardHeader}>
            <Text style={styles.goalLabel} numberOfLines={1}>
              {goal.title.toUpperCase()}
            </Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{modeLabel[goal.mode]}</Text>
            </View>
          </View>

          {/* 核心：当前任务标题 */}
          <Text style={styles.taskTitle}>{task.title}</Text>

          {/* 底部：进度 & snooze 计数 */}
          <View style={styles.cardFooter}>
            <Text style={styles.progressText}>
              {completedCount} / {totalCount}
            </Text>
            {task.snoozeCount > 0 && (
              <Text style={styles.snoozeText}>
                已推迟 {task.snoozeCount} 次
              </Text>
            )}
          </View>

          {/* 滑动引导线 */}
          <View style={styles.swipeHint}>
            <View style={styles.swipeHintLine} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHint: {
    position:       'absolute',
    top: 0, bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 32,
    borderRadius:   Radius.card,
    zIndex:         0,
  },
  actionHintRight: {
    left:            20,
    right:           20,
    backgroundColor: Colors.accent + '22',
    alignItems:      'flex-start',
  },
  actionHintLeft: {
    left:            20,
    right:           20,
    backgroundColor: Colors.accentBlue + '18',
    alignItems:      'flex-end',
  },
  actionHintText: {
    fontSize:   16,
    fontWeight: '600',
    color:      Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.card,
    paddingHorizontal: Layout.cardPaddingH,
    paddingVertical:   Layout.cardPaddingV,
    marginHorizontal:  20,
    width:             SCREEN_W - 40,
    zIndex:            1,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   20,
  },
  goalLabel: {
    ...Typography.goalLabel,
    flex: 1,
    marginRight: 8,
  },
  modeBadge: {
    backgroundColor:  Colors.background,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.pill,
  },
  modeBadgeText: {
    fontSize:   11,
    fontWeight: '500',
    color:      Colors.textSecondary,
  },
  taskTitle: {
    ...Typography.heroTask,
    marginBottom: 28,
  },
  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  progressText: {
    ...Typography.caption,
  },
  snoozeText: {
    fontSize:   11,
    color:      Colors.accentBlue,
    fontWeight: '500',
  },
  swipeHint: {
    alignItems: 'center',
    marginTop:  20,
  },
  swipeHintLine: {
    width:           40,
    height:           3,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.separator,
  },
});
