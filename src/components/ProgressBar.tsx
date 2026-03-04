/**
 * ProgressBar（沙漏进度条）
 *
 * 屏幕底部一根 2px 极细进度条：
 * - 不显示数字，只做视觉时间感知
 * - 周期 25 分钟，到头后无缝循环
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors, Layout, SCREEN_W } from '../constants/design';

const CYCLE_MS = 25 * 60 * 1000;

export const ProgressBar: React.FC = () => {
  // 用 0~SCREEN_W 的像素值驱动宽度，避免百分比字符串在 Android 上的兼容问题
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withRepeat(
      withTiming(SCREEN_W, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,   // 无限循环
      false // 不往回播（直接跳回 0 重新开始）
    );
    return () => cancelAnimation(barWidth);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    width: barWidth.value,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    position:        'absolute',
    bottom:           0,
    left:             0,
    right:            0,
    height:           Layout.progressBarH,
    backgroundColor: Colors.separator,
  },
  fill: {
    height:          Layout.progressBarH,
    backgroundColor: Colors.accentBlue,
    borderRadius:    Layout.progressBarH,
  },
});
