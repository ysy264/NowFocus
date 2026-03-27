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

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
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
  /** upcoming 用：第几个待做项（0=紧接着的，越大越靠后，透视越小） */
  index?:  number;
  /** active 用：点击胶囊触发（进入详情）*/
  onTap?:  () => void;
}

// ─── 历史药丸 ──────────────────────────────────────────────────
export const CapsuleItem: React.FC<Props> = ({ variant, title, index = 0, onTap }) => {
  const complete = useTaskStore(s => s.completeCurrentCapsule);
  const snooze   = useTaskStore(s => s.snoozeCurrentCapsule);

  if (variant === 'history') {
    return (
      <View style={styles.historyPill}>
        <View style={styles.historyPillLeft} />
        <View style={styles.historyPillRight} />
      </View>
    );
  }

  if (variant === 'upcoming') {
    return <UpcomingCapsule title={title} index={index} />;
  }

  return <ActiveCapsule title={title} complete={complete} snooze={snooze} onTap={onTap} />;
};

// ─── Upcoming 胶囊 ────────────────────────────────────────────
const MIN_CLOSED_W = CapsuleDims.capsuleH * 2;  // 最小宽度保证圆头
const TEXT_PAD_H   = 24;                         // 文字左右各留 24px

const UpcomingCapsule: React.FC<{ title?: string; index: number }> = ({ title, index }) => {
  const scale = Math.max(0.72, 1 - index * 0.08);
  const [capsuleW, setCapsuleW] = useState(MIN_CLOSED_W);
  const h = CapsuleDims.capsuleH;

  const onTextLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.width + TEXT_PAD_H * 2;
    setCapsuleW(Math.max(MIN_CLOSED_W, measured));
  }, []);

  return (
    <View style={{ transform: [{ scale }] }}>
      {/* 隐藏文字：仅用于测量宽度 */}
      {title ? (
        <Text
          style={[styles.measureText]}
          numberOfLines={1}
          onLayout={onTextLayout}
        >
          {title}
        </Text>
      ) : null}

      <View style={[styles.closedWrap, { width: capsuleW, height: h }]}>
        <View style={[styles.leftHalfClosed, {
          width: capsuleW / 2,
          height: h,
          backgroundColor: CapsuleColors.activeRed,
        }]} />
        <View style={[styles.rightHalfClosed, {
          width: capsuleW / 2,
          height: h,
          backgroundColor: CapsuleColors.activeBlue,
        }]} />
        {title ? (
          <Text style={[styles.closedText, { opacity: 0.85, fontSize: 13 }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

// ─── Active 胶囊 ───────────────────────────────────────────────
const CENTER_X    = SCREEN_W / 2;
const { halfW, capsuleH, openGap, swipeThreshold } = CapsuleDims;

// 根据文字宽度计算目标 gap（每侧推出距离）
// 文字左右各留 12px 内边距，最小 openGap，最大受屏幕宽度约束
const TEXT_PADDING = 12;
const MAX_GAP = SCREEN_W / 2 - halfW - 8; // 保证壳不飞出屏幕边缘

function calcTargetGap(textWidth: number): number {
  const half = textWidth / 2 + TEXT_PADDING;
  return Math.max(openGap, Math.min(half, MAX_GAP));
}

const ActiveCapsule: React.FC<{
  title?:   string;
  complete: () => void;
  snooze:   () => void;
  onTap?:   () => void;
}> = ({ title, complete, snooze, onTap }) => {
  // swipeX: 整体横向跟手偏移
  const swipeX = useSharedValue(0);
  // gap:    两壳之间单侧距离，0=闭合，openGap=完全张开
  const gap    = useSharedValue(0);
  // 当前目标 gap（根据文字宽度计算）
  const [targetGap, setTargetGap] = useState(openGap);

  // 文字测量回调
  const onTextLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTargetGap(calcTargetGap(w));
  }, []);

  // 进场：缓缓张开到目标宽度
  useEffect(() => {
    gap.value = withSpring(targetGap, Spring.open);
  }, [targetGap]);

  const triggerComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    complete();
  }, [complete]);

  const triggerSnooze = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    snooze();
  }, [snooze]);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])   // 明确横向滑动才激活，避免和 tap 冲突
    .onUpdate(e => {
      swipeX.value = e.translationX;
      // 随手势逐渐合拢（增加"抓着胶囊"的手感）
      const ratio = Math.min(Math.abs(e.translationX) / swipeThreshold, 1);
      gap.value = targetGap * (1 - ratio * 0.6);
    })
    .onEnd(e => {
      if (e.translationX >= swipeThreshold) {
        swipeX.value = withTiming(
          SCREEN_W * 1.5,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => { if (finished) runOnJS(triggerComplete)(); }
        );
      } else if (e.translationX <= -swipeThreshold) {
        swipeX.value = withTiming(
          -SCREEN_W * 1.5,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => { if (finished) runOnJS(triggerSnooze)(); }
        );
      } else {
        swipeX.value = withSpring(0, Spring.snapBack);
        gap.value    = withSpring(targetGap, Spring.open);
      }
    });

  // 点击进入详情（Race：pan 先激活时 tap 被取消，轻点时 tap 触发）
  const tap = Gesture.Tap()
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  const composed = Gesture.Race(pan, tap);

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
    opacity: gap.value / Math.max(targetGap, 1),
  }));

  return (
    <GestureDetector gesture={composed}>
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

        {/* 隐藏文字：用于测量真实宽度，触发动态 gap 计算 */}
        {title ? (
          <Text
            style={styles.measureText}
            numberOfLines={1}
            onLayout={onTextLayout}
          >
            {title}
          </Text>
        ) : null}

        {/* 可见文字：随 gap 淡入，位置随 targetGap 动态定位 */}
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

  // 隐藏测量文字（透明，不可见，仅用于 onLayout）
  measureText: {
    position:   'absolute',
    opacity:     0,
    fontSize:    13,
    fontWeight: '500',
    top:        -9999,
  },

  // ── Upcoming ──────────────────────────────────────────────
  closedWrap: {
    flexDirection: 'row',
    overflow:      'hidden',
    borderRadius:  CapsuleDims.capsuleH / 2,
  },
  leftHalfClosed: {
    borderTopLeftRadius:    CapsuleDims.capsuleH / 2,
    borderBottomLeftRadius: CapsuleDims.capsuleH / 2,
  },
  rightHalfClosed: {
    borderTopRightRadius:    CapsuleDims.capsuleH / 2,
    borderBottomRightRadius: CapsuleDims.capsuleH / 2,
  },
  closedText: {
    position:          'absolute',
    left:               TEXT_PAD_H,
    right:              TEXT_PAD_H,
    top:                 0,
    bottom:              0,
    textAlignVertical: 'center',
    textAlign:         'center',
    color:              CapsuleColors.textOnCapsule,
    fontSize:           13,
    fontWeight:         '500',
  },

  // ── History ───────────────────────────────────────────────
  historyPill: {
    width:         80,
    height:        CapsuleDims.histPillH,
    borderRadius:  CapsuleDims.histPillH / 2,
    flexDirection: 'row',
    overflow:      'hidden',
  },
  historyPillLeft: {
    width:           40,
    height:          CapsuleDims.histPillH,
    backgroundColor: CapsuleColors.historyBlue,
    opacity:          0.55,
  },
  historyPillRight: {
    width:           40,
    height:          CapsuleDims.histPillH,
    backgroundColor: 'rgba(75,113,184,0.12)',
  },
});
