/**
 * CapsuleDetailCard
 *
 * 点击激活胶囊进入详情模式：
 *   - 居中弹出卡片（scale 0.8 → 1 + opacity 0 → 1）
 *   - 磨砂玻璃渐变卡片
 *   - 卡片内：任务标题 + 百分比进度条（可点击，100% = 完成）
 *   - 右滑 ≥ 72px → 完成
 *   - 左滑 ≥ 72px → 延后 + 退出详情模式
 *   - 点击卡片外 → 退出详情模式
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CapsuleColors, CapsuleDims, Spring, SCREEN_W } from '../constants/design';

interface Props {
  title:      string;
  onClose:    () => void;
  onComplete: () => void;
  onSnooze:   () => void;
}

const STEPS  = 10;
const CARD_W = SCREEN_W - 48;

export const CapsuleDetailCard: React.FC<Props> = ({
  title, onClose, onComplete, onSnooze,
}) => {
  const [progress, setProgress] = useState(0); // 0~10格
  const scale   = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const swipeX  = useSharedValue(0);

  // 进场动画
  React.useEffect(() => {
    scale.value   = withSpring(1, Spring.open);
    opacity.value = withTiming(1, { duration: 180 });
  }, []);

  const closeWithAnim = useCallback(() => {
    scale.value   = withTiming(0.85, { duration: 160 });
    opacity.value = withTiming(0, { duration: 160 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [onClose]);

  // 进度条点击
  const handleStepPress = useCallback((step: number) => {
    const newProgress = step + 1;
    setProgress(newProgress);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (newProgress >= STEPS) {
      // 100% → 完成
      setTimeout(() => {
        scale.value   = withTiming(0.85, { duration: 160 });
        opacity.value = withTiming(0, { duration: 160 }, (done) => {
          if (done) runOnJS(onComplete)();
        });
      }, 300);
    }
  }, [onComplete]);

  // 卡片滑动手势：1:1 跟手 + 速度判断飞出
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(e => {
      swipeX.value = e.translationX;
    })
    .onEnd(e => {
      const shouldComplete = e.translationX > 72 || e.velocityX > 500;
      const shouldSnooze   = e.translationX < -72 || e.velocityX < -500;

      if (shouldComplete) {
        swipeX.value = withTiming(
          SCREEN_W * 1.5,
          { duration: 280, easing: Easing.in(Easing.quad) },
          (done) => { if (done) runOnJS(onComplete)(); }
        );
      } else if (shouldSnooze) {
        swipeX.value = withTiming(
          -SCREEN_W * 1.5,
          { duration: 280, easing: Easing.in(Easing.quad) },
          (done) => { if (done) runOnJS(onSnooze)(); }
        );
      } else {
        swipeX.value = withSpring(0, Spring.snapBack);
      }
    });

  // 1:1 跟手位移 + 拖动时轻微倾斜 + 渐隐
  const cardStyle = useAnimatedStyle(() => {
    const drag = swipeX.value;
    return {
      opacity:   opacity.value * interpolate(Math.abs(drag), [0, SCREEN_W * 0.6], [1, 0.5], 'clamp'),
      transform: [
        { scale:      scale.value },
        { translateX: drag },
        { rotate:     `${interpolate(drag, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12], 'clamp')}deg` },
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 背景遮罩：遮住后面的胶囊，点击关闭 */}
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: CapsuleColors.background }]}
        onPress={closeWithAnim}
      />

      {/* 居中卡片 */}
      <View style={styles.centerWrap} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardWrap, cardStyle]}>
            {/* 渐变背景模拟磨砂效果 */}
            <LinearGradient
              colors={['rgba(255,255,255,0.96)', 'rgba(248,247,244,0.99)']}
              style={StyleSheet.absoluteFill}
            />

            {/* 拖动把手 */}
            <View style={styles.handle} />

            {/* 任务标题（不限行数，卡片自适应高度） */}
            <Text style={styles.taskTitle}>{title}</Text>

            {/* 提示文字 */}
            <Text style={styles.hint}>右滑完成 · 左滑延后 · 点击进度条</Text>

            {/* 进度条（10格，可点击） */}
            <View style={styles.progressRow}>
              {Array.from({ length: STEPS }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.progressStep,
                    i < progress && styles.progressStepFilled,
                  ]}
                  onPress={() => handleStepPress(i)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <Text style={styles.progressLabel}>{progress * 10}%</Text>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerWrap: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  cardWrap: {
    width:           CARD_W,
    borderRadius:    24,
    overflow:        'hidden',
    alignItems:      'center',
    paddingHorizontal: 24,
    paddingTop:      20,
    paddingBottom:   32,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.7)',
    // 阴影
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 8 },
    shadowOpacity:   0.12,
    shadowRadius:    24,
    elevation:       16,
  },
  handle: {
    width:           40,
    height:           4,
    borderRadius:     2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom:    20,
  },
  taskTitle: {
    fontSize:     20,
    fontWeight:  '700',
    color:       '#1A1A1A',
    textAlign:   'center',
    lineHeight:   28,
    marginBottom: 10,
  },
  hint: {
    fontSize:     11,
    color:        CapsuleColors.textMuted,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap:            6,
    marginBottom:   10,
  },
  progressStep: {
    flex:            1,
    height:          8,
    borderRadius:    4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressStepFilled: {
    backgroundColor: CapsuleColors.activeBlue,
  },
  progressLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      CapsuleColors.activeBlue,
  },
});
