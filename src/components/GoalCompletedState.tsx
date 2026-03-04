/**
 * GoalCompletedState
 * 当一个目标的所有任务都完成后，展示庆祝界面
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spring, Typography } from '../constants/design';
import { Goal } from '../store/taskStore';

interface GoalCompletedStateProps {
  goal: Goal;
  onDismiss: () => void;  // 返回目标列表 / 继续下一个目标
}

export const GoalCompletedState: React.FC<GoalCompletedStateProps> = ({
  goal,
  onDismiss,
}) => {
  const scale   = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value   = withSpring(1, Spring.cardEnter);
    opacity.value = withTiming(1, { duration: 300 });
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>目标完成！</Text>
      <Text style={styles.goalName}>{goal.title}</Text>
      <Text style={styles.stats}>
        共完成 {goal.history.length} 个步骤
      </Text>

      <Pressable style={styles.button} onPress={onDismiss}>
        <Text style={styles.buttonText}>继续下一个</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emoji: {
    fontSize:    56,
    marginBottom: 8,
  },
  title: {
    fontSize:   28,
    fontWeight: '700',
    color:      Colors.textPrimary,
  },
  goalName: {
    fontSize:   16,
    color:      Colors.textSecondary,
    textAlign:  'center',
  },
  stats: {
    ...Typography.caption,
    fontSize: 13,
  },
  button: {
    marginTop:        24,
    backgroundColor:  Colors.textPrimary,
    paddingHorizontal: 40,
    paddingVertical:   16,
    borderRadius:     Radius.pill,
  },
  buttonText: {
    fontSize:   16,
    fontWeight: '600',
    color:      '#fff',
  },
});
