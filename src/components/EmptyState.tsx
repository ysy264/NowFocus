/**
 * EmptyState
 * 当没有任何任务时，显示引导提示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors, Typography } from '../constants/design';

export const EmptyState: React.FC = () => {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1600 }),
        withTiming(1.0, { duration: 1600 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>◎</Text>
      <Text style={styles.title}>专注当下</Text>
      <Animated.View style={animStyle}>
        <Text style={styles.hint}>点击右下角 + 添加你的第一个目标</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  icon: {
    fontSize:   48,
    color:      Colors.separator,
    marginBottom: 8,
  },
  title: {
    fontSize:   22,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  hint: {
    ...Typography.caption,
    fontSize: 14,
    textAlign: 'center',
  },
});
