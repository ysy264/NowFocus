/**
 * CapsuleItem
 *
 * 三种形态：
 *   active   — 红蓝拉开，文字在缝隙间；进场时缓缓张开，支持左/右飞出
 *   upcoming — 闭合红蓝胶囊，文字贴左壳（半透明）
 *   history  — 纯蓝小药丸，无文字
 *
 * 手势（仅 active）：
 *   右滑 ≥ swipeThreshold → 飞出屏幕右侧 → completeCurrentCapsule
 *   左滑 ≥ swipeThreshold → 飞出屏幕左侧 → snoozeCurrentCapsule
 *   未达阈值松手             → snapBack 弹回
 *
 * 布局关键：两半壳以屏幕中心为基准向外展开，不会飞出屏幕边缘。
 *   Left half  → right: SCREEN_W/2  (右边缘贴中线)
 *   Right half → left:  SCREEN_W/2  (左边缘贴中线)
 *   openGap    → 各向外 42px（总缝隙 84px）
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CapsuleColors, CapsuleDims, Spring, SCREEN_W } from '../constants/design';
import { useTaskStore } from '../store/taskStore';

// ─── 类型 ─────────────────────────────────────────────────────
type CapsuleVariant = 'active' | 'upcoming' | 'history';

interface Props {
  variant: CapsuleVariant;
  title?:  string;
}

// ─── 历史药丸 ──────────────────────────────────────────────────
export const CapsuleItem: React.FC<Props> = ({ variant, title }) => {
  const complete = useTaskStore(s => s.completeCurrentCapsule);
  const snooze   = useTaskStore(s => s.snoozeCurrentCapsule);

  if (variant === 'history') {
    return <View style={styles.historyPill} />;
  }

  if (variant === 'upcoming') {
    return (
      <View style={[styles.closedWrap, { width: CapsuleDims.upcomingW, height: CapsuleDims.upcomingH }]}>
        <View style={[styles.leftHalfClosed, {
          width: CapsuleDims.upcomingW / 2,
          height: CapsuleDims.upcomingH,
          backgroundColor: CapsuleColors.activeRed,
        }]} />
        <View style={[styles.rightHalfClosed, {
          width: CapsuleDims.upcomingW / 2,
          height: CapsuleDims.upcomingH,
          backgroundColor: CapsuleColors.activeBlue,
        }]} />
        {title ? (
          <Text style={[styles.closedText, { opacity: 0.72 }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
    );
  }

  return <ActiveCapsule title={title} complete={complete} snooze={snooze} />;
};

// ─── Active 胶囊 ───────────────────────────────────────────────
const CENTER_X    = SCREEN_W / 2;
const { halfW, capsuleH, openGap, swipeThreshold } = CapsuleDims;

const ActiveCapsule: React.FC<{
  title?:   string;
  complete: () => void;
  snooze:   () => void;
}> = ({ title, complete, snooze }) => {
  // swipeX: 整体横向跟手偏移
  const swipeX = useSharedValue(0);
  // gap:    两壳之间单侧距离，0=闭合，openGap=完全张开
  const gap    = useSharedValue(0);

  // 进场：缓缓张开
  useEffect(() => {
    gap.value = withSpring(openGap, Spring.open);
  }, []);

  const triggerComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    complete();
  }, [complete]);

  const triggerSnooze = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    snooze();
  }, [snooze]);

  const pan = Gesture.Pan()
    .onUpdate(e => {
      swipeX.value = e.translationX;
      // 随手势逐渐合拢（增加"抓着胶囊"的手感）
      const ratio = Math.min(Math.abs(e.translationX) / swipeThreshold, 1);
      gap.value = openGap * (1 - ratio * 0.6);
    })
    .onEnd(e => {
      if (e.translationX >= swipeThreshold) {
        // 飞出右侧，再触发完成
        swipeX.value = withTiming(
          SCREEN_W * 1.5,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => { if (finished) runOnJS(triggerComplete)(); }
        );
      } else if (e.translationX <= -swipeThreshold) {
        // 飞出左侧，再触发延后
        swipeX.value = withTiming(
          -SCREEN_W * 1.5,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => { if (finished) runOnJS(triggerSnooze)(); }
        );
      } else {
        // 弹回
        swipeX.value = withSpring(0, Spring.snapBack);
        gap.value    = withSpring(openGap, Spring.open);
      }
    });

  // 整体横向偏移（跟手）
  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  // 左半壳：右边缘贴中线，向左推 gap
  const leftAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -gap.value }],
  }));

  // 右半壳：左边缘贴中线，向右推 gap
  const rightAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gap.value }],
  }));

  // 文字：随缝隙淡入
  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: gap.value / openGap,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.activeContainer, containerAnimStyle]}>
        {/* 左半壳（红） */}
        <Animated.View style={[
          styles.leftHalfActive,
          { backgroundColor: CapsuleColors.activeRed },
          leftAnimStyle,
        ]} />

        {/* 右半壳（蓝） */}
        <Animated.View style={[
          styles.rightHalfActive,
          { backgroundColor: CapsuleColors.activeBlue },
          rightAnimStyle,
        ]} />

        {/* 文字：固定在缝隙中间，随 gap 淡入 */}
        {title ? (
          <Animated.Text
            style={[styles.activeText, textAnimStyle]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {title}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
};

// ─── 样式 ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Active ────────────────────────────────────────────────
  activeContainer: {
    width:  SCREEN_W,
    height: capsuleH,
    // 子元素用 absolute，容器本身作为坐标系
  },
  // 左半壳：右边缘固定在屏幕中心，向左延伸 halfW
  leftHalfActive: {
    position:               'absolute',
    right:                   CENTER_X,
    width:                   halfW,
    height:                  capsuleH,
    borderTopLeftRadius:     capsuleH / 2,
    borderBottomLeftRadius:  capsuleH / 2,
  },
  // 右半壳：左边缘固定在屏幕中心，向右延伸 halfW
  rightHalfActive: {
    position:                'absolute',
    left:                     CENTER_X,
    width:                    halfW,
    height:                   capsuleH,
    borderTopRightRadius:     capsuleH / 2,
    borderBottomRightRadius:  capsuleH / 2,
  },
  // 文字：居中在缝隙区域（CENTER_X ± openGap）
  activeText: {
    position:  'absolute',
    left:       CENTER_X - openGap - 8,
    right:      CENTER_X - openGap - 8,
    top:         0,
    bottom:      0,
    textAlignVertical: 'center',
    textAlign:  'center',
    color:      CapsuleColors.textActive,
    fontSize:   14,
    fontWeight: '600',
    zIndex:      10,
  },

  // ── Upcoming ──────────────────────────────────────────────
  closedWrap: {
    flexDirection: 'row',
    overflow:      'hidden',
    borderRadius:  CapsuleDims.upcomingH / 2,
  },
  leftHalfClosed: {
    borderTopLeftRadius:    CapsuleDims.upcomingH / 2,
    borderBottomLeftRadius: CapsuleDims.upcomingH / 2,
  },
  rightHalfClosed: {
    borderTopRightRadius:    CapsuleDims.upcomingH / 2,
    borderBottomRightRadius: CapsuleDims.upcomingH / 2,
  },
  closedText: {
    position:          'absolute',
    left:               14,
    right:               8,
    top:                 0,
    bottom:              0,
    textAlignVertical: 'center',
    color:              CapsuleColors.textOnCapsule,
    fontSize:           13,
    fontWeight:         '500',
  },

  // ── History ───────────────────────────────────────────────
  historyPill: {
    width:           CapsuleDims.histPillW,
    height:          CapsuleDims.histPillH,
    borderRadius:    CapsuleDims.histPillH / 2,
    backgroundColor: CapsuleColors.historyBlue,
    opacity:          0.5,
  },
});
